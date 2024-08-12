import * as v1 from "firebase-functions/v1";
import config from "../../config.json";
import {Timestamp} from "firebase-admin/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const messaging = admin.messaging();
const db = admin.firestore();

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

const path = `/${config.FIRESTORE_ACTIVE_USERS_COLLECTION}/{userId}/notifications/{notificationId}`;

export const sendNotif = v1.firestore.document(path)
  .onCreate(async (snapshot, context) => {
    try {
        const notification = snapshot.data() as Notification;

        const {userId} = context.params;

        // Fetch the user's document
        const userDoc = await db.collection(config.FIRESTORE_ACTIVE_USERS_COLLECTION).doc(userId).get();

        if (!userDoc.exists) {
            console.error(`User document with ID ${userId} does not exist.`);
            throw new Error("User document not found");
        }

        const userData = userDoc.data();
        const fcmToken = userData?.fcmToken;

        if (!fcmToken) {
            console.error(`FCM token for user with ID ${userId} not found.`);
            throw new Error("FCM token not found");
        }

        const message = {
            token: fcmToken,
            notification: {
                title: notification.title,
                body: notification.body,
            },
        };

        const response = messaging.send(message);
        return response;
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error("Notification failed to send");
    }
  });
