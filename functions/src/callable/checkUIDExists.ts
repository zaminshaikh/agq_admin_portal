import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

/**
 * Checks if a given UID exists in Firebase Authentication
 * 
 * @param data.uid - The user ID to check
 * @returns Object containing whether the user exists and optionally user info
 */
export const checkUIDExists = functions.https.onCall(
  async (data, context) : Promise<boolean | { exists: boolean }> =>  {
    try {
      // Validate the input
      if (!data.uid || typeof data.uid !== "string") {
        throw new functions.https.HttpsError(
          "invalid-argument", 
          "UID must be a non-empty string."
        );
      }

      // Try to get the user from Firebase Auth
      try {
        const userRecord = await admin.auth().getUser(data.uid);
        if (!userRecord) {
          return false;
        }
        return true;
      } catch (error: any) {
        // If the error is because the user doesn't exist, return exists: false
        if (error.code === 'auth/user-not-found') {
          return false;
        }
        
        // For other errors, throw a proper HTTP error
        throw new functions.https.HttpsError(
          "internal",
          "Error checking user existence."
        );
      }
    } catch (error) {
      console.error("Error in checkUIDExists:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Unexpected error occurred."
      );
    }
  }
);