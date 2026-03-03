const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'team-shaikh-service-account.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Calculates Profit Since Inception (PSI) for a single user.
 * Sums all AGQ profit/income activities across all time (no date filter).
 */
async function calculatePSIForUser(userCid, usersCollectionID) {
  const activitiesRef = db.collection(`/${usersCollectionID}/${userCid}/activities`);
  const snapshot = await activitiesRef
    .where("fund", "==", "AGQ")
    .where("type", "in", ["profit", "income"])
    .get();

  let psiTotal = 0;
  snapshot.forEach((doc) => {
    const activity = doc.data();
    psiTotal += activity.amount;
  });

  return psiTotal;
}

/**
 * Calculates total PSI for a user including all connected (linked) users.
 */
async function calculateTotalPSIForUser(cid, usersCollectionID) {
  const processedUsers = new Set();
  const userQueue = [cid];
  let totalPSI = 0;

  while (userQueue.length > 0) {
    const currentUserCid = userQueue.shift();

    if (currentUserCid && !processedUsers.has(currentUserCid)) {
      processedUsers.add(currentUserCid);

      const psi = await calculatePSIForUser(currentUserCid, usersCollectionID);
      totalPSI += psi;

      const userDoc = await db.collection(usersCollectionID).doc(currentUserCid).get();
      const userData = userDoc.data();

      if (userData && userData.connectedUsers) {
        userQueue.push(...userData.connectedUsers);
      }
    }
  }

  return totalPSI;
}

/**
 * Updates psi and totalPSI for all users in the specified collection.
 *
 * @param {string} usersCollectionID - The name of the users collection.
 */
async function updateAllUsersPSI(usersCollectionID) {
  console.log(`Starting PSI update for all users in collection '${usersCollectionID}'`);

  const usersRef = db.collection(usersCollectionID);

  try {
    const usersSnapshot = await usersRef.get();
    console.log(`Found ${usersSnapshot.size} users in collection '${usersCollectionID}'`);

    for (const userDoc of usersSnapshot.docs) {
      const cid = userDoc.id;
      console.log(`Processing PSI update for user CID: ${cid}`);

      try {
        const psi = await calculatePSIForUser(cid, usersCollectionID);
        const totalPSI = await calculateTotalPSIForUser(cid, usersCollectionID);

        const userGeneralAssetRef = db
          .collection(usersCollectionID)
          .doc(cid)
          .collection('assets')
          .doc('general');
        await userGeneralAssetRef.update({ psi, totalPSI });

        console.log(`  PSI: ${psi}, Total PSI: ${totalPSI}`);
      } catch (error) {
        console.error(`Error updating PSI for user CID: ${cid}:`, error);
      }
    }

    console.log(`Successfully updated PSI for all users in collection '${usersCollectionID}'`);
  } catch (error) {
    console.error(`Error updating PSI for collection '${usersCollectionID}':`, error);
    throw error;
  }
}

const usersCollectionID = 'users';
updateAllUsersPSI(usersCollectionID)
  .then(() => {
    console.log('PSI update completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('PSI update failed:', error);
    process.exit(1);
  });
