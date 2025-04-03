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
import { calculateTotalYTD, calculateYTD } from "./callable/ytd";
import { checkUIDExists } from "./callable/checkUIDExists";

import * as functions from "firebase-functions";

export {
  // ======= TRIGGERS =======
  handleActivity,
  onActivityWrite,
  onAssetUpdate,
  onConnectedUsersChange,

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
}

export const helloWorlddd = functions.https.onRequest((req: any, res: { send: (arg0: string) => void; }) => {
  res.send("Hello from Firebase!");
});