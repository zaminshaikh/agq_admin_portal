/**
 * @file index.ts
 * @description Main entry point for Firebase Functions. Imports and re-exports
 *              all triggers, callable, and scheduled functions for deployment.
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK once here
admin.initializeApp();

// ======= TRIGGERS =======
import { handleActivity, onActivityWrite } from "./triggers/activityTriggers";
import { onAssetUpdate } from "./triggers/assetTriggers";
import { onConnectedUsersChange } from "./triggers/connectedUsersTriggers";
import { onUserLinkStatusChange } from "./triggers/userLinkTriggers";
import { handleStorageDocumentUpload } from "./triggers/documentTriggers";

// ======= SCHEDULED =======
import { scheduledYTDReset } from "./scheduled/scheduledReset";
import { processScheduledActivities } from "./scheduled/scheduledActivities";

// ======= CALLABLE =======
import { linkNewUser } from "./callable/linkUser";
import { isUIDLinked, checkDocumentExists, checkDocumentLinked } from "./callable/checkDocsAndUID";
import { unlinkUser } from "./callable/unlinkUser";
import { calculateTotalYTD, calculateYTD } from "./callable/ytd";
import { checkUIDExists } from "./callable/checkUIDExists";

// ======= ADMIN MANAGEMENT =======
import { createAdminAccount } from "./admin/createAdminAccount";
import { updateAdminPermissions } from "./admin/updateAdminPermissions";
import { getAllAdmins } from "./admin/getAllAdmins";
import { deleteAdmin } from "./admin/deleteAdmin";

export {
  // ======= TRIGGERS =======
  handleActivity,
  onActivityWrite,
  onAssetUpdate,
  onConnectedUsersChange,
  onUserLinkStatusChange,
  handleStorageDocumentUpload,

  // ======= SCHEDULED =======
  scheduledYTDReset,
  processScheduledActivities,

  // ======= CALLABLE =======
  linkNewUser,
  isUIDLinked,
  checkDocumentExists,
  checkDocumentLinked,
  unlinkUser,
  calculateTotalYTD,
  calculateYTD,
  checkUIDExists,

  // ======= ADMIN MANAGEMENT =======
  createAdminAccount,
  updateAdminPermissions,
  getAllAdmins,
  deleteAdmin,
}