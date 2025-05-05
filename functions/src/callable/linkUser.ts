/**
 * @file linkUser.ts
 * @description Contains a callable function that links a user’s Auth UID with 
 *              an existing Firestore document (based on a provided "cid").
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { addUidToConnectedUsers } from "../helpers/addUidToConnectedUsers";

/**
 * Callable: linkNewUser
 * 
 * @description Links a Firestore document (identified by "cid") to a newly registered user's
 *              Firebase Auth UID. Updates the doc with the user’s email and uid, and ensures
 *              that all connected users can see this user's data if needed.
 *
 * @param {object} data - The payload from the client. 
 * @param {string} data.email - The user’s email address.
 * @param {string} data.cid - The Firestore document ID representing the user’s record.
 * @param {string} data.uid - The Firebase Auth UID for the user.
 * @param {string} data.usersCollectionID - The name/path of the user collection in Firestore.
 * @param {functions.https.CallableContext} context - Contains authentication and event metadata.
 * @returns {Promise<void>}
 * @throws {functions.https.HttpsError} If arguments are missing or if linking fails.
 */
export const linkNewUser = functions.https.onCall(async (data, context): Promise<void> => {
  // Validate that the caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be called while authenticated.");
  }

  const { email, cid, uid, usersCollectionID } = data;
  if (!email || !cid || !uid || !usersCollectionID) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      'Requires "email", "cid", "uid", and "usersCollectionID".'
    );
  }

  // Reference the correct user document
  const usersCollection = admin.firestore().collection(usersCollectionID);
  const userRef = usersCollection.doc(cid);
  const userSnapshot = await userRef.get();

  // Error if user doc doesn't exist
  if (!userSnapshot.exists) {
    throw new functions.https.HttpsError("not-found", `Document not found for cid: ${cid}`);
  }

  const existingData = userSnapshot.data() || {};
  if (existingData.uid && existingData.uid !== "") {
    // Already has a linked UID
    throw new functions.https.HttpsError("already-exists", `User already exists for cid: ${cid}`);
  }

  // Update doc
  const updatedData = {
    ...existingData,
    uid,
    email,
    appEmail: email,
    linked: true,
  };

  await userRef.set(updatedData);
  console.log(`User ${uid} linked with document ${cid} in Firestore`);

  // Update connected users to ensure they grant access to this new UID
  const connectedUsers: string[] = existingData.connectedUsers || [];
  await addUidToConnectedUsers(connectedUsers, uid, usersCollection);
});