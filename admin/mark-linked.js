const admin = require('firebase-admin');
const path = require('path');

// Path to the service account key file
const serviceAccountPath = path.join(__dirname, 'team-shaikh-service-account.json');
const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const USERS_COLLECTION = 'users'; // from config.FIRESTORE_ACTIVE_USERS_COLLECTION

/**
 * Updates all user documents in the specified collection with a "linked" field
 * based on whether the document has a non-empty uid (source of truth).
 */
async function updateLinkedStatus() {
  console.log(`Starting linked status update for all users in collection '${USERS_COLLECTION}'`);

  // Get all user documents
  const usersSnapshot = await db.collection(USERS_COLLECTION).get();
  console.log(`Found ${usersSnapshot.size} users to process`);

  const userPromises = usersSnapshot.docs.map(async (userDoc) => {
    const cid = userDoc.id;
    const userData = userDoc.data();
    console.log(`Processing user CID: ${cid}`);

    const isLinked = !!(userData.uid && String(userData.uid).trim() !== '');

    // Update the document with the linked field
    await userDoc.ref.update({
      linked: isLinked
    });

    console.log(`Updated user ${cid} linked status to ${isLinked}`);
    return { cid, linked: isLinked };
  });

  // Wait for all updates to complete
  const results = await Promise.all(userPromises);

  // Log summary
  const linkedCount = results.filter(r => r.linked).length;
  console.log(`Update complete. ${linkedCount} of ${results.length} users are linked.`);
}

// Execute the function
updateLinkedStatus()
  .then(() => {
    console.log('Linked status update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error updating linked status:', error);
    process.exit(1);
  });
