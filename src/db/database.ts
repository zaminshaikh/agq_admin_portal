import { collection, getFirestore, getDocs, getDoc, doc, Firestore, CollectionReference, DocumentChangeType, DocumentData, addDoc, setDoc, deleteDoc, collectionGroup} from 'firebase/firestore'
import { app } from '../App.tsx'
import 'firebase/firestore'
import config from '../config.json'
import 'firebase/firestore'

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
    amount: number;
    fund: string;
    recipient: string;
    time: Date;
    type: string;
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
     * Asynchronously generates a unique hash for a given name.
     *
     * @param user - The name to be hashed. It should be a string.
     *
     * This function performs the following steps:
     * 1. If `cidArray` is empty, it initializes it by calling `initCIDArray`.
     * 2. It creates a new `TextEncoder` and uses it to encode the `name` into a `Uint8Array`.
     * 3. It uses the `window.crypto.subtle.digest` function to create a SHA-256 hash of the encoded `name`.
     * 4. It converts the hash into a hexadecimal string.
     * 5. It converts the first 8 characters of the hexadecimal string into a decimal number and takes the remainder of dividing by 100000000 to get `numHash`.
     * 6. If `numHash` is already in `cidArray`, it increments `numHash` by 1 and takes the remainder of dividing by 100000000 until `numHash` is not in `cidArray`.
     * 7. It adds `numHash` to `cidArray`.
     * 8. It returns `numHash` as a string.
     *
     * @returns {Promise<string>} Returns a Promise that resolves to the unique hash.
     */
    async hash(user: string) {
        if (this.cidArray.length === 0) {
            await this.initCIDArray();
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(user);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        let numHash = parseInt(hashHex.substring(0, 8), 16) % 100000000;

        while (this.cidArray.includes(numHash.toString().padEnd(8, '0'))) {
            numHash = (numHash + 1) % 100000000;
        }

        const numHashStr = numHash.toString().padEnd(8, '0');
        this.cidArray.push(numHashStr);

        return numHashStr;
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
        const users: User[] = []

        // Loop over each document in the query snapshot
        for (const userDoc of querySnapshot.docs) {
            // Get the data from the document
            const data = userDoc.data()

            // Get a reference to the 'assets' subcollection for this user
            const assetsSubcollection = collection(this.usersCollection, userDoc.id, config.ASSETS_SUBCOLLECTION)

            // References to each doc in assets subcollection, one for each fund and a general overview doc
            const generalAssetsDoc = doc(assetsSubcollection, config.ASSETS_GENERAL_DOC_ID)
            const agqAssetsDoc = doc(assetsSubcollection, config.ASSETS_AGQ_DOC_ID)
            const ak1AssetsDoc = doc(assetsSubcollection, config.ASSETS_AK1_DOC_ID)

            // Use the references to fetch the snapshots of the documents
            const generalAssetsSnapshot = await getDoc(generalAssetsDoc)
            const agqAssetsSnapshot = await getDoc(agqAssetsDoc)
            const ak1AssetsSnapshot = await getDoc(ak1AssetsDoc)

            // Get the data from the snapshots
            const generalAssetsData = generalAssetsSnapshot.data()
            const agqAssetsData = agqAssetsSnapshot.data()
            const ak1AssetsData = ak1AssetsSnapshot.data()

            // Push a new user object to the array, with properties from the document data and the 'assets' subcollection data
            users.push({
                cid: userDoc.id,
                uid: data.uid ?? '',
                firstName: data.name?.first ?? '',
                lastName: data.name?.last ?? '',
                companyName: data.name?.company ?? '',
                address: data.address ?? '',
                dob: data.dob?.toDate() ?? null,
                initEmail: data.initEmail ?? data.email ?? '',
                appEmail: data.appEmail ?? data.email ?? 'User has not logged in yet',
                connectedUsers: data.connectedUsers ?? [],
                totalAssets: generalAssetsData ? generalAssetsData.total : 0,
                phoneNumber: data.phoneNumber ?? '',
                firstDepositDate: data.firstDepositDate?.toDate() ?? null,
                beneficiaryFirstName: data.beneficiaryFirstName ?? '',
                beneficiaryLastName: data.beneficiaryLastName ?? '',
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
            })
        }

        // Return the array of user objects
        return users
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

        // Since the CID is unique, this will create a unique user in the database
        await this.setUser(newUser, newUserDocId);
    }

    /**
     * Asynchronously sets the user doc in the Firestore database for the given CID
     * 
     * @param user 
     * @param cid 
     * 
     */
    setUser = async (user: User, cid: string) => {
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
        ['firstName', 'lastName', 'companyName', 'email', 'cid', 'assets', 'activities'].forEach(key => {
                if (user.appEmail === '') {delete newUserDocData[key]; return;}
                delete newUserDocData[key];
        });

        // Create a reference with the CID.
        const docRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);

        // Updates/Creates the document with the CID
        await setDoc(docRef, newUserDocData);

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
        const assetCollectionRef = collection(docRef, config.ASSETS_SUBCOLLECTION)
        
        // Create references to the documents in the subcollection
        const agqRef = doc(assetCollectionRef, config.ASSETS_AGQ_DOC_ID)
        const ak1Ref = doc(assetCollectionRef, config.ASSETS_AK1_DOC_ID)
        const genRef = doc(assetCollectionRef, config.ASSETS_GENERAL_DOC_ID)

        // Set the documents in the subcollection
        await setDoc(agqRef, agqDoc)
        await setDoc(ak1Ref, ak1Doc)
        await setDoc(genRef, general)

        // Update/Create a activity subcollection for user
        
        const activityCollectionRef = collection(docRef, config.ACTIVITIES_SUBCOLLECTION)

        // If no activities exist, we leave the collection empty
        if (user.activities === undefined) {return}

        // Add each activity to the subcollection
        for (let activity of user.activities) {
            await addDoc(activityCollectionRef, activity)
        }
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

    /**
     * Updates the given user in the Firestore database.
     * 
     * @param updatedUser 
     *
     */
    updateUser = async (updatedUser: User) => {
        await this.setUser(updatedUser, updatedUser.cid);
    }

    getActivities = async () => {
        const querySnapshot = await getDocs(collectionGroup(this.db, 'activities'));
        const activities: Activity[] = querySnapshot.docs.map(doc => doc.data() as Activity);
        for (let i = 0; i < activities.length; i++) {
            activities[i].time = (activities[i].time as any).toDate();
        }
        return activities;
    }

}

