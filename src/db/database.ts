import { collection, getFirestore, getDocs, getDoc, doc, Firestore, CollectionReference, DocumentData, addDoc, setDoc, deleteDoc, collectionGroup, DocumentSnapshot, where, query, writeBatch} from 'firebase/firestore'
import { app } from '../App.tsx'
import 'firebase/firestore'
import config from '../../config.json'
import 'firebase/firestore'
import { Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
import { formatDate, toSentenceCase } from 'src/utils/utilities.ts'
import { Client, AssetDetails, Activity, ScheduledActivity, Assets, GraphPoint} from './models.ts'
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts';
import { formatCurrency, formatPDFDate } from './utils.ts'
import { agqTopLogo, agqWatermarkLogo } from './logos.ts'

/**
 * DatabaseService
 * -------------------------------------------------------------------------------
 * Central Firestore & Cloud Functions wrapper for the admin portal.
 *
 * This service centralizes data-layer logic so UI components remain agnostic 
 * of the underlying database structure. It handles:
 * 
 * • Client management - CRUD operations, asset tracking, and link/unlink operations
 * • Activity tracking - Financial transactions and their lifecycle
 * • Scheduled activities - Future-dated operations
 * • Financial calculations - YTD values, running balances, reporting
 * • Document generation - PDF statement creation
 */

// Get the correct reference to pdfMake
const pdfMake = (pdfMakeModule as any).default || pdfMakeModule as any;
// Properly initialize the virtual file system
pdfMake.vfs = (pdfFontsModule as any).pdfMake?.vfs;

// Initialize Firebase Functions
const functions = getFunctions();

export class DatabaseService {
  /**
   * Firestore database instance from the app initialization.
   */
  private db: Firestore = getFirestore(app);
  
  /**
   * Collection reference for the active users/clients.
   */
  private clientsCollection: CollectionReference<DocumentData, DocumentData>;
  
  /**
   * Array to track client IDs for collision detection during generation.
   */
  private cidArray: string[];

  /**
   * Initializes the DatabaseService with references to Firestore.
   * Sets up the clients collection reference and initializes the CID array.
   */
  constructor() {
      this.clientsCollection = collection(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION);
      this.cidArray = [];
      this.initCIDArray();
  }

  /*=============================================================================
   * UTILITY METHODS
   *============================================================================*/

  /**
   * Asynchronously initializes the cidArray with all existing Client IDs.
   * This ensures new generated client IDs will not collide with existing ones.
   */
  async initCIDArray() {
      const querySnapshot = await getDocs(this.clientsCollection);
      for (const doc of querySnapshot.docs) {
          this.cidArray.push(doc.id);
      }
  }

  /**
   * Hashes an input string to generate a unique 8-digit client ID.
   * Uses FNV-1a hashing with collision resolution.
   *
   * @param input - String to hash (typically contains client identifiers)
   * @returns A unique 8-digit ID that doesn't collide with existing IDs
   */
  async hash(input: string): Promise<string> {
      /**
       * Internal FNV-1a hash implementation for string input.
       * 
       * @param input - String to hash
       * @returns 32-bit unsigned integer hash value
       */
      function fnv1aHash(input: string): number {
          let hash = 2166136261; // FNV offset basis
          for (let i = 0; i < input.length; i++) {
              hash ^= input.charCodeAt(i);
              hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
          }
          return hash >>> 0; // Convert to unsigned 32-bit integer
      }

      /**
       * Generates a unique ID and handles collisions with existing IDs.
       * 
       * @param baseID - Initial ID generated from the hash
       * @returns A unique ID that doesn't exist in cidArray
       */
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

  /*=============================================================================
   * CLIENT MANAGEMENT
   *============================================================================*/

  /**
   * Fetches all clients from the active users collection in Firestore.
   * For each client, retrieves their associated assets and calculates totals.
   * 
   * @returns An array of Client objects with complete profile and asset information
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

  /**
   * Converts Firestore document snapshots into a Client object.
   * Processes client data and associated asset documents.
   *
   * @param clientSnapshot - The client document snapshot
   * @param generalAssetsSnapshot - The general assets document snapshot
   * @param agqAssetsSnapshot - The AGQ assets document snapshot
   * @param ak1AssetsSnapshot - The AK1 assets document snapshot
   * @returns A Client object or null if the client document doesn't exist
   */
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

      /**
       * Parses asset data from Firestore into the application's AssetDetails structure.
       * 
       * @param assetsData - Raw asset data from Firestore
       * @returns Object with asset types as keys and AssetDetails as values
       */
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

  /**
   * Retrieves a specific client by Client ID (CID).
   * Includes all associated asset information.
   * 
   * @param cid - The Client ID to retrieve
   * @returns A Client object or null if not found
   */
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
   * Creates a new client in the Firestore database with a unique CID.
   * Generates a CID based on client identifiers, then sets up the client document
   * and associated asset structure.
   *
   * @param newClient - The client object to create (without CID)
   * @returns Promise that resolves when the client is created
   */
  createClient = async (newClient: Client) => {
      // Using the passed email, first name, and initial email to create a unique 8 digit CID using our hash function
      const newClientDocId = await this.hash(newClient.firstName + '-' + newClient.lastName + '-' + newClient.initEmail);

      newClient = {...newClient, cid: newClientDocId};
      // Since the CID is unique, this will create a unique client in the database
      await this.setClient(newClient);
  }

  /**
   * Sets or updates a client document and all its associated data in Firestore.
   * Handles the client profile, asset documents, activities, and graph points.
   * 
   * @param client - Complete client object with all data
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

      // Update/Create activity subcollection for client
      const activityCollectionRef = collection(clientRef, config.ACTIVITIES_SUBCOLLECTION)

      const graphCollectionRef = collection(clientRef, config.ASSETS_SUBCOLLECTION, config.ASSETS_GENERAL_DOC_ID, config.GRAPHPOINTS_SUBCOLLECTION)

      // If activities exist, add them to the subcollection
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

              return addDoc(activityCollectionRef, filteredActivity);
          });
          // Use Promise.all to add all activities concurrently
          await Promise.all(promise);
      }
          
      // If graph points exist, add them to the subcollection
      if (client.graphPoints !== undefined) {
          // Add all the graph points to the subcollection
          const promise = client.graphPoints.map((graphPoint) => addDoc(graphCollectionRef, graphPoint));
          // Use Promise.all to add all graph points concurrently
          await Promise.all(promise);
      }
  }

  /**
   * Updates the asset subcollection for a client.
   * Writes out three asset documents (AGQ, AK1, General) and maintains running totals.
   *
   * @param client - Client object with assets to update
   */
  async setAssets(client: Client) {
      const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, client.cid);
      const assetCollectionRef = collection(clientRef, config.ASSETS_SUBCOLLECTION);

      // Get the assets for each fund
      const agqAssets = client.assets.agq;
      const ak1Assets = client.assets.ak1;

      /**
       * Prepares an asset document for storage in Firestore.
       * Calculates total value and formats dates correctly.
       * 
       * @param assets - Asset data for a fund 
       * @param fundName - Name of the fund
       * @returns Prepared document with proper formatting
       */
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

      // Prepare asset documents
      const agqDoc = prepareAssetDoc(agqAssets, 'AGQ');
      const ak1Doc = prepareAssetDoc(ak1Assets, 'AK1');

      // Calculate total across all funds for the general document
      const general = {
          ytd: client.ytd ?? 0,
          totalYTD: client.totalYTD ?? 0,
          total: agqDoc.total + ak1Doc.total,
      };

      // Create references to each asset document
      const agqRef = doc(assetCollectionRef, config.ASSETS_AGQ_DOC_ID);
      const ak1Ref = doc(assetCollectionRef, config.ASSETS_AK1_DOC_ID);
      const genRef = doc(assetCollectionRef, config.ASSETS_GENERAL_DOC_ID);

      // Write the asset documents
      await setDoc(agqRef, agqDoc);
      await setDoc(ak1Ref, ak1Doc);
      await setDoc(genRef, general);
  }

  /**
   * Deletes a client and all associated data from Firestore.
   * 
   * @param cid - Client ID to delete
   */
  deleteClient = async (cid: string | undefined) => {
      if (cid === undefined || cid === null ||cid === '' ) { 
          console.log('No client ID provided for deletion'); 
          return;
      }
      const clientRef = doc(this.db, config.FIRESTORE_ACTIVE_USERS_COLLECTION, cid);
      await deleteDoc(clientRef);
  }

  /**
   * Unlinks a client's user account using a Cloud Function.
   * Removes the association between the client and a Firebase Authentication user.
   * 
   * @param client - Client object containing the CID and UID to unlink
   * @throws Error if the unlink operation fails
   */
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
   * Updates an existing client in the Firestore database.
   * Wrapper for setClient to maintain semantic clarity.
   * 
   * @param updatedClient - Client object with updated data
   */
  updateClient = async (updatedClient: Client) => {
      await this.setClient(updatedClient);
  }

  /*=============================================================================
   * YTD METHODS
   *============================================================================*/

  /**
   * Calculates Year-to-Date (YTD) performance for a client via Cloud Function.
   * 
   * @param cid - Client ID to calculate YTD for
   * @returns The calculated YTD value
   * @throws Error if the calculation fails
   */
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

  /**
   * Calculates Total Year-to-Date (YTD) performance for a client via Cloud Function.
   * This is the cumulative performance across all years.
   * 
   * @param cid - Client ID to calculate Total YTD for
   * @returns The calculated Total YTD value
   * @throws Error if the calculation fails
   */
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

  /*=============================================================================
   * ACTIVITY MANAGEMENT
   *============================================================================*/

  /**
   * Retrieves all activities across all clients.
   * Uses collectionGroup query to fetch activities from all clients' subcollections.
   * 
   * @returns Array of activities with formatted dates and parent references
   */
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

  /**
   * Creates a new activity for a specific client.
   * 
   * @param activity - Activity object to create
   * @param cid - Client ID to associate with the activity
   */
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

  /**
   * Updates an existing activity document.
   * 
   * @param activity - Updated activity data
   * @param activityDocId - Optional document ID of the activity
   * @param cid - Client ID the activity belongs to
   */
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

  /**
   * Deletes an activity document.
   * 
   * @param activity - Activity to delete (must include id and parentDocId)
   */
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

  /**
   * Deletes notifications related to a specific activity.
   * Used when an activity is deleted to clean up associated notifications.
   * 
   * @param activity - Activity whose notifications should be deleted
   */
  async deleteNotification(activity: Activity) {
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

  /*=============================================================================
   * SCHEDULED ACTIVITY MANAGEMENT
   *============================================================================*/

  /**
   * Retrieves all scheduled activities from Firestore.
   * These are activities set to be executed at a future time.
   * 
   * @returns Array of scheduled activities with processed dates and assets
   */
  getScheduledActivities = async () => {
      const scheduledActivitiesCollection = collection(this.db, config.SCHEDULED_ACTIVITIES_COLLECTION);
      // Query for scheduled activities matching the current users collection
      const q = query(scheduledActivitiesCollection, where('usersCollectionID', '==', config.FIRESTORE_ACTIVE_USERS_COLLECTION));
      const querySnapshot = await getDocs(q);

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

  /**
   * Schedules a new activity for future execution.
   * Creates a document in the scheduledActivities collection.
   *
   * @param activity - Activity to schedule
   * @param clientState - Client the activity belongs to
   * @param changedAssets - Projected asset state after activity execution
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

  /**
   * Updates an existing scheduled activity.
   * 
   * @param id - ID of the scheduled activity to update
   * @param updatedActivity - New activity data
   * @param clientState - Associated client
   * @param changedAssets - Updated projected asset state
   */
  async updateScheduledActivity(id: string | undefined, updatedActivity: Activity, clientState: Client, changedAssets: Assets | null) {
      const docRef = doc(this.db, config.SCHEDULED_ACTIVITIES_COLLECTION, id ?? '');

      const activityWithParentId = { 
          ...updatedActivity,
          parentCollection: config.FIRESTORE_ACTIVE_USERS_COLLECTION,
      };
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
  
  /**
   * Deletes a scheduled activity.
   * 
   * @param id - ID of the scheduled activity to delete
   */
  async deleteScheduledActivity(id: string) {
      const docRef = doc(this.db, 'scheduledActivities', id);
      await deleteDoc(docRef);
  }

  /*=============================================================================
   * REPORTING & STATEMENTS
   *============================================================================*/

  /**
   * Retrieves graph points for a specific client.
   * Used for generating financial charts and statements.
   * 
   * @param cid - Client ID to fetch graph points for
   * @returns Array of graph points or empty array if none found
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
   * Generates a PDF statement for a client within a date range.
   * Includes account balance, transactions, and running totals.
   * 
   * @param client - Client to generate statement for
   * @param startDate - Beginning date for the statement period
   * @param endDate - Ending date for the statement period
   * @param selectedAccount - Account to filter transactions for
   */
  public async generateStatementPDF(
      client: Client,
      startDate: Date,
      endDate: Date,
      selectedAccount: string
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
              isDividend: data.isDividend || false,
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
              : (activity.type == 'profit' && !activity.isDividend
                  ? 0
                  : 1)) * amount;
          
          return {
              date: activityDate ? formatPDFDate(activityDate) : 'N/A',
              type: activity.type || 'Transaction',
              amount: amount,
              formattedCashflow: (activity.type === 'withdrawal' ? '-' : '') + formatCurrency(amount),
              balance: runningBalance
          };
      });

      // Find the last graph point before or at endDate with selectedAccount
      const endingPointArray = graphPoints
          .filter(point => {
              const pointDate = point.time instanceof Timestamp ? point.time.toDate() : point.time;
              return pointDate && 
                    pointDate <= endDate && 
                    point.account === selectedAccount;
          })
          .sort((a, b) => {
              const dateA = a.time instanceof Timestamp ? a.time.toDate() : (a.time || new Date(0));
              const dateB = b.time instanceof Timestamp ? b.time.toDate() : (b.time || new Date(0));
              return dateB.getTime() - dateA.getTime(); // Sort descending to get most recent first
          });
      const endingBalance = endingPointArray.length > 0
          ? endingPointArray[0].amount
          : (formattedActivities.length > 0 ? formattedActivities[formattedActivities.length - 1].balance : runningBalance);
  
      // 3. Build the PDF document definition
      const docDefinition: any = {
          pageSize: 'LETTER',
      pageMargins: [40, 60, 40, 60],
      background: function (_currentPage: number, pageSize: any) {
          /*
            * Watermark: 110 % page width, rotated –45 °, and **truly centered**.
            * Original logo aspect ratio ≈ 28 : 16 (width : height).
            */
          const wmWidth  = pageSize.width * 0.7;
          const wmRatio  = 16 / 28;                 // height / width
          const wmHeight = wmWidth * wmRatio;

          return {
              image: agqWatermarkLogo,
              width: wmWidth,
              opacity: 0.1,
              absolutePosition: {
                  x: (pageSize.width  - wmWidth)  / 2,
                  y: (pageSize.height - wmHeight) / 2
              }
          };
      },
      footer: (_currentPage: number, _pageCount: number) => {
        return {
          columns: [
            {
              text: [
                { text: '195 International Parkway, Suite 103, Lake Mary, FL 32746\n', style: 'footerText' },
                { text: 'Contact: management@agqconsulting.com', style: 'footerText' }
              ],
              alignment: 'center',
              margin: [0, 20, 0, 0], // Increased top margin for better spacing
            },
          ],
        };
      },
      content: [
        // AGQ Letterhead Logo
        {
          image: agqTopLogo,
          width: 110,
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
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
                              { text: formatCurrency(endingBalance), style: 'valueText', alignment: 'right' }
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
                  color: '#0A3464',
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
              footerText: { // Style for the address and contact info
                  fontSize: 10,
                  color: '#0A3464', // Blue color like the header
                  italics: true,
              },
              footerPageNum: { // Style for the page number
                  fontSize: 10,
                  color: '#0A3464',
              }
          },
      };
  
      // 4. Generate and open the PDF
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.open();
  }
}

export * from './models.ts'
export * from './utils.ts'