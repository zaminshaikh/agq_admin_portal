/**
 * @file adminLinkUser.ts
 * @description Admin-only callable that links a Firebase Auth UID to an existing
 *              client document (identified by "cid"). This mirrors the logic of
 *              the mobile app's linkNewUser call so an administrator can finish
 *              the linking process manually when the mobile app's API call
 *              failed (leaving the user with a Firebase Auth account but no
 *              linked client record).
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { checkAdminPermission, getAdminNameByUid } from "../helpers/adminPermissions";
import { addUidToConnectedUsers } from "../helpers/addUidToConnectedUsers";
import config from "../../config.json";

interface AdminLinkUserData {
  uid: string;
  cid: string;
  markEmailVerified?: boolean;
}

/**
 * Callable: adminLinkUser
 *
 * Links the given Firebase Auth UID to the client document with the given
 * CID. Pulls the user's email from Firebase Auth, updates the Firestore
 * document (setting uid, email, appEmail, linked), and grants access to the
 * client's connected users. Emulates what the mobile app's linkNewUser
 * callable is supposed to do, but callable by an admin instead of the user.
 *
 * Requires admin-level permissions.
 */
export const adminLinkUser = functions.https.onCall(
  async (data: AdminLinkUserData, context: functions.https.CallableContext) => {
    checkAdminPermission(context, "admin");

    const { uid, cid, markEmailVerified } = data || ({} as AdminLinkUserData);
    if (!uid || !cid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        'Both "uid" and "cid" are required.'
      );
    }

    const usersCollectionID = config.FIRESTORE_ACTIVE_USERS_COLLECTION;

    // Verify the Auth user exists and fetch their email
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

    const email = authUser.email ?? "";

    // Optionally mark the auth account as verified — useful when the admin is
    // vouching for an account whose owner never clicked the verification email.
    if (markEmailVerified && !authUser.emailVerified) {
      try {
        await admin.auth().updateUser(uid, { emailVerified: true });
        console.log(`Marked uid ${uid} as email-verified by admin ${context.auth!.uid}`);
      } catch (verifyError) {
        console.error("Failed to mark email as verified:", verifyError);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to mark the Firebase account as email-verified."
        );
      }
    }

    const firestore = admin.firestore();
    const usersCollection = firestore.collection(usersCollectionID);
    const userRef = usersCollection.doc(cid);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Client document not found for cid: ${cid}`
      );
    }

    const existingData = userSnapshot.data() || {};

    // Block double-linking the same client document
    if (existingData.uid && existingData.uid !== "" && existingData.uid !== uid) {
      throw new functions.https.HttpsError(
        "already-exists",
        `Client ${cid} is already linked to a different UID.`
      );
    }

    // Ensure this UID isn't already linked to a different client document
    const existingLinkSnap = await usersCollection.where("uid", "==", uid).get();
    for (const docSnap of existingLinkSnap.docs) {
      if (docSnap.id !== cid) {
        throw new functions.https.HttpsError(
          "already-exists",
          `UID ${uid} is already linked to client ${docSnap.id}.`
        );
      }
    }

    const updatedBy = await getAdminNameByUid(context.auth!.uid);

    await userRef.set(
      {
        ...existingData,
        uid,
        email,
        appEmail: email,
        linked: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy,
      },
      { merge: true }
    );

    const connectedUsers: string[] = existingData.connectedUsers || [];
    await addUidToConnectedUsers(connectedUsers, uid, usersCollection);

    console.log(
      `Admin ${context.auth!.uid} (${updatedBy}) linked auth uid ${uid} to client ${cid}`
    );

    return {
      success: true,
      message: `Linked UID ${uid} to client ${cid}.`,
      email,
      emailVerified: markEmailVerified ? true : authUser.emailVerified,
    };
  }
);
