import * as v1 from "firebase-functions/v1";
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

const path = `/${config.FIRESTORE_ACTIVE_USERS_COLLECTION}/{userId}/notifications/{notificationId}`;

export const sendNotif = v1.firestore.document(path)
  .onCreate(async (snapshot, context) => {
    try {
      const fcmToken = config.FCM;
      const message = {
        token: fcmToken,
        notification: {
          title: "New Activity",
          body: "TEST",
        },
      };
      const response = messaging.send(message);
      return response;
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error("Notification failed to send");
    }
  });
