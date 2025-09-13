import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { checkAdminPermission, AdminPermission, isValidPermission, getAdminNameByUid } from "../helpers/adminPermissions";

interface UpdateAdminPermissionsData {
  adminId: string;
  permissions: AdminPermission;
}

/**
 * Updates admin permissions via Firebase Auth custom claims
 * Requires 'admin' level permissions
 */
export const updateAdminPermissions = functions.https.onCall(
  async (data: UpdateAdminPermissionsData, context: functions.https.CallableContext) => {
    // PERMISSION GATE: Require admin privileges
    checkAdminPermission(context, 'admin');

    const { adminId, permissions } = data;

    // Validate input
    if (!adminId || !permissions) {
      throw new functions.https.HttpsError('invalid-argument', 'Admin ID and permissions are required');
    }

    if (!isValidPermission(permissions)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid permission level');
    }

    // Prevent self-demotion (admin can't remove their own admin privileges)
    if (context.auth!.uid === adminId && permissions !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Cannot modify your own admin privileges');
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

      // Update Firebase Auth custom claims
      await admin.auth().setCustomUserClaims(adminId, { 
        adminPermissions: permissions 
      });

      // Get the current admin's name from Firestore
      const updatedByName = await getAdminNameByUid(context.auth!.uid);

      // Update admin document timestamp and updatedBy
      await admin.firestore()
        .collection('admins')
        .doc(adminId)
        .update({
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: updatedByName
        });

      console.log(`Admin permissions updated: ${adminId} -> ${permissions} by ${updatedByName}`);

      return { 
        success: true,
        message: `Admin permissions updated to '${permissions}' successfully`
      };

    } catch (error) {
      console.error('Error updating admin permissions:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', 'Failed to update admin permissions');
    }
  }
);
