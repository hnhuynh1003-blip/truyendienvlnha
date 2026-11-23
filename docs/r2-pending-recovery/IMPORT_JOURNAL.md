# Import progress journal and owner report

This frontend change addresses a confirmed observability/data-lifecycle gap: controller failures discarded HTTP details, and verified per-part upload receipts disappeared with tab memory. It does not establish the root cause of earlier production draft failures and does not repair quota, OAuth or unavailable Firestore.

The owner panel now includes **Phiên nhập & báo cáo khôi phục**. It shows the latest local phase, failing operation, HTTP status (when a response was actually received), fixed safe server code and verified quarantine counts. **Lưu báo cáo phiên nhập** exports a private JSON report without Console. The journal is localStorage `dudu-r2-import-journal:<uid>`, separate from the unchanged schema-1 pending key. Only the configured owner/admin can use the panel/export.

The journal is whitelisted metadata: up to 20 recent allocated sessions, 500 queue rows, 4,000 receipt identifiers and 900,000 JSON characters. It never stores Firebase tokens, draft tickets, cookies, request bodies, raw responses or chapter text. A code not on the fixed allowlist becomes `OTHER_SERVER_CODE`. Catalog cache and Firestore quota optimizations remain unchanged; journal operations make no cloud calls. Queue changes are debounced; request/verified receipt checkpoints are immediate. Storage failure shows a warning and never grants recovery authority.

Reports contain session IDs, filenames and book metadata. Keep them private; never publish real reports in GitHub/Actions. Downloaded metadata cannot be remotely revoked. Owner checks hide the panel on account changes; local records remain partitioned by UID. No automatic deletion of records or pending is introduced.

## Safety and limits

- Existing pending persists before POST dispatch. If that mandatory persistence fails, no POST is sent. A token failure before the first dispatch creates no pending and retains the existing safe manual retry path.
- No upload, promote or publish retry is added. Unknown/network outcomes stay blocked; observed HTTP errors are diagnostics, not proof that a write cannot complete later.
- Each canonical uploader receipt is emitted only after response hash/size/identity validation. Per-part checkpoints survive a subsequent failure within that batch. Checkpoints do not replace the original in-memory complete-batch publication gate and are never replayed or trusted to authorize publish.
- A saved queue is a list of metadata, not File handles/EPUB contents. Reselect files after reload and run fresh complete catalog duplicate preflight. No automatic queue restart.
- `NOT_FOUND` is not a release decision: it does not prove R2 empty, writer drain, publication elsewhere or a safe retry. `importing` also remains locked. Only the existing exact-owner/book/revision published status check clears pending.
- No forced unlock/skip button, orphan clearance, production Worker source, secret, Rules/IAM/billing/schema change or deployment is included. Paused PR44 is not bypassed.

## Acceptance

Simulate draft HTTP 400/401/403/429/500/503, token/network errors, interrupted batches, denied storage, malformed JSON, reload and account changes. Verify only safe diagnostics are persisted/exported, no POST replay or new cloud requests, old pending remains compatible, and both fresh catalog sources are still required before any new import. Browser tests are intercepted fixtures, not production recovery proof.

## Remaining backend recovery gate

A permanent **continue exact session** feature needs independently verified server object/manifest inspection, expected-revision pinning, concurrency/writer coordination and outcome reconciliation before retry decisions. An absent document alone cannot safely unlock a queue. Changes to the live Worker require separate reviewed source/config artifacts and deployment approval. This PR deliberately leaves those production gates unresolved.

Rollback is a frontend revert. The old version ignores the separate journal key. Do not clear unrelated storage, pending or cloud objects as a rollback shortcut. No cloud rollback/migration is needed.
