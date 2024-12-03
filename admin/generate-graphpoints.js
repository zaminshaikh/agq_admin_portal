const admin = require("firebase-admin");
const path = require("path");

// Path to the service account key file
const serviceAccountPath = path.join(__dirname, 'team-shaikh-service-account.json');
const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Generates graphpoints for all users in the specified collection.
 * Utilizes Promise.all to process multiple users in parallel for enhanced performance.
 *
 * @param {string} usersCollectionName - The name of the users collection.
 */
async function generateGraphpoints(usersCollectionName) {
  console.log(`Starting graphpoints generation for collection '${usersCollectionName}'`);

  const usersRef = db.collection(usersCollectionName);
  
  try {
    const usersSnapshot = await usersRef.get();
    console.log(`Found ${usersSnapshot.size} users in collection '${usersCollectionName}'`);

    // Process all users in parallel
    const userPromises = usersSnapshot.docs.map(async (userDoc) => {
      const cid = userDoc.id;
      console.log(`Processing user CID: ${cid}`);

      const userRef = usersRef.doc(cid);
      const activitiesRef = userRef.collection('activities');
      const graphpointsRef = userRef.collection('graphpoints');

      // Clear existing graphpoints
      try {
        const existingGraphpoints = await graphpointsRef.get();
        if (!existingGraphpoints.empty) {
          const deletePromises = existingGraphpoints.docs.map(doc => {
            console.log(`Deleting graphpoint ID: ${doc.id} for user CID: ${cid}`);
            return doc.ref.delete();
          });
          await Promise.all(deletePromises);
          console.log(`Cleared existing graphpoints for user CID: ${cid}`);
        } else {
          console.log(`No existing graphpoints found for user CID: ${cid}`);
        }
      } catch (deleteError) {
        console.error(`Error clearing graphpoints for user CID: ${cid}:`, deleteError);
        throw deleteError;
      }

      // Retrieve activities sorted by time
      let activitiesSnapshot;
      try {
        activitiesSnapshot = await activitiesRef.orderBy('time').get();
        console.log(`Retrieved ${activitiesSnapshot.size} activities for user CID: ${cid}`);
      } catch (activitiesError) {
        console.error(`Error retrieving activities for user CID: ${cid}:`, activitiesError);
        throw activitiesError;
      }

      let cumulativeBalance = 0;
      const accountBalances = {};

      // Process activities sequentially to maintain balance integrity
      for (const activityDoc of activitiesSnapshot.docs) {
        const activity = activityDoc.data();

        if (
          activity.type === 'deposit' ||
          activity.type === 'withdrawal' ||
          activity.recipient.includes('IRA')
        ) {
          const cashflow = activity.amount * (activity.type === 'withdrawal' ? -1 : 1);
          const time = activity.time;
          const account = activity.recipient;

          // Update cumulative balance
          cumulativeBalance += cashflow;

          // Update account-specific balance
          if (!accountBalances[account]) {
            accountBalances[account] = 0;
          }
          accountBalances[account] += cashflow;

          // Prepare graphpoints
          const cumulativeGraphpoint = {
            account: 'cumulative',
            amount: cumulativeBalance,
            cashflow: cashflow,
            time: time,
          };

          const accountGraphpoint = {
            account: account,
            amount: accountBalances[account],
            cashflow: cashflow,
            time: time,
          };

          // Add graphpoints
          try {
            await graphpointsRef.add(cumulativeGraphpoint);
            console.log(`Added cumulative graphpoint for user CID: ${cid} at time: ${time.toDate()}`);

            await graphpointsRef.add(accountGraphpoint);
            console.log(`Added graphpoint for account '${account}' for user CID: ${cid} at time: ${time.toDate()}`);
          } catch (addError) {
            console.error(`Error adding graphpoints for user CID: ${cid}:`, addError);
            throw addError;
          }
        }
      }

      console.log(`Completed graphpoints generation for user CID: ${cid}`);
    });

    // Wait for all users to be processed
    await Promise.all(userPromises);
    console.log(`Successfully generated graphpoints for all users in collection '${usersCollectionName}'`);
  } catch (error) {
    console.error(`Error generating graphpoints for collection '${usersCollectionName}':`, error);
    throw error;
  }
}

// Example usage
const usersCollectionName = 'playground2'; // Replace with your actual users collection name
generateGraphpoints(usersCollectionName)
  .then(() => {
    console.log('Graphpoints generation completed successfully');
    process.exit(0); // Exit successfully
  })
  .catch(error => {
    console.error('Graphpoints generation failed:', error);
    process.exit(1); // Exit with failure
  });