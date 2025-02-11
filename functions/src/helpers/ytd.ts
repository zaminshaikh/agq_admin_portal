/**
 * @file ytd.ts
 * @description Contains helper functions for calculating and updating Year-To-Date (YTD)
 *              earnings for both individual users and their connected (linked) users.
 */

import * as admin from "firebase-admin";
import config from "../../lib/config.json";
import { Activity } from "../interfaces/activity.interface";

/**
 * Calculates the Year-To-Date (YTD) total for a single user, filtering only certain
 * activity types (e.g., 'profit' or 'income' within the 'AGQ' fund).
 *
 * @async
 * @function calculateYTDForUser
 * @param {string} userCid - The Firestore document ID for the target user.
 * @param {string} usersCollectionID - The collection in which the user doc resides (e.g., 'testUsers').
 * @returns {Promise<number>} The numeric total YTD amount for the specified user.
 */
export async function calculateYTDForUser(userCid: string, usersCollectionID: string): Promise<number> {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear + 1, 0, 1);

  // Reference to the user's "activities" subcollection
  const activitiesRef = admin
    .firestore()
    .collection(`/${usersCollectionID}/${userCid}/${config.ACTIVITIES_SUBCOLLECTION}`);

  // Query for relevant activities that fall within YTD range
  const snapshot = await activitiesRef
    .where("fund", "==", "AGQ")
    .where("type", "in", ["profit", "income"])
    .where("time", ">=", startOfYear)
    .where("time", "<=", endOfYear)
    .get();

  let ytdTotal = 0;
  snapshot.forEach((doc) => {
    const activity = doc.data() as Activity;
    ytdTotal += activity.amount;
  });

  return ytdTotal;
}

/**
 * Calculates the total YTD for a user by also including all connected (linked) users.
 * 
 * This function iterates through each user and any users in its `connectedUsers` array,
 * summing the results of `calculateYTDForUser`.
 *
 * @async
 * @function calculateTotalYTDForUser
 * @param {string} cid - The Firestore document ID of the base user.
 * @param {string} usersCollectionID - The name of the Firestore collection (e.g., 'testUsers').
 * @returns {Promise<number>} The combined YTD of the user and all connected users.
 */
export async function calculateTotalYTDForUser(cid: string, usersCollectionID: string): Promise<number> {
  const processedUsers: Set<string> = new Set();
  const userQueue: string[] = [cid];
  let totalYTD = 0;

  // BFS or queue-based approach to traverse connectedUsers
  while (userQueue.length > 0) {
    const currentUserCid = userQueue.shift();
    if (currentUserCid && !processedUsers.has(currentUserCid)) {
      processedUsers.add(currentUserCid);

      // Calculate the individual's YTD
      const ytd = await calculateYTDForUser(currentUserCid, usersCollectionID);
      totalYTD += ytd;

      // Retrieve doc to find further connected users
      const userDoc = await admin.firestore().collection(usersCollectionID).doc(currentUserCid).get();
      const userData = userDoc.data();

      // If this user has connectedUsers, add them to the queue
      if (userData && userData.connectedUsers) {
        const connectedUsers = userData.connectedUsers as string[];
        userQueue.push(...connectedUsers);
      }
    }
  }

  return totalYTD;
}

/**
 * Updates both the direct user's YTD/totalYTD and any parent/connected users'
 * totalYTD references.
 * 
 * This function:
 * 1. Calculates YTD and totalYTD for the user.
 * 2. Updates the user's 'assets/general' doc.
 * 3. Finds all users that have this user in their `connectedUsers` array and updates their totalYTD.
 *
 * @async
 * @function updateYTD
 * @param {string} cid - The Firestore doc ID of the base user.
 * @param {string} usersCollectionID - The Firestore collection name for the user docs.
 * @throws Will throw an error if YTD update fails.
 */
export async function updateYTD(cid: string, usersCollectionID: string): Promise<void> {
  try {
    // 1. Calculate the base user’s YTD + totalYTD
    const ytd = await calculateYTDForUser(cid, usersCollectionID);
    const totalYTD = await calculateTotalYTDForUser(cid, usersCollectionID);

    // 2. Update the user’s general doc in the assets subcollection
    const userGeneralAssetRef = admin
      .firestore()
      .collection(usersCollectionID)
      .doc(cid)
      .collection(config.ASSETS_SUBCOLLECTION)
      .doc(config.ASSETS_GENERAL_DOC_ID);

    await userGeneralAssetRef.update({ ytd, totalYTD });

    // 3. Find all parent users (those who have 'cid' in their connectedUsers array)
    const usersCollectionRef = admin.firestore().collection(usersCollectionID);
    const parentUsersSnapshot = await usersCollectionRef
      .where("connectedUsers", "array-contains", cid)
      .get();

    // For each parent user, recalc their totalYTD and update
    const updatePromises = parentUsersSnapshot.docs.map(async (doc) => {
      const parentUserCID = doc.id;
      const parentUserTotalYTD = await calculateTotalYTDForUser(parentUserCID, usersCollectionID);

      const parentUserGeneralAssetRef = admin
        .firestore()
        .collection(usersCollectionID)
        .doc(parentUserCID)
        .collection(config.ASSETS_SUBCOLLECTION)
        .doc(config.ASSETS_GENERAL_DOC_ID);

      await parentUserGeneralAssetRef.update({ totalYTD: parentUserTotalYTD });
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error updating YTD:", error);
    throw error; // Rethrow to ensure error is visible to caller
  }
}