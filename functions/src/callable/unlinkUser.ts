/**
 * @file unlinkUser.ts
 * @description Contains callable functions for unlinking a user from Firebase Auth and 
 *              clearing their associated Firestore doc fields.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

/**
 * Callable: unlinkUser
 * 
 * @description Clears the user's `uid` and `appEmail` in Firestore, then deletes the user from Firebase Auth.
 *
 * @param {Object} data - The payload from client side.
 * @param {string} data.uid - The Firebase Auth UID to delete.
 * @param {string} data.cid - The Firestore doc ID referencing the user’s record.
 * @param {string} data.usersCollectionID - The user collection in Firestore.
 * @returns {Promise<{ success: boolean; message: string }>} 
 *          Object indicating success and a descriptive message.
 */
export const unlinkUser = functions.https.onCall(async (data, context) => {
  const { uid, cid, usersCollectionID } = data;
  if (!uid || !cid || !usersCollectionID) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      'Requires "uid", "cid", and "usersCollectionID".'
    );
  }

  try {
    const userRef = admin.firestore().collection(usersCollectionID).doc(cid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", `No user doc found for cid: ${cid}`);
    }

    // Clear Firestore fields
    await userRef.update({ appEmail: "", uid: "", linked: false});
    console.log(`Cleared Firestore fields for cid ${cid}`);

    // Delete from Firebase Auth
    await admin.auth().deleteUser(uid);
    console.log(`Deleted Auth user with uid ${uid}`);

    return { success: true, message: `User with uid ${uid} and cid ${cid} unlinked.` };
  } catch (error) {
    console.error("Error unlinking user:", error);
    throw new functions.https.HttpsError("unknown", "Failed to unlink user", error);
  }
});