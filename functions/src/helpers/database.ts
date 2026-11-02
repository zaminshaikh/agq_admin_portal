import { getFirestore } from 'firebase-admin/firestore';

export const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
export const getDatabase = () => getFirestore(databaseId);
export const contentStoragePath = (path: string) => databaseId === '(default)' ? path : `${databaseId}/${path}`;
