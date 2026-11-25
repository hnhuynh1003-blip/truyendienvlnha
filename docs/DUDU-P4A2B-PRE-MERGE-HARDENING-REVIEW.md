# BUSINESS-CP-004-R1 - P4A.2B pre-merge hardening

Historical P4A.2B results are retained below. The P4A.2C / BUSINESS-CP-004-R2 continuation at the end records the current PR-preparation result.

Date: 2026-11-25 (Asia/Saigon). Status: local review complete; requested hardening checks PASS. Overall repository validation remains PARTIAL because of known baseline failures. No merge, deployment, production write, Rules/Worker change, account reset or Van Gioi restoration.

## Isolation and scope

Continued P4A.2A in `.p4a2a-isolated`, detached at `1c920b9a73331721dae899a2f9ad5a0f054832e4`. Preserved the original dirty Windows checkout. Original `index.html` SHA-256 before/after: `EB8F1B9DDB3E1A2AB66248BEF0A4790011D95FE787AADEBAC7B66697C928B2C4`. Final original status has 2,605 paths: the previously reported 2,604 plus the isolated checkout directory. Original staged totals remain 2,107 files / 1,263,287 insertions, and the unrelated unstaged HTML diff remains 148 insertions / 10 deletions. The original status snapshot command encountered Git ownership protection; a read-only, per-command `safe.directory` override verified the final totals. No global Git configuration was changed.

The frozen P4A.2A patch and before-source copies remain under the local review directories for reproducible comparison. Logs, measurements, dependencies and screenshots are local evidence, excluded from PR scope.

## A-14 - Normal batching restored

Normal submission requires at least six completed slots; batch maximum remains 60. The application tick never forces every new slot. Partial force is limited to restored candidates, an explicit Reader exit/pagehide, or a failed-submission recovery. Retained rejected holds alone do not keep the runtime in forced-recovery mode. Normal reading resumes six-slot batching even while old held candidates remain.

The deterministic test runs the actual reading clock and slot collector for 10,800 eligible seconds, using periodic simulated activity, then uses the existing reward planner to confirm the result. The comparison measurement runs the frozen P4A.2A and final runtimes with the same schedule.

| Continuous eligible reading | P4A.2A before | P4A.2B after |
| --- | ---: | ---: |
| Duration | 180 minutes | 180 minutes |
| Completed slots | 1,080 | 1,080 |
| Reward transaction calls | 1,080 | **180** |
| Quest calls, counted separately | 1 | 1 |
| Normal reward calls/minute | 6 | **1** |

There are no deliberate network retries in that measurement. The final planner fixture credits 10,800,000ms and 360 EXP using the unchanged policy and level/Xu formulas. These are local fixture results, not live acceptance. Exceptional invalid-window diagnosis can make additional single-slot probe calls; that overhead is separate from normal reading.

## A-15 - Cached state and bounded reconciliation

`bind()` restores only on UID changes. Normal `push()` does one per-slot write and uses cached queue state. Runtime checks use cached status; status is recomputed on mutations or a relevant eligibility/hold deadline. Storage events update only the affected key using its current value, avoiding stale event payloads. Unrelated events cause no queue storage reads. A clear event requests reconciliation.

A full scan occurs on account restoration, explicit `sync()`/diagnostic `size()`, immediately before an actual attempted submission, or at a five-minute reconciliation boundary. The idle application still has one cheap tick/second, independently of Reader. It performs no per-second storage enumeration. Recovery can persist previously memory-only records when storage becomes writable again.

Measured after initial binding, for one simulated idle hour / 3,600 ticks, allowing promise completion between ticks:

| Storage fixture | Before scans | After scans | Before `key()` calls | After `key()` calls | Writes/deletes |
| --- | ---: | ---: | ---: | ---: | --- |
| 10 unrelated keys, empty queue | 10,800 | **12** | 108,000 | **120** | 0 / 0 |
| 10,000 unrelated keys, empty queue | 10,800 | **12** | 108,000,000 | **120,000** | 0 / 0 |

The large unrelated-key fixture consumed 4840.8 ms of local CPU/wall benchmark time before, versus 19.8 ms after; timings are environment-sensitive. Counts are deterministic. The three scans per old tick came from repeated binding plus forced `begin()`.

Queued/unready account tests also run 3,600 ticks: 360 queued candidates produce 12 scans / 4,320 key reads / 4,320 value reads; the full 8,640-slot day produces 12 scans / 101,700 key reads / 101,700 value reads. Its oldest 360 candidates expire explicitly during the hour; zero rewards are submitted, and no persistence writes occur. Reconciliation prunes them with visible expiry counts.

## A-16 - Retain 8,640 slots, with measured tradeoffs

The old 360-slot RAM queue covered only 60 minutes and silently skipped excess candidates. A 24-hour window contains at most 8,640 distinct completed aligned 10-second slots. Retaining that natural bound prevents a one-hour client limit from dropping eligible observations during prolonged submission failure. A 1,080-slot limit based on the 180-minute cap would incorrectly apply server/day assumptions on the client, including across UTC midnight and uncertain ACKs. The server remains responsible for the unchanged 180-minute/day UTC cap.

For comparison below, all capacities use the final durable per-slot schema; the original 360-slot implementation itself had no durable storage. Chromium uses an isolated 390x844 touch/mobile viewport, 4x CPU throttling, 10,000 unrelated storage keys and a 28-character UID. Payload estimates are `2 * (key.length + value.length)`, excluding browser bookkeeping. Timings are one measured run, not a physical-device benchmark or a latency guarantee.

| Candidate count | Estimated payload bytes | Restore | Begin first batch | ACK 60 | 3,600 cached maintain/status calls |
| --- | ---: | ---: | ---: | ---: | ---: |
| 360 | 62,640 | 46.2 ms | 22.1 ms | 3.0 ms | 2.1 ms |
| 1,080 | 187,920 | 24.3 ms | 23.8 ms | 1.2 ms | 1.2 ms |
| 8,640 | 1,503,360 | 79.3 ms | 85.5 ms | 4.7 ms | 0.5 ms |

At 8,640 candidates, the normal-value payload is about 1.43 MiB for that UID; a 120-character UID raises the same estimate to about 2.95 MiB. Held-value retry metadata adds bytes. Browser quota is shared with other app data and accounts, so no universal fit is assumed: quota/write/read/delete failures remain explicit, with memory retention where possible. Full synthetic bulk seeding took 203.7 ms at 4x CPU; normal reading writes one key per completed 10-second slot.

Recovery requires 6 batches for 360 candidates, 18 for 1,080, or 144 for 8,640, at 60 slots/batch. The deterministic full-queue test restores and ACKs all 8,640 through exactly 144 batches with no loss. In one active tab, a one-second pump normally schedules roughly that many seconds of attempts, plus SDK/network stalls and retry delays; online/storage/auth events may wake it earlier. Eligibility continues to age during recovery, so candidates near the 24-hour boundary can expire and are reported explicitly. No physical mobile acceptance or end-to-end remote recovery-time guarantee is claimed.

Existing valid candidates are retained. A true excess new insertion is rejected with an explicit overflow count and a Reader warning; it never evicts an existing candidate silently. Genuine aligned candidates inside the full 24-hour window fit the default bound. Tests inject smaller capacities to verify overflow and persistence-failure UI behavior.

## A-17 - Visible Reader status

The existing `reader-exp-live-p2d` badge now separates **confirmed session EXP** from **pending completed reading seconds**. It shows synchronization, offline/auth wait, retry, retained-window rejection, persistence failure, and expiry/overflow/corruption counts in Vietnamese. Text is assigned through `textContent`; the existing badge wraps at mobile width. `role=status`, polite live-region semantics and a `data-sync-state` are attached to the existing UI.

The badge never converts candidates into EXP. Only `awardExp` returned by the confirmed reward bridge increments the session display; `already-credited` can legitimately report zero. Reader authentication problems leave the status visible for a still-matching UID. There are no native alerts. The Chromium fixture verifies real DOM text before/after a controlled bridge response, warnings, absence of dialogs and wrapping at 390px. `reader-status.png` is a fixture screenshot, not a screenshot of a live production account.

## A-18 - Terminal/retry state handling

| Result / error | Local behavior |
| --- | --- |
| Confirmed `applied` / `already-credited` | ACK only that ticket's slots; server bitmap semantics unchanged |
| Network/unknown error, lost ACK, unconfirmed result | Keep candidates; UID-specific monotonic exponential retry, 5s through 300s |
| Exact planner `invalid-reading-window` | No ACK. Persist probe metadata for that rejected batch; diagnose each member as a singleton |
| Singleton invalid-window rejection | Keep the record with a five-minute hold; exclude it while allowing newer eligible slots to proceed |
| Known invalid profile/history, missing profile or incompatible policy | Keep all candidates; explicit Reader error, bounded five-minute retry |
| Authentication/permission rejection | Keep candidates; five-minute retry, or release that auth-specific wait on an auth-state notification |
| Planner `clock-backwards` | Keep candidates, show clock warning, retry no sooner than 60 seconds |
| Local expiry | Prune according to the unchanged 24-hour start-time window; increment visible expiry count |

Normal values `1` remain readable. The same pre-merge schema namespace now also accepts `p` and `h:<retry-wall-ms>` values for durable probe/hold metadata. UID and policy remain in the key. Probe/hold transitions never claim a commit or remove uncertain candidates. Generic SDK errors do not trigger invalid-window isolation.

In-memory retry state is keyed by UID and survives stop/reopen, same-UID auth notifications, and A -> B -> A. Reader open no longer resets deadlines. Authentication notifications may release only known authentication rejection state, not transient network backoff. Ticket epochs and bridge account checks still fence stale results. A rejected batch can require up to 60 bounded singleton probes before all its members are diagnosed; that is exceptional recovery work, not normal six-slot batching. Held records are retried later and can expire naturally; they are never permanently stuck ahead of newer slots.

Both fixtures and the unchanged-source-Rules emulator reproduce server high-water expiry: older locally eligible slots are retained on hold, while newer eligible slots commit. After diagnosis, a new normal reading minute makes one reward call even though old holds remain.

## Verification

Environment: Windows PowerShell, Node 24.22.0, Playwright/Chromium 1194, JDK 21, Firestore emulator 1.22.0. Physical phone and exact Node 22/Linux CI execution were not available.

| Check | Final result |
| --- | --- |
| Targeted reading/reliability/hardening, R2 loot, bookmark and profile-save tests | **43 PASS** |
| `node scripts/test-domains.cjs`, all five active domains | **1,587 PASS, 0 FAIL, 1 opt-in emulator SKIP** |
| `node --test functions/tests/*.test.cjs` | **10 PASS** |
| Chromium two-tab union/refresh/Web Locks, capacity proxy, Reader status | **3 PASS** |
| Opt-in isolated Firestore integration | **1 PASS**, including lost ACK, duplicates, UID fencing and high-water recovery |
| Cloudflare full test directory | **1,089 PASS, 8 known baseline FAIL** |
| Existing Reader return browser test | FAIL: refresh timeout at line 158 on final rerun; same failure reproduced in untouched baseline during P4A.2A |
| Changed JS syntax and whitespace checks | PASS |
| Rules / Worker / reward engine / policy source changes | None |

All prior P4A.2A regression cases remain, including crash/refresh boundaries, account isolation, failures outside Reader, lost ACK, corruption/expiry, capacity, duplicate slots and two tabs. The emulator uses only `127.0.0.1:8194` and `demo-dudu-p4a2a`, loading checked-in Rules unchanged. It verifies EXP72 -> 74 once despite duplicate replay, Xu8 and profile metadata unchanged, then a distinct valid recovered minute produces EXP76 after rejecting old high-water slots. A-13 deployed/source Rules divergence remains unverified and untouched. Emulator stopped after testing. No fixture/emulator result is presented as live acceptance.

The eight Cloudflare failure names and totals match the previously tested untouched baseline: V45 activation, G1D/G1G Windows file-URL paths, G2S fixture equality, and four G2X inventory checks. No baseline repair or restoration was attempted.

## Exact changed files and proposed PR

P4A.2B increment relative to the provisionally reviewed P4A.2A result:

1. `js/personal-reading-slots-p2c.js` - cached synchronization, bounded reconciliation, diagnostics/counters and retained probe/hold state.
2. `js/personal-reading-runtime-p2a.js` - six-slot batching, scoped recovery/backoff and visible Reader status.
3. `index.html` - two script cache versions and accessible attributes on the existing badge.
4. `tests/browser-personal-reading-reliability-p4a2a.cjs` - retain two-tab check; add capacity proxy and actual DOM status checks.
5. `tests/personal-reading-emulator-p4a2a.test.cjs` - retain prior integration; add high-water rejected-window isolation and newer-slot recovery.
6. `tests/helpers/personal-reading-runtime-p4a2b.cjs` - deterministic clock, storage operation counters and runtime harness.
7. `tests/personal-reading-hardening-p4a2b.test.cjs` - ten hardening cases, including 180-minute transaction count and lifecycle/backoff behavior.
8. `docs/DUDU-P4A2A-READING-RELIABILITY-REVIEW.md` - normalize its prior Windows encoding to UTF-8 and link this continuation; historical findings retained.
9. `docs/DUDU-P4A2B-PRE-MERGE-HARDENING-REVIEW.md` - this report.

The combined PR against the requested baseline contains those nine plus the two unchanged P4A.2A additions/edits: `tests/personal-reading-reliability-p4a2a.test.cjs` and `tests/personal-reading-slots-p2c.test.cjs` - **11 files total**. Proposed title: **Persist completed reading rewards with batched recovery and visible sync status**. Exclude `.review-p4a2a/`, `.review-p4a2b/`, dependencies, logs, baseline copies and screenshots. No PR was opened or merged.

## Remaining limitations

- Durable browser storage is best effort; storage clearing, quota/permission denial, private-session teardown and device loss can defeat refresh recovery. Errors are visible; memory-only retention cannot survive page destruction.
- Web Locks coordinate supported same-origin tabs. Unsupported/denied locks fall back to per-tab single flight and authoritative transaction deduplication. Cross-tab views are eventually synchronized; there is no device-to-device lock.
- App suspension/background throttling, unresolved SDK calls, offline state and authentication readiness delay recovery. An unresolved operation holds single flight until SDK completion or reload. The backoff map is in memory; a full refresh starts recovery afresh. Probe/hold metadata is persisted.
- Expiry and hold deadlines use wall time with an in-process high-water mark. Forward jumps can expire candidates early; rollback can delay held-slot retry. New eligible records are not blocked by those holds. No trusted server-time service was introduced. The existing planner remains authoritative for its server-profile high-water checks.
- Expired logged-out namespaces remain lazily pruned when that UID is next accessed. Other accounts and unrelated app storage share browser quota. The capacity measurement is a CPU-throttled desktop proxy, not physical mobile acceptance.
- Diagnostic counts and session EXP are per application instance/UID; they are not a new server ledger. Invalid-window probing adds bounded exceptional request overhead and a five-minute retained hold, rather than dropping ambiguous candidates.
- The deployed Rules differ from source (A-13). Live Web/R2 acceptance, production Rules compatibility and exact CI-platform execution remain unverified. Overall status stays PARTIAL pending those separate gates and the baseline failures.


## P4A.2C continuation - BUSINESS-CP-004-R2

Remote main was fetched and verified at `1c920b9a73331721dae899a2f9ad5a0f054832e4`, identical to the isolated checkout baseline. The combined scope remains the same 11 files. No review directory, dependency, log, screenshot, baseline copy or workflow is included.

A-19: recovery now captures the actual eligible slot IDs instead of retaining a UID-only flag. Empty stop/pagehide clears recovery. Recovery drops candidates that another tab ACKed or that expired; `begin()` revalidates the capture after storage synchronization before permitting a partial batch. New slots do not inherit stale recovery. Genuine failed partial flushes retain their candidates and existing backoff through Reader reopen.

A-20: the queue distinguishes previously persisted slots from never-persisted volatile candidates. A failed probe/hold metadata write is preserved over older stored normal values. Concurrent holds merge conservatively using the later deadline. A missing previously persisted key is observed as a peer ACK, including a recheck before retrying the metadata write; never-persisted candidates remain in memory for eventual storage recovery. No uncertain candidate is ACKed because of a metadata write failure. Server bitmap and reward transaction behavior are unchanged.

The Reader once again explicitly distinguishes active reading from paused reading, independently of synchronization state. Blur and inactivity show paused status while pending time remains separate from confirmed EXP.

Six regression cases were added to the existing hardening test file, covering empty exit/reopen and pagehide, peer ACK/expiry (including a missed notification before begin), genuine failed partial flush/backoff, volatile probe/hold recovery, peer ACK versus never-persisted memory candidates, and active/paused status. All previous cases are retained.

Final local validation before branch publication:

- Targeted reading/reliability/hardening, loot, bookmark and profile-save tests: 49 PASS.
- All five active repository domains: 1,593 PASS, zero FAIL, one explicit emulator opt-in SKIP.
- Functions: 10 PASS.
- Chromium: three PASS (two-tab union/locks, capacity proxy, Reader status).
- Isolated demo-project Firestore emulator: one PASS, covering replay, UID isolation and high-water recovery. No production Firebase writes.
- Continuous 180 eligible minutes: exactly 180 normal reward transaction calls; quest calls remain separate.
- Simulated idle hour: exactly 12 bounded full scans after initial binding for small/large fixtures.
- Full Cloudflare directory: 1,089 PASS and the same eight known baseline failures; no newly failing test names.
- Syntax, whitespace and protected-source diff checks: PASS. Reward engine, policy, Rules, Workers and workflows remain unchanged.

Original Windows `index.html` SHA-256 remains `EB8F1B9DDB3E1A2AB66248BEF0A4790011D95FE787AADEBAC7B66697C928B2C4`; original dirty work was not staged or committed. GitHub delivery is a dedicated branch and Draft PR against main, with CI inspection reported separately in the PR and local review evidence. No merge or deployment is authorized. The earlier eight-failure Cloudflare result and Reader refresh timeout remain baseline limitations, and live acceptance is still unverified.
