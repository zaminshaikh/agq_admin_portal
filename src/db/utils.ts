import { AssetDetails, Assets, Client } from "./models";

/**
 * Rounds the provided Date instance to the nearest hour.
 *
 * This function evaluates the minutes portion of the given date. If the minutes
 * are 30 or greater, it rounds up to the next hour; otherwise, it keeps the current hour.
 * In both cases, it resets the minutes, seconds, and milliseconds to zero.
 *
 * @param date - The original Date object to round.
 * @returns A new Date object representing the original time rounded to the nearest hour.
 */
export const roundToNearestHour = (date: Date): Date => {
  const minutes = date.getMinutes();
  const roundedDate = new Date(date);
  if (minutes >= 30) {
    roundedDate.setHours(date.getHours() + 1);
  }
  roundedDate.setMinutes(0, 0, 0);
  return roundedDate;
};

/**
 * Formats a number as a currency string.
 *
 * This function takes a number as input and returns a string that represents
 * the number formatted as a currency in US dollars. The formatting is done
 * using the built-in `Intl.NumberFormat` object with 'en-US' locale and 'USD'
 * as the currency.
 *
 * @param amount - The number to be formatted as currency.
 * @returns The formatted currency string.
 *
 * @example
 * ```typescript
 * const amount = 1234.56;
 * const formattedAmount = formatCurrency(amount);
 * ```
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

/**
 * Compares two Client objects and returns an object containing only the assets that have changed.
 * This is useful for tracking what assets have been modified between two states of a client.
 * 
 * @param initialClientState - The original state of the client before changes
 * @param clientState - The current state of the client after changes
 * @returns An Assets object containing only the changed assets, or null if no changes
 */
export const getChangedAssets = (initialClientState: Client | null, clientState?: Client | null) => {
  // Will store only the assets that have changed. Starts as null.
  let changedAssets: Assets | null = null;

  // Only proceed if we have both initial and current client states
  if (initialClientState && clientState) {
      // Loop through each fund (like 'agq', 'ak1') in the current client's assets
      Object.keys(clientState.assets).forEach(fundKey => {
          // Get the fund data from both initial and current states
          // Use empty object as fallback if fund doesn't exist
          const initialFund = initialClientState.assets[fundKey] || {};
          const currentFund = clientState.assets[fundKey] || {};
          
          // Will store changes for this specific fund
          const fundChanges: {[assetType: string]: AssetDetails} = {};
          // Flag to track if this fund has any changes
          let hasChanges = false;
          
          // Loop through each asset type (like 'personal', 'business') in the current fund
          Object.keys(currentFund).forEach(assetType => {
              const initialAsset = initialFund[assetType];
              const currentAsset = currentFund[assetType];
              
              // Check if the asset has changed by comparing all properties at once
              if (!initialAsset || JSON.stringify(initialAsset) !== JSON.stringify(currentAsset)) {
                  fundChanges[assetType] = currentAsset; // Store the current asset details
                  hasChanges = true;
              }
          });
          
          // Only add this fund to changedAssets if it has any changes
          if (hasChanges) {
              // Initialize changedAssets if this is the first change we've found
              if (!changedAssets) {
                  changedAssets = {};
              }
              changedAssets[fundKey] = fundChanges;
          }
      });
  }

  return changedAssets;
}

// Create a utility function to apply asset changes to client state
/**
 * Applies changes to the client's asset state by merging the provided changes
 * into a deep clone of the current client state. This ensures immutability
 * of the original client state.
 *
 * @param clientState - The current state of the client, containing asset information.
 * @param changedAssets - An object representing the changes to be applied to the client's assets.
 *                         The structure of this object should match the nested structure of `clientState.assets`.
 * @returns A new `Client` object with the updated asset state.
 *
 * @remarks
 * - If `changedAssets` is `null` or `undefined`, the function returns the original `clientState`.
 * - The function uses `structuredClone` to create a deep copy of the `clientState` to avoid mutating the original object.
 * - Changes are applied at the fund and asset type levels, adding or updating entries as necessary.
 *
 * @example
 * ```typescript
 * const clientState = {
 *   assets: {
 *     fund1: {
 *       equity: { value: 100 },
 *     },
 *   },
 * };
 * 
 * const changedAssets = {
 *   fund1: {
 *     equity: { value: 150 },
 *     bonds: { value: 50 },
 *   },
 *   fund2: {
 *     equity: { value: 200 },
 *   },
 * };
 * 
 * const updatedClientState = applyAssetChanges(clientState, changedAssets);
 * console.log(updatedClientState);
 * Output:
 * {
 *   assets: {
 *     fund1: {
 *       equity: { value: 150 },
 *       bonds: { value: 50 },
 *     },
 *     fund2: {
 *         equity: { value: 200 },
 *     },
 *   },
 * }
 * ```
 */
export const applyAssetChanges = (clientState: Client, changedAssets: any): Client => {
  if (!changedAssets) return clientState;

  // Create a deep clone to avoid mutation
  const newClientState = structuredClone(clientState);

  // Apply changes to each fund and asset type
  Object.keys(changedAssets).forEach(fundKey => {
    if (!newClientState.assets[fundKey]) {
      newClientState.assets[fundKey] = {};
    }
    
    Object.keys(changedAssets[fundKey]).forEach(assetType => {
      const change = changedAssets[fundKey][assetType] as AssetDetails;
      newClientState.assets[fundKey][assetType] = change;
    });
  });

  return newClientState;
};

/**
 * Formats a Date object into a string suitable for PDF generation.
 *
 * This function takes a Date object and formats it into a string
 * in the format "MMM DD, YYYY" (e.g., "Jan 01, 2023"). If the date
 * is null or undefined, it returns 'N/A'.
 *
 * @param date - The Date object to format.
 * @returns A formatted date string or 'N/A' if the date is null/undefined.
 */
export function formatPDFDate(date: Date | null | undefined): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}