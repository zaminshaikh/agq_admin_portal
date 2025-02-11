/**
 * @file activity.interface.ts
 * @description Defines the structure of the `Activity` interface used throughout the application.
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * @interface Activity
 * 
 * Represents an "activity" record in the system, e.g. a deposit, withdrawal,
 * profit distribution, or any manually created transaction.
 * 
 * @property {number} amount - The numeric amount involved in this activity (e.g., deposit/withdrawal sum).
 * @property {string} fund - The name or identifier of the fund associated with this activity (e.g., 'AGQ', 'AK1').
 * @property {string} recipient - The display name or identifier of the account that receives (or from which it withdraws) the funds.
 * @property {Date | Timestamp} time - The date/time at which the activity occurred. Can be a JS Date or Firestore Timestamp.
 * @property {string} [formattedTime] - (Optional) A human-readable string representation of the time.
 * @property {string} type - The type of activity (e.g. 'deposit', 'withdrawal', 'profit', 'income').
 * @property {boolean} [isDividend] - (Optional) Indicates if this activity is a dividend (true) or not (false).
 * @property {boolean} [sendNotif] - (Optional) Whether to trigger a push notification upon creation of this activity.
 */
export interface Activity {
  amount: number;
  fund: string;
  recipient: string;
  time: Date | Timestamp;
  formattedTime?: string;
  type: string;
  isDividend?: boolean;
  sendNotif?: boolean;
}