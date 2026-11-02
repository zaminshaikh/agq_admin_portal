# Mobile app content

Administrators can edit mobile app copy, contact details, and artwork at **App Content** in the portal. The catalog contains 59 editable messages and two profile photos, the Sonny and Kash portraits. Existing content is the default. Text uses plain text, with named placeholders for client-specific values. Changing content never changes client records, authentication error codes, transaction identifiers, navigation routes, or formatting rules.

The first **Publish content** stores the full text catalog in `appContent/published` and uploads all default artwork to Firebase Storage. The Firestore document holds text and image URLs/MIME types; binary images remain in Storage. It contains public content only and is readable before login. Writes use administrator-only callable functions, validate the catalog, and require the editor's current version. Reload after a conflict; unpublished edits remain visible until you reload.

Image replacement accepts PNG, JPEG, and WebP up to 5 MB. Bundled SVG defaults can be restored; arbitrary SVG uploads are not accepted. Each replacement gets a new URL. Published images remain available for apps with cached content. Unreferenced uploads are removed only after a confirmed publication conflict.

## Release

1. Review the rules against the deployed rules. The added `appContent` rule allows public reads of `published` and denies all direct client writes. The existing rule for unrelated collections is preserved; it is not a new access policy for those collections.
2. Build and deploy `getAppContentForAdmin`, `saveAppContent`, and `updateAppImage`, the Firestore rules, and portal hosting. Deploying only hosting is insufficient.
3. Sign in as an administrator, open **App Content**, and publish the defaults once.
4. Release the companion mobile PR. Existing app versions continue using bundled content; this feature requires the mobile update. Updated apps listen for changes, cache the last valid config locally, and fall back to bundled text/images offline or when image downloads fail.

No deployment or live content writes are performed by the tests.

### Initialize with the Admin SDK

To populate the database before releasing the portal, build functions and set `GOOGLE_APPLICATION_CREDENTIALS` to the project's service account JSON path. From the portal root:

```sh
npm --prefix functions run build
node functions/scripts/seed-app-content.cjs
node functions/scripts/seed-app-content.cjs --apply --backup /absolute/private/path/app-content.json
node functions/scripts/seed-app-content.cjs
```

The first command invocation is a read-only preview. Applying saves the previous published document to a private file, uploads missing bundled defaults to Storage, and adds missing text/image entries in a transaction. Existing edits are preserved. Rerunning against a complete catalog performs no writes. The script checks the credential project against `.firebaserc` and uses the default Firestore database. This initializes data only; callable functions and rules still need deployment for the released portal. After seeding, skip the initial Publish step above.

## Validation

- `npm --prefix functions run test:content` tests permission checks, catalog validation, first publish, conflicts, and image replacement/reset using mocked Firestore and Storage.
- `npm run build` builds the portal.
- Mobile: `flutter test test/content/app_content_test.dart` covers defaults, template substitution, malformed content, stale snapshots, image references, and updates to an open screen without losing its state.

## Catalog maintenance

The source catalog lives in the mobile repository at `lib/content/catalog.json`. When adding visible copy or a bundled image, add a stable catalog entry and use `AppContent.text` or `AppContentImage` at the display site. Do not replace programmatic identifiers with editable values. The mobile helper `tool/sync_content.py --portal /path/to/agq_admin_portal` regenerates Dart defaults and copies the catalog/default images into the portal and functions. Keep matching catalog updates in linked PRs. Tests verify the portal/backend catalogs agree.

## Editing by screen

The editor groups content by app screen, with subsections for messages, controls, team contact cards, and artwork. Search spans all screens and current published/draft wording. Text/image and edited-only filters narrow results without losing drafts. Team portraits appear alongside their contact cards. Image publication is blocked while text changes are unpublished, and text editing waits for a pending image preview to be published or canceled.

Client ID help is now one complete message (`signup.cid_help`), including the contact email. The old standalone support email and split template are no longer editor settings. Reads and seeding combine previously published template/contact values if the complete-message field is missing; existing full-message edits always win. Legacy stored keys remain untouched for compatibility. The mobile reader also supports the old document shape during rollout. Genuine dynamic client values still use validated placeholders; team email/phone lines also combine the label and destination into one setting. The mobile tap action extracts the address/number from that same line; validation requires exactly one valid destination. Previously stored contact labels and destinations are preserved on migration.

Required app values such as `{clientId}` are protected while typing, cutting, or pasting. An edit that removes or renames a required placeholder is rejected immediately with inline guidance; the server independently rejects missing or unknown placeholders before publishing. Surrounding wording remains editable.

The editor uses descriptive placeholders such as `{email}`, `{clientId}`, and `{errorMessage}`. It translates them to the existing stored token names on publish, preserving compatibility with mobile versions and saved custom wording. Button text, navigation, headings, logos, icons, and artwork are fixed; only message content and the two team portraits are editable.

The mobile app stores each profile photo in an atomic, bounded file in application support storage. A matching URL reuses it across restarts without a download. A changed URL refreshes in the background while the prior photo or bundled default remains visible; invalid downloads never replace a valid cached image.
