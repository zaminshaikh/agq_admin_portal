import * as functions from "firebase-functions/v1";
import config from "../../config.json";
import {Timestamp} from "firebase-admin/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const messaging = admin.messaging();

interface Notification {
    activityId: string;
    recipient: string;
    title: string;
    body: string;
    message: string;
    isRead: boolean;
    type: string;
    time: Date | Timestamp;
}

interface Activity {
    amount: number;
    fund: string;
    recipient: string;
    time: Date | Timestamp;
    formattedTime?: string;
    type: string;
    isDividend?: boolean;
    sendNotif?: boolean;
}

// const path = `/${config.FIRESTORE_ACTIVE_USERS_COLLECTION}/{userId}/notifications/{notificationId}`;

// export const sendNotif = v1.firestore.document(path)
//   .onCreate(async (snapshot, context) => {
//     try {
//         const notification = snapshot.data() as Notification;

//         const {userId} = context.params;

//         // Fetch the user's document
//         const userDoc = await db.collection(config.FIRESTORE_ACTIVE_USERS_COLLECTION).doc(userId).get();

//         if (!userDoc.exists) {
//             console.error(`User document with ID ${userId} does not exist.`);
//             throw new Error("User document not found");
//         }

//         const userData = userDoc.data();
//         const fcmToken = userData?.fcmToken;

//         if (!fcmToken) {
//             console.error(`FCM token for user with ID ${userId} not found.`);
//             throw new Error("FCM token not found");
//         }

//         const message = {
//             token: fcmToken,
//             notification: {
//                 title: notification.title,
//                 body: notification.body,
//             },
//         };

//         const response = messaging.send(message);
//         return response;
//     } catch (error) {
//       console.error("Error sending message:", error);
//       throw new Error("Notification failed to send");
//     }
//   });

/**
 * Generates a notification message based on the activity type.
 * @param {Activity} activity - The activity data.
 * @return {string} The notification message.
 */
function getActivityMessage(activity: Activity): string {
    let message: string;
    switch (activity.type) {
        case 'withdrawal':
            message = `New Withdrawal: ${activity.fund} Fund has withdrawn $${activity.amount} from your account. View the Activity section for more details.`;
            break;
        case 'profit':
            message = `New Profit: ${activity.fund} Fund has posted the latest returns from ${activity.recipient}'s investment. View the Activity section for more details.`;
            break;
        case 'deposit':
            message = `New Deposit: ${activity.fund} Fund has deposited $${activity.amount} into your account. View the Activity section for more details.`;
            break;
        case 'manual-entry':
            message = `New Manual Entry: ${activity.fund} Fund has made a manual entry of $${activity.amount} into your account. View the Activity section for more details.`;
            break;
        default:
            message = 'New Activity: A new activity has been created. View the Activity section for more details.';
    }
    return message;
}

const activityPath = `/${config.FIRESTORE_ACTIVE_USERS_COLLECTION}/{userId}/${config.ACTIVITIES_SUBCOLLECTION}/{activityId}`;

/**
 * Creates a notification document in Firestore.
 * @param {Activity} activity - The activity object containing details for the notification.
 * @param {string} cid - The user ID to whom the notification will be sent.
 * @param {string} activityId - The unique ID of the activity.
 * @return {Promise<{title: string, body: string, userRef: FirebaseFirestore.DocumentReference}>} The notification details and user reference.
 */
async function createNotif(activity: Activity, cid: string, activityId: string): Promise<{ title: string; body: string; userRef: FirebaseFirestore.DocumentReference; }> {
    const userRef = admin.firestore().doc(`${config.FIRESTORE_ACTIVE_USERS_COLLECTION}/${cid}`);
    const notificationsCollectionRef = userRef.collection(config.NOTIFICATIONS_SUBCOLLECTION);
    const message = getActivityMessage(activity);
    const [title, body] = message.split(': ', 2);

    const notification = {
        activityId: activityId,
        recipient: activity.recipient,
        title: title,
        body: body,
        message: message,
        isRead: false,
        type: 'activity',
        time: admin.firestore.FieldValue.serverTimestamp(),
    } as Notification;

    await notificationsCollectionRef.add(notification);
    return {title, body, userRef};
}

/**
 * Sends a notification to the user's device using Firebase Cloud Messaging.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body text of the notification.
 * @param {FirebaseFirestore.DocumentReference} userRef - A reference to the user document.
 * @return {Promise<string>} A promise that resolves with the result of the FCM send operation.
 * @throws {Error} Throws an error if the FCM token is not found.
 */
async function sendNotif(title: string, body: string, userRef: FirebaseFirestore.DocumentReference): Promise<string[]> {
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    if (userData && userData.tokens && Array.isArray(userData.tokens)) {
        const sendPromises = userData.tokens.map((token: string) => {
            const fcmMessage = {
                token: token,
                notification: {
                    title: title,
                    body: body,
                },
            };
            return messaging.send(fcmMessage);
        });
        return Promise.all(sendPromises);
    } else {
        throw new Error('FCM tokens not found');
    }
}

export const handleActivity = functions.firestore.document(activityPath).onCreate(async (snapshot, context) => {
    const activity = snapshot.data() as Activity;
    const {userId, activityId} = context.params;

    if (activity.sendNotif !== true) {
        return null; // Exit if no notification is required
    }

    try {
        const {title, body, userRef} = await createNotif(activity, userId, activityId);
        const result = sendNotif(title, body, userRef);
        return result;
    } catch (error) {
        console.error('Error handling activity:', error);
        throw new functions.https.HttpsError('unknown', 'Failed to handle activity', error);
    }
});

