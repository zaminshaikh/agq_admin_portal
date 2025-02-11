/**
 * @file scheduledActivities.ts
 * @description Cloud Function (Pub/Sub scheduled) that processes scheduled
 *              activity documents. If a scheduled time has arrived, it creates
 *              actual activities and updates user assets, then marks them 'completed'.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import config from "../../lib/config.json";

const db = admin.firestore();

/**
 * Scheduled: Runs every 12 hours (adjust as needed) to check for scheduled activities
 * where scheduledTime <= now and status == 'pending'. 
 * 
 * For each match:
 * 1) Creates a real Activity in the user's subcollection.
 * 2) Optionally updates clientState (assets, ytd, totalYTD, etc.).
 * 3) Marks the scheduled activity doc as 'completed'.
 */
export const processScheduledActivities = functions.pubsub
  .schedule("0 */12 * * *") // Runs every 12 hours
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const scheduledActivitiesRef = db.collection("scheduledActivities");

    // Find all scheduled activities that are pending and are due
    const querySnapshot = await scheduledActivitiesRef
      .where("scheduledTime", "<=", now)
      .where("status", "==", "pending")
      .get();

    if (querySnapshot.empty) {
      console.log("No scheduled activities to process at this time.");
      return null;
    }

    const batch = db.batch();
    console.log(`Found ${querySnapshot.size} scheduled activities to process.`);

    // Process each pending doc
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const { cid, activity, clientState, usersCollectionID } = data;

      // Validate essential fields
      if (!cid || !activity) {
        console.error(`Scheduled activity ${doc.id} missing 'cid' or 'activity'.`);
        return;
      }

      // 1) Create the actual activity in user's subcollection
      const clientRef = db.collection(usersCollectionID).doc(cid);
      const activitiesRef = clientRef.collection(config.ACTIVITIES_SUBCOLLECTION);
      const newActivityRef = activitiesRef.doc(); // auto-generated doc ID

      batch.set(newActivityRef, {
        ...activity,
        parentCollection: usersCollectionID,
        formattedTime: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2) If clientState is provided, we update the user's asset docs
      if (clientState) {
        const assetCollectionRef = clientRef.collection(config.ASSETS_SUBCOLLECTION);

        // Helper to shape the doc updates
        const prepareAssetDoc = (assets: any, fundName: string) => {
          let total = 0;
          const docObj: any = { fund: fundName };
          for (const key of Object.keys(assets)) {
            const asset = assets[key];
            docObj[key] = {
              amount: asset.amount,
              firstDepositDate: asset.firstDepositDate
                ? admin.firestore.Timestamp.fromDate(asset.firstDepositDate)
                : null,
              displayTitle: asset.displayTitle,
              index: asset.index,
            };
            total += asset.amount;
          }
          docObj.total = total;
          return docObj;
        };

        // Recreate AGQ doc, AK1 doc, and general doc
        const agqDoc = prepareAssetDoc(clientState.assets.agq, "AGQ");
        const ak1Doc = prepareAssetDoc(clientState.assets.ak1, "AK1");
        const general = {
          ytd: clientState.ytd ?? 0,
          totalYTD: clientState.totalYTD ?? 0,
          total: agqDoc.total + ak1Doc.total,
        };

        const agqRef = assetCollectionRef.doc(config.ASSETS_AGQ_DOC_ID);
        const ak1Ref = assetCollectionRef.doc(config.ASSETS_AK1_DOC_ID);
        const genRef = assetCollectionRef.doc(config.ASSETS_GENERAL_DOC_ID);

        batch.update(agqRef, agqDoc);
        batch.update(ak1Ref, ak1Doc);
        batch.update(genRef, general);
      }

      // 3) Mark this scheduled doc as 'completed'
      const scheduledActivityRef = scheduledActivitiesRef.doc(doc.id);
      batch.update(scheduledActivityRef, { status: "completed" });
    });

    // Commit
    try {
      await batch.commit();
      console.log(`Processed ${querySnapshot.size} scheduled activities.`);
    } catch (error) {
      console.error("Error processing scheduled activities:", error);
    }

    return null;
  });