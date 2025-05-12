import { collection, getFirestore, getDocs, getDoc, doc, Firestore, CollectionReference, DocumentData, addDoc, setDoc, deleteDoc, collectionGroup, DocumentSnapshot, where, query, writeBatch} from 'firebase/firestore'
import { app } from '../App.tsx'
import 'firebase/firestore'
import config from '../../config.json'
import 'firebase/firestore'
import { Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
import { formatDate, toSentenceCase } from 'src/utils/utilities.ts'
import { Client, AssetDetails, Activity, ScheduledActivity, StatementData, Assets, GraphPoint} from './models.ts'
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts';
import { formatCurrency } from './utils.ts'

// Get the correct reference to pdfMake
const pdfMake = (pdfMakeModule as any).default || pdfMakeModule as any;
// Properly initialize the virtual file system
pdfMake.vfs = (pdfFontsModule as any).pdfMake?.vfs;

// Add this helper function for formatting dates in the PDF
function formatPDFDate(date: Date | null | undefined): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

const functions = getFunctions();


export class DatabaseService {
  private db: Firestore = getFirestore(app);
  private clientsCollection: CollectionReference<DocumentData, DocumentData>;
  private cidArray: string[];

  constructor() {
      this.clientsCollection = collection(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION);
      this.cidArray = [];
      this.initCIDArray();
  }

  /**
   * Asynchronously initializes the `cidArray` property with all the Client IDs from the 'testClients' collection in Firestore.
   *
   * This function performs the following steps:
   * 1. It fetches all documents from the 'testClients' collection in Firestore.
   * 2. It iterates over each document in the query snapshot and adds the document ID to the `cidArray`.
   * 3. It logs the `cidArray` to the console.
   */
  async initCIDArray() {
      const querySnapshot = await getDocs(this.clientsCollection);
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
   * Fetches all clients from the 'testClients' collection in Firestore.
   * For each client, it also fetches their total assets from the 'assets' subcollection.
   * 
   * @returns An array of client objects, each with the following properties:
   * - cid: The document ID of the client (the Client ID).
   * - firstname: The client's first name.
   * - lastname: The client's last name.
   * - company: The client's company.
   * - email: The client's email, or a default message if not set.
   * - uid: The client's UID, or the empty string if they have not signed up
   * - connectedUsers: The client's connected clients.
   * - totalAssets: The client's total assets.
   * - formattedAssets: The client's total assets, formatted as a currency string.
   */
  getClients = async () => {
      // Fetch all documents from the clients collection
      const querySnapshot = await getDocs(this.clientsCollection);

      // Initialize an empty array to hold the client objects
      const clients: Client[] = [];

      // Use Promise.all to fetch all clients concurrently
      const clientPromises = querySnapshot.docs.map(async (clientSnapshot) => {
          // Get a reference to the 'assets' subcollection for this client
          const assetsSubcollection = collection(this.clientsCollection, clientSnapshot.id, config.ASSETS_SUBCOLLECTION);

          // References to each doc in assets subcollection
          const generalAssetsDoc = doc(assetsSubcollection, config.ASSETS_GENERAL_DOC_ID);
          const agqAssetsDoc = doc(assetsSubcollection, config.ASSETS_AGQ_DOC_ID);
          const ak1AssetsDoc = doc(assetsSubcollection, config.ASSETS_AK1_DOC_ID);

          // Fetch all the assets documents concurrently
          const [generalAssetsSnapshot, agqAssetsSnapshot, ak1AssetsSnapshot] = await Promise.all([
              getDoc(generalAssetsDoc),
              getDoc(agqAssetsDoc),
              getDoc(ak1AssetsDoc),
          ]);

          // Process the snapshots to create the client object
          return this.getClientFromSnapshot(clientSnapshot, generalAssetsSnapshot, agqAssetsSnapshot, ak1AssetsSnapshot);
      });

      // Wait for all client processing promises to resolve
      const processedClients = await Promise.all(clientPromises);

      // Filter out any null values in case some clients couldn't be created
      clients.push(...processedClients.filter(client => client !== null));

      // Return the array of client objects
      return clients;
  };

    getClientFromSnapshot = async (
        clientSnapshot: DocumentSnapshot,
        generalAssetsSnapshot: DocumentSnapshot,
        agqAssetsSnapshot: DocumentSnapshot,
        ak1AssetsSnapshot: DocumentSnapshot
    ): Promise<Client | null> => {
        if (!clientSnapshot.exists()) {
            return null;
        }

      const data = clientSnapshot.data();
      const generalAssetsData = generalAssetsSnapshot.data();
      const agqAssetsData = agqAssetsSnapshot.data();
      const ak1AssetsData = ak1AssetsSnapshot.data();

      const parseAssetsData = (assetsData: any): { [assetType: string]: AssetDetails } => {
          const parsedAssets: { [assetType: string]: AssetDetails } = {};
          if (assetsData) {
              Object.keys(assetsData).forEach(assetType => {
                  if (assetType !== 'fund' && assetType !== 'total') {
                      const asset = assetsData[assetType];
                      parsedAssets[assetType] = {
                          amount: asset.amount ?? 0,
                          firstDepositDate: asset.firstDepositDate?.toDate?.() ?? null,
                          displayTitle: asset.displayTitle ?? '',
                          index: asset.index ?? 0, // Include index
                      };
                  }
              });
          }
          return parsedAssets;
      };

        const client: Client = {
            cid: clientSnapshot.id,
            uid: data?.uid ?? '',
            uidGrantedAccess: data?.uidGrantedAccess ?? [],
            linked: data?.linked ?? false,
            firstName: data?.name?.first ?? '',
            lastName: data?.name?.last ?? '',
            companyName: data?.name?.company ?? '',
            address: data?.address ?? '',
            province: data?.province ?? '',
            state: data?.state ?? '',
            street: data?.street ?? '',
            city: data?.city ?? '',
            zip: data?.zip ?? '',
            country: data?.country ?? '',
            dob: data?.dob?.toDate() ?? null,
            initEmail: data?.initEmail ?? data?.email ?? '',
            appEmail: data?.appEmail ?? data?.email ?? 'Client has not logged in yet',
            connectedUsers: data?.connectedUsers ?? [],
            totalAssets: generalAssetsData ? generalAssetsData.total : 0,
            ytd: generalAssetsData ? generalAssetsData.ytd : 0,
            totalYTD: generalAssetsData ? generalAssetsData.totalYTD : 0,
            phoneNumber: data?.phoneNumber ?? '',
            firstDepositDate: data?.firstDepositDate?.toDate() ?? null,
            beneficiaries: data?.beneficiaries ?? [],
            lastLoggedIn: data?.lastLoggedIn instanceof Timestamp
                ? formatDate(data?.lastLoggedIn?.toDate()) // If the lastLoggedIn field is a valid date, format it
                : ((data?.uid && data?.uid != '') // Else we'll check if the user has logged in before
                    ? 'Before 01/25' // If they have, it was before we added the feature to track last login
                    : 'N/A'), // If they haven't, we'll display N/A, because they have not linked their account
            _selected: false,
            notes: data?.notes ?? '',
            assets: {
                agq: parseAssetsData(agqAssetsData), // Dynamically parse AGQ assets
                ak1: parseAssetsData(ak1AssetsData), // Dynamically parse AK1 assets
            },
        };

        

      return client;
  };

  getClient = async (cid: string) => {
      const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
      const clientSnapshot = await getDoc(clientRef);
      // Get a reference to the 'assets' subcollection for this client
      const assetsSubcollection = collection(this.clientsCollection, cid, config.ASSETS_SUBCOLLECTION)

      // References to each doc in assets subcollection, one for each fund and a general overview doc
      const generalAssetsDoc = doc(assetsSubcollection, config.ASSETS_GENERAL_DOC_ID)
      const agqAssetsDoc = doc(assetsSubcollection, config.ASSETS_AGQ_DOC_ID)
      const ak1AssetsDoc = doc(assetsSubcollection, config.ASSETS_AK1_DOC_ID)

      // Use the references to fetch the snapshots of the documents
      const generalAssetsSnapshot = await getDoc(generalAssetsDoc)
      const agqAssetsSnapshot = await getDoc(agqAssetsDoc)
      const ak1AssetsSnapshot = await getDoc(ak1AssetsDoc)

      return this.getClientFromSnapshot(clientSnapshot, generalAssetsSnapshot, agqAssetsSnapshot, ak1AssetsSnapshot);
  }

  /**
   * Asynchronously creates a new client in the Firestore database.
   *
   * @param newClient - The client object to be created. It should be of type `Client`.
   * 
   * The `Client` object should have the following properties:
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
   * 1. It creates a new `DocumentData` object from the `newClient` object, with a `name` property that is an object containing `first`, `last`, and `company` properties.
   * 2. It deletes the `firstName`, `lastName`, `companyName`, `email`, `cid`, and `assets` properties from the `newClientDocData` object.
   * 3. It generates a new document ID by hashing the client's first and last name.
   * 4. It creates a new document in the Firestore database with the new ID and the `newClientDocData` object.
   * 5. It creates `agqDoc` and `ak1Doc` objects from the `agq` and `ak1` properties of the `assets` property of the `newClient` object. Each object has a `fund` property and a `total` property, which is the sum of all the values in the object.
   * 6. It creates a `general` object with a `total` property that is the sum of the `total` properties of the `agqDoc` and `ak1Doc` objects.
   * 7. It creates a new collection in the Firestore database under the new client document.
   * 8. It creates new documents in the new collection with the `agqDoc`, `ak1Doc`, and `general` objects.
   * 9. It logs the `agqDoc` and `ak1Doc` objects to the console.
   *
   * @returns {Promise<void>} Returns a Promise that resolves when the client and associated documents have been created in the Firestore database.
   */
  createClient = async (newClient: Client) => {

      // Using the passed email, first name, and initial email to create a unique 8 digit CID using our hash function
      const newClientDocId = await this.hash(newClient.firstName + '-' + newClient.lastName + '-' + newClient.initEmail);

      newClient = {...newClient, cid: newClientDocId};
      // Since the CID is unique, this will create a unique client in the database
      await this.setClient(newClient);
  }

  /**
   * Asynchronously sets the client doc in the Firestore database for the given CID
   * 
   * @param client 
   * @param cid 
   * 
   */
  setClient = async (client: Client) => {
      // Create a new DocumentData object from the newClient object, with a name property that is an object containing first, last, and company properties.
      let newClientDocData: DocumentData = {
          ...client,
          name: {
              first: client.firstName.trimEnd(),
              last: client.lastName.trimEnd(),
              company: client.companyName.trimEnd(),
          },
      };

      // Delete these unused properties from the newClientDocData object
      ['firstName', 'lastName', 'companyName', 'email', 'cid', 'assets', 'activities', 'totalAssets', 'graphPoints', 'ytd', 'totalYTD'].forEach(key => {
              delete newClientDocData[key];
      });

      // Remove any fields with undefined values
      newClientDocData = Object.fromEntries(
          Object.entries(newClientDocData).filter(([_, value]) => value !== undefined)
      );

      // Create a reference with the CID.
      const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, client.cid);

      // Updates/Creates the document with the CID
      await setDoc(clientRef, newClientDocData, { merge: true });
      
      // Update/Create the assets subcollection for client
      await this.setAssets(client); 

      // Update/Create a activity subcollection for client
      const activityCollectionRef = collection(clientRef, config.ACTIVITIES_SUBCOLLECTION)

      const graphCollectionRef = collection(clientRef, config.ASSETS_SUBCOLLECTION, config.ASSETS_GENERAL_DOC_ID, config.GRAPHPOINTS_SUBCOLLECTION)

      // If no activities exist, we leave the collection undefined
      if (client.activities !== undefined) {
          
          // Add all the activities to the subcollection
          const promise = client.activities.map((activity) => {
              const activityWithParentId = {
                  ...activity,
                  parentCollection: config.FIRESTORE_ACTIVE_USERS_COLLECTION
              };
        
              // Filter out undefined properties
              const filteredActivity = Object.fromEntries(
                  Object.entries(activityWithParentId).filter(([_, v]) => v !== undefined)
              );

              addDoc(activityCollectionRef, filteredActivity);
          });
          // Use Promise.all to add all activities concurrently
          await Promise.all(promise);
      }
          
      if (client.graphPoints !== undefined) {
          // Add all the graph points to the subcollection
          const promise = client.graphPoints.map((graphPoint) => addDoc(graphCollectionRef, graphPoint));
          // Use Promise.all to add all graph points concurrently
          await Promise.all(promise);
      }
  }

  // // Filters out 0 values from a given fund
  // filterAssets = (assets: { [assetType: string ]: AssetDetails }) => {
  //     return Object.fromEntries(
  //         Object.entries(assets).filter(([key, value]) => value.amount !== 0)
  //     );
  // }


  async setAssets(client: Client) {
      const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, client.cid);
      const assetCollectionRef = collection(clientRef, config.ASSETS_SUBCOLLECTION);

      // // Filter out assets with amount 0
      // const agqAssets = this.filterAssets(client.assets.agq);
      // const ak1Assets = this.filterAssets(client.assets.ak1);

      const agqAssets = client.assets.agq;
      const ak1Assets = client.assets.ak1;

      const prepareAssetDoc = (assets: { [assetType: string]: AssetDetails }, fundName: string) => {
          let total = 0;
          const assetDoc: any = { fund: fundName };
          Object.keys(assets).forEach(assetType => {
              const asset = assets[assetType];
              assetDoc[assetType] = {
                  amount: asset.amount,
                  firstDepositDate: asset.firstDepositDate 
                    ? asset.firstDepositDate instanceof Date 
                      ? Timestamp.fromDate(asset.firstDepositDate) 
                      : asset.firstDepositDate 
                    : null,
                  index: asset.index,
                  displayTitle: asset.displayTitle,
              };
              total += asset.amount;
          });
          assetDoc.total = total;
          return assetDoc;
      };

      const agqDoc = prepareAssetDoc(agqAssets, 'AGQ');
      const ak1Doc = prepareAssetDoc(ak1Assets, 'AK1');

      const general = {
          ytd: client.ytd ?? 0,
          totalYTD: client.totalYTD ?? 0,
          total: agqDoc.total + ak1Doc.total,
      };

      const agqRef = doc(assetCollectionRef, config.ASSETS_AGQ_DOC_ID);
      const ak1Ref = doc(assetCollectionRef, config.ASSETS_AK1_DOC_ID);
      const genRef = doc(assetCollectionRef, config.ASSETS_GENERAL_DOC_ID);

      await setDoc(agqRef, agqDoc);
      await setDoc(ak1Ref, ak1Doc);
      await setDoc(genRef, general);
  }

  /**
   * Asynchronously deletes a client from the Firestore database.
   *
   * @param cid - The Client ID of the client to be deleted.
   *
   * @returns {Promise<void>} Returns a Promise that resolves when the client has been deleted from the Firestore database.
   */
  deleteClient = async (cid: string | undefined) => {
      if (cid === undefined || cid === null ||cid === '' ) { console.log('no value'); return }
      const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
      await deleteDoc(clientRef);
  }

  async unlinkClient(client: Client): Promise<void> {
      const unlinkUser = httpsCallable<{ cid: string, uid: string, usersCollectionID: string}, { success: boolean }>(functions, 'unlinkUser');
      try {
          const result = await unlinkUser({ cid: client.cid, uid: client.uid, usersCollectionID: config.FIRESTORE_ACTIVE_USERS_COLLECTION });
          console.log('Unlink user success:', result.data.success);
          if (!result.data.success) {
              throw new Error('Failed to unlink user.');
          }
      } catch (error) {
          console.error('Error unlinking user:', error);
          throw new Error('Failed to unlink user.');
      }
  }

  /**
   * Updates the given client in the Firestore database.
   * 
   * @param updatedClient 
   *
   */
  updateClient = async (updatedClient: Client) => {
      await this.setClient(updatedClient);
  }

  getActivities = async () => {
      // Fetch all activities from all clients' 'activities' subcollections using collectionGroup
      const activitiesCollectionGroup = collectionGroup(this.db, config.ACTIVITIES_SUBCOLLECTION);
      const q = query(activitiesCollectionGroup, where('parentCollection', '==', config.FIRESTORE_ACTIVE_USERS_COLLECTION));
      const querySnapshot = await getDocs(q);

      // Map the query snapshot to an array of Activity with formatted time
      const activities: Activity[] = querySnapshot.docs.map((doc) => {
          const data = doc.data() as Activity;
          const parentPath = doc.ref.parent.path.split('/');
          const parentDocId = parentPath[parentPath.length - 2];

          // Format the time field
          let formattedTime = '';
          const time = data.time instanceof Timestamp ? data.time.toDate() : data.time;
          if (time instanceof Date) {
              formattedTime = formatDate(time);
          }

          return {
              ...data,
              id: doc.id,
              parentDocId,
              formattedTime,
          };
      });

      return activities;
  }

  getScheduledActivities = async () => {
    const scheduledActivitiesCollection = collection(this.db, config.SCHEDULED_ACTIVITIES_COLLECTION);
    // const querySnapshot = await getDocs(scheduledActivitiesCollection);
    const q = query(scheduledActivitiesCollection, where('usersCollectionID', '==', config.FIRESTORE_ACTIVE_USERS_COLLECTION));
    const querySnapshot = await getDocs(q)

    const scheduledActivities: ScheduledActivity[] = querySnapshot.docs.map((doc) => {
        const data = doc.data() as ScheduledActivity;

        // Format the time field
        let formattedTime = '';
        const time = data.activity.time instanceof Timestamp ? data.activity.time.toDate() : data.activity.time;
        if (time instanceof Date) {
            formattedTime = formatDate(time);
        }

        // Process changed assets if they exist
        const processedChangedAssets = data.changedAssets ? { ...data.changedAssets } : null;
        if (processedChangedAssets) {
            Object.keys(processedChangedAssets).forEach((fundName) => {
                const fund = processedChangedAssets[fundName];
                Object.keys(fund).forEach((assetType) => {
                    if (fund[assetType].firstDepositDate && fund[assetType].firstDepositDate instanceof Timestamp) {
                        fund[assetType].firstDepositDate = fund[assetType].firstDepositDate.toDate();
                    }
                });
            });
        }

        return {
            ...data,
            changedAssets: processedChangedAssets,
            id: doc.id,
            formattedTime,
            activity: {
                ...data.activity,
                formattedTime,
                parentDocId: data.cid,
            },
        };
    });

    return scheduledActivities;
}

  createActivity = async (activity: Activity, cid: string) => {
      // Create a reference to the client document
      const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
      // Create a reference to the activities subcollection for the client
      const activityCollectionRef = collection(clientRef, config.ACTIVITIES_SUBCOLLECTION);
      
      // Add the parentCollectionId field to the activity
      const activityWithParentId = {
        ...activity,
        parentCollection: config.FIRESTORE_ACTIVE_USERS_COLLECTION,
      };
      
      // Filter out undefined properties
      const filteredActivity = Object.fromEntries(
        Object.entries(activityWithParentId).filter(([_, v]) => v !== undefined)
      );

      console.log('Filtered Activity:', filteredActivity);
      
      // Add the activity to the subcollection
      await addDoc(activityCollectionRef, filteredActivity);
  }

  setActivity = async (activity: Activity, {activityDocId}: {activityDocId?: string}, cid: string) => {
      // Create a reference to the client document
      const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
      // Create a reference to the activities subcollection for the client
      const activityCollectionRef = collection(clientRef, config.ACTIVITIES_SUBCOLLECTION);
      // Create a reference to the activity document
      const activityRef = doc(activityCollectionRef, activityDocId);
      // Set the activity document with new data
      await setDoc(activityRef, activity);
  }

  deleteActivity = async (activity: Activity) => {
      const cid = activity.parentDocId!;
      const activityDocID = activity.id!;
      // Create a reference to the client document
      try {
          const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
          const activityCollectionRef = collection(clientRef, config.ACTIVITIES_SUBCOLLECTION);
          const activityRef = doc(activityCollectionRef, activityDocID);
          await deleteDoc(activityRef);
      } catch (error) {
          console.error('Failed to delete activity, CID or activityDocID does not exist for the activity:', error);
          console.error('Activity:', activity);
      }
  }

  async deleteNotification(activity: Activity,) {
      const cid = activity.parentDocId!;
      const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
      const notificationsCollectionRef = collection(clientRef, config.NOTIFICATIONS_SUBCOLLECTION);
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

  async getYTD(cid: string): Promise<number> {
      const calculateYTD = httpsCallable<{cid: string, usersCollectionID: string}, {ytd: number}>(functions, 'calculateYTD');
      try {
          const result = await calculateYTD({ cid: cid, usersCollectionID: config.FIRESTORE_ACTIVE_USERS_COLLECTION });
          console.log('YTD Total:', result.data);
          return result.data as unknown as number;
      } catch (error) {
          console.error('Error updating YTD:', error);
          throw new Error('Failed to update YTD.');
      }
  }

  async getTotalYTD(cid: string): Promise<number> {
      const calculateYTD = httpsCallable<{cid: string, usersCollectionID: string}, {ytdTotal: number}>(functions, 'calculateTotalYTD');
      try {
          const result = await calculateYTD({ cid: cid, usersCollectionID: config.FIRESTORE_ACTIVE_USERS_COLLECTION });
          console.log('YTD Total:', result.data);
          return result.data as unknown as number;
      } catch (error) {
          console.error('Error updating YTD:', error);
          throw new Error('Failed to update YTD.');
      }
  }

  async addStatement(statement: StatementData): Promise<void> {
  try {
      // Example using Firestore
      const db = getFirestore(); // Import and initialize Firestore as needed
      const statementsCollection = collection(db, 'statements');
      await addDoc(statementsCollection, statement);
  } catch (error) {
      console.error('Error adding statement:', error);
      throw error;
  }
  }

  /**
   * Schedules an activity by adding it to the 'scheduledActivities' collection.
   *
   * @param scheduledActivity - The activity data along with scheduling details.
   * @returns A promise that resolves when the scheduled activity is added.
   */
  async scheduleActivity(activity: Activity, clientState: Client, changedAssets: Assets | null): Promise<void> {
      delete activity.id;
      // Add the parentCollectionId field to the activity
      const activityWithParentId = {
          ...activity,
          parentCollection: config.FIRESTORE_ACTIVE_USERS_COLLECTION,
      };
      
      // Filter out undefined properties
      const filteredActivity = Object.fromEntries(
          Object.entries(activityWithParentId).filter(([_, v]) => v !== undefined)
      );

      const scheduledActivity = {
          cid: clientState.cid,
          scheduledTime: filteredActivity.time,
          activity: { ...filteredActivity, parentName: clientState.firstName + ' ' + clientState.lastName },
          changedAssets,
          usersCollectionID: config.FIRESTORE_ACTIVE_USERS_COLLECTION,
          status: 'pending',
      };

      // Add the scheduled activity to the 'scheduledActivities' collection
      await addDoc(collection(this.db, 'scheduledActivities'), scheduledActivity);
  }

  async updateScheduledActivity(id: string | undefined, updatedActivity: Activity, clientState: Client, changedAssets: Assets | null) {
      const docRef = doc(this.db, config.SCHEDULED_ACTIVITIES_COLLECTION, id ?? '');

      const activityWithParentId = { 
          ...updatedActivity,
          parentCollection: config.FIRESTORE_ACTIVE_USERS_COLLECTION,
      }
      const filteredActivity = Object.fromEntries(
          Object.entries(activityWithParentId).filter(([_, v]) => v !== undefined)
      );
      const updatedScheduledActivity = {
          cid: clientState.cid,
          scheduledTime: filteredActivity.time,
          activity: { ...filteredActivity, parentName: clientState.firstName + ' ' + clientState.lastName },
          changedAssets,
          usersCollectionID: config.FIRESTORE_ACTIVE_USERS_COLLECTION,
          status: 'pending',
      };
      await setDoc(docRef, updatedScheduledActivity, { merge: true });
  }
  
  async deleteScheduledActivity(id: string) {
      const docRef = doc(this.db, 'scheduledActivities', id);
      await deleteDoc(docRef);
  }

  /**
   * Compares two Client objects and returns an object containing only the assets that have changed.
   * This is useful for tracking what assets have been modified between two states of a client.
   * 
   * @param initialClientState - The original state of the client before changes
   * @param clientState - The current state of the client after changes
   * @returns An Assets object containing only the changed assets, or null if no changes
   */
  getChangedAssets = (initialClientState: Client | null, clientState?: Client | null) => {
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

  /**
   * Retrieves graph points for a specific client
   */
  async getClientGraphPoints(cid: string): Promise<GraphPoint[]> {
    try {
      const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
      const graphPointsCollectionRef = collection(clientRef, config.GRAPHPOINTS_SUBCOLLECTION);
      const querySnapshot = await getDocs(graphPointsCollectionRef);
      
      const graphPoints: GraphPoint[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        graphPoints.push({
          id: doc.id,
          time: data.time,
          amount: data.amount || 0,
          type: data.type,
          cashflow: data.cashflow || 0,
          account: data.account
        });
      });
      
      return graphPoints;
    } catch (error) {
      console.error('Error fetching graph points:', error);
      return [];
    }
  }

  /**
   * Generates a PDF Statement for a client given a start/end date.
   * The statement includes all activities in the specified date range.
  */
  public async generateStatementPDF(
    client: Client,
    startDate: Date,
    endDate: Date,
    selectedAccount: string // Added selectedAccount parameter
  ): Promise<void> {
    // 1. Find starting balance from graph points
    const graphPoints = await this.getClientGraphPoints(client.cid);
    
    // Find the last graph point before startDate with selectedAccount
    const startingPointArray = graphPoints
      .filter(point => {
        const pointDate = point.time instanceof Timestamp ? point.time.toDate() : point.time;
        return pointDate && 
               pointDate < startDate && 
               point.account === selectedAccount;
      })
      .sort((a, b) => {
        const dateA = a.time instanceof Timestamp ? a.time.toDate() : (a.time || new Date(0));
        const dateB = b.time instanceof Timestamp ? b.time.toDate() : (b.time || new Date(0));
        return dateB.getTime() - dateA.getTime(); // Sort descending to get most recent first
      });
    
    // Set starting balance (use the most recent point before startDate, or 0 if none exists)
    let runningBalance = startingPointArray.length > 0 ? startingPointArray[0].amount : 0;
    
    // 2. Get client's activities within the date range
    const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, client.cid);
    const activitiesCollection = collection(clientRef, config.ACTIVITIES_SUBCOLLECTION);
    
    let activitiesQuery;
    if (selectedAccount === "Cumulative") {
      activitiesQuery = query(activitiesCollection);
    } else {
      activitiesQuery = query(activitiesCollection, where("recipient", "==", selectedAccount));
    }
    const activitiesSnapshot = await getDocs(activitiesQuery);
    
    const activities: Activity[] = [];
    activitiesSnapshot.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        time: data.time,
        type: data.type,
        amount: data.amount || 0,
        parentDocId: client.cid,
      });
    });
    
    // Filter activities within date range
    const filteredActivities = activities.filter(activity => {
      const activityDate = activity.time instanceof Timestamp ? activity.time.toDate() : activity.time;
      return activityDate && activityDate >= startDate && activityDate <= endDate;
    });
    
    // Sort activities by date
    filteredActivities.sort((a, b) => {
      const dateA = a.time instanceof Timestamp ? a.time.toDate() : (a.time || new Date(0));
      const dateB = b.time instanceof Timestamp ? b.time.toDate() : (b.time || new Date(0));
      return dateA.getTime() - dateB.getTime();
    });
    
    // Create formatted activities with running balance
    const formattedActivities = filteredActivities.map(activity => {
      const activityDate = activity.time instanceof Timestamp ? activity.time.toDate() : activity.time;
      const amount = activity.amount || 0;
      
      // Update running balance based on activity type
      runningBalance = runningBalance + (activity.type == 'withdrawal'
        ? -1
        : (activity.type == 'profit'
          ? 0
          : 1)) * amount;
      
      return {
        date: activityDate ? formatPDFDate(activityDate) : 'N/A',
        type: activity.type || 'Transaction',
        amount: amount,
        formattedCashflow: formatCurrency(amount),
        balance: runningBalance
      };
    });
  
    // 3. Build the PDF document definition
    const docDefinition: any = {
      pageSize: 'LETTER',
      pageMargins: [40, 60, 40, 60],
      footer: (currentPage: number, pageCount: number) => {
        return {
          columns: [
            {
              text: `Page ${currentPage} of ${pageCount}`,
              alignment: 'center',
              margin: [0, 5, 0, 0],
            },
          ],
        };
      },
      content: [
        // Statement Header
        {
          text: 'Account Statement',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 15],
        },
        
        // Client Information Section
        {
          style: 'infoSection',
          margin: [0, 0, 0, 20],
          layout: {
            fillColor: function(i: number) { return (i % 2 === 0) ? '#f8f8f8' : null; }
          },
          table: {
            widths: ['50%', '50%'],
            body: [
              [
                { text: 'Investor:', style: 'labelText' }, 
                { text: `${client.firstName} ${client.lastName}`, style: 'valueText' }
              ],
              [
                { text: 'Client Since:', style: 'labelText' }, 
                { text: client.firstDepositDate ? formatPDFDate(client.firstDepositDate) : 'N/A', style: 'valueText' }
              ],
              [
                { text: 'Statement Period:', style: 'labelText' }, 
                { text: `${formatPDFDate(startDate)} - ${formatPDFDate(endDate)}`, style: 'valueText' }
              ],
            ]
          },
        },
        
        // Statement Summary
        {
          text: 'Statement Summary',
          style: 'subheader',
          margin: [0, 0, 0, 10],
        },
        {
          style: 'summaryTable',
          table: {
            widths: ['70%', '30%'],
            body: [
              [
                { text: 'Investment Account Total Balance:', style: 'labelText' }, 
                { text: formatCurrency(client.totalAssets || 0), style: 'valueText', alignment: 'right' }
              ],
            ]
          },
          layout: 'noBorders'
        },
        
        // Transaction History Table
        {
          text: 'Transaction History',
          style: 'subheader',
          margin: [0, 20, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              // Table Header
              [
                { text: 'Date', style: 'tableHeader', alignment: 'center' },
                { text: 'Type', style: 'tableHeader', alignment: 'center' },
                { text: 'Cashflow', style: 'tableHeader', alignment: 'center' },
                { text: 'Balance', style: 'tableHeader', alignment: 'center' },
              ],
              // Starting Balance Row
              [
                { text: 'Starting Balance', alignment: 'center' },
                { text: '', alignment: 'center' },
                { text: '', alignment: 'center' },
                { text: formatCurrency(startingPointArray.length > 0 ? startingPointArray[0].amount : 0), alignment: 'center' },
              ],
              // Table Rows
              ...formattedActivities.map((activity) => [
                { text: activity.date, alignment: 'center' },
                { text: toSentenceCase(activity.type), alignment: 'center' },
                { 
                  text: activity.formattedCashflow, 
                  alignment: 'center',
                },
                { 
                  text: formatCurrency(activity.balance), 
                  alignment: 'center',
                },
              ]),
            ],
          },
          // Full border layout
          layout: {
            hLineWidth: function() { return 1; },
            vLineWidth: function() { return 1; },
            hLineColor: function() { return '#dddddd'; },
            vLineColor: function() { return '#dddddd'; },
          },
          // Center the table
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
      ],
      
      // Styles
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          color: '#2B41B8',
        },
        subheader: {
          fontSize: 16,
          bold: true,
          margin: [0, 5, 0, 5],
        },
        small: {
          fontSize: 10,
        },
        tableHeader: {
          bold: true,
          fontSize: 12,
          color: 'black',
          fillColor: '#f8f8f8',
          margin: [0, 5, 0, 5],
        },
        labelText: {
          bold: true,
          fontSize: 11,
        },
        valueText: {
          fontSize: 11,
        },
        summaryTable: {
          margin: [0, 0, 0, 10],
        },
      },
    };
  
    // 4. Generate and open the PDF
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.open();
  }
}

export * from './models.ts'
export * from './utils.ts'