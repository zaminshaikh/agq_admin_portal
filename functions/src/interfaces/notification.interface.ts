/**
 * @file notification.interface.ts
 * @description Defines the structure of the `Notification` interface used to store and send push notifications.
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * @interface Notification
 * 
 * Represents a notification record stored in Firestore and displayed in-app. 
 * Used to send push notifications to a user’s device and store a record for in-app display.
 *
 * @property {string} activityId - The ID referencing the associated activity in Firestore.
 * @property {string} recipient - The identifier or name of the user that should receive the notification.
 * @property {string} title - The headline/title for the notification.
 * @property {string} body - The body text for the notification.
 * @property {string} message - A concatenated string message that might combine title/body or hold full text details.
 * @property {boolean} isRead - Indicates if the user has already read/dismissed the notification.
 * @property {string} type - The category of notification, e.g. 'activity' or system-specific type.
 * @property {Date | Timestamp} time - Timestamp or Date of when the notification is created/triggered.
 */
export interface Notification {
  activityId: string;
  recipient: string;
  title: string;
  body: string;
  message: string;
  isRead: boolean;
  type: string;
  time: Date | Timestamp;
}