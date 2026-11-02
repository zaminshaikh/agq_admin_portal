# Portal behavior preservation

Run `npm run test:preservation` after installing portal dependencies. It runs the **same 19 behavioral tests** against the original portal commit `10c9a7488234351adce2b720f568d1ebbc051924`, then against the current checkout. Either failure fails the command. The baseline is read with `git show`, without checking out or editing the old code. `PORTAL_BASELINE` can explicitly select a different reviewed baseline.

To verify an integration checkout containing all ticket branches:

```sh
PORTAL_SOURCE_ROOT=/path/to/localhost-preview npm run test:preservation
```

Coverage includes legacy client reads and missing-field defaults, separate first/last name writes for the mobile app, fund amounts and dates, active-user activity queries, activity writes and audit fields, scheduled activities, all four performance-calculation callable contracts and failures, unlink payloads and failures, permission levels, admin record/claim checks, and statement recipient selection and cash-flow calculations. PDF output delivery is accepted as either the original open action or the intentionally introduced download; uploading is disabled for this preservation case.

Firebase, file downloads, and PDF delivery are isolated fakes. The suite executes the actual TypeScript services and checks their results and outgoing requests. It does not contact production, send emails, or write client documents. These are targeted contract regressions, not a claim that every screen or production rule is covered. Feature tests separately cover intended changes such as Client Name, content, test-client exclusion, and statement uploads.

## Testing rules regression

Install isolated dependencies with `npm ci --prefix tests/rules`. Start a local Firestore emulator on port 8187 (or set `FIRESTORE_EMULATOR_HOST=127.0.0.1:PORT`), then run:

```sh
npm test --prefix tests/rules
```

Use only the synthetic project `demo-agq-regression`; the tests enforce a loopback host. The suite reproduces the denied activity collection-group query under the original testing rules and verifies it succeeds for read/write/admin roles after the fix. Anonymous/client denial, read-only write denial, writer access, public content reads, and direct content-write denial must pass both before and after. The database-name matcher is adapted for the emulator's default database; the query rules are unchanged.

## Verified result

19/19 tests passed on the original portal and on the combined localhost preview. Both emulator rules scenarios passed. Browser fixtures also verified content permissions, saved drafts, protected placeholders, test-client editing/filtering, save-failure behavior, AUM refresh, and the checked-by-default optional statement upload. Browser fixtures mock external services; a signed-in localhost smoke test remains useful for deployment/integration issues.
