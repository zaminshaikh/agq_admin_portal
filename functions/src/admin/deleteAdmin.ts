import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { checkAdminPermission, getAdminNameByUid } from "../helpers/adminPermissions";

interface DeleteAdminData {
  adminId: string;
}

/**
 * Deletes an admin account and removes all permissions
 * Requires 'admin' level permissions
 */
export const deleteAdmin = functions.https.onCall(
  async (data: DeleteAdminData, context: functions.https.CallableContext) => {
    // PERMISSION GATE: Require admin privileges
    checkAdminPermission(context, 'admin');

    const { adminId } = data;

    if (!adminId) {
      throw new functions.https.HttpsError('invalid-argument', 'Admin ID is required');
    }

    // Prevent self-deletion
    if (context.auth!.uid === adminId) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot delete your own admin account');
    }

    try {
      // Verify the target admin exists
      const adminDoc = await admin.firestore()
        .collection('admins')
        .doc(adminId)
        .get();

      if (!adminDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Admin account not found');
      }

      // Remove custom claims (revoke all permissions)
      await admin.auth().setCustomUserClaims(adminId, null);

      // Delete admin document
      await admin.firestore()
        .collection('admins')
        .doc(adminId)
        .delete();

      // Get the current admin's name for logging
      const deletedByName = await getAdminNameByUid(context.auth!.uid);
      console.log(`Admin account deleted: ${adminId} by ${deletedByName}`);

      return { 
        success: true,
        message: 'Admin account deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting admin:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', 'Failed to delete admin account');
    }
  }
);
