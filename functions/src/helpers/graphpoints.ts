/**
 * @file graphpoints.ts
 * @description Provides helper functions to generate and update "graphpoints"
 *              data based on deposit/withdrawal/dividend activities, enabling
 *              graphical charts in the client application.
 */

import * as admin from "firebase-admin";
import config from "../../config.json";
import { Activity } from "../interfaces/activity.interface";

const db = admin.firestore();

/**
 * Rebuilds the "graphpoints" subcollection for a given user. It:
 * 1. Clears existing graphpoints.
 * 2. Iterates through all relevant activities (deposit/withdrawal/isDividend).
 * 3. Creates "cumulative" and "account-specific" graphpoints.
 *
 * @async
 * @function updateGraphpoints
 * @param {string} userCollection - The parent collection containing the user doc (e.g. 'testUsers').
 * @param {string} userId - The specific user doc ID.
 * @returns {Promise<void>} Resolves once the graphpoints are fully updated.
 */
export async function updateGraphpoints(userCollection: string, userId: string): Promise<void> {
  const userRef = db.collection(userCollection).doc(userId);
  const activitiesRef = userRef.collection(config.ACTIVITIES_SUBCOLLECTION);
  const graphpointsRef = userRef.collection(config.GRAPHPOINTS_SUBCOLLECTION);

  // Step 1: Clear existing graphpoints
  const existingGraphpoints = await graphpointsRef.get();
  const deletePromises = existingGraphpoints.docs.map((doc) => doc.ref.delete());
  await Promise.all(deletePromises);

  // Retrieve user's name to interpret "Personal" accounts
  const userDoc = await userRef.get();
  const userData = userDoc.data() || {};
  const fullName = userData.name ? `${userData.name.first} ${userData.name.last}` : null;

  // Step 2: Retrieve all activities in chronological order
  const activitiesSnapshot = await activitiesRef.orderBy("time").get();

  // We'll maintain a map of fund => {cumulativeBalance, accountBalances: {...}}
  const fundsMap: Record<string, { cumulativeBalance: number; accountBalances: Record<string, number> }> = {};

  // Step 3: Generate new graphpoints from deposit/withdrawal/isDividend activities
  for (const activityDoc of activitiesSnapshot.docs) {
    const activity = activityDoc.data() as Activity;

    // We only build chart data from deposit/withdrawals or dividends
    if (["deposit", "withdrawal"].includes(activity.type) || activity.isDividend) {
      const cashflow = activity.amount * (activity.type === "withdrawal" ? -1 : 1);
      const time = activity.time;
      const fund = activity.fund || "Unspecified";

      let accountName = activity.recipient;
      // If the recipient is exactly the user's "fullName," standardize to "Personal"
      if (fullName && accountName === fullName) {
        accountName = "Personal";
      }

      // Initialize data structure for the fund if missing
      if (!fundsMap[fund]) {
        fundsMap[fund] = {
          cumulativeBalance: 0,
          accountBalances: {},
        };
      }

      // Initialize data structure for the specific account if missing
      if (!fundsMap[fund].accountBalances[accountName]) {
        fundsMap[fund].accountBalances[accountName] = 0;
      }

      // Update balances
      fundsMap[fund].cumulativeBalance += cashflow;
      fundsMap[fund].accountBalances[accountName] += cashflow;

      // Construct two separate graphpoints:

      // 1) "Cumulative" graphpoint: overall fund-level balance
      const cumulativeGraphpoint = {
        account: "Cumulative",
        amount: fundsMap[fund].cumulativeBalance,
        cashflow,
        time,
        fund,
      };

      // 2) "Account-specific" graphpoint
      const accountGraphpoint = {
        account: accountName,
        amount: fundsMap[fund].accountBalances[accountName],
        cashflow,
        time,
        fund,
      };

      // Add each to Firestore
      await graphpointsRef.add(cumulativeGraphpoint);
      await graphpointsRef.add(accountGraphpoint);
    }
  }
}