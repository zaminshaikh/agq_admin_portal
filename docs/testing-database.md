# Testing database and localhost preview

The named Firestore database `testing` is a full point-in-time clone of `(default)` in `team-shaikh-app-52dc5`, including indexes and subcollections. The active client collection remains `users`; no `testUsers` collection is needed for ongoing testing. First and last names remain under `name.first` and `name.last`, alongside the portal's `clientName` field.

The browser selects `testing` through `.env.testing`. Every portal callable goes to the local Functions server. That server explicitly selects the same database and refuses to start against `(default)`. File operations use the `testing/` prefix in the existing Storage bucket. The initial 91 files were copied and checksum-verified. Test content image references are updated to the copied images.

Authentication is shared with the Firebase project: sign in using an existing admin account. Account creation/deletion, email verification changes, admin permission changes, user linking/unlinking, and invitation delivery are blocked by the testing entrypoint. It exports no background triggers or scheduled jobs. These three ticket features can be tested without sending customer messages or changing production clients/files.

## Run locally

Use Node 22 and install the portal and functions dependencies. Build functions, then make the function dependencies available to the small preview entrypoint:

```sh
npm --prefix functions run build
ln -s ../functions/node_modules functions-testing/node_modules
```

Set `GOOGLE_APPLICATION_CREDENTIALS` to the local service account JSON path (never commit the key). Run in separate terminals:

```sh
firebase emulators:start --only functions --config firebase.testing.json --project team-shaikh-app-52dc5
npm run start -- --mode testing --host 127.0.0.1 --port 3000 --strictPort
```

Open `http://127.0.0.1:3000/` and confirm the Testing banner before editing. Both servers must be running. Missing local functions fail instead of falling back to production. This is a cloud testing database, not a local Firestore emulator; test changes persist across restarts.

The testing rules in `firestore.testing.rules` allow admin claim holders to read/write ordinary data and keep content writes behind validated callables. Deploy them only to the named database. The default database's deployed rules are separate and are not changed by this setup.

## Validation

```sh
npm run build -- --mode testing
npm --prefix functions run build
node --test functions/test/appContent.test.cjs functions/test/testingEnvironment.test.cjs
```

The clone is a snapshot, not continuous synchronization. Future production edits do not appear in testing automatically. Do not run a refresh over test edits without deciding what to preserve first.

## Backup database

The separate named database `backup` mirrors the regular database. The retired top-level `backup`, `testUsers`, and `graphpoints` collections are removed from the regular, testing, and backup databases after the initial full copies were verified. Client-level graphpoint histories remain intact. The backup database has administrator-only client reads and no client writes, using `firestore.backup.rules`, and is never selected by localhost.

Original Storage files are copied under `backup/`. The separate monthly-backup codebase refreshes the backup on the first of each month at 02:00 America/Los_Angeles, verifies copied documents, and removes stale target records. Testing is never refreshed by that job.
