import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { checkAdminPermission } from "../helpers/adminPermissions";

/**
 * Retrieves all admin accounts with their permission levels from custom claims
 * Requires 'admin' level permissions
 */
export const getAllAdmins = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    // PERMISSION GATE: Require admin privileges
    checkAdminPermission(context, 'admin');

    try {
      // Get all admin documents
      const adminsSnapshot = await admin.firestore()
        .collection('admins')
        .get();

      const admins = [];

      for (const doc of adminsSnapshot.docs) {
        const adminData = doc.data();
        
        // Get user's custom claims to get permissions
        let permissions = 'none';
        try {
          const userRecord = await admin.auth().getUser(doc.id);
          permissions = userRecord.customClaims?.adminPermissions || 'none';
        } catch (error) {
          console.warn(`Could not get permissions for admin ${doc.id}:`, error);
          // If we can't get the user record, they might have been deleted from Auth
          permissions = 'none';
        }

        // Convert Firestore Timestamps to JavaScript Date objects
        const createdAt = adminData.createdAt?.toDate ? adminData.createdAt.toDate() : (adminData.createdAt ? new Date(adminData.createdAt) : null);
        const updatedAt = adminData.updatedAt?.toDate ? adminData.updatedAt.toDate() : (adminData.updatedAt ? new Date(adminData.updatedAt) : null);

        admins.push({
          id: doc.id,
          name: adminData.name,
          email: adminData.email,
          permissions,
          createdAt: createdAt?.toISOString() || null,
          updatedAt: updatedAt?.toISOString() || null,
          updatedBy: adminData.updatedBy
        });
      }

      console.log(`Retrieved ${admins.length} admin accounts`);

      return { success: true, admins };

    } catch (error) {
      console.error('Error getting all admins:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', 'Failed to retrieve admin list');
    }
  }
);
