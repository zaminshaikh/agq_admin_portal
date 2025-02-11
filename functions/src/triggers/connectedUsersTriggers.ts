/**
 * @file connectedUsersTrigger.ts
 * @description Contains a Firestore trigger for user documents that automatically
 *              manages the `uidGrantedAccess` array whenever `connectedUsers` changes.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { addUidToConnectedUsers } from "../helpers/addUidToConnectedUsers";

/**
 * Trigger: onUpdate of a user's main doc. When `connectedUsers` changes, we add/remove
 * the current user's UID from the connected users' `uidGrantedAccess` array.
 */
export const onConnectedUsersChange = functions.firestore
  .document("{userCollection}/{userId}")
  .onUpdate(async (change, context) => {
    const userCollection = context.params.userCollection;
    const userId = context.params.userId;

    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Extract arrays (or default to empty)
    const beforeConnectedUsers = beforeData.connectedUsers || [];
    const afterConnectedUsers = afterData.connectedUsers || [];

    // If no difference, do nothing
    if (JSON.stringify(beforeConnectedUsers) === JSON.stringify(afterConnectedUsers)) {
      return null;
    }

    // Identify newly added or removed users
    const addedConnectedUsers = afterConnectedUsers.filter((id: string) => !beforeConnectedUsers.includes(id));
    const removedConnectedUsers = beforeConnectedUsers.filter((id: string) => !afterConnectedUsers.includes(id));

    const db = admin.firestore();
    const currentUserUid = afterData.uid;

    if (!currentUserUid) {
      console.log(`User ${userId} does not have a 'uid'. Skipping.`);
      return null;
    }

    const usersRef = db.collection(userCollection);

    // For each newly added connected user, add currentUserUid to their uidGrantedAccess
    const addPromises = addedConnectedUsers.map(async (connectedUserId: string) => {
      const connectedUserRef = usersRef.doc(connectedUserId);
      const connectedUserDoc = await connectedUserRef.get();

      if (!connectedUserDoc.exists) {
        console.log(`Connected user ${connectedUserId} does not exist. Skipping.`);
        return;
      }

      addUidToConnectedUsers([connectedUserId], currentUserUid, usersRef);
    });

    // For each removed connected user, remove currentUserUid from their uidGrantedAccess
    const removePromises = removedConnectedUsers.map(async (connectedUserId: string) => {
      const connectedUserRef = usersRef.doc(connectedUserId);
      const connectedUserDoc = await connectedUserRef.get();

      if (!connectedUserDoc.exists) {
        console.log(`Connected user ${connectedUserId} does not exist. Skipping.`);
        return;
      }

      const connectedUserData = connectedUserDoc.data() || {};
      let uidGrantedAccess: string[] = connectedUserData.uidGrantedAccess || [];
      if (uidGrantedAccess.includes(currentUserUid)) {
        uidGrantedAccess = uidGrantedAccess.filter((uid) => uid !== currentUserUid);
        await connectedUserRef.update({ uidGrantedAccess });
        console.log(`Removed ${currentUserUid} from uidGrantedAccess of ${connectedUserId}`);
      }
    });

    // Wait for all
    await Promise.all([...addPromises, ...removePromises]);

    console.log("Successfully updated uidGrantedAccess arrays.");
    return null;
  });