/**
 * @file listAuthUsers.ts
 * @description Admin-only callable function that lists all Firebase Auth users along
 *              with whether they are currently linked to a client document in
 *              Firestore. Used to diagnose and resolve cases where an auth user
 *              was created during mobile sign-up but the corresponding client
 *              link call never succeeded.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { checkAdminPermission } from "../helpers/adminPermissions";
import config from "../../config.json";

interface AuthUserSummary {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  providerIds: string[];
  disabled: boolean;
  emailVerified: boolean;
  creationTime: string | null;
  lastSignInTime: string | null;
  linkedCid: string | null;
  linkedClientName: string | null;
  isAdmin: boolean;
}

/**
 * Callable: listAuthUsers
 *
 * Returns every user in Firebase Authentication along with metadata indicating
 * whether that UID is already linked to a client document in the configured
 * users collection, or belongs to an admin account.
 *
 * Requires admin-level permissions.
 */
export const listAuthUsers = functions.https.onCall(
  async (_data: unknown, context: functions.https.CallableContext) => {
    checkAdminPermission(context, "admin");

    try {
      const usersCollectionID = config.FIRESTORE_ACTIVE_USERS_COLLECTION;
      const firestore = admin.firestore();

      // Build a lookup from uid -> client document info for all linked clients.
      // We fetch the full collection and filter in memory because some docs may
      // not have the `uid` field at all, which a Firestore != query cannot match.
      const linkedUidToClient = new Map<string, { cid: string; name: string }>();
      const clientsSnapshot = await firestore.collection(usersCollectionID).get();

      for (const docSnap of clientsSnapshot.docs) {
        const data = docSnap.data() || {};
        const uid: string | undefined = data.uid;
        if (!uid || uid === "") continue;
        const first = data?.name?.first ?? "";
        const last = data?.name?.last ?? "";
        const company = data?.name?.company ?? "";
        const displayName = [first, last].filter(Boolean).join(" ") || company || "";
        linkedUidToClient.set(uid, { cid: docSnap.id, name: displayName });
      }

      // Collect admin UIDs so we can flag them in the UI
      const adminUids = new Set<string>();
      const adminsSnapshot = await firestore.collection("admins").get();
      for (const docSnap of adminsSnapshot.docs) {
        adminUids.add(docSnap.id);
      }

      // Page through all Firebase Auth users (Admin SDK returns up to 1000 per call)
      const users: AuthUserSummary[] = [];
      let pageToken: string | undefined = undefined;
      do {
        const result = await admin.auth().listUsers(1000, pageToken);
        for (const user of result.users) {
          const linked = linkedUidToClient.get(user.uid);
          users.push({
            uid: user.uid,
            email: user.email ?? null,
            displayName: user.displayName ?? null,
            phoneNumber: user.phoneNumber ?? null,
            providerIds: user.providerData.map((p) => p.providerId),
            disabled: user.disabled,
            emailVerified: user.emailVerified,
            creationTime: user.metadata?.creationTime ?? null,
            lastSignInTime: user.metadata?.lastSignInTime ?? null,
            linkedCid: linked?.cid ?? null,
            linkedClientName: linked?.name ?? null,
            isAdmin: adminUids.has(user.uid),
          });
        }
        pageToken = result.pageToken;
      } while (pageToken);

      return { success: true, users };
    } catch (error) {
      console.error("Error listing auth users:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to list Firebase Auth users"
      );
    }
  }
);
