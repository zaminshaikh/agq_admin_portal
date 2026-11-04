import type { FirebaseApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

export const databaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID || '(default)'
export const isTesting = databaseId !== '(default)'
const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN
if (isTesting && !functionsOrigin) {
  throw new Error('A testing database requires VITE_FUNCTIONS_ORIGIN; production functions cannot be used.')
}

export const getPortalDatabase = (app: FirebaseApp) => getFirestore(app, databaseId)
export const getPortalFunctions = (app?: FirebaseApp) => getFunctions(app, functionsOrigin || 'us-central1')
export const portalStoragePath = (path: string) => isTesting ? `${databaseId}/${path}` : path
