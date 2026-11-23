# Firestore read quota audit and bounded optimization

Status: PARTIAL backend recovery; offline optimization prepared for a separate Draft PR. No production deployment, data mutation, polling, billing, Rules, IAM or secret change.

This is the PR42 audit snapshot. The subsequent opt-in, display-only device metadata cache is documented in [DEVICE_CATALOG.md](DEVICE_CATALOG.md); its six-hour display reuse does not authorize owner preflight, which still requires fresh complete network results.

## Evidence and coverage

Static scan covered all 887 tracked JS/MJS/CJS/TS/HTML files in the base main revision. There were 59 candidate files: 31 entrypoint/directly loaded files, 23 backend files, one other source/tool and four test/prototype/reference files. See [READ_INVENTORY.md](READ_INVENTORY.md). A candidate is not proof of an executed read: comments, definitions, Map.get and fixture APIs require manual classification. Indirect imports and runtime feature gates were also inspected for the relevant paths. Backend code in the repository is not assumed to equal a deployed Worker or Function.

Live Cloud Monitoring read_count and API request_count were accessible with the existing official CLI session. In the inspected 24-hour window, LOOKUP dominated QUERY; NOT_FOUND was also material. This establishes the largest observed operation category, not which screen, collection, UID or credential caused it. Those attribution dimensions are absent from these time series. API request metrics exist under both legacy project and database resource types; they must not be added together. Raw metrics, timestamps, usage totals and credential tooling stay local.

The daily project read quota was previously verified exhausted. The document-read monitoring chart is not the billing/quota enforcement ledger. [Firebase documents limitations of usage metrics](https://firebase.google.com/docs/firestore/monitor-usage). No query or billing configuration was changed to obtain the evidence.

## Source findings

| Source | Verified code behavior | Treatment |
| --- | --- | --- |
| `index.html` catalog wrapper and `js/epub-catalog-perf-r1.js` | Each refresh used to invalidate R2, cancel the current coordinator and launch both V49 and R2 loaders. Already-issued Firestore reads cannot be refunded by cancellation; V49 publicBooks does not accept cancellation. | Coalesce only unfinished automatic refreshes within the same Firebase user object and access generation. |
| `js/library-r2-author-ui-c13b6d.js` | The author start action refreshes the complete catalog before tickets/uploads; pending blocks entry. | Preserve a new-read boundary for publish preflight and manual comparison. No cached catalog authorizes publish. |
| `js/library-epub-r2-client-l6p2c5c3.js` | Every listPublished call walks pages of 20; validates each book and cursor; onPage can display partial data, but only full completion is success. | Inspected and integration-tested, not modified. |
| `js/epub-production-v49.js` | publicBooks walks pages of 60. Chapter reads check the book document, then fetch the chapter: two direct document requests. | No query or content semantics changed. |
| `js/auth-v2.js`, `js/account-approval-v1.js` | Existing-user profile read; optional approval read and legacy-profile fallback; SDK timeout can lead to REST profile read. Admin custom claim skips approval lookup. Token refresh itself is not a Firestore read. | Security and fallback paths unchanged. |
| `js/profile-save-c23.js`, `index.html` saveCurrentAccount | Each queued save transaction reads the current profile before deciding whether to write. Even an unrelated/no-patch save detects a newer remote wallet/item state and blocks stale edits. | Not skipped or cached: removing this read would change conflict detection. High-frequency callers remain a follow-up candidate. |
| `js/personal-fun-c25.js`, `js/personal-scratch-c28.js`, `js/personal-blind-box-c29.js`, `js/vanbao-*.js` | Game load functions fetch the profile; commands use transaction reads and bounded receipt logic. The live Van Bao lobby starts two independent load functions. | No economy, RNG, receipt or transaction change. SDK calls are not equated to distinct billable reads. |
| Library card covers and private chapter/layout/assets | Library renders clear cover handles and issue authenticated GETs before assigning blob URLs. Setting loading=lazy on that blob image does not defer the preceding GET. Server ACL/catalog checks add Firestore lookups per media request. | Defer only library card cover GETs until IntersectionObserver reports viewport/100px proximity. No completed media/ACL cache; hero and Reader logic remain unchanged. Pending observers cancel on re-render/dispose; every actual request still uses existing token and server authorization. |
| Synopsis search | Reads missing legacy synopsis chapters, with an existing in-memory per-identity/revision cache and single-flight map. | Existing invalidation kept. R2 metadata description avoids an extra synopsis chapter fetch where available. |
| `functions/index.js`, Cloudflare source modules | AI/economy transactions and library REST operations are additional potential consumers. Paused/fixture Van Gioi adapters are not evidence of production traffic. | Inventoried; deployment/production attribution not inferred. No backend bundle or configuration in this PR. |

### Listener lifecycle

The active entrypoint registers one Firestore data onSnapshot for studio_data/main_library at script initialization, outside render/navigation functions. It lives for the tab; no accumulating per-library-open registration was found. Its updates/reconnections can consume reads. Auth onAuthStateChanged observers are not Firestore data listeners. Private-media clients already unsubscribe their auth observer on disposal; the phone lifecycle initializer has a mount guard. No additional listener, listener restart, polling or listener cache was added. A listener leak is not claimed as the root cause.

## Per-action budget: estimates versus measurements

Let V = published V49 books and R = published R2 books. Define Q(N,L) = N for a nonempty final partial page; add one minimum empty-query read when N=0 or N is exactly divisible by L. Let C = Q(V,60) + Q(R,20). For an R2 owner/admin, service catalog listing contributes the R2 term; a non-admin reader may also incur one approval lookup per page, or two in the legacy-profile fallback path. These are request/data-read budget estimates, not invoices.

| Action | Estimate from code, before Rules/retries/cache effects | Evidence |
| --- | --- | --- |
| Open web signed out | One main-library document listener initial snapshot if allowed; catalog loaders zero while not ready. | Static entrypoint plus coordinator readiness guard. A denied listener is not counted as a successful document delivery. |
| Restore/sign in existing admin | One profile get plus C; optional migration/other explicit UI actions are extra. | Auth path inspection; Firebase token exchange is excluded. |
| Sign in existing allowlisted reader | Profile get + approval get + catalog C + per-page Worker approval checks. | Code estimate; no bypass of the explicit approval check. |
| Legacy-profile reader | Additional profile existence probe after missing approval, then normal profile hydration; Worker approval fallbacks also apply. | Code estimate; missing-document reads are not free by assumption. |
| Open Library after catalog loaded | Navigation/render alone need not fetch metadata again. Visible covers and unresolved synopsis may add requests; explicit refresh adds C. | Static call graph; no fixed universal per-open read number claimed. |
| Open FUN / Scratch / Blind Box subview | One logical profile get per module load; commands/claims add transaction reads. | Measured using the real module functions and a synthetic Firestore fixture: one get each. |
| Open live Van Bao lobby | Two logical load calls, each fetching the profile. | Static lobby + both real load functions measured separately: one get each. SDK coalescing/billing not measured. |
| Casino load function | One logical get when explicitly enabled/called; it is not assumed active merely because source exists. | Real function fixture measured one get; feature/deployment status separate. |
| Open device-only game | Zero direct Firestore reads from local gameplay itself; authenticated load, save and reward bridges are additional. | Code classification; not a whole-session production measurement. |
| Owner catalog preflight | A new C metadata budget per explicit start, independent of an old background request. Example V=0,R=72: about 73 baseline query-document reads, before additional effects. | Estimate; 72 is an illustrative cardinality, not a new production inventory. |
| R2 private chapter/layout/asset request | Typically catalog lookup plus reader approval path; separate media GETs multiply this. | Server-source estimate; no new deployed Worker verification. |

[Firestore pricing](https://firebase.google.com/docs/firestore/pricing) includes minimum query reads, listener/reconnect effects, possible index reads and additional Security Rules document lookups. Transaction retries and SDK cache/network behavior also affect real usage. Estimates above do not substitute for measured production read bills. No per-screen production read count was obtained.

## Change and effect

The coordinator shares only the pending Promise, keyed by the exact current Firebase user object plus generation/readiness. There is no completed-result TTL cache. After settlement, the next refresh starts a new read. Sign-out, account switch, revocation and explicit invalidate cancel the generation and clear data; late responses and old finalizers cannot restore it.

R2 invalidation moved into beforeRefresh, executed once per actual new load instead of once per caller. Calls from startup/access/auth can share unfinished work. Explicit author comparison, publish preflight, opening a newly published book, and management/publish mutation callbacks all request `{fresh:true}`. A fresh request supersedes the older background flight; success from the older flight cannot authorize it. A partial/error catalog never becomes successful preflight.

Measured locally against the actual base coordinator and candidate, ten simultaneous refresh calls started ten V49 + ten R2 loader functions before, versus one + one after. This is 90% fewer loader starts in that synthetic burst, not a claim of 90% fewer project/billed reads. Aborted R2 loads can stop before HTTP; already-served requests remain charged. If calls are sequential, across tabs, across identities, or explicit fresh operations, this optimization intentionally does not combine them. Production benefit depends on overlap frequency.

### Follow-up: R2 cover demand and observable logical starts

The branch incorporates main's exact pending classifier/status behavior from PR43. The reviewed compatibility test adjustment now evaluates that actual classifier instead of expecting its pre-extraction inline source. No PR44 recovery/DO code is included.

Real Chromium fixture at 375x700: 20 cover cards render; four authenticated fixture GETs occur initially, four more after scrolling to the bottom, and no additional requests occur after dispose. This is 80% fewer initial cover GETs relative to eager fetching all 20 cards in this fixture. It is not a measured 80% reduction of billed/project reads. Cards that the user eventually sees still require authorization and content retrieval. Unsupported IntersectionObserver retains the existing eager authenticated fallback.

Unit tests use the actual private media adapter to require authenticated GETs after intersection. They cover account switch/sign-out before visibility, server 403, detached nodes, duplicate pending calls, changed revision/later renders, clear during an in-flight response, cleanup and fallback. No completed blob/permission cache is introduced. A delayed response for an old render is released without touching detached UI. Server permission revocation remains authoritative on each actual request.

`DuduCatalogPerfMeasurements.requests` now contains only tab-local logical counts: automaticCalls, freshCalls, inFlightJoins, v49LoaderStarts and r2LoaderStarts. No UID, book ID, token, chapter text or request headers are stored. These counters are never labeled Firestore reads: one loader can issue several pages and SDK/network/retry/cache behavior differs. They permit comparing real user action bursts without intercepting auth tokens. Existing V49/R2 completion states remain the sole catalog readiness authority.

This addresses two demonstrated amplifiers, not all quota use. Full fresh catalogs for explicit comparison/import remain required. The exact largest production caller that exhausted daily quota is still unverified. There is no change to billing, IAM, Rules, Worker deployment, profile transactions or gameplay. The interrupted promoting session must remain pending and be reconciled separately; this frontend patch does not resume/replay any POST.

## Regression and release boundary

Targeted auth/profile/catalog/pending tests: 61/61 PASS. Library/EPUB/FUN/Scratch/Blind Box tests: 215/215 PASS; overlapping cases are not distinct tests. New cases cover shared Promise, no completed cache, exact user-object isolation, account switch, revocation, partial failure, all pages, catalog additions/revision/removal, explicit fresh preflight boundaries and exact published pending proof.

No full production browser session or post-reset owner import has been certified. A separate Draft PR carries only public frontend code, synthetic tests, this sanitized audit/inventory and offline CI. Raw Monitoring responses, private investigation scripts, Worker bundles, credentials, config and book/session data remain local. PR #41 remains separate; no merge/deploy is performed.

Quota exhaustion is not repaired by this client patch. After the normal daily quota reset, require a complete HTTP-200 catalog under the owner session, then exact pending bookId/revision/published proof before the existing client clears pending. If it still fails, retain pending and inspect the actual server status. Do not repeatedly probe while exhausted. Long-term stability on Spark is not established until normal-use operation mix and refresh frequency are measured after a separately approved rollout.

Rollback is a normal revert of this frontend optimization commit. It restores the original refresh behavior; it must never delete pending, Firestore/R2 data or receipts. No backend rollback is needed because none was changed.
