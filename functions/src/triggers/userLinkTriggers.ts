import * as functions from "firebase-functions/v1";

/**
 * Firestore trigger that runs when a user document is updated
 * and the uid field has changed.
 * Keeps the 'linked' field in sync with whether a non-empty uid exists.
 * (uid presence is the source of truth; linked is maintained for backfill.)
 */
export const onUserLinkStatusChange = functions.firestore
  .document(`{userCollectionId}/{userId}`)
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;

    const beforeUid = (before.uid || "").trim();
    const afterUid = (after.uid || "").trim();

    // Only proceed when the primary uid changes
    if (beforeUid === afterUid) {
      console.log(`No uid change for user ${userId}`);
      return null;
    }

    const isLinked = afterUid !== "";

    // Only update if linked status is different
    if (after.linked === isLinked) {
      console.log(`Linked status already correctly set to ${isLinked} for user ${userId}`);
      return null;
    }

    console.log(`Updating linked status to ${isLinked} for user ${userId} (uid=${afterUid || "(empty)"})`);
    return change.after.ref.update({ linked: isLinked });
  });
