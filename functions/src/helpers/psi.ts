/**
 * @file psi.ts
 * @description Contains helper functions for calculating and updating Profit Since Inception (PSI)
 *              for both individual users and their connected (linked) users.
 *              Unlike YTD, PSI does not reset annually - it is a lifetime running total.
 */

import * as admin from "firebase-admin";
import config from "../../config.json";
import { Activity } from "../interfaces/activity.interface";

/**
 * Calculates the Profit Since Inception (PSI) for a single user, filtering only
 * 'profit' or 'income' activities within the 'AGQ' fund across all time.
 *
 * @async
 * @function calculatePSIForUser
 * @param {string} userCid - The Firestore document ID for the target user.
 * @param {string} usersCollectionID - The collection in which the user doc resides.
 * @returns {Promise<number>} The numeric total PSI amount for the specified user.
 */
export async function calculatePSIForUser(userCid: string, usersCollectionID: string): Promise<number> {
  const activitiesRef = admin
    .firestore()
    .collection(`/${usersCollectionID}/${userCid}/${config.ACTIVITIES_SUBCOLLECTION}`);

  const snapshot = await activitiesRef
    .where("fund", "==", "AGQ")
    .where("type", "in", ["profit", "income"])
    .get();

  let psiTotal = 0;
  snapshot.forEach((doc) => {
    const activity = doc.data() as Activity;
    psiTotal += activity.amount;
  });

  return psiTotal;
}

/**
 * Calculates the total PSI for a user by also including all connected (linked) users.
 *
 * @async
 * @function calculateTotalPSIForUser
 * @param {string} cid - The Firestore document ID of the base user.
 * @param {string} usersCollectionID - The name of the Firestore collection.
 * @returns {Promise<number>} The combined PSI of the user and all connected users.
 */
export async function calculateTotalPSIForUser(cid: string, usersCollectionID: string): Promise<number> {
  const processedUsers: Set<string> = new Set();
  const userQueue: string[] = [cid];
  let totalPSI = 0;

  while (userQueue.length > 0) {
    const currentUserCid = userQueue.shift();
    if (currentUserCid && !processedUsers.has(currentUserCid)) {
      processedUsers.add(currentUserCid);

      const psi = await calculatePSIForUser(currentUserCid, usersCollectionID);
      totalPSI += psi;

      const userDoc = await admin.firestore().collection(usersCollectionID).doc(currentUserCid).get();
      const userData = userDoc.data();

      if (userData && userData.connectedUsers) {
        const connectedUsers = userData.connectedUsers as string[];
        userQueue.push(...connectedUsers);
      }
    }
  }

  return totalPSI;
}

/**
 * Updates both the direct user's PSI/totalPSI and any parent/connected users'
 * totalPSI references.
 *
 * @async
 * @function updatePSI
 * @param {string} cid - The Firestore doc ID of the base user.
 * @param {string} usersCollectionID - The Firestore collection name for the user docs.
 * @throws Will throw an error if PSI update fails.
 */
export async function updatePSI(cid: string, usersCollectionID: string): Promise<void> {
  try {
    const psi = await calculatePSIForUser(cid, usersCollectionID);
    const totalPSI = await calculateTotalPSIForUser(cid, usersCollectionID);

    const userGeneralAssetRef = admin
      .firestore()
      .collection(usersCollectionID)
      .doc(cid)
      .collection(config.ASSETS_SUBCOLLECTION)
      .doc(config.ASSETS_GENERAL_DOC_ID);

    await userGeneralAssetRef.update({ psi, totalPSI });

    const userDocRef = admin.firestore().collection(usersCollectionID).doc(cid);
    await userDocRef.update({ 
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: "System" 
    });

    const usersCollectionRef = admin.firestore().collection(usersCollectionID);
    const parentUsersSnapshot = await usersCollectionRef
      .where("connectedUsers", "array-contains", cid)
      .get();

    const updatePromises = parentUsersSnapshot.docs.map(async (doc) => {
      const parentUserCID = doc.id;
      const parentUserTotalPSI = await calculateTotalPSIForUser(parentUserCID, usersCollectionID);

      const parentUserGeneralAssetRef = admin
        .firestore()
        .collection(usersCollectionID)
        .doc(parentUserCID)
        .collection(config.ASSETS_SUBCOLLECTION)
        .doc(config.ASSETS_GENERAL_DOC_ID);

      await parentUserGeneralAssetRef.update({ totalPSI: parentUserTotalPSI });

      const parentUserDocRef = admin.firestore().collection(usersCollectionID).doc(parentUserCID);
      await parentUserDocRef.update({ 
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: "System" 
      });
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error updating PSI:", error);
    throw error;
  }
}
