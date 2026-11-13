# P2-S verification record

## Current closure: MOD-P3 exploration and encounter identity

- Read full V1.7 MOD-P3 appendix in MASTER HANDOFF (native Docs revision read, no edits). Correct root/branch/head; existing untracked prototypes preserved. Only prototype files changed, original Combat Core/fixtures/icons remain unchanged.
- Node: **85 passed, 0 failed** using `node --test prototypes/tutien-combat-s/tests/*.test.mjs` (all prior 70 plus 15 P3 tests).
- Chrome aggregate: **63 passed, 0 failed** (all prior 56 plus 7 P3 checks), new isolated profile/loopback. P3 checks cover old S/M/MR3/P1/P2 preservation, herb success/failure, egg success/failure, active challenge reload, skip, safe retreat and boss defeat keeping ALL committed loot, no false clear, retry/double-click, actual two-tab harvest/final-egg contention, injected write rollback for BOTH herb and egg, replay/no farm, explicit trial isolation, widths and no jade/production resource loads.
- Native Chrome raster/input: **14 passed, 0 failed** with `node tests/run-presentation.mjs <Chrome> --explore` from this directory: herb/nest screenshots at 320/360/390/430/1000, native keyboard force 55, native arrow key and native touch to nest, screenshot plus persisted two-item bag after boss loss without clear receipt. PNGs visually inspected; static target and tiles support reduced motion. Original raster/animation/reduced motion suite **15 passed, 0 failed**.
- Small beast identity: enemy defense alternates 24/6 by hidden/exposed phase (or existing weaken state), actual damage assertions 12 vs 48 demonstrate behavior. Stone beast armor adds 8 after attacks (max16), drops after guard/ward; actual damage 26 ->18 and reset->26 asserted. These are P3-only snapshot/state adapters, not duplicate damage math, evasion RNG, new Core status or animation.
- Boss and Core unchanged. Full no-potion clears via shield preparation and guard preparation end HP32/LL2 and HP4/LL5. No claim about exhaustive balance or human fun.
- P3 fixed record mod-p3-run-v1 and optional explicit QA trials use existing mockTrials/IndexedDB v2. No migration or automatic new run. One herb/egg opportunity per run survives floor attempts; inventory.loot is sole ownership record, not the collection UI. Pickups and opportunity/command/receipt commit atomically. Loss/retreat never removes loot; clear reward remains boss-only and once per run. All items non-production-redeemable.
- Jade initialization was removed from world rules import graph (definitions-only jade-policy); old MR3 screen still uses original helpers and passes regression. P3 renderer does not call Jade, Alchemy, Pet, Quest, Library or production.
- Limits: read-only cultivation fixture, no alchemy/hatching/pets/trade, fixed visible puzzle data, pending cross-run rarity/farm policy, no physical-device/accessibility certification. Human acceptance pending An Du.

Earlier closure records below are historical.

## Current closure: MOD-P2 waves and first boss

- Node: **70 passed, 0 failed**, all 61 prior checks plus 9 waves checks. Command: `node --test prototypes/tutien-combat-s/tests/*.test.mjs`.
- Chrome: **56 passed, 0 failed**, all 51 prior checks plus 5 waves checks, loopback with fresh isolated browser profile. Includes P1 completed-save preservation, S/M/MR3 state preservation, wave/boss reloads, no early receipt, carry HP/LL/potions, repeated attempts, actual two-tab win/NEXT/boss finishing contention, loss/retreat at each wave, home/resume, UI and no grants.
- Original raster/animation/reduced-motion suite: **15 passed, 0 failed**. Boss raster suite: **6 passed, 0 failed**, `node prototypes/tutien-combat-s/tests/run-presentation.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe" --waves`. Captured boss at 320/360/390/430/1000px and an actual cleave frame; visually inspected gold placeholder, Boss 3/3, double-heavy intent and original slash. PNGs/reports live in temporary QA folders, not game assets.
- New snapshots are configured by the dungeon adapter after calling original newBattle; Combat Core, Slice S fixture and animation routine are unchanged. Wave data: 64HP/A18/D6 prepare-basic; 100HP/A26/D10 prepare-heavy-basic; boss 152HP/A30/D12 prepare-heavy-heavy-basic.
- Five full-chain policies simulated in simulate-waves.mjs; README has numerical table. Tactical finishes HP28/LL5, reactive HP11/LL11 without potion; pure offense, early waste and fixed ward/basic/basic cycle lose to boss. Tactical also succeeds from zero potions. No exhaustive claim about every strategy or human difficulty.
- No HP/LL/potion refill between waves. Existing encounter-local cooldown/status semantics retained. Rest is blocked while ACTIVE/BETWEEN; loss/retreat permits rest and restart at wave 1. No additional real-time waits or daily requirements.
- MOD-P2 is opt-in at `/module/index.html?waves=1`, fixed record mod-p2-run-v1 in existing mockTrials/v2. MOD-P1 remains at the original URL with its own untouched record. No automatic migration/reset or ownership transfer. First boss clear writes one local-only event/receipt, no money/items/EXP/Tu Vi.
- Technical gate GO; provisional simulation balance acceptable for An Du testing. Human experience and physical-device acceptance remain pending. No production, dependencies, new art/animation, commit or deployment.

Earlier records below are historical.

## Current closure: MOD-P1R1 presentation regression

- Cause: MOD HTML omitted the visual-event layer and MOD action handler never played the Slice S animation after commit. Compact shared CSS also combined a short fighter row, negative portrait margin, overflow hidden and a MOD margin override, cropping the body.
- Fix: extracted the exact existing Slice S playback routine into battle-animation.mjs for both UIs, retaining existing CSS/VFX. MOD animates only a newly committed action, shows its terminal hit before result, supports skip and page/OS reduced motion, and cancels playback on hide/leave. Geometry overrides are scoped to MOD only; full bodies have a separate row and normal vertical scrolling.
- Node regression: **61 passed, 0 failed**. Chrome aggregate regression: **51 passed, 0 failed** using isolated temporary profile and loopback.
- Additional run-presentation.mjs uses Chrome DevTools raster screenshots, not only class/function assertions. Captures idle figures at 320/360/390/430/1000px; basic, cleave, ward and suppress at a paused visible animation frame; and original Slice S slash. PNGs were visually inspected for full bodies, visible slash, shield glow and blue weakening glow. It also checks committed revision/double-click, no replay on reload/retry, rejected action stability, skip and reduced-motion preferences.
- Screenshot midpoints are paused only by the QA script; runtime retains 680ms playback. Artifacts/report are saved outside the repository in a fresh temp folder. Physical phone testing and An Du acceptance remain pending.
- Core, fixtures, repository, dungeon progression and reward rules are unchanged in this revision. Browser tests use fresh profiles, preserving the player's saves. No production access, reset, new sprites/assets or dependency install.

Earlier closure records below are historical.

## Current closure: MOD-P1 mini-app and first dungeon

- **Node: 61 passed, 0 failed**, command `node --test prototypes/tutien-combat-s/tests/*.test.mjs`. Includes all 53 previous checks plus 8 MOD checks.
- **Chrome headless: 51 passed, 0 failed**, existing approved loopback runner with a fresh temporary profile. Includes all 43 previous checks plus 8 MOD checks.
- MOD entry: `/module/index.html`, no quest prerequisite or fog-map navigation. Same Combat Core and skill icons imported, fixture unchanged. Original S/M/MR3 page is unchanged.
- Real IndexedDB: one fixed MOD record in existing mockTrials/v2; S/M/MR3 snapshots compared byte-for-byte; no migration or deletion. Default run UI record also compared before/after MOD play. No production profile opened.
- MOD checks cover first clear and repeat win, durable receipt/event, actual two-tab finishing-action contention, retry, injected write-failure rollback, no asset grants, direct entry/home return, active-turn reload, terminal reload, double-click, potion debit retained, loss/rest/retreat, completed-floor replay, paused/idle stability, disabled breakthrough.
- Viewports: 320x568, 360x640, 390x664, 430x740 and 1000x800. Five circular controls remain at least 48px, no horizontal overflow or control overlap; home/utility controls remain available. Vertical scrolling is allowed. No real-device or assistive-technology certification.
- Cultivation is a read-only fixture, not a second stored EXP/Tu Vi progression. Dungeon completion is content progress, not EXP. Event is local-only and not dispatched to Quest/Firebase.
- No balance change, no new enemy/skill/equipment, no map expansion, no art assets/dependencies/production changes. Technical recommendation GO for An Du review. Experience acceptance is pending An Du; integration into the real product remains out of scope.

Earlier records below describe previous prototype revisions.

## Current closure: P2-MR3 mock jade adapter proof

- Node: **53 passed, 0 failed**, using `node --test prototypes/tutien-combat-s/tests/*.test.mjs` (46 previous + 7 new).
- Chrome: **43 passed, 0 failed**, using the same reviewed headless runner with approved execution, loopback and a fresh temporary browser profile (36 previous + 7 new).
- Endpoint security tested before gameplay implementation: GET source bytes equal original; HEAD body empty; POST denied; query/dynamic file paths, plain/backslash/encoded/double-encoded traversal denied. No CORS added; CSP unchanged.
- Browser loaded the original `/__shared/personal-jade-core-v1.js`; adapter outputs matched the original API. No Arcade act(), market, timer or wallet operations are invoked.
- MR3 checks cover fixed specimen immutability, hints across reload, one source producing only a specimen, two result variants, changing preview, double-click, retry/reopen, actual two-tab craft contention, injected write failure rollback, next-encounter defense, blocked midbattle equipment, hidden route and no-craft completion. Portrait widths 320/390 and desktop 1000 were checked alongside existing S/M viewport coverage.
- Existing default run compared byte-for-byte before/after separate MR3 trial activity in test databases. No player-profile database was opened by automation. Physical schema remains IndexedDB v2; old records are not migrated into MR3 specimens.
- All code changes are inside the prototype. Original jade source, combat core, fixture and skill icons are unchanged. No production integration or reset.
- Limits: no physical phone/assistive-technology test, no production anti-cheat, no player fun/art acceptance. Technical recommendation: GO for An Du review only.

Earlier closure records below are historical.

## Current closure: P2-M mechanics-first

- **Node: 46 passed, 0 failed**: all original 29 plus 17 world/quest/crafting tests. Use the complete Node command in README.
- **Chrome headless: 36 passed, 0 failed**: all original 24 plus 12 M checks. The reviewed runner used a new temporary profile and a loopback-only server, with approved execution.
- M browser coverage: combat/survey share one source; WARD and GUIDE crafting/retry/equip/completion; no-craft completion; wrong choices recover; reload each quest milestone; actual v1 IndexedDB upgrade preserving old records; separate trial runs preserving original state; injected craft write failure rollback; source/craft races from two actual tabs; UI double-click and run switching; M width checks 320/360/390/430/1000px.
- Combat reducer, fixture and circular-icon module remain unchanged. WARD's +2 defense is applied only by the mock repository to a new encounter snapshot. No production assets or EXP are awarded.
- IndexedDB name is unchanged. Physical schema v2 adds `mockTrials`; existing `mockRuns` survives. Lazy world initialization preserves the original inventory, battle, command history and receipts. Legacy jade is the same entitlement, not a new reward.
- Browser loaded resources were loopback only; play-page CSP still blocks outbound connections. This does not claim system-wide network monitoring.
- Remaining: physical phone/assistive technology testing and An Du's assessment of whether the exploration/crafting loop is enjoyable. Technical gate: **GO for Slice M user review**, not production release.

The records below describe earlier revisions and their limits at that time.

## Current closure: P2-SR1 mobile portrait UI

The previous P2-S partial browser sign-off below is historical. P2-SR1 completed the final browser verification after permission was granted for the local headless runner.

- **Node: 29 passed, 0 failed** (the original 23 plus 6 read-only presentation checks).
- **Chrome headless: 24 passed, 0 failed**, including the previously unexecuted actual-two-tab contention, injected storage-write rollback and animation-skip cases.
- Browser checks also exercise all five primary actions, potion/retreat, cooldown badges, skill information without issuing a command, actual UI reload, safe-area presentation after defeat, rest preserving the previous result, and reward isolation.
- The first UI pass exposed a selector collision between the animation scene's old `data-action` attribute and action buttons. The scene now uses `data-animation-action`, and test selectors explicitly target buttons. Combat rules were not changed.

Final Node command:

```powershell
node --test prototypes/tutien-combat-s/tests/core.test.mjs prototypes/tutien-combat-s/tests/repository.test.mjs prototypes/tutien-combat-s/tests/isolation.test.mjs prototypes/tutien-combat-s/tests/presentation.test.mjs
```

Browser command is the same runner documented below. It was reviewed before requesting permission: loopback-only server, a new temporary Chrome profile, no DUDU entry page or production account. Loaded page resources were all loopback. The play page retains `connect-src 'none'`.

Measured active-combat layout (CSS pixels; DOM geometry, not a physical device test):

| Viewport | Main button diameter | Control panel bottom | Horizontal overflow / HUD overlap |
|---|---:|---:|---|
| 320 × 568 | 52 | 519 | None |
| 360 × 640 | 52 | 549 | None |
| 390 × 664 | 52 | 549 | None |
| 430 × 740 | 52 | 549 | None |
| 1000 × 800 | 56 | 843 | None; normal vertical scrolling on desktop |

Safe presentation does not reset state: defeat still retains HP0 until the existing Rest command is chosen. Enemy HP and combat controls are hidden at the safe point; the last result remains labeled as historical even after Rest.

No IndexedDB namespace, fixture numbers, combat reducer, repository transaction rules or existing mock saves were changed. Browser tests used their own temporary browser profile and separate test databases; they did not reset the player's saved run.

Remaining limits: no physical mobile/assistive-technology verification, no premium art sign-off, no production/backend integration. Technical gate: **GO for Slice S review**; this does not authorize Slice M.

---

## Historical P2-S record (before P2-SR1 closure)

## Scope

Only `prototypes/tutien-combat-s/` was created. No project dependency installation, production integration, reset, commit, push or deployment. The prototype uses a separate local IndexedDB namespace and a loopback-only preview server.

## Executed

```powershell
node --test prototypes/tutien-combat-s/tests/core.test.mjs prototypes/tutien-combat-s/tests/repository.test.mjs prototypes/tutien-combat-s/tests/isolation.test.mjs
```

**23 passed, 0 failed** on the final implementation: combat arithmetic, exact reference sequences, cooldown/status rules, death/retreat, item validity, dedup/revision/scope/reward rules, explicit storage failures, standalone resource isolation and server boundary.

```powershell
node prototypes/tutien-combat-s/tests/run-browser.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

An earlier revision completed **13 browser checks passed, 0 failed**, using actual Chrome and actual IndexedDB. It verified commits, reopen/retry, a real transaction abort, competing connections, independent iframe window contexts, repeat-reward prevention, owner/run isolation, 320px and desktop DOM layout checks, UI double-click, actual iframe reload with potion debit retained, and only loopback resource entries.

The first sandboxed Chrome attempt failed because the browser/GPU subprocess could not run. An approved out-of-sandbox headless run subsequently passed the 13 checks. The harness was then extended with three checks: actual separate browser tabs, injected quota/write failure with rollback, and animation skipping. Small follow-up changes also added deferred cross-tab UI refresh and save-version validation.

**The final headless rerun was not approved and did not execute.** Therefore the current 16-check browser suite is not claimed as passed, and the final UI changes have not been browser-reverified. The 23 Node checks above did run after these changes.

## Not verified

- Final 16-check browser suite, including actual separate tabs (earlier pass covered connections and iframe contexts only).
- Human visual/art assessment, physical mobile device, accessibility assistive technology.
- Production authority/security, real multi-device sync, DUDU integration (deliberately absent).
- Whether the game is enjoyable; only An Du/player testing can evaluate this.

No browser resource report contained Firebase/Cloudflare or another external origin. The production entry page was not opened. The page has `connect-src 'none'`; this is a page isolation claim, not a claim that every background process on the computer was network-audited.

## Gate

Ready for local Slice S play review. Full technical sign-off remains partial until the final browser suite is permitted and the unverified items relevant to release are reviewed. No authorization to add Slice M is inferred.
