import * as functions from "firebase-functions/v1";
import config from "../../config.json";
import {Timestamp} from "firebase-admin/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const messaging = admin.messaging();

/**
 * Defines the structure for notification objects.
 * 
 * @param activityId - Unique identifier for the associated activity.
 * @param recipient - Identifier for the recipient of the notification.
 * @param title - Title of the notification.
 * @param body - Body text of the notification.
 * @param message - Complete message of the notification.
 * @param isRead - Boolean indicating if the notification has been read.
 * @param type - Type of notification.
 * @param time - Timestamp of when the notification was created or should be sent.
 */
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

/**
 * Defines the structure for activity objects.
 * 
 * @param amount - Numeric value associated with the activity (e.g., transaction amount).
 * @param fund - Name or identifier of the fund involved in the activity.
 * @param recipient - Identifier for the recipient of the activity.
 * @param time - Timestamp of when the activity occurred.
 * @param formattedTime - Optional formatted string of the time.
 * @param type - Type of activity (e.g., withdrawal, deposit).
 * @param isDividend - Optional boolean to indicate if the activity involves dividends.
 * @param sendNotif - Optional boolean to indicate whether a notification should be sent for this activity.
 */
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

const activityPath = `/${config.FIRESTORE_ACTIVE_USERS_COLLECTION}/{userId}/${config.ACTIVITIES_SUBCOLLECTION}/{activityId}`;

/**
 * Generates a custom message based on the type of activity.
 * 
 * This function constructs a user-friendly message that describes the activity in detail, 
 * which is used for notifications and logging purposes.
 *
 * @param activity - The activity data containing type, fund, amount, and recipient.
 * @return The constructed message as a string.
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


/**
 * Creates a notification document in Firestore based on given activity details.
 * 
 * This function populates a notification object with details provided from an activity,
 * then stores it in Firestore under the specified user's notifications collection.
 *
 * @param activity - The activity object containing details for the notification.
 * @param cid - The Firestore document ID of the user to whom the notification will be sent.
 * @param activityId - The unique ID of the activity, used for tracking.
 * @return A promise that resolves with notification details including title, body, and user reference.
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
 * Sends a notification via Firebase Cloud Messaging (FCM) to a user's device.
 * 
 * This function retrieves FCM tokens from a user's document and sends a notification
 * with a title and body. It handles multiple tokens by sending to all associated devices.
 *
 * @param title - The title of the notification to be sent.
 * @param body - The body content of the notification.
 * @param userRef - A reference to the Firestore document of the user.
 * @return A promise that resolves with the results of the send operations for each FCM token.
 * @throws Error if no FCM tokens are found, indicating the user may not have any registered devices.
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

/**
 * Cloud Firestore Trigger for creating and sending notifications upon new activity creation.
 * 
 * This function listens to a specific path in Firestore for any new documents (activities).
 * If a new activity requires a notification, it processes the activity, creates a notification,
 * and sends it to the relevant user's devices.
 *
 * @param snapshot - The snapshot of the new activity document.
 * @param context - The context of the event, including path parameters.
 * @return A promise resolved with the result of the notification send operation, or null if no notification is sent.
 */
export const handleActivity = functions.firestore.document(activityPath).onCreate(async (snapshot, context): Promise<string[] | null> => {
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

/**
 * Callable function to link a new user's document in Firestore with their authentication UID.
 * 
 * This function updates a user's document to include their UID and email once they register.
 * It ensures data consistency and enables notification functionality.
 *
 * @param data - Contains the email, user document ID (cid), and UID from the client.
 * @param context - Provides authentication and runtime context.
 * @return Logs success messages or errors, with no explicit return value.
 */
export const linkNewUser = functions.https.onCall(async (data, context): Promise<void> => {
    // Ensure authenticated context
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
  
    const { email, cid, uid } = data;
  
    const usersCollection = admin.firestore().collection(config.FIRESTORE_ACTIVE_USERS_COLLECTION);
    const userRef = usersCollection.doc(cid);
    const userSnapshot = await userRef.get();
  
    if (!userSnapshot.exists) {
      throw new functions.https.HttpsError('not-found', `Document does not exist for cid: ${cid}`);
    }
  
    const existingData = userSnapshot.data() as admin.firestore.DocumentData;
  
    // Check if user already exists
    if (existingData.uid && existingData.uid !== '') {
      throw new functions.https.HttpsError('already-exists', `User already exists for cid: ${cid}`);
    }
  
    // Prepare updated data
    const updatedData = {
      ...existingData,
      uid: uid,
      email: email,
      appEmail: email,
    };
  
    // Update the user document
    await userRef.set(updatedData);
  
    console.log(`User ${uid} has been linked with document ${cid} in Firestore`);
  
    const connectedUsers: string[] = existingData.connectedUsers || [];
  
    // Update connected users
    await addUidToConnectedUsers(connectedUsers, uid, usersCollection);
});

/**
 * Helper function to update the access list for connected users.
 * 
 * This function iterates over each connected user for a newly linked user and updates their
 * access control lists to include the new user's UID. This is crucial for sharing data access among related users.
 *
 * @param connectedUsers - Array of document IDs for users who are connected to the new user.
 * @param uid - UID of the newly linked user to be added to others' access control lists.
 * @param usersCollection - Reference to the Firestore collection containing user documents.
 * @return A promise resolved once all updates are completed.
 */
const addUidToConnectedUsers = async (connectedUsers: string[], uid: string, usersCollection: admin.firestore.CollectionReference): Promise<void> => {
    const updatePromises = connectedUsers.map(async (connectedUser) => {
        const connectedUserRef = usersCollection.doc(connectedUser);
        const connectedUserSnapshot = await connectedUserRef.get();

        if (connectedUserSnapshot.exists) {
            const connectedUserData = connectedUserSnapshot.data() as admin.firestore.DocumentData;
            const uidAccessGranted: string[] = connectedUserData.uidAccessGranted || [];

            if (!uidAccessGranted.includes(uid)) {
                uidAccessGranted.push(uid);
                await connectedUserRef.update({ uidAccessGranted });
                console.log(`User ${uid} has been added to uidAccessGranted of connected user ${connectedUser}`);
            }
        } else {
            console.log(`Connected user document ${connectedUser} does not exist`);
        }
    });

    await Promise.all(updatePromises);
};


/**
 * Checks if a document exists in the 'users' collection in Firestore based on a given document ID.
 * 
 * This function is callable, meaning it's designed to be invoked directly from a client application.
 * It requires the client to provide a 'cid' (Client ID) which represents the document ID whose existence is to be verified.
 *
 * @param {Object} data - The data payload passed from the client, which should include the 'cid'.
 * @param {Object} context - The context of the function call, providing authentication and environment details.
 * @returns {Promise<Object>} - A promise that resolves to an object indicating whether the document exists.
 *                              The object has a single property 'exists' which is a boolean.
 * @throws {functions.https.HttpsError} - Throws an 'invalid-argument' error if the 'cid' is not provided or is invalid.
 *                                        Throws an 'unknown' error if there's an unexpected issue during the execution.
 */
exports.checkDocumentExists = functions.https.onCall(async (data, context): Promise<object> => {
    // Extract 'cid' from the data payload; it is expected to be the Firestore document ID.
    const cid = data.cid;

    // Check if 'cid' is provided, if not, throw an 'invalid-argument' error.
    if (!cid) {
      throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one argument "cid".');
    }
  
    try {
      // Attempt to fetch the document by ID from the 'users' collection.
      const docSnapshot = await admin.firestore().collection('users').doc(cid).get();
        
      // Return the existence status of the document as a boolean.
      return { exists: docSnapshot.exists };
    } catch (error) {
      // Log the error and throw a generic 'unknown' error for any unexpected issues.
      console.error('Error checking document existence:', error);
      throw new functions.https.HttpsError('unknown', 'Failed to check document existence', error);
    }
});

/**
 * Checks if a document in the 'users' collection is linked to a user.
 * 
 * This function expects a document ID ('cid') and checks if the corresponding document
 * in the Firestore 'users' collection has a non-empty 'uid' field, indicating a link to a user.
 *
 * @param {Object} data - The data payload from the client, expected to contain the 'cid'.
 * @param {Object} context - The context of the function call, providing environment and authentication details.
 * @returns {Promise<Object>} - A promise that resolves to an object with a boolean property 'isLinked'.
 * @throws {functions.https.HttpsError} - Throws an 'invalid-argument' error if the 'cid' is not provided.
 * @throws {functions.https.HttpsError} - Throws an 'unknown' error for any unexpected issues during execution.
 */
exports.checkDocumentLinked = functions.https.onCall(async (data, context): Promise<object> => {
    // Validate input: ensure 'cid' is provided
    const cid = data.cid;
    if (!cid) {
      throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one argument "cid".');
    }
  
    try {
      // Fetch the document from the 'users' collection using the provided 'cid'
      const docSnapshot = await admin.firestore().collection('users').doc(cid).get();

      // Check if the document exists and the 'uid' field is non-empty
      const docData = docSnapshot.data();
      const isLinked = docSnapshot.exists && docData && docData.uid && docData.uid !== '' && docData.uid !== null;

      // Return the link status
      return { isLinked };
    } catch (error) {
      // Log and throw an 'unknown' error for any unexpected issues
      console.error('Error checking document link status:', error);
      throw new functions.https.HttpsError('unknown', 'Failed to check document link status', error);
    }
});

exports.calculateYTD = functions.https.onCall(async (data, context): Promise<object> => {
    const cid = data.cid;
    if (!cid) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a valid "cid".');
    }

    try {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31);

        const activitiesRef = admin.firestore().collection(`/users/${cid}/activities`);
        const snapshot = await activitiesRef
            .where("fund", "==", "AGQ")
            .where("type", "in", ["profit", "income"])
            .where("time", ">=", startOfYear)
            .where("time", "<=", endOfYear)
            .get();

        let ytdTotal = 0;
        snapshot.forEach((doc) => {
            const activity = doc.data();
            ytdTotal += activity.amount;
        });

        return { ytdTotal };
    } catch (error) {
        console.error("Error calculating YTD:", error);
        throw new functions.https.HttpsError('unknown', 'Failed to calculate YTD due to an unexpected error.', {
            errorDetails: (error as Error).message,
        });
    }
});
