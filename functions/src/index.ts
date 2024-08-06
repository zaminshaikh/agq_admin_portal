/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import {onRequest} from "firebase-functions/v2/https";
import * as v2 from "firebase-functions/v1";   
// import * as logger from "firebase-functions/logger";
import config from '../../config.json'
import { Timestamp } from "firebase-admin/firestore";
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

export const helloWorld = v2.firestore.document(`${config.FIRESTORE_ACTIVE_USERS_COLLECTION}/{userId}/notifications/{notificationId}`)
    .onCreate( async snapshot => {
        // const data = snapshot.data() as Notification;
        const fcmToken =  "fzPD9rBAXEJHjUpjljmJ6c:APA91bGmSFAZwNB5IdUZM9KTSOX4El9hHQ1y6ZbXuyOwXL1s7FWCCXZf_SHd8txUDM_-BTsKjm0Rw0sCimPtcfCIs5cHuH6qJrwNmSjm4tU5YSEM7-SGRPJqyEA_t2r6X8uloW1Vvyjo"
        const message = {
            token: fcmToken,
            notification: {
                title: 'New Activity',
                body: "TEST",
            },
        };
        await messaging.send(message);
    });