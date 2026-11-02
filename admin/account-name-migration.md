# Account Name backfill

`backfill-account-names.cjs` fills missing, null, or blank `accountName` fields with trimmed `name.first` and `name.last`, separated by a space. It preserves nonempty account names, first/last names, and all other fields. Records without a usable personal name are skipped. Each write checks the current document in a transaction, so concurrent edits are preserved.

Install the admin package dependencies, set `GOOGLE_APPLICATION_CREDENTIALS` to the service account JSON path, then run from the portal repository:

```sh
node admin/backfill-account-names.cjs
node admin/backfill-account-names.cjs --apply --backup /absolute/private/path/account-names.json
node admin/backfill-account-names.cjs
```

The default is a read-only preview. The target is the default database in the `.firebaserc` project and the active users collection in `config.json`. The credential project must match. Applying requires a new backup file; the script saves prior account-name field states before writing. Store this backup privately outside the repository. Output contains only counts, not client names. A subsequent dry-run should report zero candidates unless new accounts were added.

Validation: `node --test admin/backfill-account-names.test.cjs`.
