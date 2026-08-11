/**
 * @file adminVerifyUserEmail.ts
 * @description Admin-only callables for reading and setting a Firebase Auth
 *              user's emailVerified flag. Used from the edit-client modal so an
 *              administrator can mark a linked user's email as verified without
 *              requiring the user to click a verification link.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { checkAdminPermission, getAdminNameByUid } from "../helpers/adminPermissions";

interface AdminUidData {
  uid: string;
}

/**
 * Callable: adminGetAuthEmailStatus
 *
 * Returns whether the given Firebase Auth user's email is verified.
 * Requires admin-level permissions.
 */
export const adminGetAuthEmailStatus = functions.https.onCall(
  async (data: AdminUidData, context: functions.https.CallableContext) => {
    checkAdminPermission(context, "admin");

    const { uid } = data || ({} as AdminUidData);
    if (!uid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        '"uid" is required.'
      );
    }

    let authUser: admin.auth.UserRecord;
    try {
      authUser = await admin.auth().getUser(uid);
    } catch (error: any) {
      if (error?.code === "auth/user-not-found") {
        throw new functions.https.HttpsError(
          "not-found",
          `No Firebase Auth user found for uid: ${uid}`
        );
      }
      console.error("Error looking up auth user:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to look up Firebase Auth user"
      );
    }

    return {
      success: true,
      uid: authUser.uid,
      email: authUser.email ?? null,
      emailVerified: authUser.emailVerified,
    };
  }
);

/**
 * Callable: adminVerifyUserEmail
 *
 * Sets emailVerified=true on the given Firebase Auth user via the Admin SDK.
 * Idempotent when the email is already verified.
 * Requires admin-level permissions.
 */
export const adminVerifyUserEmail = functions.https.onCall(
  async (data: AdminUidData, context: functions.https.CallableContext) => {
    checkAdminPermission(context, "admin");

    const { uid } = data || ({} as AdminUidData);
    if (!uid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        '"uid" is required.'
      );
    }

    let authUser: admin.auth.UserRecord;
    try {
      authUser = await admin.auth().getUser(uid);
    } catch (error: any) {
      if (error?.code === "auth/user-not-found") {
        throw new functions.https.HttpsError(
          "not-found",
          `No Firebase Auth user found for uid: ${uid}`
        );
      }
      console.error("Error looking up auth user:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to look up Firebase Auth user"
      );
    }

    if (authUser.emailVerified) {
      return {
        success: true,
        uid: authUser.uid,
        email: authUser.email ?? null,
        emailVerified: true,
        alreadyVerified: true,
        message: "Email was already verified.",
      };
    }

    try {
      authUser = await admin.auth().updateUser(uid, { emailVerified: true });
    } catch (error) {
      console.error("Error verifying auth user email:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to verify Firebase Auth user email"
      );
    }

    const updatedBy = await getAdminNameByUid(context.auth!.uid);
    console.log(
      `Admin ${context.auth!.uid} (${updatedBy}) verified email for uid ${uid}`
    );

    return {
      success: true,
      uid: authUser.uid,
      email: authUser.email ?? null,
      emailVerified: true,
      alreadyVerified: false,
      message: `Verified email for UID ${uid}.`,
    };
  }
);
