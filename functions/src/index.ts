import * as v2 from "firebase-functions/v1";
import config from "../../config.json";
import {Timestamp} from "firebase-admin/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const messaging = admin.messaging();

export interface Notification {
    activityId: string;
    recipient: string;
    message: string;
    isRead: boolean;
    type: string;
    time: Date | Timestamp;
}

export const sendNotif = v2.firestore.document(`${config.FIRESTORE_ACTIVE_USERS_COLLECTION}/{userId}/notifications/{notificationId}`)
  .onCreate(async (snapshot) => {
    const fcmToken = config.FCM;
    const message = {
      token: fcmToken,
      notification: {
        title: "New Activity",
        body: "TEST",
      },
    };
    return await messaging.send(message);
});
