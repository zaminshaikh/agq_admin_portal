/**
 * @file activityTriggers.ts
 * @description Firebase Firestore triggers that respond to changes in
 *              "activities" subcollections. This includes:
 *                - onCreate: Handling new activities (notifications, YTD update).
 *                - onWrite: Handling created, updated, or deleted activities
 *                           (recalculate YTD, rebuild graphpoints, etc.).
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import config from "../../lib/config.json";
import { Activity } from "../interfaces/activity.interface";
import { updateYTD } from "../helpers/ytd";
import { updateGraphpoints } from "../helpers/graphpoints";

/**
 * Trigger: onCreate for a new Activity document.
 *
 * @description When a new activity is created, this function:
 *  1) Updates YTD totals for the user (and connected users).
 *  2) Optionally sends a push notification if `sendNotif` is true.
 */
export const handleActivity = functions.firestore
  .document(`/{userCollection}/{userId}/${config.ACTIVITIES_SUBCOLLECTION}/{activityId}`)
  .onCreate(async (snapshot, context) => {
    const activity = snapshot.data() as Activity;
    const { userId, activityId, userCollection } = context.params;

    // 1) Update YTD totals
    await updateYTD(userId, userCollection);

    // 2) Check if we need to create and send a notification
    if (
      activity.sendNotif !== true ||
      ["backup", "playground", "playground2"].includes(userCollection)
    ) {
      // If we do not send notifications for the environment or if sendNotif is false, exit.
      return null;
    }

    // Import notification helpers dynamically or statically:
    const { createNotif, sendNotif } = await import("../helpers/notifications");

    try {
      const { title, body, userRef } = await createNotif(activity, userId, activityId, userCollection);
      return sendNotif(title, body, userRef);
    } catch (error) {
      console.error("Error handling new activity:", error);
      throw new functions.https.HttpsError("unknown", "Failed to handle activity", error);
    }
  });

/**
 * Trigger: onWrite for an Activity document.
 *
 * @description Responds to any creation, update, or deletion of an Activity.
 *  1) Recalculates YTD if the activity affects YTD (AGQ + profit/income).
 *  2) Updates graphpoints for this user so the historical chart is current.
 */
export const onActivityWrite = functions.firestore
  .document(`/{userCollection}/{userId}/${config.ACTIVITIES_SUBCOLLECTION}/{activityId}`)
  .onWrite(async (change, context) => {
    const { userId, userCollection } = context.params;

    // Utility function to determine if this activity impacts YTD
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const getActivityDate = (activity: Activity): Date => {
      // Convert Firestore Timestamp to JS Date if needed
      if (activity.time instanceof admin.firestore.Timestamp) {
        return activity.time.toDate();
      } else {
        return activity.time as Date;
      }
    };

    const doesAffectYTD = (activity: Activity): boolean => {
      const activityDate = getActivityDate(activity);
      return (
        activity.fund === "AGQ" &&
        ["profit", "income"].includes(activity.type) &&
        activityDate >= startOfYear
      );
    };

    let shouldUpdateYTD = false;

    // Case: new doc created
    if (!change.before.exists && change.after.exists) {
      const activity = change.after.data() as Activity;
      if (doesAffectYTD(activity)) {
        shouldUpdateYTD = true;
      }
    }
    // Case: doc deleted
    else if (change.before.exists && !change.after.exists) {
      const activity = change.before.data() as Activity;
      if (doesAffectYTD(activity)) {
        shouldUpdateYTD = true;
      }
    }
    // Case: doc updated
    else if (change.before.exists && change.after.exists) {
      const beforeActivity = change.before.data() as Activity;
      const afterActivity = change.after.data() as Activity;
      if (doesAffectYTD(beforeActivity) || doesAffectYTD(afterActivity)) {
        shouldUpdateYTD = true;
      }
    }

    // 1) Update YTD if needed
    if (shouldUpdateYTD) {
      await updateYTD(userId, userCollection);
    }

    // 2) Always update the graphpoints so historical data is consistent
    await updateGraphpoints(userCollection, userId);

    return null;
  });