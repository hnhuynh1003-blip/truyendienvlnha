# BUSINESS-CP-004 — P4A.2A local implementation review

Historical checkpoint: continued and hardened in [P4A.2B review](DUDU-P4A2B-PRE-MERGE-HARDENING-REVIEW.md).

Date: 2026-11-25 (Asia/Saigon). Scope: reading reliability only.

Status: local implementation reviewed; targeted, browser and emulator reliability checks pass. Repository-wide validation remains PARTIAL because the baseline has the failures listed below. No live acceptance is claimed. No merge, push, deployment, production Firebase write, Rules change or Worker change was performed.

## Preflight and isolation

- Original checkout: `main`, HEAD `d28211d6cf5fe274d4bccb40b925a5fa34e71b6b`.
- Original working tree: 2,604 porcelain status paths; staged diff 2,107 files, 1,263,287 insertions; unstaged `index.html` 148 insertions / 10 deletions. Inspected the HTML diff; it contains unrelated R2 author/reader integration work. Preserved all original changes.
- Expected commit was absent locally. Fetched repository into `.p4a2a-isolated`, then checked out detached `1c920b9a73331721dae899a2f9ad5a0f054832e4`; initial isolated status was clean.
- Original HEAD is an ancestor of the requested baseline (`git merge-base --is-ancestor` returned 0). Inspected intervening diff: 230 files, 12,842 insertions / 587 deletions.
- Implementation and testing remain in that isolated checkout. `.review-p4a2a` contains test logs, temporary dependencies, a clean baseline comparison checkout and the implementation patch; exclude that directory from a PR.

## Architecture decisions

1. Persist completed candidates synchronously when collected, before submission. Each candidate has one immutable localStorage key: `dudu:reading:pending:v1:<encoded-policy-id>:<encoded-uid>:<UTC-slot-start>`, value `1`. The `v1` namespace is the storage schema; the approved policy ID scopes policy versions independently. No shared JSON array is overwritten by concurrent tabs.
2. Logout/account changes invalidate flight tickets but keep each UID's candidates. Restore only the authenticated UID's namespace. Both runtime and existing transaction bridge check identity before submission and after completion. Queue epochs reject stale tickets, including A ? B ? A.
3. A candidate is eligible only when its complete 10-second window is in the past and its start is at most 24 hours old. Expired entries are pruned on access. Partial reading intervals remain intentionally non-durable; the task covers completed slots.
4. Delete submitted keys only after the existing reward bridge returns `applied` or `already-credited`. Rejected, failed, account-invalidated or unconfirmed results retain candidates. Failed deletion leaves the durable record for safe replay.
5. A lifetime application pump, online/storage events and auth notifications restore/retry outside Reader. Batch size remains at most 60. Failed attempts use monotonic exponential backoff: 5, 10, 20, 40, 80, 160, then 300 seconds maximum. Offline and nonmatching/unready authentication suspend submission.
6. In-process single flight plus per-UID Web Locks coordinate tabs. Lock contention skips the attempt; a later pump retries. Missing/rejected Web Locks fall back to per-tab single flight with authoritative server bitmap deduplication. Per-slot storage preserves the union without array replacement even in this fallback.
7. Default capacity is 8,640 distinct candidate slots per UID: a full 24-hour window at 10-second granularity, independent of the unchanged 180-minute reward cap. Reject excess new candidates explicitly; retain existing candidates. Duplicate inserts do not consume extra capacity. Smaller injected capacity is used by overflow fixtures.
8. `queue.status()` and `DuduPersonalReadingRuntimeP2A.pendingStatus()` expose UID, pending count, durable flag and diagnostic issues. `dudu-reading-pending-status` events report `overflow`, `expiry`, `corruption`, `persistence-failure`, `invalid-slot`, `clock-invalid`, and `clock-rollback`. Diagnostics are sticky for the current application instance; persistence failure marks durability false and preserves in-memory candidates.
9. Existing collector, transaction engine, server bitmap, EXP/level/Xu formulas and profile update fields are unchanged. Policy remains 2 EXP/min, 180 min/day UTC and 10-second slots. No wallet/account creation or economy migration is introduced.

## Changed files / proposed PR scope

| File | Change |
| --- | --- |
| `js/personal-reading-slots-p2c.js` | Durable UID/policy queue, explicit diagnostics, guarded ACK, expiry, capacity and restoration |
| `js/personal-reading-runtime-p2a.js` | Application-level retry pump, auth fences, monotonic backoff and Web Locks |
| `index.html` | Cache versions for those two scripts only |
| `tests/personal-reading-slots-p2c.test.cjs` | Adapt queue fixture clock and explicit successful ACK contract |
| `tests/personal-reading-reliability-p4a2a.test.cjs` | Recovery, concurrency, status, backoff and identity regression fixtures |
| `tests/browser-personal-reading-reliability-p4a2a.cjs` | Real isolated same-origin Chromium tabs, refresh and Web Locks |
| `tests/personal-reading-emulator-p4a2a.test.cjs` | Opt-in local-only transaction, replay, metadata and UID isolation integration |
| `docs/DUDU-P4A2A-READING-RELIABILITY-REVIEW.md` | This review and validation record |

Proposed PR title: **Persist completed reading slots and retry safely across sessions**. Base: the requested baseline, subject to reconciling subsequent upstream changes before opening. Include exactly the eight files above. Exclude logs, emulator output, test dependencies and comparison checkout. No PR was opened.

## Verification results

Environment: Windows PowerShell, Node 24.22.0, Chromium 1194 (Playwright 1.56.1), JDK 21, Firestore emulator 1.22.0. CI uses Node 22/Linux; that exact environment was not available here.

| Check | Result |
| --- | --- |
| Targeted reading clock/reward/queue/reliability + R2 loot + bookmark + profile-save tests | 30/30 PASS initially; three additional reliability cases subsequently PASS |
| Final reliability fixture file | 10/10 PASS |
| Final `node scripts/test-domains.cjs` (all five default active domains) | 1,577 PASS, 0 FAIL, 1 explicit emulator opt-in SKIP |
| `node --test functions/tests/*.test.cjs` | 10/10 PASS |
| `node --test cloudflare/tests/*.test.mjs` | 1,089 PASS, 8 FAIL; untouched baseline has identical eight failures |
| New real Chromium two-tab reliability test | 1/1 PASS |
| New local Firestore transaction integration | 1/1 PASS with explicit opt-in; source Rules loaded unchanged |
| Existing `browser-library-reading-return-c443.cjs` | FAIL: Reader not restored after refresh, timeout at line 158; same timeout on untouched baseline |
| JS syntax checks and `git diff --check` | PASS |
| Rules and Worker source diff | Empty |

Full Cloudflare baseline comparison: V45 pilot activation assertion; G1D/G1G Windows file-URL path conversion failures; G2S fixture equality assertion; four G2X writer-inventory assertions. Names, totals and logs match the untouched baseline. No V?n Gi?i restoration or baseline repair was attempted.

Recovery coverage includes refresh/crash before submission, during submission and before ACK; failed submit after Reader stops; lost acknowledgement following a successful transaction; A ? B ? A and logged-out suspension; invalid/expired records; capacity overflow; quota/read/delete failures; two-tab inserts and ACK; wall-clock rollback/drift; duplicate slots; bounded backoff; lock rejection fallback; preservation of existing bookmark/loot/profile-save behavior through the active domain suite.

The emulator test uses only `127.0.0.1:8194`, hardcoded project `demo-dudu-p4a2a`, and the checked-in source Rules. It verifies EXP72 ? 74 once, Xu8 unchanged, inventory unchanged, story metadata preserved and lifetime 60,000ms despite duplicate retries. A-13 remains unresolved by design: this does not validate the different deployed Rules or BUSINESS-CP-003 live acceptance. The emulator was stopped after testing.

Reproduction (from isolated checkout, with dependencies available):

```powershell
node scripts/test-domains.cjs
node --test functions/tests/*.test.cjs
node --test cloudflare/tests/*.test.mjs
node --test tests/personal-reading-reliability-p4a2a.test.cjs
node --test tests/browser-personal-reading-reliability-p4a2a.cjs
# Start Firestore emulator locally on 127.0.0.1:8194, project demo-dudu-p4a2a.
# Install firebase@12.6.0 and @firebase/rules-unit-testing@5.0.0 in an isolated dependency directory.
# Set NODE_PATH to that directory's node_modules for this opt-in test.
$env:P4A2A_EMULATOR='1'
node --test tests/personal-reading-emulator-p4a2a.test.cjs
```

## Remaining limitations

- Browser storage is a best-effort device store. Storage clearing, quota/permission failure, private-session teardown or device loss can prevent crash recovery. Failure is explicit; memory-only candidates survive only the current page. No silent claim of durability is made.
- Cross-tab localStorage views converge asynchronously via browser storage propagation. Per-slot keys prevent lost updates; authoritative transaction replay handles stale views and concurrent duplicates.
- Cross-tab strict single flight requires Web Locks. Unsupported/denied browsers can submit duplicates concurrently; reward deduplication remains transactional. There is no distributed lock across devices.
- Retry requires the app to remain loaded, online and authenticated/ready. Browser background throttling, suspension and closed tabs delay retries. An unresolved SDK operation retains single flight until the SDK completes or the page reloads; persisted candidates survive reload.
- Expiry uses wall time with an in-process high-water mark. Rollback cannot revive entries already pruned in that instance; a large forward jump can expire entries early. There is no new trusted server time service. The existing server plan also rejects out-of-window/backwards-clock submissions. Expired logged-out namespaces are pruned lazily when accessed; dormant disk records can remain until then but are never submitted beyond eligibility.
- Corrupt records are discarded with explicit diagnostics. Incompatible policy/schema namespaces are not migrated or submitted by this version. Status is available through the runtime API/event; no new global status panel is included.
- The existing source transaction's `already-credited` status also covers candidates made terminal by the daily cap. This implementation preserves that authoritative contract.
- Full local results remain PARTIAL due to baseline failures. Production Rules compatibility, live Firebase/R2 acceptance, mobile lifecycle acceptance and exact CI-platform execution remain unverified. No remote acceptance is inferred from fixtures, Chromium stubs or emulator tests.
