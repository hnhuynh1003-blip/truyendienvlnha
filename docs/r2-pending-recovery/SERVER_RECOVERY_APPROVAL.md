# Exact-session server recovery: reviewed candidate, not a deployment

## Scope and boundary

This candidate adds owner/admin inspection and manual completion of an **existing importing book whose complete staged bytes validate**. It also separates current production draft errors into fixed safe codes. It does not claim to resolve the unknown historical draft failure, repair an exhausted quota, or provide all recovery paths.

A confirmed local validation gap is also corrected: upload-plan validation accepted chapter titles/control characters and word-count metadata that the pinned production draft schema rejects. These fields now match the existing server limits during queue preparation, before its ticket request. Unsupported EPUB metadata becomes a local `BLOCKED` queue row; it does not allocate a pending or halt other ready candidates. This is a preventive correction, not evidence that the historical production EPUB had this particular defect. No server limit/schema is relaxed or book content normalized.

There is no automatic POST retry, upload replay, new-book creation in recovery, forced queue skip, orphan clearance or cloud delete. `NOT_FOUND_EMPTY` always includes `closeAllowed:false` and `oldWriterDrainProven:false`. A missing draft with empty R2 remains blocked. Partial or corrupt uploads remain blocked; resuming missing parts is not implemented in this candidate. Paused PR44's fence/drain requirements are not bypassed.

## Production source and private delivery

The source is independently read from the current Worker and pinned to SHA-256 `dba461ad9ed8b628c9153ab6f5562f605e6b4167d25c2f1424673657427a5884`. The full bundle, exact replacement-context builder, review/rollback configs, synthetic native tests, generated artifacts and inventories remain local in `cloudflare/recovery-v2/.private/`. They are not committed or uploaded to Actions. Public files contain new code, tests and integration glue only. The private builder refuses a baseline hash/context mismatch and does not edit its input.

The legacy worker keeps all existing routes. The wrapper intercepts only these new exact paths:

- `GET /v1/library/r2/catalog/{bookId}/recovery?revision={expectedRevision}`
- `POST /v1/library/r2/catalog/{bookId}/recovery/publish`, JSON `{revisionId}`

No existing POST route is redirected to a Durable Object. There are no namespace, migration, Rules, IAM, billing or secret changes in this candidate.

## Guarantees and limits

- Reuse the baseline JWT verifier, pinned production owner constant, configured owner UID and project. Require owner/admin, allowed Origin, valid JWT, global R2 flag and existing write/pipeline flags. No authenticated reader can invoke owner recovery.
- Draft diagnostics distinguish OAuth unavailable, ticket denied, manifest rejected, upstream Firestore HTTP 400/401/403/429/500, transport-unknown and unverifiable write responses. They expose only fixed codes and `writeOutcome` (`not-dispatched`, `rejected`, `unknown`), not response payloads or private error messages. A diagnostic does not prove all prior requests drained.
- Empty inspection reads Firestore before/after and probes all five **whole-book/all-revision** R2 prefixes. Any object, truncated empty list, document appearing late, malformed result or IO uncertainty prevents a close proof. This API never issues a close proof even when all prefixes are empty.
- Importing inspection invokes the existing staged-byte audit (metadata, size, SHA-256, payload and layout/chapter consistency), then checks document updateTime and identity again. Only a complete verified audit can enable the manual publication button.
- Publication independently re-reads the document and checks the caller's expected revision **inside the baseline publish validator** before its existing object audit and updateTime CAS. Concurrent publication cannot produce two successful CAS writes from one document version. A post-write exact read is required; unknown outcomes never count as published.
- UI requires a fresh complete V49/R2 catalog and duplicate check before a manually confirmed recovery POST. It saves a local attempt first, sends one POST, and reconciles by GET only. Existing exact published status handling performs pending clearance. No recovery module removes localStorage pending directly.
- No automatic polling or full catalog refresh is added. Owner-triggered empty inspection costs two Firestore document reads plus five R2 lists; published inspection costs one Firestore read. Complete importing inspection costs two Firestore reads plus one R2 get per expected object. Manual publication adds the baseline audit/CAS and exact result checks (three document reads and at most one CAS write for this request). Ordinary reader traffic is unchanged.
- To prevent unbounded work, inspection/recovery is denied above 500 expected objects or 32 MiB aggregate manifest bytes. This is not a complete/partial-success result. Larger books need a separately reviewed bounded/paged server audit. Workerd tests do not certify production CPU capacity, quotas or billing equivalence.
- Only application-path immutable staged writes and Firestore CAS are covered. External privileged mutation and old writer drain are not proven. There are no new permanent fences in this candidate.

## Deployment gate

Both new flags stay OFF: frontend `serverRecoveryEnabled:false`, Worker review config `LIBRARY_R2_RECOVERY_ENABLED=false`. A frontend merge is not backend activation. Owner must approve the private Worker artifacts and configuration separately before any deployment. Until then, production does not have these recovery endpoints.

1. Re-read production source/version/settings and refuse drift. Review exact private candidate/rollback SHA manifests. Preserve every existing binding, var, secret name, route, compatibility flag and nested observability field. Do not import PR44's unapproved DO/migration configuration.
2. Confirm source/native/browser tests and candidate/rollback Wrangler **dry-runs** on these exact artifacts. Public CI uses intercepted fixtures; the private native test uses real verifier code with synthetic JWT/OAuth and a local R2 binding. None is production PASS.
3. Deploy only after explicit Worker approval, initially with recovery OFF. Verify anonymous denial, existing owner/reader routes and safe diagnostics; do not upload/publish as a smoke test.
4. Separately approve activating Worker recovery and the frontend flag after read-only production acceptance. Use the signed-in owner's official SDK session; never request/export a token. Verify an exact known published book and an appropriate existing importing session read-only first. Any mismatch/unknown/partial audit stops activation.
5. A real **Hoàn tất xuất bản phiên này** click requires owner confirmation. Audit/POST failure leads only to read-only status reconciliation, not an automatic retry. Confirm the exact book/revision is published and appears once in a complete fresh catalog before clearing through the existing status mechanism.

## Rollback

Disable recovery, then restore the exact production baseline artifact and preserved settings. The frontend keeps pending on endpoint unavailable/404. A rollback does not revert an already confirmed publication or cancel in-flight requests; reconcile those read-only. Do not delete objects, documents, pending or journal as rollback. Since this candidate creates no guard/fence/DO state, there is none to discard; if any PR44 guard ever exists in production, stop and prepare a fence-preserving rollback instead.

## Remaining work before claiming full recovery

General missing-part resume and orphan termination require their own concurrency-safe server design and tests. In particular, no user should have to clear a pending manually, but that goal is not achieved by this limited candidate. Keep the overall recovery effort PARTIAL until those flows and production acceptance are complete.
