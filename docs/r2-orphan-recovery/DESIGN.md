# CLOSE_ORPHAN_PENDING — review candidate, not deployed

No production session IDs, credentials, Worker bundle, deployment configuration or raw cloud evidence belong in this PR. The existing production investigation is accepted as incident evidence; runtime verification is repeated by the new protocol before a close. No real pending was changed during development.

## Scope

Only an existing owner/admin may resolve a locally rehydrated `draft` pending with no current controller and an empty idle queue. DRAFT, IMPORTING, PUBLISHED, REVISION_MISMATCH and UNKNOWN never produce an orphan proof. PUBLISHED still uses the original authenticated GET-status reconciliation. The new code never marks a book published, changes a catalog record, uploads/promotes data or deletes an R2 object.

New API:

- `POST /v1/library/r2/catalog/{bookId}/orphan/inspect`: authenticated proof preparation; body contains exact revisionId and phase=draft.
- `POST /v1/library/r2/catalog/{bookId}/orphan/close`: explicit `action=CLOSE_ORPHAN_PENDING`, exact revisionId/phase and opaque proofId. This is NOT an upload/promote/publish replay.

The inspect response is shown to the author through a confirmation dialog. Cancel, timeout, unknown response, mismatched identity/session, storage failure or backend failure leaves the pending unresolved. There is no background polling and no automatic POST retry.

## Server authority and race model

A new SQLite Durable Object, one stable actor for the library owner, serializes **all** legacy POST operations and recovery requests. Reads retain the existing Worker path. JWT verification uses the unchanged verifier exported from the SHA-verified production bundle; boolean admin, fixed owner, configured owner and exact Origin remain mandatory. The legacy handler still independently verifies signed tickets and all normal write permissions. Draft fence routing checks manifest/ticket identity agreement but does not treat an unsigned ticket decode as authorization.

Before each legacy POST, the actor persists an active intent and advances a write epoch. It clears the intent only after successful completion. Failed/ambiguous responses and actor restarts retain it. There is no time-based clearing: recovery and further writes fail closed until a separate authorized investigation resolves that intent. This deliberately favors safety over availability; a non-2xx can conservatively stop the owner writer even when no mutation actually happened.

Inspect performs a trusted Firestore GET of only status/revision/owner/backend. Only an actual 404 qualifies for absence. It then lists at most one object in each of five book-scoped prefixes: quarantine under the configured owner, originals, chapters, layouts and assets. Any object, including another revision, blocks closure. All empty lists must be untruncated. A second Firestore read catches a document appearing during the inventory. Exceptions/400/401/403/429/5xx never mean NOT_FOUND.

An inspect proof is bound to owner/book/revision/phase/write epoch and expires after 60 seconds. Close validates the proof and action, repeats all absence checks inside the same serialized queue, rechecks expiration, then persists a permanent closed-book fence and receipt. Any intervening POST invalidates the old proof. Later draft/stage/promote/publish requests for that book are denied. Lost close responses are recoverable through an explicit idempotent retry; even that path rechecks absence. No book or object is removed. A missing catalog cannot independently prove that a revision was once allocated; the protocol binds the supplied revision and refuses any data under the whole book.

The actor writes **new coordination metadata** (proofs, active intents, epoch, closed fences/receipts) into its own storage. It does not write Firestore/R2. Namespace/binding/migration, those metadata writes and deployment require separate owner approval. They have not been performed on Cloudflare.

### Critical rollout assumptions — default OFF

The mutex cannot retroactively govern requests already executing old Worker code or privileged writes that bypass the guarded entrypoint. Therefore recovery requires both `LIBRARY_R2_ORPHAN_CLOSE_ENABLED=true` and `LIBRARY_R2_ORPHAN_LEGACY_DRAIN_VERIFIED=true`; the prepared private config sets both false. These are server environment controls, never accepted from a client.

**Do not set the drain attestation merely because a timer elapsed or mock tests passed.** All production routes/versions that can mutate this library must use this guard, old writers must be demonstrably drained, and privileged out-of-band Firestore/R2 writes must be excluded during recovery. If an old in-flight writer cannot be accounted for, recovery remains unavailable. Cloudflare can allow old in-flight external requests to finish after an actor restart; persistent intent protects guarded writes, but does not prove legacy drain. See [Durable Object lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/).

No atomic multi-service absence guarantee exists against uncoordinated administrative writes. This candidate does not claim otherwise. The activation gate and maintenance acceptance must remain blocked if those prerequisites cannot be established.

## Local evidence and concurrent tabs

The browser stores the exact original pending string and server proof under a new owner/book/revision/proof-scoped `dudu-r2-orphan-evidence:` key. It verifies backup persistence **before** sending close. Only a matching confirmed receipt can mark that evidence resolved.

The original `dudu-r2-personal:` key is never removed or overwritten by this feature. The pending reader treats it as resolved only while its exact raw value still matches the archived value, including schema/phase/revision. A different pending written by another tab remains active. This avoids relying on a nonexistent atomic compare-and-delete operation in localStorage or on old tabs participating in Web Locks. Evidence entries are not published and must not contain JWTs. Browser storage remains user-controlled UI state, not server authorization or tamper-proof evidence; durable server fences are authoritative.

After receipt persistence, the client explicitly reloads catalogs with a fresh boundary and requires both V49 and R2 success. If either load fails, closing evidence stays saved but publication remains blocked. A subsequent start still performs the normal duplicate preflight. No UNKNOWN queue row is relabeled PUBLISHED. Recovery is intentionally unavailable while an in-memory controller/queue is active; the rehydrated orphan flow is the supported entry point.

## Production-derived patch packaging

`cloudflare/recovery/build-private.cjs` accepts a local independently downloaded production bundle only at the reviewed SHA and writes ignored `.private/` outputs. The legacy byte source is unchanged except for:

1. Exporting its existing verifier, OAuth provider, scoped service transport and fixed owner for the wrapper.
2. Allowing exactly the four-field catalog GET projection used by recovery in the existing service transport classifier. Foreign collections, changed masks, query/mutation projections and existing redirects remain denied.

The new entry imports that private module plus the new guard. No prototype Worker replaces production. The original source, live-derived review TOML, generated bundle/source map and baseline metadata remain local and are not uploaded to GitHub or CI. A fresh baseline SHA mismatch stops the build pending review.

SQLite-backed Durable Objects are available on Workers Free, subject to quotas; this is not a request to change billing. Owner must confirm account support/capacity before approving the namespace. [Cloudflare limits](https://developers.cloudflare.com/durable-objects/platform/limits/).

## Validation limits

Public CI runs offline synthetic regression tests only. Native local testing uses the SHA-derived bundle, actual bundled JWT/OAuth code with locally generated fixture keys, SQLite DO storage and local R2. Every external call is replaced by a bounded fixture; no production request is made by that harness. Requested local compatibility date is 2026-10-19; live remains 2026-11-01. Local native success is not production-equivalence, capacity proof, or production recovery certification.

See [ACCEPTANCE.md](ACCEPTANCE.md) for approvals, activation and rollback boundaries. No merge, cloud write, namespace creation, flag activation, Worker deployment or user confirmation has been performed by this work.

Validation recorded for this candidate: 105/105 targeted tests and 195/195 Library/EPUB tests PASS; inline syntax and private Wrangler dry-run PASS. Native local inspect/close return 200, anonymous 401, wrong UID/admin/expired fixture JWT are rejected, and a late local R2 object blocks idempotent close with 409. Exact projection scope checks also pass. None of these results certifies a real close.

## Draft PR compatibility

Local merged trees (not merges into main or either PR) combine this patch with #41 and #42 while retaining #42's coordinator, beforeRefresh hook and fresh preflight boundaries. Targeted and Library tests pass on the combined tree. Three old #41/#42 tests fail on **both** the unmodified main+#41+#42 control tree and the combined recovery tree because PR #43 extracted classifyRecovery: two VM harnesses omit the actual helper and one source assertion expects the old inline condition. This is a pre-existing test drift, not a hidden pass.

[PR41_PR42_TEST_COMPAT.patch](PR41_PR42_TEST_COMPAT.patch) updates those test harnesses to evaluate the real PR43 helper and assert the explicit mismatch/published branches. It changes no runtime code. With that review patch applied only to the local compatibility tree, all 39 #41/#42/clock tests pass, alongside targeted/Library tests. Neither upstream Draft PR was modified. This is a zero-context review patch: use `git apply --unidiff-zero` only on the reviewed matching test versions. Apply/review it when coordinating their merges; do not drop the quota optimization or claim the unchanged historical suites are green.
