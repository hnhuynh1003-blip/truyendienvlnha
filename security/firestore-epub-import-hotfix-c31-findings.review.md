# C3.1 — EPUB permission-denied incident, 2026-10-30

Observed: owner reports an EPUB import form returning `Missing or insufficient permissions` immediately after applying C3.0 Rules to `(default)` Firestore. Owner also reports no EPUB edit controls on the published book screen.

## Client access traced

1. `js/epub-production-v49.js:importDraft()` requires a Firebase `admin` custom claim and **first calls `ref.get()` on a newly generated, nonexistent `/epub_stories_v49/{storyId}`** to ensure the ID is unused; only then it calls `ref.set(cover)` and starts importing chapters.
2. C3.0 `allow get` tests `resource.data.status == 'published' || (admin() && resource.data.ownerUid == request.auth.uid)`. On a nonexistent document, `resource.data` is null. An admin with a valid claim therefore still gets `PERMISSION_DENIED` for the ID availability probe. Original production Rules allowed unconditional EPUB admin get, so this is a regression.
3. `index.html` kept `EPUB_MANAGEMENT_L2D2_ENABLED=false` and `EPUB_CHAPTER_TOOLS_L2D5_ENABLED=false` after the one-time Rules publication. Therefore the buttons are hidden regardless of account/Rules state.
4. EPUB imports are owner-admin scoped, `chapterCount <= 160`, metadata only allowed schema, chapters `title/content/wordCount/order`, public query uses `status == published` and `.limit(60)`, owner archived list uses `ownerUid == uid` and `.limit(60)`, revision history `.orderBy(version desc).limit(20)`.

## Narrow correction

- Restore the **previously available** admin `get` permission on EPUB documents, including nonexistent IDs; keep public `get` only for published books, bounded list, admin-only writes and owner-only updates.
- Add an Emulator regression for the admin `get()` of a nonexistent EPUB ID; test guest/reader denial of missing document, bogus admin claim, owner hijacking, transition bypass, malformed content, transaction backup, and public list constraints.
- Enable only the existing owner-scoped EPUB metadata/chapter edit controls in the main UI after testing the corrected Rules candidate; no seasonal reset or verified economy changes.
- Ensure no real project writes occur through our tests. Production Console will require a narrow second Publish by owner.

## Reproduction and validation

- Before patch: Emulator `allow get` probe of a nonexistent EPUB ID returned `PERMISSION_DENIED`, specifically `Null value error` at the C3.0 `resource.data.status` condition. This reproduced the owner's import failure.
- After patch: Admin/owner can read a nonexistent EPUB ID, but guests and regular readers are rejected; private draft read by a foreign admin still fails. Admin rights still derive exclusively from the Firebase custom claim, not profile role.
- Actual application `epubApi.importDraft()` with a realistic Vietnamese metadata fixture, JPEG cover and two chapters now completes the preflight, creates the metadata, imports both chapters and changes status to draft. `publishDraft()` and `updatePublishedMetadata()` also succeed.
- End-to-end Firestore Emulator: **73/73 permission and transaction checks passed**. Existing invalid schema, giant fields, role spoof, owner hijack, query leakage, unauthorized edits and receipt minting are all still rejected.
- Local application regressions: **145/145 tests passed**.
- `index.html` now sets `EPUB_MANAGEMENT_L2D2_ENABLED=true` and `EPUB_CHAPTER_TOOLS_L2D5_ENABLED=true` but still filters both panels to `canEditStories()` and `_ownerUidV49 == current UID`. The Firebase Security Rules remain authoritative for every write.
- Nothing was changed in the real Firebase database; `DUDU_SEASON_RESET_READY_C26` remains `false`.

## Remaining rollout gate

The owner has already published the previous C3.0 Rules. They must now publish the corrected C3.1 `firestore.rules` through Console, then refresh the GitHub Pages `main` site to receive the enabled editor controls. The failing import did not need a reset or a deletion. This narrow second Console Publish is necessary to fix the app-to-Rules regression.
