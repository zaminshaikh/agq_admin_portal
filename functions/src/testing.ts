/** Local callable entrypoint. Never exports scheduled jobs or production triggers. */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { databaseId } from './helpers/database';
import { checkAdminPermission } from './helpers/adminPermissions';

if (databaseId !== 'testing') throw new Error('The testing server requires FIRESTORE_DATABASE_ID=testing');
admin.initializeApp({ storageBucket: 'team-shaikh-app-52dc5.appspot.com' });

export { getAppContentForAdmin, saveAppContent, updateAppImage } from './content/appContent';
export { getAllAdmins } from './admin/getAllAdmins';
export { listAuthUsers } from './admin/listAuthUsers';
export { getAumHistory } from './analytics/getAumHistory';

import * as ytd from './callable/ytd';
import * as psi from './callable/psi';
const protectedCalculation = (handler: typeof ytd.calculateYTD) => functions.https.onCall(async (data, context) => {
  checkAdminPermission(context, 'write');
  return handler.run(data, context);
});
export const calculateYTD = protectedCalculation(ytd.calculateYTD);
export const calculateTotalYTD = protectedCalculation(ytd.calculateTotalYTD);
export const calculatePSI = protectedCalculation(psi.calculatePSI);
export const calculateTotalPSI = protectedCalculation(psi.calculateTotalPSI);

// Auth is project-wide. Keep the existing login, but never mutate live accounts
// or send real invitations from the testing database.
const blocked = functions.https.onCall(async (_data, context) => {
  checkAdminPermission(context, 'write');
  throw new functions.https.HttpsError('failed-precondition', 'Authentication changes and email delivery are disabled in the testing environment.');
});
export const createAdminAccount = blocked;
export const updateAdminPermissions = blocked;
export const deleteAdmin = blocked;
export const adminLinkUser = blocked;
export const unlinkUser = blocked;
export const verifyUserEmail = blocked;
export const sendInviteEmail = blocked;
export { getUserEmailVerified } from './callable/verifyUserEmail';

export { getAumReconciliation } from './analytics/getAumReconciliation';
