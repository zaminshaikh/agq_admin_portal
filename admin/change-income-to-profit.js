const admin = require("firebase-admin");
const path = require("path");

// Path to the service account key file
const serviceAccountPath = path.join(__dirname, 'team-shaikh-service-account.json');
const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const changeIncomeToProfit = (async () => {
    try {
        const snapshot = await admin
            .firestore()
            .collectionGroup('activities')
            .where('type', '==', 'income')
            .get();

        const batch = admin.firestore().batch();
        snapshot.forEach((doc) => {
            batch.update(doc.ref, { type: 'profit' });
        });

        await batch.commit();
    } catch (error) {
        console.error('Error updating documents: ', error);
    }
});

changeIncomeToProfit();