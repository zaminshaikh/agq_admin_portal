/**
 * @file verifyUserEmail.ts
 * @description Callable functions for reading and setting a Firebase Auth user's emailVerified flag.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

/**
 * Callable: getUserEmailVerified
 *
 * @description Returns whether the Firebase Auth user with the given UID has a verified email.
 *
 * @param {Object} data
 * @param {string} data.uid - The Firebase Auth UID to inspect.
 * @returns {Promise<{ emailVerified: boolean }>}
 */
export const getUserEmailVerified = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be called while authenticated.");
  }

  const { uid } = data;
  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", 'Requires a non-empty "uid".');
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    return { emailVerified: userRecord.emailVerified === true };
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      throw new functions.https.HttpsError("not-found", `No Auth user found for uid: ${uid}`);
    }
    console.error("Error getting email verification status:", error);
    throw new functions.https.HttpsError("internal", "Failed to get email verification status.");
  }
});

/**
 * Callable: verifyUserEmail
 *
 * @description Marks the Firebase Auth user's email as verified if it is not already.
 *
 * @param {Object} data
 * @param {string} data.uid - The Firebase Auth UID to verify.
 * @returns {Promise<{ success: boolean; alreadyVerified: boolean }>}
 */
export const verifyUserEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be called while authenticated.");
  }

  const { uid } = data;
  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", 'Requires a non-empty "uid".');
  }

  try {
    const userRecord = await admin.auth().getUser(uid);

    if (userRecord.emailVerified) {
      return { success: true, alreadyVerified: true };
    }

    await admin.auth().updateUser(uid, { emailVerified: true });
    console.log(`Marked email verified for uid ${uid}`);

    return { success: true, alreadyVerified: false };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    if (error.code === "auth/user-not-found") {
      throw new functions.https.HttpsError("not-found", `No Auth user found for uid: ${uid}`);
    }
    console.error("Error verifying user email:", error);
    throw new functions.https.HttpsError("internal", "Failed to verify user email.");
  }
});
