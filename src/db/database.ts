import { collection, getFirestore, getDocs, getDoc, doc, Firestore, CollectionReference, DocumentChangeType, DocumentData, addDoc, setDoc} from 'firebase/firestore'
import { app } from '../App.tsx'
import 'firebase/firestore'
import config from '../config.json'
import {ClientState} from '../views/dashboard/CreateNewClient.tsx'

//Now import this 
import 'firebase/firestore'

export type User = {
    cid: string
    firstname: string,
    lastname: string,   
    company: string,
    email: string,
    uid: string,
    connectedUsers: string[],
    totalAssets: number,
    formattedAssets: string,
}

// Formats a number into USD currency representation
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
export const getUsers = async () => {
    // Initialize Firestore
    const db = getFirestore(app)

    // Get a reference to the 'testUsers' collection
    const usersCollection = collection(db, config.FIRESTORE_ACTIVE_USERS_COLLECTION)

    // Fetch all documents from the 'testUsers' collection
    const querySnapshot = await getDocs(usersCollection)

    // Initialize an empty array to hold the user objects
    const users: User[] = []

    // Loop over each document in the query snapshot
    for (const userDoc of querySnapshot.docs) {
        // Get the data from the document
        const data = userDoc.data()

        // Get a reference to the 'assets' subcollection for this user
        const assetsDoc = doc(usersCollection, userDoc.id, config.ASSETS_SUBCOLLECTION, config.ASSETS_GENERAL_DOC_ID)

        // Fetch the 'assets' document
        const assetsSnapshot = await getDoc(assetsDoc)

        // Get the data from the 'assets' document
        const assetsData = assetsSnapshot.data()

        // Push a new user object to the array, with properties from the document data and the 'assets' data
        users.push({
            cid: userDoc.id,
            firstname: data.name.first,
            lastname: data.name.last,   
            company: data.name.company,
            email: data.email ? data.email : 'User has not created account',
            uid: data.uid ? data.uid : '',
            connectedUsers: data.connectedUsers,
            totalAssets: assetsData ? assetsData.total : 0,
            formattedAssets: assetsData ? formatCurrency(assetsData.total) : formatCurrency(0),
        })
    }

    // Return the array of user objects
    return users
}

export const createUser = async (client: ClientState) => {
    const db = getFirestore(app);
    const usersCollection = collection(db, config.FIRESTORE_ACTIVE_USERS_COLLECTION);

    const user: DocumentData = {
        name: {
            first: client.firstName,
            last: client.lastName,
            company: client.companyName,
        },
        email: '',
        connectedUsers: client.connectedUsers,
        uid: '',
    };

      // Generate your own ID here. This could be any string.
    const newDocId = '12345671';

    // Create a reference with the new ID.
    const docRef = doc(db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, newDocId);
    console.log(`${docRef}`)

    // Create the document with the new ID.
    await setDoc(docRef, user);

    console.log('Document written with ID: ', newDocId);

    let agqDoc = {
        ...client.assets.agq,
        fund: 'AGQ',
        total: Object.values(client.assets.agq).reduce((sum, value) => sum + value, 0),
    }

    let ak1Doc = {
        ...client.assets.ak1,
        fund: 'AK1',
        total: Object.values(client.assets.ak1).reduce((sum, value) => sum + value, 0),
    }

    let general = {
        total: agqDoc.total + ak1Doc.total
    }

    const assetCollectionRef = collection(docRef, 'assets')

    const agqRef = doc(assetCollectionRef, 'agq')
    const ak1Ref = doc(assetCollectionRef, 'ak1')
    const genRef = doc(assetCollectionRef, 'general')

    await setDoc(agqRef, agqDoc)
    await setDoc(ak1Ref, ak1Doc)
    await setDoc(genRef, general)

    console.log('agq doc:', JSON.stringify(agqDoc));
    console.log('ak1 doc:', JSON.stringify(ak1Doc));

}
