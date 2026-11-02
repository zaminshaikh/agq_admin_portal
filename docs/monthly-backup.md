# Monthly database mirror

`monthlyBackup` refreshes the named Firestore `backup` database from `(default)` at 02:00 America/Los_Angeles on the first day of every month. It never reads or writes `testing`.

The job uses a fixed, minute-aligned PITR read time for all source pages, copies every document including orphan subcollections, verifies all copied field values, then removes target documents absent from that source snapshot. It does not add metadata collections to either database. Existing backup security rules continue to deny client writes. The destination database must already exist and production PITR must remain enabled.

It also refreshes original Storage files under `backup/` and removes obsolete backup objects. `testing/`, `backup/`, and `.backup-control/` are excluded from source objects. Storage generations and checksums protect individual copies; Storage and Firestore do not share an atomic snapshot. Database image URLs retain their original values; backup objects provide recovery copies, not rewritten app configuration.

Backup is a monthly mirror, not a versioned archive. Changes appear during refresh, so restore only after a successful completion report at `gs://team-shaikh-app-52dc5.appspot.com/.backup-control/latest.json`. A failed refresh may be partial; retries are idempotent. No stale database records are deleted until a complete source copy has passed verification. A Storage lock prevents overlapping refreshes. Logs contain counts/status, not client fields.

Deploy this independent codebase with `firebase deploy --only functions:monthly-backup --config firebase.backup.json --project team-shaikh-app-52dc5`. It does not deploy portal/mobile functions. The runtime service account needs Firestore read/write access and object read/write/delete access on the existing Storage bucket. Run tests with `npm test --prefix functions-backup`.
