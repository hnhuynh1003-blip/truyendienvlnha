# DUDU V25 — Private, signed milestone evidence ledger

**Date:** 16 October 2026  
**Branch:** `feat/dudu-v25-trusted-milestone-ledger`, based on V24.  
**Status:** Draft-only integration contract, in-memory SQL tests; **NOT merged, deployed, activated, or connected to real Firebase/Cloudflare storage**.

## Why V25
V24 had a strict frame verifier, but trusted milestone readers were not backed by a durable ledger. V25 builds the missing **private, transactional database implementation**, authenticates receipts with separate backend credentials, and connects four read interfaces to the V24 verifier. This is meaningful server code, **not yet proof that real gameplay is verified**.

## Files shipped
- `cloudflare/src/milestone-receipt-v25.mjs`: validates exact signed receipt schemas, timestamps and IDs, verifies HMAC-SHA256 of the exact payload with constant-time comparison, rejects stale/oversize/tampered/extra-field requests. **Distinct secrets** for author-approval service vs trusted gameplay-progress service; neither secret is in GitHub or a browser.
- `cloudflare/src/milestone-ledger-v25.mjs`: SQL-backed private ledger with replay/idempotency journal, immutable author milestone approval revisions and revocations, UID/story/chapter proof records, UID/story/NPC/milestone proof records, unique milestone completion records and V24-compatible readers. Each ingestion commits in one transaction or fails closed.
- `cloudflare/tests/milestone-ledger-v25.test.mjs`: real in-memory SQLite fixtures and V25 → V24 → V19 integration tests plus forged/mismatched UID, wrong signature, unsafe old local affinity, missing proof, role-separation, replay, revision, revocation and duplicate assertions.
- V24 reader scope refined to pass exact `milestoneId` to the bond proof reader; test updated for this explicitly.

## Event types — signed by backend only
| Kind | Required issuer | Effect |
| --- | --- | --- |
| `APPROVAL_PUBLISHED` | independent author-approval signer | stores next version of a chapter/NPC milestone; requires explicit approved frame and chapter |
| `APPROVAL_REVOKED` | approval signer | next immutable version becomes revoked; future V24 verification rejects old completion |
| `CHAPTER_VERIFIED` | trusted gameplay signer | records UID/story/chapter in a non-client-writable ledger |
| `BOND_VERIFIED` | trusted gameplay signer | records exact UID/story/NPC/milestone with trust meeting approved threshold |
| `MILESTONE_COMPLETED` | trusted gameplay signer | only records once chapter and, for Tri Kỷ, bond proofs exist with matching UID/version and valid temporal ordering |

**Note:** Author approvals must be verified by a separate server authentication/authorization service **before its signer issues receipts**. Actual chapter reading and NPC trust transitions likewise require an audited server-side evidence producer; browsers cannot certify themselves. Cryptographic signatures guarantee the producer's key, not that its underlying evidence is truthful.

## Privacy, save safety and isolation
- Nothing is written to legacy Firebase profiles, NPC save data, localStorage, Firestore, R2 or the public library. V23 image-deletion behavior is untouched.
- The SQL ledger must be embedded in a **private** Worker Durable Object with `ctx.storage.transactionSync.bind(ctx.storage)` and SQL storage, and only reached from authenticated backend-to-backend code. This repository does **not** register a binding or connect a public route in V25.
- Individual read methods are **internal capabilities**, not public endpoints; callers must derive UID from a verified identity / trusted service context, never pass an unchecked browser-selected UID.
- Existing player affection/ trust is preserved for gameplay; it is not a signed NPC bond proof and cannot unlock the frame.
- Retired/revised author approvals invalidate old proof at V24 verification; already granted frames in V19 are **not automatically clawed back**. Product revocation policy needs a separate explicit decision.

## Test locally
Requires Node.js 22+ (the test harness uses experimental built-in `node:sqlite`):

```sh
npm test --prefix cloudflare
npm run build --prefix cloudflare
```

Also run `node --test tests/*.test.cjs`, `node tests/browser-smoke.cjs`, and existing Chromium security smoke as CI does. The Wrangler command is `deploy --dry-run` only, not deployment.

## Release blockers
1. Build audited trusted producers for chapter read completion, NPC relationship progression, and author approvals. Separate secrets and verify server-side Firebase UID, authorized author/story ownership and content scope.
2. Add a private Durable Object declaration, migration and strict backend-only ingestion/read boundary in controlled staging; do **not** expose `ingestSignedReceipt` to browser requests or embed secrets in public JS.
3. Establish key rotation, proof expiry/retention, abuse quotas, ID collision recovery, source audit, privacy deletion policy, replay/rollback strategy and approval reversal semantics.
4. Test two real Firebase accounts and cross-account attempts against the real staging service; validate author approvals, browser refresh, R2 disabled, old saves and mobile interfaces.
5. Explicit owner review before merging any stacked PR or enabling any award or photo R2 feature flag.

**Conclusion:** V25 contains the private SQL evidence machinery and integration tests, while deliberately leaving real proof sources and cross-device live awards unavailable.
