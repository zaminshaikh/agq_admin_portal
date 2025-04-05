/**
 * @file scheduledActivities.ts
 * @description Cloud Function (Pub/Sub scheduled) that processes scheduled
 *              activity documents. If a scheduled time has arrived, it creates
 *              actual activities and updates user assets, then marks them 'completed'.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import config from "../../config.json";

const db = admin.firestore();

/**
 * Scheduled: Runs every 1 hour to check for scheduled activities
 * where scheduledTime <= now and status == 'pending'. 
 * 
 * For each match:
 * 1) Creates a real Activity in the user's subcollection.
 * 2) If changedAssets is provided, update the user's asset docs
 * 3) Marks the scheduled activity doc as 'completed'.
 */
export const processScheduledActivities = functions.pubsub
  .schedule("0 * * * *") // Runs every hour at minute 0
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

    console.log(`Found ${querySnapshot.size} scheduled activities to process.`);

    // Process each pending activity individually (not in batch) to handle potential errors
    for (const doc of querySnapshot.docs) {
      try {
        const batch = db.batch();
        const data = doc.data();
        const { cid, activity, changedAssets, usersCollectionID } = data;

        // Validate essential fields
        if (!cid || !activity) {
          console.error(`Scheduled activity ${doc.id} missing 'cid' or 'activity'`);
          continue;
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

        // 2) If changedAssets is provided, update the user's asset docs
        if (changedAssets) {
          const assetCollectionRef = clientRef.collection(config.ASSETS_SUBCOLLECTION);
          
          // Get current asset docs to apply changes to
          const [agqSnapshot, ak1Snapshot, generalSnapshot] = await Promise.all([
            assetCollectionRef.doc(config.ASSETS_AGQ_DOC_ID).get(),
            assetCollectionRef.doc(config.ASSETS_AK1_DOC_ID).get(),
            assetCollectionRef.doc(config.ASSETS_GENERAL_DOC_ID).get()
          ]);
          
          // Function to apply changes to a fund's assets
          const applyChangesToFund = (currentFundData: any, changes: any, fundName: string) => {
            if (!currentFundData) {
              // Create a new document if it doesn't exist
              currentFundData = { fund: fundName, total: 0 };
            }
            
            // Apply each changed asset
            for (const [assetType, assetValue] of Object.entries(changes)) {
              // Type assertion to handle the unknown type
              const asset = assetValue as {
                amount: number;
                firstDepositDate?: Date | admin.firestore.Timestamp | string;
                displayTitle?: string;
                index?: number;
              };
              
              // Handle firstDepositDate conversion for new deposits
              let firstDeposit = currentFundData[assetType]?.firstDepositDate || null;
              if (asset.firstDepositDate) {
                if (asset.firstDepositDate instanceof admin.firestore.Timestamp) {
                  firstDeposit = asset.firstDepositDate;
                } else if (asset.firstDepositDate instanceof Date) {
                  firstDeposit = admin.firestore.Timestamp.fromDate(asset.firstDepositDate);
                } else {
                  const parsed = new Date(asset.firstDepositDate);
                  if (!isNaN(parsed.getTime())) {
                    firstDeposit = admin.firestore.Timestamp.fromDate(parsed);
                  }
                }
              }
              
              // Update or create the asset
              currentFundData[assetType] = {
                amount: asset.amount,
                firstDepositDate: firstDeposit,
                displayTitle: asset.displayTitle,
                index: asset.index
              };
            }
            
            // Recalculate the total
            let total = 0;
            for (const [key, value] of Object.entries(currentFundData)) {
              if (key !== 'fund' && key !== 'total') {
                total += (value as { amount: number }).amount || 0;
              }
            }
            currentFundData.total = total;
            
            return currentFundData;
          };
          
          // Apply changes to each fund
          const updatedAgqDoc = applyChangesToFund(
            agqSnapshot.exists ? agqSnapshot.data() : null, 
            changedAssets.agq || {}, 
            "AGQ"
          );
          
          const updatedAk1Doc = applyChangesToFund(
            ak1Snapshot.exists ? ak1Snapshot.data() : null, 
            changedAssets.ak1 || {}, 
            "AK1"
          );
          
          // Create updated general doc
          const generalData = generalSnapshot.exists ? generalSnapshot.data() : { ytd: 0, totalYTD: 0, total: 0 };
          const updatedGeneral = {
            ytd: generalData?.ytd || 0,
            totalYTD: generalData?.totalYTD || 0,
            total: updatedAgqDoc.total + updatedAk1Doc.total,
          };
          
          // Update asset docs in batch
          batch.set(assetCollectionRef.doc(config.ASSETS_AGQ_DOC_ID), updatedAgqDoc);
          batch.set(assetCollectionRef.doc(config.ASSETS_AK1_DOC_ID), updatedAk1Doc);
          batch.set(assetCollectionRef.doc(config.ASSETS_GENERAL_DOC_ID), updatedGeneral);
        }

        // 3) Mark this scheduled activity as 'completed'
        const scheduledActivityRef = scheduledActivitiesRef.doc(doc.id);
        batch.update(scheduledActivityRef, { status: "completed" });

        // Commit changes for this activity
        await batch.commit();
        console.log(`Processed scheduled activity ${doc.id} for client ${cid}`);
      } catch (error) {
        console.error(`Error processing scheduled activity ${doc.id}:`, error);
        // Continue to next activity even if this one fails
      }
    }

    return null;
});