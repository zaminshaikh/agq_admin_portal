#!/usr/bin/env node
// Dry-run by default. Rename accountName to clientName; preserve personal names.
const fs = require('node:fs');
const path = require('node:path');

function proposedName(data) {
  if (data.clientName != null && typeof data.clientName !== 'string') return null;
  if (data.clientName?.trim()) return Object.hasOwn(data, 'accountName') ? data.clientName : null;
  if (data.accountName != null && typeof data.accountName !== 'string') return null;
  if (data.accountName?.trim()) return data.accountName;
  const parts = [data.name?.first, data.name?.last];
  if (parts.some(value => value != null && typeof value !== 'string')) return null;
  return parts.map(value => value?.trim() || '').filter(Boolean).join(' ') || null;
}

async function migrate(db, collection, apply, backupPath, deleteField) {
  const snapshot = await db.collection(collection).get();
  const candidates = snapshot.docs.filter(doc => proposedName(doc.data()) !== null);
  const result = { total: snapshot.size, candidates: candidates.length, updated: 0, skipped: snapshot.size - candidates.length };
  if (!apply) return result;
  if (deleteField === undefined) throw new Error('A Firestore delete-field sentinel is required');
  // Persist the exact previous field state before any writes, outside the repository.
  fs.writeFileSync(backupPath, JSON.stringify({ collection, createdAt: new Date().toISOString(), records: candidates.map(doc => {
    const data = doc.data();
    return { path: doc.ref.path, hadAccountName: Object.hasOwn(data, 'accountName'), accountName: data.accountName ?? null,
      hadClientName: Object.hasOwn(data, 'clientName'), clientName: data.clientName ?? null, proposedClientName: proposedName(data) };
  }) }, null, 2), { flag: 'wx', mode: 0o600 });
  for (const doc of candidates) {
    const updated = await db.runTransaction(async transaction => {
      const current = await transaction.get(doc.ref);
      if (!current.exists) return false;
      const name = proposedName(current.data());
      // Avoid applying stale preview data if a person edits this record meanwhile.
      if (!name || name !== proposedName(doc.data()) || current.data().accountName !== doc.data().accountName
        || current.data().clientName !== doc.data().clientName) return false;
      transaction.update(doc.ref, { clientName: name, ...(Object.hasOwn(current.data(), 'accountName') ? { accountName: deleteField } : {}) });
      return true;
    });
    if (updated) result.updated++; else result.skipped++;
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath) throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON path');
  const credential = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  const projectId = JSON.parse(fs.readFileSync(path.join(__dirname, '../.firebaserc'), 'utf8')).projects.default;
  if (credential.project_id !== projectId) throw new Error('Credential project does not match .firebaserc');
  const collection = require('../config.json').FIRESTORE_ACTIVE_USERS_COLLECTION;
  const backupPath = args[args.indexOf('--backup') + 1];
  if (apply && (!args.includes('--backup') || !path.isAbsolute(backupPath))) throw new Error('--apply requires --backup /absolute/private/path.json');
  const admin = require('firebase-admin');
  admin.initializeApp({ credential: admin.credential.cert(credential), projectId });
  try {
    console.log(JSON.stringify({ projectId, database: '(default)', collection, mode: apply ? 'apply' : 'dry-run' }));
    console.log(JSON.stringify(await migrate(admin.firestore(), collection, apply, backupPath, admin.firestore.FieldValue.delete())));
  } finally { await admin.app().delete(); }
}
module.exports = { proposedName, migrate };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
