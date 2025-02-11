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

// ======= SCHEDULED =======
import { scheduledYTDReset } from "./scheduled/scheduledReset";
import { processScheduledActivities } from "./scheduled/scheduledActivities";

// ======= CALLABLE =======
import { linkNewUser } from "./callable/linkUser";
import { isUIDLinked, checkDocumentExists, checkDocumentLinked } from "./callable/checkDocsAndUID";
import { unlinkUser } from "./callable/unlinkUser";

// Expose Firestore triggers
export const f_handleActivity = handleActivity;
export const f_onActivityWrite = onActivityWrite;
export const f_onAssetUpdate = onAssetUpdate;
export const f_onConnectedUsersChange = onConnectedUsersChange;

// Expose scheduled tasks
export const f_scheduledYTDReset = scheduledYTDReset;
export const f_processScheduledActivities = processScheduledActivities;

// Expose callable functions
export const f_linkNewUser = linkNewUser;
export const f_checkDocumentExists = checkDocumentExists;
export const f_checkDocumentLinked = checkDocumentLinked;
export const f_unlinkUser = unlinkUser;
export const f_isUIDLinked = isUIDLinked;
