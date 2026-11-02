# Dashboard AUM history

The dashboard offers Combined, AGQ, and AK1 views, plus YTD, one-year, all-time, and custom date ranges. Current asset totals are shown separately from the recorded historical balance. Dates are UTC and the horizontal axis uses elapsed time.

`getAumHistory` requires an admin read/write/admin claim. It reads only the configured active client collection and each client's `graphpoints` subcollection, selecting `account == Cumulative`. It does not follow linked-user access lists or read the old top-level graphpoints collection, so archived records and per-account points cannot double-count the same assets.

Each graphpoint replaces that client's balance for its fund. Other client/fund balances are carried forward. Multiple points at the same event timestamp use Firestore creation time to select the last written cumulative balance, matching the existing sequential graphpoint generator. The latest combined value at each UTC day is AGQ plus AK1; currency arithmetic uses integer cents. Range changes retain the opening balance rather than resetting to zero.

Historical data is not silently reconciled to current assets. The UI reports differences, invalid points, and funded client/fund combinations without history. The old root graphpoints series is tagged `playground`, stops in January 2025, and has invalid negative totals; it is deliberately excluded. This feature reads existing records without regenerating or editing history.

Deploy `getAumHistory` with the portal for production. It is also exported by the isolated localhost testing server. Existing unrelated portal type-check errors remain.

Validation: build functions and run `node --test functions/test/aum.test.cjs`; build the portal with `npm run build -- --mode testing`. The tests cover cumulative replacement, duplicate/account-point exclusion, fund carry-forward, same-time updates, invalid/future data, withdrawals, cents, range boundaries, and endpoint permissions.
