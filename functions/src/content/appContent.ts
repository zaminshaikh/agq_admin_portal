import { getDatabase, contentStoragePath } from '../helpers/database';
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { createHash, randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { basename, resolve } from 'path';
import { checkAdminPermission } from '../helpers/adminPermissions';
import catalog from './catalog.json';
import { defaultTexts, entries, expectedVersion, imageType, ImageValue, validateText } from './validation';

const document = () => getDatabase().doc('appContent/published');
const options = { memory: '512MB' as const, timeoutSeconds: 120 };
function invalid(error: unknown): never {
  if (error instanceof functions.https.HttpsError) throw error;
  throw new functions.https.HttpsError('invalid-argument', error instanceof Error ? error.message : 'Invalid content');
}
async function storeImage(path: string, bytes: Buffer, contentType: string, token: string = randomUUID()): Promise<ImageValue> {
  path = contentStoragePath(path);
  const bucket = admin.storage().bucket();
  await bucket.file(path).save(bytes, { resumable: false, metadata: {
    contentType, cacheControl: 'public,max-age=31536000,immutable',
    metadata: { firebaseStorageDownloadTokens: token },
  } });
  return { url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`, contentType };
}
async function defaultImage(id: string): Promise<ImageValue> {
  const entry = entries.get(id);
  if (!entry || entry.kind !== 'image') throw new functions.https.HttpsError('invalid-argument', 'Unknown image field');
  const name = basename(entry.defaultValue);
  const bytes = await readFile(resolve(__dirname, '../../../assets/app-content', name));
  const digest = createHash('sha256').update(bytes).digest('hex');
  const type = name.endsWith('.svg') ? 'image/svg+xml' : imageType(bytes);
  return storeImage(`app-content/defaults/${digest}/${name}`, bytes, type, digest);
}
async function initialImages(existing: Record<string, ImageValue> = {}): Promise<Record<string, ImageValue>> {
  const result: Record<string, ImageValue> = {};
  // Bounded batches avoid overloading storage on the first publish.
  const images = catalog.filter(entry => entry.kind === 'image' && !Object.prototype.hasOwnProperty.call(existing, entry.id));
  for (let i = 0; i < images.length; i += 6) {
    await Promise.all(images.slice(i, i + 6).map(async e => { result[e.id] = await defaultImage(e.id); }));
  }
  return result;
}

/** Admin SDK migration helper, not a deployed endpoint. Preserves all published edits. */
export async function seedAppContentDefaults(actor: string): Promise<{ changed: boolean; version: number }> {
  const before = (await document().get()).data();
  const images = await initialImages(before?.images ?? {});
  return getDatabase().runTransaction(async transaction => {
    const previous = (await transaction.get(document())).data();
    const complete = catalog.every(entry => Object.prototype.hasOwnProperty.call(
      entry.kind === 'image' ? previous?.images ?? {} : previous?.texts ?? {}, entry.id));
    if (complete) return { changed: false, version: previous?.version ?? 0 };
    const version = (previous?.version ?? 0) + 1;
    transaction.set(document(), {
      ...previous, version,
      texts: { ...defaultTexts, ...previous?.texts },
      images: { ...images, ...previous?.images },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: actor,
    });
    return { changed: true, version };
  });
}

/** Admin-only editing; readers (including signup screens) use the public document. */
export const getAppContentForAdmin = functions.https.onCall(async (_data, context) => {
  checkAdminPermission(context, 'admin');
  const snapshot = await document().get();
  const data = snapshot.data();
  return { version: data?.version ?? 0, texts: { ...defaultTexts, ...data?.texts }, images: data?.images ?? {} };
});

export const saveAppContent = functions.runWith(options).https.onCall(async (data, context) => {
  checkAdminPermission(context, 'admin');
  let version: number;
  const changes: Record<string, string> = {};
  try {
    version = expectedVersion(data?.baseVersion);
    if (!data?.texts || typeof data.texts !== 'object' || Array.isArray(data.texts)) throw new Error('Text changes are required');
    for (const [id, value] of Object.entries(data.texts)) changes[id] = validateText(id, value);
  } catch (error) { return invalid(error); }
  const defaults = version === 0 ? await initialImages() : {};
  return getDatabase().runTransaction(async transaction => {
    const snapshot = await transaction.get(document());
    const previous = snapshot.data();
    if ((previous?.version ?? 0) !== version) throw new functions.https.HttpsError('aborted', 'Content changed since you opened it. Reload before saving.');
    const texts = { ...defaultTexts, ...previous?.texts, ...changes };
    if (Buffer.byteLength(JSON.stringify(texts), 'utf8') > 350000) throw new functions.https.HttpsError('invalid-argument', 'The text catalog is too large');
    const next = { version: version + 1, texts, images: { ...defaults, ...previous?.images }, updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: context.auth!.uid };
    transaction.set(document(), next);
    return { version: next.version, texts, images: next.images };
  });
});

export const updateAppImage = functions.runWith(options).https.onCall(async (data, context) => {
  checkAdminPermission(context, 'admin');
  let version: number;
  let bytes: Buffer | undefined;
  let contentType: string | undefined;
  try {
    version = expectedVersion(data?.baseVersion);
    if (entries.get(data?.id)?.kind !== 'image') throw new Error('Unknown image field');
    if (version === 0) throw new Error('Publish the default content before uploading images');
    if (data.reset !== true) {
      if (typeof data.base64 !== 'string' || data.base64.length > 7 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data.base64)) throw new Error('Choose an image up to 5 MB');
      bytes = Buffer.from(data.base64, 'base64');
      contentType = imageType(bytes);
    }
  } catch (error) { return invalid(error); }
  const before = await document().get();
  if (before.data()?.version !== version) throw new functions.https.HttpsError('aborted', 'Content changed. Reload before saving.');
  const uploadPath = `app-content/uploads/${data.id}/${randomUUID()}`;
  const image = data.reset === true ? await defaultImage(data.id) : await storeImage(uploadPath, bytes!, contentType!);
  try {
    return await getDatabase().runTransaction(async transaction => {
      const snapshot = await transaction.get(document());
      const previous = snapshot.data();
      if (previous?.version !== version) throw new functions.https.HttpsError('aborted', 'Content changed. Reload before saving.');
      const images = { ...previous.images, [data.id]: image };
      transaction.update(document(), { images, version: version + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: context.auth!.uid });
      return { version: version + 1, texts: { ...defaultTexts, ...previous.texts }, images };
    });
  } catch (error) {
    // Delete only this unreferenced upload; never delete the prior published image.
    if (data.reset !== true && error instanceof functions.https.HttpsError && error.code === 'aborted') {
      await admin.storage().bucket().file(contentStoragePath(uploadPath)).delete().catch(() => undefined);
    }
    throw error;
  }
});
