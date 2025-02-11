/**
 * @file checkDocsAndUID.ts
 * @description Provides callable functions to:
 *   1) Check if a Firestore document exists.
 *   2) Check if a Firestore document is linked (i.e., has a non-empty uid).
 *   3) Check if a given Auth UID is currently linked to any user doc in the specified collection.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

/**
 * Callable: checkDocumentExists
 *
 * @description Checks if a Firestore doc with the given `cid` exists within `usersCollectionID`.
 *
 * @param {Object} data - The payload from the client.
 * @param {string} data.cid - The document ID to check.
 * @param {string} data.usersCollectionID - The Firestore collection name.
 * @returns {Promise<{ exists: boolean }>}
 * @throws {functions.https.HttpsError} If any validation or retrieval error occurs.
 */
export const checkDocumentExists = functions.https.onCall(async (data, context) => {
  const { cid, usersCollectionID } = data;
  if (!cid || !usersCollectionID) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      'Must provide "cid" and "usersCollectionID".'
    );
  }

  try {
    const docSnapshot = await admin.firestore().collection(usersCollectionID).doc(cid).get();
    return { exists: docSnapshot.exists };
  } catch (error) {
    console.error("Error checking document existence:", error);
    throw new functions.https.HttpsError("unknown", "Failed to check document existence", error);
  }
});

/**
 * Callable: checkDocumentLinked
 *
 * @description Determines if a Firestore doc (specified by `cid`) has a non-empty UID field,
 *              indicating it's already linked to an Auth user.
 *
 * @param {Object} data - The payload from client.
 * @param {string} data.cid - The Firestore document ID.
 * @param {string} data.usersCollectionID - The user collection name/path.
 * @returns {Promise<{ isLinked: boolean }>}
 * @throws {functions.https.HttpsError} If any validation or retrieval error occurs.
 */
export const checkDocumentLinked = functions.https.onCall(async (data, context) => {
  const { cid, usersCollectionID } = data;
  if (!cid || !usersCollectionID) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      'Must provide "cid" and "usersCollectionID".'
    );
  }

  try {
    const docSnapshot = await admin.firestore().collection(usersCollectionID).doc(cid).get();
    const docData = docSnapshot.data();
    const uid = docData?.uid;
    const isLinked = !!(docSnapshot.exists && uid && uid !== "" && uid !== null);

    return { isLinked };
  } catch (error) {
    console.error("Error checking document link:", error);
    throw new functions.https.HttpsError("unknown", "Failed to check link status", error);
  }
});

/**
 * Callable: isUIDLinked
 *
 * @description Checks whether the provided Auth UID is linked to any user document
 *              in the specified Firestore collection (i.e., a doc with `uid` = provided UID).
 *
 * @param {Object} data - The payload from the client.
 * @param {string} data.uid - The Auth UID to check for.
 * @param {string} data.usersCollectionID - The Firestore collection where user docs reside.
 * @returns {Promise<{ isLinked: boolean }>} - Whether or not the UID is found in that collection.
 * @throws {functions.https.HttpsError} If any validation or retrieval error occurs.
 */
export const isUIDLinked = functions.https.onCall(async (data, context) => {
  const { uid, usersCollectionID } = data;
  if (!uid || !usersCollectionID) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      'Requires "uid" and "usersCollectionID".'
    );
  }

  try {
    const userSnapshot = await admin
      .firestore()
      .collection(usersCollectionID)
      .where("uid", "==", uid)
      .get();

    const isLinked = !userSnapshot.empty;
    return { isLinked };
  } catch (error) {
    console.error("Error checking UID link:", error);
    throw new functions.https.HttpsError("unknown", "Failed to check UID link", error);
  }
});