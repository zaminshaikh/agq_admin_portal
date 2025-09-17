import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

interface CreateAdminAccountData {
  name: string;
  email: string;
}

/**
 * Creates an admin account document after Firebase Auth signup
 * Sets initial permissions to 'none' - requires admin approval
 * This function is called by users who just signed up
 */
export const createAdminAccount = functions.https.onCall(
  async (data: CreateAdminAccountData, context: functions.https.CallableContext) => {
    // This function is called by newly signed up users
    // No permission check needed as they're creating their own account
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { name, email } = data;

    // Validate input
    if (!name || !email) {
      throw new functions.https.HttpsError('invalid-argument', 'Name and email are required');
    }

    // Verify the email matches the authenticated user's email
    if (context.auth.token.email !== email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email must match authenticated user');
    }

    try {
      // Check if admin document already exists
      const existingAdmin = await admin.firestore()
        .collection('admins')
        .doc(context.auth.uid)
        .get();

      if (existingAdmin.exists) {
        throw new functions.https.HttpsError('already-exists', 'Admin account already exists');
      }

      // Create admin document with UID as document ID
      const adminDoc = {
        id: context.auth.uid,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'System'
      };

      // Save to Firestore using UID as document ID
      await admin.firestore()
        .collection('admins')
        .doc(context.auth.uid)
        .set(adminDoc);

      // Set initial custom claims (no permissions - requires approval)
      await admin.auth().setCustomUserClaims(context.auth.uid, { 
        adminPermissions: 'none' 
      });

      console.log(`Admin account created for ${email} (${context.auth.uid})`);

      return { 
        success: true, 
        uid: context.auth.uid,
        message: 'Admin account created. Awaiting permission approval from administrator.'
      };

    } catch (error) {
      console.error('Error creating admin account:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', 'Failed to create admin account');
    }
  }
);
