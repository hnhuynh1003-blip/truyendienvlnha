# R2 EPUB diagnostics: filtered publication review

Status: backend recovery remains PARTIAL. This branch contains frontend diagnostics and offline safety tests only. It does not deploy or modify a Worker, repair quota capacity, or unlock an import.

## Exact publication manifest

| File | Classification | Review |
| --- | --- | --- |
| `js/firebase-worker-get-probe-c13b6d.js` | Public frontend change | Adds only a fixed catalog-stage allowlist, scoped to the existing authenticated error response. No new identity, endpoint, write, storage, retry, or permission. |
| `tests/r2-epub-diagnostics-safety.test.cjs` | Public regression tests | In-memory fixtures exercise the already-public frontend. No network, credentials, production sessions, Worker bundle, or external test dependency. |
| `.github/workflows/r2-epub-diagnostics-qa.yml` | Public offline CI | Read-only repository permission, Node tests only; no secrets, upload, deploy, credentials, or cloud API calls. |
| `docs/r2-epub-safe-diagnostics/SECURITY_REVIEW.md` | Sanitized technical document | Classification, public quota identifiers and recovery procedure; no raw production evidence, configuration, account identifiers, deployment IDs or private usage totals. |

The branch starts directly from current `main`. It does not cherry-pick or inherit the unpublished recovery commit. The original local branch and commit are preserved unchanged. Existing public repository files outside this manifest are not modified.

## Excluded original paths

All paths below are relative to `ops/r2-import-recovery/` unless a full path is shown. Exclusion covers their contents and their Git history, not just the final working tree.

| Original path | Disposition |
| --- | --- |
| `candidate-worker.mjs` | Production-derived Worker bundle; separate publication approval required. |
| `production-worker-personal.mjs` | Downloaded production source; separate publication approval required. |
| `wrangler.review.toml` | Live-derived deployment configuration; kept local. |
| `LIVE_SNAPSHOT.json` | Production configuration/deployment/binding inventory; kept local. |
| `CATALOG_INSPECTION.json` | Raw diagnostic artifact, even though aggregate; kept local. |
| `USAGE_INSPECTION.json` | Internal billing/usage evidence; kept local. |
| `BUILD.json` | Production artifact/hash inventory; kept local. |
| `build.cjs` | Production-specific bundle patcher and embedded handler code; kept local. |
| `recovery.test.mjs` | Depends on unpublished Worker bundles; kept local. |
| `client.test.cjs` | Original file excluded; frontend cases reauthored in the public test with synthetic status identities. |
| `REPORT.md` | Original incident report contains live metadata; replaced by this sanitized document. |
| `.gitattributes` | Production bundle checkout rules; unnecessary in public payload. |
| `.gitignore` | Private artifact build-output rules; unnecessary in public payload. |
| `.github/workflows/r2-import-recovery-qa.yml` | Original workflow depends on private bundles/build scripts; replaced by frontend-only CI. |

Private investigation scripts, API snapshots, Wrangler outputs, source maps, environment files, credential stores, service keys, token values, local tooling logs and book/session data are excluded. No secret or credential values are intentionally included. Pattern checks supplement a manual review; they are not proof that arbitrary content is non-sensitive.

## Quota finding and scope

The local read-only investigation identified quota metric `firestore.googleapis.com/read_operations_per_project`, limit `ReadOperationsPerProjectPerDay`, location `global`, limit value 50,000. Cloud Monitoring reported boolean `quota/exceeded=true` for this limit. This establishes daily project-wide read quota exhaustion; it does not attribute the consumption to a specific UID, collection, Worker or browser session. The earlier operator catalog query returned HTTP 429 / RESOURCE_EXHAUSTED. The exact upstream response of a current authenticated Worker request remains unverified.

The numeric limit was read as a gauge, not summed across samples. The exceeded metric is boolean. A document-read usage chart is not an authoritative replacement for this quota signal. The Service Usage quota endpoint returned 404; it was not treated as a successful quota inventory.

Official [Firestore quota documentation](https://firebase.google.com/docs/firestore/quotas) specifies 50,000 free document reads per day and reset around midnight Pacific time. For the observed November incident, the next reset is approximately **15:00 on 22 November 2026, Asia/Saigon**. Reset is a condition to recheck availability, not a guarantee of recovery or renewed capacity throughout the day. [Cloud Monitoring documents quota/exceeded as BOOL](https://docs.cloud.google.com/monitoring/alerts/using-quota-metrics).

Billing, quotas, Rules, IAM, secrets, schema and production data were not changed. Raw monitoring evidence stays local. No claim is made that the public frontend patch fixes quota exhaustion.

## Safe recovery procedure

1. Avoid repeated catalog probes while the daily quota is exhausted. No background polling or automatic POST retry is added by this branch.
2. After the quota reset, perform one controlled read-only owner check. Require HTTP 200 and every catalog page to validate and terminate under the same identity. Never accept partial results or skip an invalid book.
3. Query pending status through the existing owner UI. Preserve pending on errors, unknown states, unpublished records, wrong book/revision or non-200 responses. Only the existing exact published proof may clear the matching local pending record.
4. Confirm that file selection and publication are enabled only after pending reconciliation and the complete duplicate preflight. No real upload/publish is performed merely to validate this branch.
5. If quota is exhausted again, investigate project-wide read sources and possible repeated reads before proposing a separately reviewed consumption change. Full catalog preflight currently performs fresh server reads; it must not be bypassed with a stale or incomplete snapshot. No specific source of excess usage is proven by these observations.

Any billing upgrade, quota change, Worker publication/deployment, IAM/Rules change, schema change or alteration to duplicate/pending protections requires its own review. No merge or deployment is authorized here.

## Validation and remaining limits

Run from repository root:

```sh
node --check js/firebase-worker-get-probe-c13b6d.js
node --test tests/r2-epub-diagnostics-safety.test.cjs tests/r2-published-preflight-r1.test.cjs tests/r2-long-chapter-split-r1.test.cjs tests/firebase-owner-clock-skew-c13b6d.test.cjs tests/library-epub-r2-manifest-l6p2a.test.cjs
node --test tests/library*.test.cjs tests/epub*.test.cjs
```

The targeted suite passed 49/49, including 20 diagnostic/pending cases. The tests use the complete public probe for request boundaries and extract the unchanged pending callback to exercise its exact proof conditions. They do not simulate all DOM/button enablement or prove production OAuth, catalog completeness, pending state, browser layout or end-to-end recovery. The broader Library/EPUB suite is run separately; overlapping cases must not be counted as distinct tests.

The existing backend may continue returning a generic 503 because the Worker candidate is deliberately excluded. Unknown stages, cross-category values, oversized bodies and arbitrary raw fields must remain undisplayed. Owner/admin checks, token expiry, anonymous-denial prerequisite, GET-only requests, pending locks and duplicate protections remain in force.

Rollback, if this frontend change is later merged: revert only its frontend/test/document/CI commit. Never delete a pending record, book, R2 object or Firestore document as rollback. No production deployment currently needs rollback.
