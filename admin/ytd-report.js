const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

// Initialize if not already done elsewhere
try {
  admin.initializeApp();
} catch (error) {
  // Already initialized
}

(async function generateYTDReport2024() {
  const db = admin.firestore();
  const startOf2024 = new Date(2024, 0, 1);
  const endOf2024 = new Date(2024, 11, 31, 23, 59, 59);

  let csvLines = ["FirstName,LastName,Recipient,TotalProfit"];

  try {
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const firstName = userData.name?.first || '';
      const lastName = userData.name?.last || '';

      // Query activities of type 'profit' in 2024
      const activitiesRef = db
        .collection('users')
        .doc(userId)
        .collection('activities');
      const querySnapshot = await activitiesRef
        .where('type', '==', 'profit')
        .where('time', '>=', Timestamp.fromDate(startOf2024))
        .where('time', '<=', Timestamp.fromDate(endOf2024))
        .get();

      let totalProfit2024ByAccount = {};
      querySnapshot.forEach((activityDoc) => {
        const activityData = activityDoc.data();
        totalProfit2024ByAccount[activityData.recipient] += activityData.amount || 0;
      });

      for (const [recipient, total] of Object.entries(totalProfit2024ByAccount)) {
        csvLines.push(`${firstName},${lastName},${recipient},${total}`);
      }
    }

    console.log(csvLines.join("\n"));
    process.exit(0);
  } catch (error) {
    console.error('Error generating YTD report:', error);
    process.exit(1);
  }
})();