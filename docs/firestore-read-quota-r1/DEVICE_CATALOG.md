# Device catalog metadata cache

The full V49/R2 catalog previously loaded again after a mobile browser/app restart. This candidate keeps a complete published metadata snapshot in IndexedDB for at most six hours, partitioned by Firebase UID and project/Worker/backend scope. The first open, an expired/missing/invalid cache, and explicit **Cập nhật thư viện** perform a full authenticated catalog refresh. There is no automatic polling or background full refresh on a valid cache hit.

This is a frontend change only. No Worker endpoint, deployment, Durable Object, Firestore document/schema/index, Rules, IAM, billing, pending key or upload/publish behavior is modified. Server-side cheap catalog version checks are not part of this release: new/changed/deleted books on another device appear after manual update or the next automatic refresh after expiry, rather than immediately. The original Worker remains authoritative for all content reads.

## Safety boundary

- Restore only after the existing authenticated account readiness checks pass. Do not render an anonymous or different account's cache. Account/readiness generation checks prevent late IndexedDB or network results repainting a newer session.
- Cached source states are `cached`, never `success`. Both V49 and R2 must complete fresh network loads before the owner catalog review is ready. Existing author comparison/import entry points still use `{fresh:true}` and retain pending and duplicate guards.
- Partial/error loads never replace the complete stored snapshot. Failed explicit refresh does not convert cached or partial data into successful preflight. Manual retry/freshness remains explicit; no POST replay.
- Metadata only: IDs, title, author, synopsis, genre, dates, publication label, chapter index/title/word count and existing bounded JPEG thumbnail. R2 cover asset ID/revision stay metadata. Whitelisting excludes chapter bodies, layouts, private blobs, tokens/tickets, permissions/admin flags and request headers. Chapter content is reconstructed as null on restoration.
- A cached chapter index supplies a display title to the existing R2 adapter. The adapter still makes its authenticated content GET; 401/403/404/error never falls back to Firestore. No chapter payload or access decision is cached by this feature. Reader reward/word-count logic is unchanged.
- On sign-out/account switch/revocation observed by the app, clear the visible data and attempt deletion of that active account/scope record. Deletion may fail if device storage is denied; such a record is not displayed to another UID or while readiness is false. Local metadata is not encrypted and cannot be remotely erased while the browser is closed; it is not a permission/security boundary.
- IndexedDB failures, quota, unsupported/private browsing, malformed records or a bounded open/transaction timeout fall back to normal full network loading. No incomplete library is labeled ready to hide a storage/backend error. Snapshots are bounded to 5,000 books per backend, 160 chapters per book and 32 Mi JSON characters; oversized snapshots are not persisted.

## What this saves and what it does not

Synthetic tests with 1,000 published metadata records: first open runs one V49/R2 loader pair; same-account reopening within the TTL runs **zero catalog loaders** and restores all 1,000 rows. Actual IndexedDB/reload browser acceptance verifies the same behavior, then a fresh refresh, persisted deletion, expiry, account switch and revocation. These are fixture measurements, not billed production Firestore reads.

Firebase login/profile checks, legacy library listener, visible R2 covers, content reads, explicit old-book synopsis chapter search and author preflight still have their existing network/read costs. Caching does not resolve an already-exhausted quota or complete an interrupted promotion/publication. PR42's in-flight coalescing and viewport cover demand remain intact.

## Acceptance and rollback

1. Open as an approved reader; complete the first full catalog. Reload the same device/account: cached metadata appears after existing identity/access readiness, with a visible saved-catalog notice and update button. Developer counter `DuduCatalogPerfMeasurements.requests` must show zero V49/R2 loader starts on that warm reopen. This is not a claim of zero total Firestore reads.
2. Publish/edit/remove a book through the already authorized workflow on another device. Cached display may be stale within six hours. Click **Cập nhật thư viện** to force both complete sources, observe changes and persist the replacement snapshot.
3. Sign out/switch/revoke access and simulate delayed IDB/network responses. No old-account repaint; no cached permission grant. Server content denial must remain denied.
4. Attempt author comparison/import while metadata is cached or only one source has refreshed: readiness stays unavailable until both fresh sources succeed. Preserve exact pending book/revision reconciliation and duplicate preflight tests.
5. Disable IndexedDB/corrupt a cache/expire it: use normal network flow, do not hang or silently authorize publishing. Do not test by modifying production books or real pending.
6. Rollback the frontend commit only, with review. The previous frontend ignores this separate IndexedDB database; books, cloud data, pending and credentials are untouched. No cloud migration rollback is needed. Do not clear unrelated browser storage as a rollback shortcut.

Deployment/merge requires normal release approval and CI on the exact candidate. No production rollout, restore, pending release, upload/publish or cloud data mutation has been performed by these tests.
