import { collection, getFirestore, getDocs, getDoc, doc, Firestore, CollectionReference, DocumentChangeType, DocumentData, addDoc, setDoc} from 'firebase/firestore'
import { app } from '../App.tsx'
import 'firebase/firestore'
import config from '../config.json'
import 'firebase/firestore'

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
    formattedAssets: string,
    assets: {
        [key: string]: any;
        agq: {
        personal: number;
        company: number;
        ira: number;
        rothIra: number;
        sepIra: number;
        nuviewCashIra: number;
        nuviewCashRothIra: number;
        };
        ak1: {
        personal: number;
        company: number;
        ira: number;
        rothIra: number;
        sepIra: number;
        nuviewCashIra: number;
        nuviewCashRothIra: number;
        };
    };
}

// Formats a number into USD currency representation
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

    async initCIDArray() {
        const querySnapshot = await getDocs(this.usersCollection);
        for (const doc of querySnapshot.docs) {
            this.cidArray.push(doc.id);
        }
        console.log(this.cidArray);
    }

    /**
     * Asynchronously generates a unique hash for a given name.
     *
     * @param name - The name to be hashed. It should be a string.
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
    async hash(name: string) {
        if (this.cidArray.length === 0) {
            await this.initCIDArray();
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(name);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        let numHash = parseInt(hashHex.substring(0, 8), 16) % 100000000;

        while (this.cidArray.includes(numHash.toString())) {
            numHash = (numHash + 1) % 100000000;
        }

        this.cidArray.push(numHash.toString());

        return numHash.toString();
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

        // Fetch all documents from the 'testUsers' collection
        const querySnapshot = await getDocs(this.usersCollection)

        // Initialize an empty array to hold the user objects
        const users: User[] = []

        // Loop over each document in the query snapshot
        for (const userDoc of querySnapshot.docs) {
            // Get the data from the document
            const data = userDoc.data()

            // Get a reference to the 'assets' subcollection for this user
            const assetsDoc = doc(this.usersCollection, userDoc.id, config.ASSETS_SUBCOLLECTION, config.ASSETS_GENERAL_DOC_ID)

            // Fetch the 'assets' document
            const assetsSnapshot = await getDoc(assetsDoc)

            // Get the data from the 'assets' document
            const assetsData = assetsSnapshot.data()

            // Push a new user object to the array, with properties from the document data and the 'assets' data
            users.push({
                cid: userDoc.id,
                uid: data.uid ?? '',
                firstName: data.name.first ?? '',
                lastName: data.name.last ?? '',
                companyName: data.name.company ?? '',
                address: data.address ?? '',
                dob: data.dob ?? null,
                initEmail: data.initEmail ?? data.email ?? '',
                appEmail: data.appEmail ?? data.initEmail ?? 'User has not signed up yet',
                connectedUsers: data.connectedUsers ?? [],
                totalAssets: assetsData ? assetsData.total : 0,
                formattedAssets: assetsData ? formatCurrency(assetsData.total) : formatCurrency(0),
                phoneNumber: data.phoneNumber ?? '',
                firstDepositDate: data.firstDepositDate ?? null,
                beneficiaryFirstName: '',
                beneficiaryLastName: '',
                assets: {
                    agq: {
                        personal: 0,
                        company: 0,
                        ira: 0,
                        rothIra: 0,
                        sepIra: 0,
                        nuviewCashIra: 0,
                        nuviewCashRothIra: 0
                    },
                    ak1: {
                        personal: 0,
                        company: 0,
                        ira: 0,
                        rothIra: 0,
                        sepIra: 0,
                        nuviewCashIra: 0,
                        nuviewCashRothIra: 0
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

        const newUserDocData: DocumentData = {
            ...newUser,
            name: {
                first: newUser.firstName,
                last: newUser.lastName,
                company: newUser.companyName,
            },
        };

        ['firstName', 'lastName', 'companyName', 'email', 'cid', 'assets'].forEach(key => {
                delete newUserDocData[key];
        });

        const newUserDocId = await this.hash(newUserDocData.name.first + '-' + newUserDocData.name.last);

        // Create a reference with the new ID.
        const docRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, newUserDocId);
        console.log(`${docRef}`)

        // Create the document with the new ID.
        await setDoc(docRef, newUserDocData);

        console.log('Document written with ID: ', newUserDocId);

        let agqDoc = {
            ...newUser.assets.agq,
            fund: 'AGQ',
            total: Object.values(newUser.assets.agq).reduce((sum, value) => sum + value, 0),
        }

        let ak1Doc = {
            ...newUser.assets.ak1,
            fund: 'AK1',
            total: Object.values(newUser.assets.ak1).reduce((sum, value) => sum + value, 0),
        }

        let general = {
            ytd: 0,
            total: agqDoc.total + ak1Doc.total
        }

        const assetCollectionRef = collection(docRef, config.ASSETS_SUBCOLLECTION)

        const agqRef = doc(assetCollectionRef, config.ASSETS_AGQ_DOC_ID)
        const ak1Ref = doc(assetCollectionRef, config.ASSETS_AK1_DOC_ID)
        const genRef = doc(assetCollectionRef, config.ASSETS_GENERAL_DOC_ID)

        await setDoc(agqRef, agqDoc)
        await setDoc(ak1Ref, ak1Doc)
        await setDoc(genRef, general)

        console.log('agq doc:', JSON.stringify(agqDoc));
        console.log('ak1 doc:', JSON.stringify(ak1Doc));

    }

}

