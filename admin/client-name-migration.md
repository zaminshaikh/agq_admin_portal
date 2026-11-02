# Client Name migration

`migrate-client-names.cjs` renames the top-level Firestore field `accountName` to `clientName`, preserving its value, including custom edits. Existing nonempty `clientName` values take precedence. If neither name is populated, the script uses trimmed `name.first` and `name.last`, separated by a space. Separate personal names and all other fields remain unchanged. Records without a usable name are skipped.

Install the admin package dependencies, set `GOOGLE_APPLICATION_CREDENTIALS` to the service account JSON path, then run from the portal repository:

```sh
node admin/migrate-client-names.cjs
node admin/migrate-client-names.cjs --apply --backup /absolute/private/path/client-names.json
node admin/migrate-client-names.cjs
```

The default is a read-only preview. The target is the default database in the `.firebaserc` project and the active users collection in `config.json`. The credential project must match. Applying requires a new backup file; the script saves both previous field states before writing. Each transaction sets `clientName` and deletes `accountName` atomically, and skips records changed since the preview. Store the backup privately outside the repository. Output contains only counts, not client names. A subsequent dry-run should report zero candidates unless new accounts were added.

Update running portal instances to the new field when migrating so an older build cannot recreate `accountName`.

Validation: `node --test admin/migrate-client-names.test.cjs`.
