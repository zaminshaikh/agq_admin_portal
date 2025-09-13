import * as functions from "firebase-functions/v1";

export type AdminPermission = 'none' | 'read' | 'write' | 'admin';

/**
 * Check if the authenticated user has the required admin permission
 * Throws an HttpsError if permission is insufficient
 */
export function checkAdminPermission(
  context: functions.https.CallableContext, 
  requiredPermission: AdminPermission
): void {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  // Get user's admin permissions from custom claims
  const userPermissions = context.auth.token.adminPermissions as AdminPermission;

  // If user has no permissions or 'none', deny access
  if (!userPermissions || userPermissions === 'none') {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Admin access denied. Please contact an administrator for access.'
    );
  }

  // Check specific permission requirements
  switch (requiredPermission) {
    case 'admin':
      if (userPermissions !== 'admin') {
        throw new functions.https.HttpsError(
          'permission-denied', 
          'Admin privileges required for this operation'
        );
      }
      break;

    case 'write':
      if (!['write', 'admin'].includes(userPermissions)) {
        throw new functions.https.HttpsError(
          'permission-denied', 
          'Write privileges required for this operation'
        );
      }
      break;

    case 'read':
      if (!['read', 'write', 'admin'].includes(userPermissions)) {
        throw new functions.https.HttpsError(
          'permission-denied', 
          'Read privileges required for this operation'
        );
      }
      break;

    case 'none':
      // No permission required
      break;

    default:
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Invalid permission level specified'
      );
  }
}

/**
 * Get the user's current admin permission level
 */
export function getUserPermission(context: functions.https.CallableContext): AdminPermission {
  if (!context.auth) {
    return 'none';
  }

  return (context.auth.token.adminPermissions as AdminPermission) || 'none';
}

/**
 * Check if user has at least the specified permission level
 */
export function hasPermission(
  context: functions.https.CallableContext, 
  requiredPermission: AdminPermission
): boolean {
  try {
    checkAdminPermission(context, requiredPermission);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate admin permission level string
 */
export function isValidPermission(permission: string): permission is AdminPermission {
  return ['none', 'read', 'write', 'admin'].includes(permission);
}

/**
 * Get admin name from Firestore document by UID
 */
export async function getAdminNameByUid(uid: string): Promise<string> {
  const admin = await import('firebase-admin');
  
  try {
    const adminDoc = await admin.firestore()
      .collection('admins')
      .doc(uid)
      .get();
    
    if (adminDoc.exists) {
      return adminDoc.data()?.name || 'Unknown Admin';
    }
    return 'Unknown Admin';
  } catch (error) {
    console.warn(`Could not fetch admin name for UID ${uid}:`, error);
    return 'Unknown Admin';
  }
}
