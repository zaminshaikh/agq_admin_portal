import { isValid, parse } from "date-fns";
import { Activity, AssetDetails, Client } from "src/db/database";

export const toTitleCase = (str: string, exceptions: string[] = []) => {
    return str.split(' ').map(word => {
        return exceptions.includes(word.toUpperCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
};

// Utility function for formatting Date
export const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}/${month}/${day} at ${hours}:${minutes}:${seconds} EST`;
}

export const parseDateWithTwoDigitYear = (dateString: string) => {
    const dateFormats = ['yyyy-MM-dd', 'MM/dd/yyyy', 'MM/dd/yy', 'MM-dd-yy', 'MM-dd-yyyy'];
    let parsedDate = null;

    for (const format of dateFormats) {
        parsedDate = parse(dateString, format, new Date());
        if (isValid(parsedDate)) {
            // Handle two-digit year
            const year = parsedDate.getFullYear();
            if (year < 100) {
                parsedDate.setFullYear(year + 2000);
            }
            break;
        }
    }

    return parsedDate;
};

export const amortize = (activityState: Activity, clientState: Client) => {
        const activity = {
            parentDocId: clientState!.cid ?? '',
            time: activityState.time,
            recipient: activityState.recipient,
            fund: activityState.fund,
            sendNotif: activityState.sendNotif,
            isDividend: activityState.isDividend,
            notes: activityState.notes,
            isAmortization: true,
            amortizationCreated: true,
            parentName: clientState!.firstName + ' ' + clientState!.lastName
        }
        
        const profit: Activity = {
            ...activity,
            type: 'profit',
            amount: activityState.amount - (activityState.principalPaid ?? 0),
        }

        const withdrawal: Activity = {
            ...activity,
            type: 'withdrawal',
            amount: activityState.principalPaid ?? 0,
        }

        return [profit, withdrawal];
}

export function toSentenceCase(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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