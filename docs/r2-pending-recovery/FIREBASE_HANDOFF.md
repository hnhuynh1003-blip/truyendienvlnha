# DUDU Studio — Firestore / Cloudflare R2 pending import handoff (READ-ONLY)

This document does not contain production book IDs, tokens, keys, or session artifacts.

## Scope
Website status button now distinguishes Firestore/R2 server outcomes but intentionally cannot release pending unless a same-user authenticated GET confirms `found:true`, matching `bookId` and `revision`, and `status:"published"`. A completed R2 upload is not the same thing as a verified publication.

The affected instance was shut down after a perceived upload completion. The local key `dudu-r2-personal:<uid>` holds schema/phase/bookId/revisionId; never delete or overwrite it as a troubleshooting shortcut.

## Codex: official Firebase/Cloudflare inspection only
1. Use the user's existing authorized Firebase CLI, GCP IAM and Wrangler sessions. If interactive login is required, stop and ask the user to complete the official sign-in. Never inspect browser auth tokens or export private keys.
2. Ask the owner to run **Kiểm tra trạng thái** once. Obtain only non-secret pending identifiers with owner consent, preferably from a local, read-only helper; do not add identifiers to public repository, logs or PR comments.
3. Read-only check `truyendienvl` Firestore document `epub_catalog_r2_v1/{bookId}`: existence, `status`, `revision`, `ownerUid`, `backend`, `updateTime`, relevant upload manifest counts. Verify identity before interpreting. Avoid dumping chapter text or full metadata.
4. Read-only inventory of R2 keys under `quarantine/epub/` and `originals/`, `chapters/`, `layouts/`, `assets/` for precisely that book/revision. Compare required object count, sizes/checksums/metadata using existing trusted validators; do not download or log content unnecessarily.
5. Classify: published exact; importing/draft incomplete; not found; wrong identity/revision; ambiguous. Reconcile async publish uncertainty against Firestore before any retry.
6. If published exact, let the *existing client status button* clear the local pending after the authenticated GET. If not, preserve pending and prepare a separate, idempotent, owner-only server recovery design (resume or abandon) with explicit user approval. Require CAS/preconditions, concurrency checks, and immutable evidence; no manual database deletion or blind POST replay.
7. Capture read-only HTTP status from Worker under real authenticated session and verify quota is available. Avoid probe loops and 50,000-read/day quota exhaustion.
8. Do not change billing, Rules, IAM, live Worker, R2 objects, Firestore documents, or secrets without a distinct approval.

## Report
Return `FOUND / STATUS / REVISION_MATCH / OWNER_MATCH / R2_OBJECT_COMPLETENESS / PUBLISH_PROVEN / NEXT_SAFE_ACTION` with no identifiers/tokens in public logs. Report confirmed versus unverified claims. If unresolved, stop; no clearing pending or reupload.
