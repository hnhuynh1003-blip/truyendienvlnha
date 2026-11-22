# Acceptance and rollback — owner approval required

## Review artifacts

- Public PR: new guard/client source, frontend integration, offline tests and sanitized documentation only.
- Local private Worker patch: `cloudflare/recovery/.private/entry.mjs`, `private-production-legacy.mjs`, guard copy, live-derived review TOML, generated bundle/source map. These must remain ignored and must not enter GitHub/Actions/artifacts.
- Prepare locally with `DUDU_PRODUCTION_BUNDLE` pointing to the freshly verified production download, then `node cloudflare/recovery/build-private.cjs`. Review the two legacy modifications described in DESIGN.md. Never substitute a repository prototype.
- Dry-run using the private review config; deploy is a different action. Existing vars, R2 binding, Origin, project, owner and managed secret names must be preserved. The proposed additional binding is `ORPHAN_PENDING_GUARD`, class `OrphanPendingGuard`; the proposed new SQLite migration tag is `orphan-pending-guard-v1`.
- Native test, where local dependencies exist: `node cloudflare/recovery/native-local.cjs` after the private dry-run. Do not give this test production keys. It generates fixture keys and blocks all unexpected external I/O.

## Separate approvals before any real action

1. Approve the new Durable Object namespace/binding/SQLite migration and its coordination metadata writes, deployment impact (serial owner writes, conservative stop on ambiguity), and reviewed production-derived Worker patch. No Firestore/R2 writes are part of close itself; normal user uploads retain their existing explicit authorization.
2. Approve a controlled maintenance/deployment window, including old-writer drain verification and exclusion of privileged bypass writers. Keep both recovery flags false until evidence supports the drain attestation. If that evidence is unavailable, STOP; do not infer readiness from an arbitrary wait.
3. Approve the actual Worker deployment separately. Compare current code SHA, versions/routes/bindings/vars/secrets before and after. No secret value needs to be read. A partial/unclear deployment is a stop condition; do not automatically deploy again.
4. Review and approve frontend merge/release separately after all required checks and compatibility testing. With the old Worker or recovery OFF, the new button must fail closed and preserve pending.
5. The author must explicitly click the new recovery action and confirm the dialog after fresh server proof. That interaction authorizes only the exact close operation and local evidence writes; it does not authorize upload/publish. No agent may click it for the author as an automatic cleanup step.

## Controlled acceptance

- Retain the original pending and secure a local backup. Do not place real IDs, receipts or tokens in GitHub or workflow logs.
- Anonymous, different UID, missing/string admin, expired JWT and wrong Origin cannot inspect/close. Inspect is a POST that can create proof metadata, not the existing GET-status check.
- Existing DRAFT/IMPORTING/PUBLISHED, revision/owner/backend mismatch, any object in any revision under the book, Firestore/R2 errors, truncated list, stale proof or unresolved active intent must withhold closure.
- Start a controlled guarded mutation in an isolated test environment, then inspect concurrently. Confirm serialization, persistent intent after forced restart/failure, and no fixed-time intent expiry. Do not create a real book just to test production recovery.
- On a verified orphan, cancel the confirmation once: no close, no resolution. Confirm only in the approved real session: original pending bytes remain identical; a local backup precedes close; matching receipt persists in the new evidence key.
- Replace pending/change account from another tab while an inspection/close response is delayed. The new session remains active; no local key is deleted. Verify reload behavior against the exact archived raw value.
- Verify complete fresh R2 **and V49** catalogs after resolution. Simulate a catalog failure in isolation: publication stays blocked. Then perform duplicate preflight before a deliberate new import. Do not claim the old book was published or skip a probable duplicate warning.
- GET status still clears only a genuinely published exact pending through the existing path. No published outcome is synthesized by orphan close.

## Rollback

Before rollout, keep the original deployed Worker unchanged. Once the guarded writer is activated, use the guard-retaining rollback below, including before the first receipt. Never delete the DO namespace or clear active intents to force recovery.

**After any successful close, restoring the old unguarded Worker is unsafe:** it would forget the durable closed-book fences. The safe rollback is to disable recovery (`LIBRARY_R2_ORPHAN_CLOSE_ENABLED=false`) while retaining the guard, namespace, active intents and closed records. Existing reads remain on the legacy implementation. A guard-retaining rollback requires its own tested artifact/approval; an unguarded version is not an acceptable substitute. Do not remove the namespace/migration as a shortcut.

`build-private.cjs` prepares `.private/entry.rollback.mjs` with a hard-coded recovery kill switch and `.private/wrangler.rollback.toml` retaining every binding/migration. Its separate dry-run output is `.private/dry-run-rollback/entry.rollback.js`. Native QA first creates a synthetic receipt, replaces the running candidate with that exact rollback artifact using the same SQLite storage, then requires close=503 and a fenced publish=409. The namespace binding, class name, actor name `library-owner-writer-v1`, storage and migration tag must remain unchanged. A future approval must cover the exact artifact SHA/config diff and deployment; this task only prepares and tests it locally. After rollback retain/export receipts through an authorized read-only audit rather than clearing them. Re-enabling recovery requires another reviewed activation/drain check.

Reverting the frontend feature does not erase any data: the original pending and local evidence remain. It may lock the UI again until a reviewed release restores receipt interpretation. Never delete evidence/pending, create a fake published document, modify book metadata or purge R2 to make rollback appear successful.
