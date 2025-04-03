import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

/**
 * Firestore trigger that runs when a user document is updated
 * and the uid or uidGrantedAccess fields have changed.
 * Updates the 'linked' field based on whether any UIDs are valid.
 */
export const onUserLinkStatusChange = functions.firestore
  .document(`{userCollectionId}/{userId}`)
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;

    // Check if uid or uidGrantedAccess fields changed
    const uidChanged = before.uid !== after.uid;
    const uidGrantedAccessChanged = JSON.stringify(before.uidGrantedAccess || []) !== 
                                   JSON.stringify(after.uidGrantedAccess || []);
    
    // Only proceed if relevant fields changed
    if (!uidChanged && !uidGrantedAccessChanged) {
      console.log(`No relevant changes for user ${userId}`);
      return null;
    }

    console.log(`Processing uid/uidGrantedAccess changes for user ${userId}`);
    
    // Check primary UID
    const primaryUid = after.uid || '';
    let isPrimaryUidValid = false;
    
    if (primaryUid && primaryUid.trim() !== '') {
      try {
        await admin.auth().getUser(primaryUid);
        isPrimaryUidValid = true;
        console.log(`Primary UID ${primaryUid} is valid for user ${userId}`);
      } catch (error) {
        console.log(`Primary UID ${primaryUid} is invalid for user ${userId}`);
      }
    }

    // Check granted access UIDs
    const uidGrantedAccess = after.uidGrantedAccess || [];
    let hasValidGrantedUID = false;
    
    for (const uid of uidGrantedAccess) {
      if (!uid) continue;
      
      try {
        await admin.auth().getUser(uid);
        hasValidGrantedUID = true;
        console.log(`Granted UID ${uid} is valid for user ${userId}`);
        break; // Stop checking after finding one valid UID
      } catch (error) {
        console.log(`Granted UID ${uid} is invalid for user ${userId}`);
      }
    }
    
    // Determine linked status
    const isLinked = isPrimaryUidValid || hasValidGrantedUID;
    
    // Only update if linked status is different
    if (after.linked === isLinked) {
      console.log(`Linked status already correctly set to ${isLinked} for user ${userId}`);
      return null;
    }
    
    // Update the linked field
    console.log(`Updating linked status to ${isLinked} for user ${userId}`);
    return change.after.ref.update({ linked: isLinked });
  });