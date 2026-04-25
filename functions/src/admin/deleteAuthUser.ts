/**
 * @file deleteAuthUser.ts
 * @description Admin-only callable that deletes a Firebase Auth user.
 *              Intended for cleaning up abandoned sign-up accounts (e.g. an
 *              unverified email that was never linked to a client). Refuses to
 *              delete UIDs that are currently linked to a client document or
 *              that belong to an admin account, since those should be removed
 *              through the normal unlink / admin-management flows instead.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { checkAdminPermission } from "../helpers/adminPermissions";
import config from "../../config.json";

interface DeleteAuthUserData {
  uid: string;
}

export const deleteAuthUser = functions.https.onCall(
  async (data: DeleteAuthUserData, context: functions.https.CallableContext) => {
    checkAdminPermission(context, "admin");

    const { uid } = data || ({} as DeleteAuthUserData);
    if (!uid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        '"uid" is required.'
      );
    }

    if (context.auth?.uid === uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You cannot delete your own Firebase Auth account from here."
      );
    }

    const firestore = admin.firestore();

    // Refuse if this UID is linked to a client document.
    const linkedClientSnap = await firestore
      .collection(config.FIRESTORE_ACTIVE_USERS_COLLECTION)
      .where("uid", "==", uid)
      .limit(1)
      .get();
    if (!linkedClientSnap.empty) {
      const linkedDoc = linkedClientSnap.docs[0];
      throw new functions.https.HttpsError(
        "failed-precondition",
        `UID ${uid} is linked to client ${linkedDoc.id}. Unlink the client first.`
      );
    }

    // Refuse if this UID is an admin.
    const adminDoc = await firestore.collection("admins").doc(uid).get();
    if (adminDoc.exists) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `UID ${uid} belongs to an admin account. Use Admin Management to remove it.`
      );
    }

    try {
      await admin.auth().deleteUser(uid);
      console.log(`Admin ${context.auth!.uid} deleted Firebase Auth uid ${uid}`);
      return { success: true, message: `Deleted Firebase Auth user ${uid}.` };
    } catch (error: any) {
      if (error?.code === "auth/user-not-found") {
        // Already gone — treat as success so the table refresh just removes it.
        return { success: true, message: `Auth user ${uid} no longer exists.` };
      }
      console.error("Error deleting auth user:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to delete Firebase Auth user."
      );
    }
  }
);
