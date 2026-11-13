# VIS-T1 — UI foundation, MASTER HANDOFF V1.24

Read native MASTER HANDOFF V1.24 (07/11/2026), including V1.21–24 scope. Worktree/branch/HEAD unchanged. Existing uncommitted INTEG-T0/prototype work preserved. No Google Docs edits.

## Assets actually present

The user's files are in **assets/tu-tien/vis-t1/** (not assets/tutien/vis-t1/). Originals are untouched, no generated or resized art:

| PNG | Dimensions | Bytes | Alpha |
|---|---|---:|---|
| tutien-cultivation-cave-v2.png | 1086×1448 | 2840594 | opaque RGB |
| tutien-meditation-female-01.png | 1254×1254 | 1916489 | ARGB, transparent corner |
| tutien-meditation-female-02.png | 1254×1254 | 2017921 | ARGB, transparent corner |
| tutien-meditation-female-03.png | 1254×1254 | 1771958 | ARGB, transparent corner |
| tutien-meditation-character.png | 1254×1254 | 1889332 | ARGB, transparent corner |

Default: female-01. Background and current character are separate DOM image layers; background cover/center, character contain with safe margins. Names, controls and progress remain DOM, not baked into art. Other appearances load only after selection, decode before replacing the current image, and remain session-only presentation choices. No profile/avatar/sex/root/attribute authority and no storage writes.

Initial two images total 4,757,083 bytes; all five total 10,436,294 bytes. Chrome confirms only two art URLs on initial render. Original-resolution PNGs remain relatively heavy for a slow mobile network; no claim of production loading-budget acceptance or physical-device benchmark. No compression tool/dependency/new image generation was introduced. Source edge residue around fine hair/cloth may remain under close inspection; original alpha is not re-authored here.

## Reuse audit

`js/npc-portrait-library-v1.js` describes 60 female + 12 male presets, plus anime and legacy resolvers. These are catalog/generated portrait entries, not 72 new meditation sprites. They are preserved. Existing full-body meditation PNGs supplied for VIS-T1 are more suitable for the hero than portrait avatars.

Equipment icon reuses `actionIcon('basic')` from `ui-icons.mjs`. The only equipped fixture is `mock-fixed-sword`. Other slots clearly say no fixture; they are not new owned items. Detail explains that attack36 already includes the sword. Stat cards read existing CHARACTER constants (148HP max,38LL max,36attack,8defense); current HP/LL text and cultivation progress retain original DOM bindings. No synthetic combat-power formula, realm allocation, equip/unequip or profession runtime.

## Changes

- `js/tutien-vis-t1.mjs`: integrated-iframe presentation enhancement; reuses existing buttons/IDs/handlers, adds layered hero, appearance picker, attribute cards, equipment detail, locked professions and collapsed test information.
- `js/tutien-integ-t0.js`: loads the enhancement only inside the integrated page.
- `css/tutien-integ-t0-frame.css`: scoped home skin; no new battle VFX/rules.
- `css/tutien-integ-t0.css`: host overflow hidden to prevent nested scrolling; iframe owns vertical scrolling.
- `tools/tutien-integ-t0/run-visual.mjs`: native touch/key and raster verification.
- README/evidence documentation.

No prototype file, Combat Core, fixture, repository, schema, reward, cultivation, Auth, Library, wallet, inventory, SDK source, service rule or service worker was changed for VIS-T1. No save reset/migration, dependency install, commit, push, merge or deploy.

## Verification

- Node regression + integration: **88 PASS / 0 FAIL**.
- Original Chrome prototype regression: **63 PASS / 0 FAIL** (IDB, duplicate commands, two tabs, rollback, earlier saves).
- Actual website gameplay/navigation regression: **21 PASS / 0 FAIL**.
- VIS-T1 website raster/input/data checks: **23 PASS / 0 FAIL**. Viewports320/360/390/430/1280, no horizontal overflow, character contains/safe margins, only one inner scroll owner, native touch item details, keyboard close, four decoded appearances, locked breakthrough/professions, exact fixture stats, entire run byte-identical after cosmetic interactions and Library return, no external requests or uncaught errors.

Commands:

```powershell
node --test prototypes/tutien-combat-s/tests/*.test.mjs tools/tutien-integ-t0/integration.test.mjs
node prototypes/tutien-combat-s/tests/run-browser.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe"
node tools/tutien-integ-t0/run-browser.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe"
node tools/tutien-integ-t0/run-visual.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

Before screenshots: `%TEMP%/dudu-integ-t0-g9A8lq/before-home-{320,360,390,430,1280}.png`.
After screenshots/report: `%TEMP%/dudu-integ-t0-REZBg4/` (`after-home-*`, `after-equipment-*`, four `appearance-*`, details and report.json). Actual PNGs inspected, including male and female variants after decode. Art/UX acceptance remains with An Du.

Play **http://127.0.0.1:4180/?sandbox=1** → Cyber Phone → Tu Tiên. Refresh the website to load the new skin. Scroll for equipment/details and appearance choices. The original MOD-P2 dungeon entry still works without quests. Browser saves remain origin-scoped; this phase does not copy/delete earlier prototype saves. Stop at VIS-T1; MOD-P3 remains outside the integrated screen.
