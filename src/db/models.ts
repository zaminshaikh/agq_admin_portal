import { Timestamp } from "firebase/firestore";

/**
 * Client interface representing a client in the Firestore database.
 *
 * @property cid - The document ID of the client (the Client ID).
 * @property uid - The client's Firebase Authentication User ID. Empty if not signed up.
 * @property uidGrantedAccess - Array of UIDs that have been granted access to this client's data.
 * @property linked - Boolean indicating if the client's account is linked to a user.
 * @property firstName - The first name of the client.
 * @property lastName - The last name of the client.
 * @property companyName - The company name, if applicable.
 * @property address - The full address of the client.
 * @property province - The province of the client.
 * @property state - The state of the client.
 * @property street - The street address of the client.
 * @property city - The city of the client.
 * @property zip - The zip code of the client.
 * @property country - The country of the client.
 * @property dob - The date of birth of the client.
 * @property phoneNumber - The phone number of the client.
 * @property appEmail - The email address used for app login.
 * @property initEmail - The initial email address provided by the client.
 * @property firstDepositDate - The date of the client's first deposit.
 * @property beneficiaries - An array of beneficiary names or identifiers.
 * @property connectedUsers - An array of UIDs connected to this client.
 * @property totalAssets - The total value of assets held by the client.
 * @property ytd - Year-to-date earnings or performance.
 * @property totalYTD - Total year-to-date earnings or performance.
 * @property _selected - Optional flag used for UI selection states.
 * @property lastLoggedIn - Timestamp or string indicating the last login time.
 * @property notes - Optional notes or comments about the client.
 * @property activities - Optional array of activities associated with the client.
 * @property graphPoints - Optional array of data points for generating graphs.
 * @property assets - An object detailing the client's assets, structured by fund and asset type.
 */
export interface Client {
    cid: string;
    uid: string;
    uidGrantedAccess: string[];
    linked: boolean;
    firstName: string;
    lastName: string;
    companyName: string;
    address: string;
    province: string;
    state: string;
    street: string;
    city: string;
    zip: string;
    country: string;
    dob: Date | null;
    phoneNumber: string;
    appEmail: string;
    initEmail: string;
    firstDepositDate: Date | null;
    beneficiaries: string[];
    connectedUsers: string[];
    totalAssets: number;
    ytd: number;
    totalYTD: number;
    _selected?: boolean;
    lastLoggedIn?: string | null | undefined;
    notes?: string | undefined;
    activities?: Activity[];
    graphPoints?: GraphPoint[];
    assets: Assets;
    createdAt?: Date;
    createdBy?: string;
    updatedAt?: Date;
    updatedBy?: string;
}

/**
 * Activity interface representing a financial transaction or event.
 *
 * @property id - Optional unique identifier for the activity.
 * @property notes - Optional notes or details about the activity. Can be a string, number, or array of strings.
 * @property parentDocId - Optional ID of a parent document, if this activity is part of a larger transaction.
 * @property amount - The monetary amount of the activity.
 * @property fund - Optional identifier for the fund associated with the activity.
 * @property recipient - Optional name or identifier of the recipient of the activity.
 * @property time - The timestamp when the activity occurred.
 * @property formattedTime - Optional pre-formatted string representation of the time.
 * @property type - The type of activity (e.g., "withdrawal", "profit", "deposit").
 * @property isDividend - Optional boolean indicating if the activity is a dividend.
 * @property sendNotif - Optional boolean indicating if a notification should be sent for this activity.
 * @property amortizationCreated - Optional boolean indicating if an amortization schedule was created for this.
 * @property isAmortization - Optional boolean indicating if this activity is an amortization payment.
 * @property principalPaid - Optional amount of principal paid in an amortization.
 * @property profitPaid - Optional amount of profit paid in an amortization.
 * @property parentName - Optional name of the parent entity or account.
 */
export interface Activity {
    id?: string;
    notes?: string | number | string[] | undefined;
    parentDocId?: string;
    amount: number;
    fund?: string;
    recipient?: string;
    time: Date | Timestamp;
    formattedTime?: string;
    type: string;
    isDividend?: boolean;
    sendNotif?: boolean;
    amortizationCreated?: boolean;
    isAmortization?: boolean;
    principalPaid?: number;
    profitPaid?: number;
    parentName?: string;
    createdAt?: Date;
    createdBy?: string;
    updatedAt?: Date;
    updatedBy?: string;
}

/**
 * ScheduledActivity interface representing an activity planned for a future time.
 *
 * @property id - Unique identifier for the scheduled activity.
 * @property cid - The client ID to whom this scheduled activity pertains.
 * @property activity - The Activity object containing details of the transaction to be performed.
 * @property changedAssets - The state of assets after this activity is processed, or null if not yet calculated.
 * @property status - The current status of the scheduled activity (e.g., "pending", "processed", "failed").
 * @property scheduledTime - The timestamp when the activity is scheduled to be executed.
 * @property formattedTime - Optional pre-formatted string representation of the scheduled time.
 * @property usersCollectionID - The ID of the Firestore collection where user data is stored.
 */
export interface ScheduledActivity {
    id: string;
    cid: string;
    activity: Activity;
    changedAssets: Assets | null;
    status: string;
    scheduledTime: Date;
    formattedTime?: string;
    usersCollectionID: string;
    createdAt?: Date;
    createdBy?: string;
    updatedAt?: Date;
    updatedBy?: string;
}

/**
 * Notification interface representing a message or alert for a user.
 *
 * @property activityId - The ID of the activity that triggered this notification.
 * @property recipient - The name or identifier of the notification recipient.
 * @property title - The title of the notification.
 * @property body - The main content or body of the notification.
 * @property message - A detailed message for the notification.
 * @property isRead - Boolean indicating whether the notification has been read by the user.
 * @property type - The type of notification (e.g., "activity", "document").
 * @property time - The timestamp when the notification was created. Can be a Date object or Firestore Timestamp.
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

/**
 * GraphPoint interface representing a data point for financial graphs.
 *
 * @property id - Optional unique identifier for the graph point.
 * @property time - The timestamp for this data point. Can be a Date, Firestore Timestamp, or null.
 * @property type - Optional type or category of the graph point.
 * @property amount - The numerical value of this data point (e.g., asset value).
 * @property cashflow - The cash flow value at this point, or null if not applicable.
 * @property account - Optional account identifier associated with this graph point.
 */
export interface GraphPoint {
    id?: string;
    time: Date | Timestamp | null;
    type?: string;
    amount: number;
    cashflow: number | null;
    account?: string;
}

/**
 * StatementData interface representing metadata for a client statement.
 *
 * @property statementTitle - The title of the statement.
 * @property downloadURL - The URL from which the statement PDF can be downloaded.
 * @property clientId - The ID of the client to whom this statement belongs.
 */
export interface StatementData {
    statementTitle: string;
    downloadURL: string;
    clientId: string;
}

/**
 * AssetDetails interface representing details for a specific asset holding.
 *
 * @property amount - The current amount or value of the asset.
 * @property firstDepositDate - The date of the first deposit into this asset. Can be Date, Firestore Timestamp, or null.
 * @property displayTitle - A user-friendly title for displaying the asset.
 * @property index - A numerical index for ordering or identifying the asset.
 */
export interface AssetDetails {
    amount: number;
    firstDepositDate: Date | Timestamp | null;
    displayTitle: string;
    index: number;
}

/**
 * Assets interface representing a collection of asset holdings, organized by fund and asset type.
 * The keys are fund identifiers (e.g., "agq", "ak1").
 * Each fund contains objects where keys are asset types (e.g., "personal", "investment")
 * and values are AssetDetails objects.
 *
 * @example
 * const clientAssets: Assets = {
 *   "agq": {
 *     "personal": { amount: 1000, firstDepositDate: new Date(), displayTitle: "Personal AGQ", index: 0 },
 *     "investment": { amount: 5000, firstDepositDate: new Date(), displayTitle: "Investment AGQ", index: 1 }
 *   },
 *   "ak1": {
 *     "personal": { amount: 2000, firstDepositDate: null, displayTitle: "Personal AK1", index: 0 }
 *   }
 * };
 */
export interface Assets {
    [fundKey: string]: {
        [assetType: string]: AssetDetails;
    };
}

export const emptyClient: Client = {
    firstName: '',
    lastName: '',
    companyName: '',
    address: '',
    province: '',
    state: '',
    street: '',
    city: '',
    zip: '',
    country: 'US',
    dob: null,
    phoneNumber: '',
    firstDepositDate: null,
    beneficiaries: [],
    connectedUsers: [],
    cid: '',
    uid: '',
    uidGrantedAccess: [],
    linked: false,
    appEmail: '',
    initEmail: '',
    totalAssets: 0,
    ytd: 0,
    totalYTD: 0,
    assets: {
        agq: {
            personal: {
                amount: 0,
                firstDepositDate: null,
                displayTitle: 'Personal',
                index: 0,
            },
        },
        ak1: {
            personal: {
                amount: 0,
                firstDepositDate: null,
                displayTitle: 'Personal',
                index: 0,
            },
        },
    },
};

export const emptyActivity: Activity = {
    amount: 0,
    fund: 'AGQ',
    recipient: '',
    time: new Date(),
    type: 'profit',
    isDividend: false,
    sendNotif: true,
    isAmortization: false,
    notes: undefined,
    parentName: '',
};