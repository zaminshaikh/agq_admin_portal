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

interface UnlinkedClientSummary {
  cid: string;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
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

      // Single pass over the clients collection to build both:
      // 1. A uid -> client lookup for already-linked clients.
      // 2. The list of unlinked clients (sent back so the page doesn't have to
      //    issue a second, heavier client fetch on the frontend).
      const linkedUidToClient = new Map<string, { cid: string; name: string }>();
      const unlinkedClients: UnlinkedClientSummary[] = [];
      const clientsSnapshot = await firestore.collection(usersCollectionID).get();

      for (const docSnap of clientsSnapshot.docs) {
        const data = docSnap.data() || {};
        const first: string = data?.name?.first ?? "";
        const last: string = data?.name?.last ?? "";
        const company: string = data?.name?.company ?? "";
        const displayName = [first, last].filter(Boolean).join(" ") || company || "";
        const uid: string | undefined = data.uid;

        if (uid && uid !== "") {
          linkedUidToClient.set(uid, { cid: docSnap.id, name: displayName });
        } else {
          unlinkedClients.push({
            cid: docSnap.id,
            firstName: first,
            lastName: last,
            companyName: company,
            email: data?.initEmail ?? data?.email ?? "",
          });
        }
      }

      unlinkedClients.sort((a, b) => {
        const an = `${a.firstName} ${a.lastName} ${a.companyName}`.toLowerCase();
        const bn = `${b.firstName} ${b.lastName} ${b.companyName}`.toLowerCase();
        return an.localeCompare(bn);
      });

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

      return { success: true, users, unlinkedClients };
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
