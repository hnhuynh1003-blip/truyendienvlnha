# C4.22 EPUB permanent deletion — Rules and safety review

Status: **prototype, not deployed**. No production records were deleted.

## Existing schema and access inventory

- Browser: vanilla JavaScript / Firebase Auth custom claim `admin: true` / Firestore compat SDK.
- Existing public read: `epub_stories_v49` filtered on `status == 'published'`, paged with `limit(60)`; public chapters are readable only while published.
- Existing owner read: `epub_stories_v49` filtered on `ownerUid == uid`, paged with `limit(60)`; own chapters and revision history (`orderBy('version','desc').limit(<=50)`).
- EPUB book: `id`, `title`, `author`, `ownerUid`, `status`, `chapterCount` (1–160), `chapterIndex`, timestamps, optional metadata, import fingerprint. Book creation is `importing`, then `draft`, `published`, or `archived`. Core identity and chapter index are immutable on update.
- EPUB chapter: `epub_stories_v49/{storyId}/chapters/{chapterId}`, bounded text, optional revision metadata. Immutable revision history: `.../revisions/{revId}`.
- Other main collections: shared `studio_data/main_library`, private `profiles_v2/{uid}` and reserved Arcade receipts; `economy_accounts_v52/{uid}` and `system_config/economy_v52`. Firebase Functions use private AI usage and economy items/receipts. Cloudflare V49 source adapters are offline/test-only. No change to their queries/permissions is proposed.
- Current UI permits archiving and restoring but no permanent deletion. The existing Rules deny deletion on books, chapters, and revisions. `firebase.json` intentionally does **not** configure rules deployment.

## Planned contract

1. An owner-admin must archive a **published** EPUB first; only `archived -> deleting` transition is permitted, changing only `status` and `updatedAt`.
2. `deleting` never appears in public queries, cannot be restored, edited, or republished, and stays owner-visible for retry after interruption.
3. Only the same verified owner-admin may delete revisions and chapters while their parent book is `deleting`. The parent document may be deleted last, after the client confirms no chapters remain. Rules also require `deleting` on parent deletion.
4. UI requires typing the exact title and a separate final confirmation. It has no bulk delete, no public delete button, and no automatic deletion on opening or refreshing.
5. Deletion proceeds with bounded page reads/batched writes, then checks for remaining chapters. Retrying a partial delete is idempotent. A failed or incomplete run preserves the `deleting` record for recovery.
6. This removes Firestore chapter/revision/book documents, **not** original EPUB files from the user's machine. It is irreversible after successful deletion.

## Rule threat model / regression matrix

Verified on 31/10/2026 against **isolated Firestore Emulator** project
`demo-dudu-standard`: 110 checks passed using
`cloudflare/tests/manual/dudu-standard-spark-rules-emulator.mjs`.
Browser/Node behavior tests: `tests/epub-hard-delete-c422.test.cjs`.
These do not prove that deployed production Rules match this candidate.

| Attempt | Expected |
|---|---|
| Guest/reader/foreign admin deletes a book, chapter, revision | Denied (emulator) |
| Owner deletes a published/draft/importing book | Denied (Rules condition, static test) |
| Owner deletes a chapter or revision before `deleting` | Denied (emulator) |
| Owner directly sets `status=deleting` from published/draft | Denied (emulator) |
| Owner changes title, owner UID, chapter index while moving to `deleting` | Denied (emulator and immutable-validator tests) |
| Owner restores or edits `deleting` book | Denied (emulator) |
| Owner archives then marks `deleting` with status-only update | Allowed (emulator) |
| Owner deletes nested revisions, then chapters, then book | Allowed (emulator and JS behavior test) |
| Public reads/query of `archived`/`deleting` or private revisions | Denied (emulator) |
| New imports, owner metadata edits, public listing, anonymous reader | Unchanged (emulator) |
| Parent deletion without children emptied | Disallowed by client workflow; Firestore Rules cannot count arbitrary subcollection documents. Trusted server deletion recommended if stronger enforcement is needed. |

## Deployment gate

`firestore.rules` is a source candidate and is **not** deployed by GitHub Pages. Back up live Rules and run the Firebase Emulator suite with two separate authenticated identities before any deliberate production Rules deployment. Confirm the live Rules match this candidate before activating real deletion.
