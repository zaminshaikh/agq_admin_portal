/**
 * @file assetTriggers.ts
 * @description Contains a Firestore trigger to update the `recipient` field in
 *              a user's activities whenever the displayTitle of an asset changes.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import config from "../../lib/config.json";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { Activity } from "../interfaces/activity.interface";

const db = admin.firestore();

/**
 * Trigger: onUpdate of a user's asset document (e.g., assets/agq or assets/ak1).
 *
 * @description If the displayTitle of an asset changes, we reflect this change
 *              in the "recipient" field of any matching activities.
 */
export const onAssetUpdate = functions.firestore
  .document("/{userCollection}/{userId}/assets/{assetId}")
  .onUpdate(async (change, context) => {
    const { userCollection, userId, assetId } = context.params;
    console.log(`onAssetUpdate triggered for userCollection: ${userCollection}, userId: ${userId}`);

    // Determine the fund name based on assetId
    const fund = assetId === "agq" ? "AGQ" : "AK1";

    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Helper to filter out the keys "total" and "fund"
    const filterAssetEntries = (obj: object) =>
      Object.entries(obj)
        .filter(([key]) => !["total", "fund"].includes(key))
        .map(([key, value]) => ({ key, ...value }));

    const beforeAssets = filterAssetEntries(beforeData);
    const afterAssets = filterAssetEntries(afterData);

    // Convert the arrays into maps keyed by 'index'
    const beforeByIndex = new Map(beforeAssets.map((a: any) => [a.index, a]));
    const afterByIndex = new Map(afterAssets.map((a: any) => [a.index, a]));

    // Identify assets that changed displayTitle
    const assetsToUpdate = [];
    for (const [index, beforeAsset] of beforeByIndex) {
      const afterAsset = afterByIndex.get(index);
      if (afterAsset && beforeAsset.displayTitle !== afterAsset.displayTitle) {
        assetsToUpdate.push({
          index,
          oldDisplayTitle: beforeAsset.displayTitle,
          newDisplayTitle: afterAsset.displayTitle,
        });
      }
    }

    if (assetsToUpdate.length === 0) {
      console.log("No changes in displayTitles detected.");
      return null;
    }

    // Get the user's actual name (e.g., "John Doe") for the 'Personal' rename logic
    const userDocRef = db.doc(`${userCollection}/${userId}`);
    const userDocSnap = await userDocRef.get();
    const clientData = userDocSnap.data();
    const clientName = clientData ? clientData.name.first + " " + clientData.name.last : null;
    
    if (!clientName) {
      console.error(`Client name not found for user ${userId}`);
      return null;
    }

    // Prepare a batch to update all matching activities
    const activitiesRef = db.collection(`${userCollection}/${userId}/activities`);
    const batch = db.batch();

    for (const { oldDisplayTitle, newDisplayTitle } of assetsToUpdate) {
      // If the new title is "Personal", set it to the client's name
      let updatedNew = newDisplayTitle === "Personal" ? clientName : newDisplayTitle;
      // If the old title is "Personal", set it to the client's name
      let updatedOld = oldDisplayTitle === "Personal" ? clientName : oldDisplayTitle;

      // Query all activities where fund == <fund> and recipient == oldDisplayTitle
      const snapshot = await activitiesRef
        .where("fund", "==", fund)
        .where("recipient", "==", updatedOld)
        .get();

      snapshot.forEach((doc: QueryDocumentSnapshot) => {
        // Update each activity's recipient field
        batch.update(doc.ref, { recipient: updatedNew });
      });
    }

    // Commit the batch
    try {
      await batch.commit();
      console.log("Batch commit successful: Updated recipient fields.");
    } catch (error) {
      console.error("Batch commit failed:", error);
    }

    return null;
  });
