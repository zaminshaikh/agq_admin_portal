import { collection, getFirestore, getDocs, getDoc, doc, Firestore, CollectionReference, DocumentData, addDoc, setDoc, deleteDoc, collectionGroup, DocumentSnapshot, updateDoc, where, query, writeBatch} from 'firebase/firestore'
import { app } from '../App.tsx'
import 'firebase/firestore'
import config from '../../config.json'
import 'firebase/firestore'
import { Timestamp } from 'firebase/firestore';
import { getAuth, deleteUser } from 'firebase/auth';

/**
 * User interface representing a client in the Firestore database.
 *  
 * .cid - The document ID of the user (the Client ID)
 * 
 * .uid - The user's UID, or the empty string if they have not signed up
 */
export interface User {
    [key: string]: any;
    cid: string;
    uid: string;
    firstName: string;
    lastName: string;
    companyName: string;
    address: string;
    dob: Date | undefined;
    phoneNumber: string;
    appEmail: string;
    initEmail: string;
    firstDepositDate: Date | undefined;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    connectedUsers: string[];
    totalAssets: number,
    _selected?: boolean;
    activities?: Activity[];
    assets: {
        [key: string]: any;
        agq: {
        personal: number;
        company: number;
        trad: number;
        roth: number;
        sep: number;
        nuviewTrad: number;
        nuviewRoth: number;
        };
        ak1: {
        personal: number;
        company: number;
        trad: number;
        roth: number;
        sep: number;
        nuviewTrad: number;
        nuviewRoth: number;
        };
    };
}

export interface Activity {
    id?: string;
    parentDocId?: string;
    amount: number;
    fund: string;
    recipient: string;
    time: Date | Timestamp;
    formattedTime?: string;
    type: string;
    isDividend?: boolean;
    sendNotif?: boolean;
}

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

export const emptyUser: User = {
    firstName: '',
    lastName: '',
    companyName: '',
    address: '',
    dob: undefined,
    phoneNumber: '',
    firstDepositDate: undefined,
    beneficiaryFirstName: '',
    beneficiaryLastName: '',
    connectedUsers: [],
    cid: '',
    uid: '',
    appEmail: '',
    initEmail: '',
    totalAssets: 0,
    assets: {
        agq: {
            personal: 0,
            company: 0,
            trad: 0,
            roth: 0,
            sep: 0,
            nuviewTrad: 0,
            nuviewRoth: 0,
        },
        ak1: {
            personal: 0,
            company: 0,
            trad: 0,
            roth: 0,
            sep: 0,
            nuviewTrad: 0,
            nuviewRoth: 0,
        },
    },
};

export const emptyActivity: Activity = {
    amount: 0,
    fund: '',
    recipient: '',
    time: new Date(),
    type: '',
    isDividend: false,
    sendNotif: true,
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
}

export class DatabaseService {
    private db: Firestore = getFirestore(app);
    private usersCollection: CollectionReference<DocumentData, DocumentData>;
    private cidArray: string[];

    constructor() {
        this.usersCollection = collection(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION);
        this.cidArray = [];
        this.initCIDArray();
    }

    /**
     * Asynchronously initializes the `cidArray` property with all the Client IDs from the 'testUsers' collection in Firestore.
     *
     * This function performs the following steps:
     * 1. It fetches all documents from the 'testUsers' collection in Firestore.
     * 2. It iterates over each document in the query snapshot and adds the document ID to the `cidArray`.
     * 3. It logs the `cidArray` to the console.
     */
    async initCIDArray() {
        const querySnapshot = await getDocs(this.usersCollection);
        for (const doc of querySnapshot.docs) {
            this.cidArray.push(doc.id);
        }
    }

    /**
     * Hashes the input string to generate a unique ID, handling collisions by checking against existing IDs.
     *
     * @param input - The string to hash.
     * @returns A unique 8-digit ID.
     */
    async hash(input: string): Promise<string> {

        function fnv1aHash(input: string): number {
            let hash = 2166136261; // FNV offset basis
            for (let i = 0; i < input.length; i++) {
                hash ^= input.charCodeAt(i);
                hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
            }
            return hash >>> 0; // Convert to unsigned 32-bit integer
        }

        const generateUniqueID = (baseID: string): string => {
            let uniqueID = baseID;
            let counter = 1;

            // Check for collisions and modify the ID if necessary
            while (this.cidArray.includes(uniqueID)) {
                uniqueID = (parseInt(baseID, 10) + counter).toString().padStart(8, '0');
                counter++;
            }
            return uniqueID;
        };

        const hash = fnv1aHash(input);
        const baseID = (hash % 100000000).toString().padStart(8, '0');
        const id = generateUniqueID(baseID);
        this.cidArray.push(id); // Add the new unique ID to the array
        return id;
    }
    /**
     * Fetches all users from the 'testUsers' collection in Firestore.
     * For each user, it also fetches their total assets from the 'assets' subcollection.
     * 
     * @returns An array of user objects, each with the following properties:
     * - cid: The document ID of the user (the Client ID).
     * - firstname: The user's first name.
     * - lastname: The user's last name.
     * - company: The user's company.
     * - email: The user's email, or a default message if not set.
     * - uid: The user's UID, or the empty string if they have not signed up
     * - connectedUsers: The user's connected users.
     * - totalAssets: The user's total assets.
     * - formattedAssets: The user's total assets, formatted as a currency string.
     */
    getUsers = async () => {

        // Fetch all documents from the users collection
        const querySnapshot = await getDocs(this.usersCollection)

        // Initialize an empty array to hold the user objects
        const users: (User) [] = []

        // Loop over each document in the query snapshot
        for (const userSnapshot of querySnapshot.docs) {
            // Get a reference to the 'assets' subcollection for this user
            const assetsSubcollection = collection(this.usersCollection, userSnapshot.id, config.ASSETS_SUBCOLLECTION)

            // References to each doc in assets subcollection, one for each fund and a general overview doc
            const generalAssetsDoc = doc(assetsSubcollection, config.ASSETS_GENERAL_DOC_ID)
            const agqAssetsDoc = doc(assetsSubcollection, config.ASSETS_AGQ_DOC_ID)
            const ak1AssetsDoc = doc(assetsSubcollection, config.ASSETS_AK1_DOC_ID)

            // Use the references to fetch the snapshots of the documents
            const generalAssetsSnapshot = await getDoc(generalAssetsDoc)
            const agqAssetsSnapshot = await getDoc(agqAssetsDoc)
            const ak1AssetsSnapshot = await getDoc(ak1AssetsDoc)

            const user = this.getUserFromSnapshot(userSnapshot, generalAssetsSnapshot, agqAssetsSnapshot, ak1AssetsSnapshot);
            if (user !== null) { users.push(user); }
        }

        // Return the array of user objects
        return users
    }

    getUserFromSnapshot = (userSnapshot: DocumentSnapshot, generalAssetsSnapshot: DocumentSnapshot, agqAssetsSnapshot: DocumentSnapshot, ak1AssetsSnapshot: DocumentSnapshot) => {
        if (userSnapshot.exists()) {
            // Get the data from the snapshots
            const data = userSnapshot.data()
            const generalAssetsData = generalAssetsSnapshot.data()
            const agqAssetsData = agqAssetsSnapshot.data()
            const ak1AssetsData = ak1AssetsSnapshot.data()
            // Create a new User object
            let user: User = userSnapshot.data() as User;
            user = {
                cid: userSnapshot?.id,
                uid: data?.uid ?? '',
                firstName: data?.name?.first ?? '',
                lastName: data?.name?.last ?? '',
                companyName: data?.name?.company ?? '',
                address: data?.address ?? '',
                dob: data?.dob?.toDate() ?? null,
                initEmail: data?.initEmail ?? data?.email ?? '',
                appEmail: data?.appEmail ?? data?.email ?? 'User has not logged in yet',
                connectedUsers: data?.connectedUsers ?? [],
                totalAssets: generalAssetsData ? generalAssetsData.total : 0,
                phoneNumber: data?.phoneNumber ?? '',
                firstDepositDate: data?.firstDepositDate?.toDate() ?? null,
                beneficiaryFirstName: data?.beneficiaryFirstName ?? '',
                beneficiaryLastName: data?.beneficiaryLastName ?? '',
                _selected: false,
                assets: {
                    agq: {
                        personal: agqAssetsData?.personal ?? 0,
                        company: agqAssetsData?.company ?? 0,
                        trad: agqAssetsData?.trad ?? 0,
                        roth: agqAssetsData?.roth ?? 0,
                        sep: agqAssetsData?.sep ?? 0,
                        nuviewTrad: agqAssetsData?.nuviewTrad ?? 0,
                        nuviewRoth: agqAssetsData?.nuviewRoth ?? 0
                    },
                    ak1: {
                        personal: ak1AssetsData?.personal ?? 0,
                        company: ak1AssetsData?.company ?? 0,
                        trad: ak1AssetsData?.trad ?? 0,
                        roth: ak1AssetsData?.roth ?? 0,
                        sep: ak1AssetsData?.sep ?? 0,
                        nuviewTrad: ak1AssetsData?.nuviewTrad ?? 0,
                        nuviewRoth: ak1AssetsData?.nuviewRoth ?? 0
                    }
                }
            } as User
            return user;
        } else {
            return null;
        }
    }

    getUser = async (cid: string) => {
        const userRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
        const userSnapshot = await getDoc(userRef);
        // Get a reference to the 'assets' subcollection for this user
        const assetsSubcollection = collection(this.usersCollection, cid, config.ASSETS_SUBCOLLECTION)

        // References to each doc in assets subcollection, one for each fund and a general overview doc
        const generalAssetsDoc = doc(assetsSubcollection, config.ASSETS_GENERAL_DOC_ID)
        const agqAssetsDoc = doc(assetsSubcollection, config.ASSETS_AGQ_DOC_ID)
        const ak1AssetsDoc = doc(assetsSubcollection, config.ASSETS_AK1_DOC_ID)

        // Use the references to fetch the snapshots of the documents
        const generalAssetsSnapshot = await getDoc(generalAssetsDoc)
        const agqAssetsSnapshot = await getDoc(agqAssetsDoc)
        const ak1AssetsSnapshot = await getDoc(ak1AssetsDoc)

        return this.getUserFromSnapshot(userSnapshot, generalAssetsSnapshot, agqAssetsSnapshot, ak1AssetsSnapshot);
    }

    /**
     * Asynchronously creates a new user in the Firestore database.
     *
     * @param newUser - The user object to be created. It should be of type `User`.
     * 
     * The `User` object should have the following properties:
     * - firstName: string
     * - lastName: string
     * - companyName: string
     * - email: string
     * - cid: string
     * - assets: object
     *   - agq: object
     *   - ak1: object
     *
     * This function performs the following steps:
     * 1. It creates a new `DocumentData` object from the `newUser` object, with a `name` property that is an object containing `first`, `last`, and `company` properties.
     * 2. It deletes the `firstName`, `lastName`, `companyName`, `email`, `cid`, and `assets` properties from the `newUserDocData` object.
     * 3. It generates a new document ID by hashing the user's first and last name.
     * 4. It creates a new document in the Firestore database with the new ID and the `newUserDocData` object.
     * 5. It creates `agqDoc` and `ak1Doc` objects from the `agq` and `ak1` properties of the `assets` property of the `newUser` object. Each object has a `fund` property and a `total` property, which is the sum of all the values in the object.
     * 6. It creates a `general` object with a `total` property that is the sum of the `total` properties of the `agqDoc` and `ak1Doc` objects.
     * 7. It creates a new collection in the Firestore database under the new user document.
     * 8. It creates new documents in the new collection with the `agqDoc`, `ak1Doc`, and `general` objects.
     * 9. It logs the `agqDoc` and `ak1Doc` objects to the console.
     *
     * @returns {Promise<void>} Returns a Promise that resolves when the user and associated documents have been created in the Firestore database.
     */
    createUser = async (newUser: User) => {

        // Using the passed email, first name, and initial email to create a unique 8 digit CID using our hash function
        const newUserDocId = await this.hash(newUser.firstName + '-' + newUser.lastName + '-' + newUser.initEmail);

        newUser = {...newUser, cid: newUserDocId};
        // Since the CID is unique, this will create a unique user in the database
        await this.setUser(newUser);
    }

    /**
     * Asynchronously sets the user doc in the Firestore database for the given CID
     * 
     * @param user 
     * @param cid 
     * 
     */
    setUser = async (user: User) => {
        // Create a new DocumentData object from the newUser object, with a name property that is an object containing first, last, and company properties.
        const newUserDocData: DocumentData = {
            ...user,
            name: {
                first: user.firstName,
                last: user.lastName,
                company: user.companyName,
            },
        };

        // Delete these unused properties from the newUserDocData object
        ['firstName', 'lastName', 'companyName', 'email', 'cid', 'assets', 'activities', 'totalAssets'].forEach(key => {
                delete newUserDocData[key];
        });

        // Create a reference with the CID.
        const userRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, user.cid);

        // Updates/Creates the document with the CID
        await setDoc(userRef, newUserDocData);
        
        // Update/Create the assets subcollection for user
        await this.setAssets(user); 

        // Update/Create a activity subcollection for user
        const activityCollectionRef = collection(userRef, config.ACTIVITIES_SUBCOLLECTION)

        // If no activities exist, we leave the collection undefined
        if (user.activities === undefined) {return}

        // Add each activity to the subcollection
        for (let activity of user.activities) {
            await addDoc(activityCollectionRef, activity)
        }
    }

    async setAssets(user: User) {
        // Create a reference to the assets subcollection for this user
        const userRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, user.cid);

         // Create the asset documents from user
         let agqDoc = {
            ...user.assets.agq,
            fund: 'AGQ',
            // Calculate sum of the subfields of the fund (personal, company, trad, roth etc.)
            total: Object.values(user.assets.agq).reduce((sum, value) => sum + value, 0), 
        }

        let ak1Doc = {
            ...user.assets.ak1,
            fund: 'AK1',
            total: Object.values(user.assets.ak1).reduce((sum, value) => sum + value, 0),
        }

        let general = {
            ytd: user.ytd ?? 0, 
            total: agqDoc.total + ak1Doc.total
        }

        // Create a reference to the assets subcollection for user
        // If none exists, it will create one
        const assetCollectionRef = collection(userRef, config.ASSETS_SUBCOLLECTION)
        
        // Create references to the documents in the subcollection
        const agqRef = doc(assetCollectionRef, config.ASSETS_AGQ_DOC_ID)
        const ak1Ref = doc(assetCollectionRef, config.ASSETS_AK1_DOC_ID)
        const genRef = doc(assetCollectionRef, config.ASSETS_GENERAL_DOC_ID)

        // Set the documents in the subcollection
        await setDoc(agqRef, agqDoc)
        await setDoc(ak1Ref, ak1Doc)
        await setDoc(genRef, general)
    }

    /**
     * Asynchronously deletes a user from the Firestore database.
     *
     * @param cid - The Client ID of the user to be deleted.
     *
     * @returns {Promise<void>} Returns a Promise that resolves when the user has been deleted from the Firestore database.
     */
    deleteUser = async (cid: string | undefined) => {
        if (cid === undefined || cid === null ||cid === '' ) { console.log('no value'); return }
        const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
        await deleteDoc(clientRef);
    }

    unlinkUser = async (cid: string) => {
        throw new Error('Method not implemented.');
    }

    /**
     * Updates the given user in the Firestore database.
     * 
     * @param updatedUser 
     *
     */
    updateUser = async (updatedUser: User) => {
        await this.setUser(updatedUser);
    }

    getActivities = async () => {
        // Get all activities from all users' 'activities' subcollections
        const querySnapshot = await getDocs(collectionGroup(this.db, 'activities')); 
        // Map the query snapshot to an array of Activity
        const activities: Activity[] = querySnapshot.docs.map((doc) => {
            const data = doc.data() as Activity;
            const parentPath = doc.ref.parent.path.split('/'); // Split the path to get parent document ID
            const parentDocId = parentPath[parentPath.length - 2]; // Get parent document ID
            const activity = {...data, id: doc.id, parentDocId};
            return activity;
        });
        // Format the time field of each activity
        for (let i = 0; i < activities.length; i++) {
            const time = activities[i].time instanceof Timestamp ? (activities[i].time as Timestamp).toDate() : activities[i].time;
            if (time instanceof Date) {
                const year = time.getFullYear();
                const month = (time.getMonth() + 1).toString().padStart(2, '0');
                const date = time.getDate().toString().padStart(2, '0');
                const hours = time.getHours().toString().padStart(2, '0');
                const minutes = time.getMinutes().toString().padStart(2, '0');
                const seconds = time.getSeconds().toString().padStart(2, '0');
                activities[i].formattedTime = `${year}/${month}/${date} at ${hours}:${minutes}:${seconds} EST`;
            } else {
                activities[i].formattedTime = '';
            }
        }
        return activities;
    }

    createActivity = async (activity: Activity, cid: string) => {
        // Create a reference to the user document
        const userRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
        // Create a reference to the activities subcollection for the user
        const activityCollectionRef = collection(userRef, config.ACTIVITIES_SUBCOLLECTION);
        // Add the activity to the subcollection
        const activityRef = await addDoc(activityCollectionRef, activity);

        // // If the activity requires a notification, create a notification for the recipient
        // if (activity.sendNotif === true) {
        //     // Create a reference to the notifications subcollection for the user
        //     const notificationsCollectionRef = collection(userRef, config.NOTIFICATIONS_SUBCOLLECTION);
        //     // Create a function to generate the notification message
        //     function getActivityMessage(activity: Activity): string {
        //         let message: string;
        //         switch (activity.type) {
        //             case 'withdrawal':
        //                 message = `New Withdrawal: ${activity.fund} Fund has withdrawn $${activity.amount} from your account. View the Activity section for more details.`;
        //                 break;
        //             case 'profit':
        //                 message = `New Profit: ${activity.fund} Fund has posted the latest returns from ${activity.recipient}'s investment. View the Activity section for more details.`;
        //                 break;
        //             case 'deposit':
        //                 message = `New Deposit: ${activity.fund} Fund has deposited $${activity.amount} into your account. View the Activity section for more details.`;
        //                 break;
        //             case 'manual-entry':
        //                 message = `New Manual Entry: ${activity.fund} Fund has made a manual entry of $${activity.amount} into your account. View the Activity section for more details.`;
        //                 break;
        //             default:
        //                 message = 'New Activity: A new activity has been created. View the Activity section for more details.';
        //         };
        //         return message;
        //     }
        //     const message = getActivityMessage(activity);
        //     const [title, body] = message.split(': ', 2);
        //     // Create a notification object
        //     const notification: Notification = {
        //         activityId: activityRef.id,
        //         recipient: activity.recipient as string,
        //         title: title,
        //         body: body,
        //         message: getActivityMessage(activity),
        //         isRead: false,
        //         type: 'activity',
        //         time: activity.time,
        //     };
        //     // Add the notification to the subcollection
        //     await addDoc(notificationsCollectionRef, notification);
        // }
    }

    setActivity = async (activity: Activity, {activityDocId}: {activityDocId?: string}, cid: string) => {
        // Create a reference to the user document
        const userRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
        // Create a reference to the activities subcollection for the user
        const activityCollectionRef = collection(userRef, config.ACTIVITIES_SUBCOLLECTION);
        // Create a reference to the activity document
        const activityRef = doc(activityCollectionRef, activityDocId);
        // Set the activity document with new data
        await setDoc(activityRef, activity);
    }

    deleteActivity = async (activity: Activity) => {
        const cid = activity.parentDocId!;
        const activityDocID = activity.id!;
        // Create a reference to the user document
        try {
            const userRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
            const activityCollectionRef = collection(userRef, config.ACTIVITIES_SUBCOLLECTION);
            const activityRef = doc(activityCollectionRef, activityDocID);
            await deleteDoc(activityRef);
        } catch (error) {
            console.error('Failed to delete activity, CID or activityDocID does not exist for the activity:', error);
            console.error('Activity:', activity);
        }
    }

    async deleteNotification(activity: Activity,) {
        const cid = activity.parentDocId!;
        const userRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
        const notificationsCollectionRef = collection(userRef, config.NOTIFICATIONS_SUBCOLLECTION);
        const querySnapshot = await getDocs(query(notificationsCollectionRef, where('activityId', '==', activity.id)));
        
        if (!querySnapshot.empty) {
            const batch = writeBatch(this.db);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } else {
            return;
        }
    }
}

