# DUDU Studio V66 — contract-first transmigration and six genre gates
Date: 2026-10-19. Production source: `main`.

## Correction to V63–V65
**Previous mistake:** six examples of F/E settings were treated as the six major worlds. The six top-level objects must instead be six narrative **genres**. Within each genre are many separately identified small worlds/mission scenarios. The Book Library is completely independent.

Six canonical genres and IDs:
- `ancient`: **Cổ đại** — family drama, court, wuxia, agrarian, exams, ancient mysteries
- `modern`: **Hiện đại** — school, city, work, sports, entertainment, business
- `era`: **Niên đại** — distinct historical periods, social/family/economic life
- `future`: **Tương lai** — science fiction, space, virtual worlds, AI
- `cultivation`: **Tu tiên** — sects, talismans, spirit farms, alchemy, secret realms
- `apocalypse`: **Mạt thế** — shelters, disasters, rebuilding, survival
Unknown or unclassified future genres are reserved for an independently reviewed expansion; no invented seventh public top-level genre.

## Mission catalog and random dispatch
`js/world-taxonomy-v66.js` defines exactly 48 separate **seed** missions, eight per genre:
- Each genre: **5 F** and **3 E**. Total **30 F + 18 E**.
- IDs are explicit, stable `missionId` values, e.g. `dudu-m-an-f01`; never use names or indices as identity.
- Each seed has a genre, rank, subgenre, premise and unpublished/unavailable flags.
- A seed is a world *concept*, **not a playable quest**. Future prompts may add scenes, choices, multiple endings and NPC bindings to the seed.
- `pickPreview({tier,genreId,seenMissionIds,recentGenreIds})` offers a non-persistent preview: avoid repeating the same mission until the eligible pool is exhausted; prefer a different genre when alternatives exist. This is NOT mission assignment.
- UI: six small genre gates, optional per-genre rotating previews for F/E, compact global rotating F preview, and collapsible unknown signals.
- A published, server-authoritative selector will later use persisted user history, scenario availability, level rules, cooldown and exclusions. Do not let client-side randomness determine economy, unlocks or rewards.

## Mandatory order: pact, then progression
1. User registers/authenticates and **signs a system pact**. Server stores immutable accepted pact version, UID, timestamp and consent audit, validates active status and any revocation. No participation without verified pact.
2. Player enters at **system rank F**; F missions are the entry point. Rank E belongs to the next low-tier pool as determined by verified system progression. No invented numerical XP thresholds or level-up promises in V66.
3. Only a **published, enabled, server-authorized mission** compatible with the verified player rank is assignable. The server must enforce replay restrictions and duplicate prevention, not rely on user-provided ranks/history.
4. Mission success/failure, milestones, XP, rank promotions, rewards and NPC changes are validated and recorded atomically server-side. A rejected/abandoned mission must not yield repeated rewards.
5. Genre is independent of rank. A genre gate can house F, E and later higher-tier worlds simultaneously. System rank gates the **mission**, not the genre.

The V66 `entryCheck` always rejects access because the catalog is made of unpublished seeds; even forged `pactVerified:true` must not enable entry. The real sign-and-execute API is **not implemented** in this tranche. No UI claims pact signing, mission acceptance or rank upgrades occurred.

## Author drafts
`js/world-blueprint-v66.js`: `schemaVersion:2`, `makeDraft(missionId)`, `validateDraft(draft)`, canonical `genreId`, rank, three roleplay modes `main/passerby/free`, locked `access`, `progression` and `rewards`. Author can download/inspect a scenario JSON locally. No saving, importing to backend, publishing or NPC binding in V66.

Historic V65 blueprint and V63 six example settings are retained as archives/backward compatibility but **removed from live scenario loading**. Do not re-enable or merge those six examples into the canonical six genre IDs.

## Data model for future phases
- `genreId` (one of six currently), `missionId` (unique per small world), `scenarioVersion`, `status` (seed/review/published), `requiredRank`, `availability`.
- `contract` per UID (accepted pact version, valid signature, date, revocation).
- `systemProgress` per UID (server-verified rank, XP, task history, promotion).
- `missionAssignments` per UID (assignment token, mission/version, active status, outcomes, idempotent reward transaction ID).
- `roleplayIdentity` and NPC memory scoped by **UID + mission/story + role mode**, never shared across unrelated worlds.
- Content pools must support hundreds or thousands of missions without rendering all entries on the overview page.

## Test and rollback
- `node tests/world-taxonomy-v66.cjs`: six genres, 48 stable IDs, 30/18 F/E, no-repetition preview, contract/rank gating and unpublished denies, locked offline author draft.
- `tests/browser-smoke.cjs`: six category tiles, mobile 2 columns, read-only multi-world dossiers, random previews and zero Firestore writes.
- Browser/physical mobile smoke, CI and GitHub Pages deployment have not been proven by source commits alone. Report those checks separately.
- Baseline for reverting this tranche: `9b5c1817b56e24c7e783256c687330212416cd54` (final V65), preserving production Firestore, story and account data.
