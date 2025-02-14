/**
 * @file scheduledReset.ts
 * @description Cloud Function (Pub/Sub scheduled) that resets ytd and totalYTD to zero
 *              for all users on January 1st of every year.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import config from "../../config.json";

/**
 * Scheduled: Runs at midnight on January 1st (US Eastern time). 
 * Resets YTD totals for all users in the specified collection.
 */
export const scheduledYTDReset = functions.pubsub
  // Cron: minute=0 hour=0 day=1 month=1 => Jan 1st at 00:00
  .schedule("0 0 1 1 *")
  .timeZone("America/New_York") 
  .onRun(async (context) => {
    const db = admin.firestore();
    // Adjust userCollection if different from your config
    const userCollection = config.FIRESTORE_ACTIVE_USERS_COLLECTION; 

    try {
      // Gather all users in the collection
      const usersSnapshot = await db.collection(userCollection).get();

      let batch = db.batch();
      let operationsCount = 0;
      const maxBatchSize = 500; // Firestore batch limit

      // Iterate all users
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        // Reference to "assets/general"
        const assetsGeneralRef = db
          .collection(userCollection)
          .doc(userId)
          .collection(config.ASSETS_SUBCOLLECTION)
          .doc(config.ASSETS_GENERAL_DOC_ID);

        // Update ytd, totalYTD to 0
        batch.update(assetsGeneralRef, { ytd: 0, totalYTD: 0 });
        operationsCount++;

        // If batch hits limit, commit and start new
        if (operationsCount === maxBatchSize) {
          await batch.commit();
          batch = db.batch();
          operationsCount = 0;
        }
      }

      // Commit any leftover operations
      if (operationsCount > 0) {
        await batch.commit();
      }

      console.log("YTD totals successfully reset for all users.");
    } catch (error) {
      console.error("Error resetting YTD totals:", error);
      throw new Error("Failed to reset YTD totals.");
    }

    return null;
  });