import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import config from "../../config.json";
import { sendNotif } from "../helpers/notifications";

/**
 * Trigger: onFinalize for a new Firebase Storage object.
 *
 * @description When a new file is uploaded to a path matching {usersCollection}/{cid}/{fileName},
 * this function:
 *  1) Creates a notification document in Firestore for the user.
 *  2) Sends an FCM push notification to the user's registered devices.
 */
export const handleStorageDocumentUpload = functions.storage
  .bucket("team-shaikh-app-52dc5.appspot.com") // Corrected bucket name
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name; // File path in the bucket e.g., users/someUserId/file.jpg
    const contentType = object.contentType; // Type of file e.g. 'image/jpeg'

    // Exit if this is a folder creation event or if filePath is undefined.
    // Storage triggers onFinalize for folder creation with contentType 'application/octet-stream' and path ending with '/'
    if (!filePath || (contentType === "application/octet-stream" && filePath.endsWith("/"))) {
      console.log(
        `Exiting: filePath is '${filePath}', contentType is '${contentType}'. This might be a folder placeholder or an invalid event.`
      );
      return null;
    }

    // Parse usersCollection and cid from the filePath.
    // Expected path structure: {usersCollection}/{cid}/{fileName} or {usersCollection}/{cid}/path/to/{fileName}
    const pathParts = filePath.split("/");
    if (pathParts.length < 3) {
      console.log(
        `File path "${filePath}" does not match expected structure "{usersCollection}/{cid}/{fileName...}". Expected at least 3 parts.`
      );
      return null;
    }

    const usersCollection = pathParts[0];
    const cid = pathParts[1];
    const fileName = pathParts.slice(2).join("/");

    // Optional: Prevent notifications for specific user collections (e.g., test environments)
    if (["backup", "playground", "playground2", "testUsers"].includes(usersCollection)) {
      console.log(`Skipping notification for userCollection: ${usersCollection} due to environment/testing rules.`);
      return null;
    }

    try {
      const userRef = admin.firestore().doc(`${usersCollection}/${cid}`);
      
      // Check if the user document actually exists before proceeding
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        console.log(`User document not found at ${usersCollection}/${cid}. Skipping notification.`);
        return null;
      }

      const notificationsCollectionRef = userRef.collection(
        config.NOTIFICATIONS_SUBCOLLECTION
      );

      const title = "New Document";
      const body = `A new document "${fileName}" has been uploaded to your account. Navigate to the Documents section to view it.`;
      const message = body; // Using the same content for the 'message' field

      const notificationData = {
        title,
        body,
        message,
        isRead: false,
        type: "document", // A distinct type for this kind of notification
        time: admin.firestore.FieldValue.serverTimestamp(),
        filePath: filePath, // Optionally store the path to the uploaded file
      };

      // 1. Create a notification document in Firestore
      const notificationRef = await notificationsCollectionRef.add(notificationData);
      console.log(
        `Notification document created (ID: ${notificationRef.id}) for ${usersCollection}/${cid} regarding file: ${fileName}`
      );

      // 2. Send FCM push notification
      await sendNotif(title, body, userRef);
      console.log(
        `Push notification attempt for ${usersCollection}/${cid} regarding file: ${fileName}`
      );

      return null;
    } catch (error) {
      console.error(
        `Error handling file upload notification for "${filePath}" (user: ${usersCollection}/${cid}):`,
        error
      );
      // Depending on the function's retry policy, you might want to re-throw the error
      // or return a specific value to manage retries. For now, just logging.
      return null;
    }
  });
