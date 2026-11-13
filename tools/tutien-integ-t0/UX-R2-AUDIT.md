# VIS-T1 UX-R2 — 08/11/2026

## Baseline and scope

- Root: D:/Games/gamedienvl/github/tutien-world-v1
- Branch: work/tutien-world-v1
- HEAD: 6adc79707eea7808589448ca08e30f6c2277d361
- Existing dirty/untracked work preserved. Backup: ../local-backups/vis-ux-r2-20261108/.
- Master Handoff V1.45, especially appendices V1.43–V1.45, read through Google Drive.
- UI and read-only mock projection implemented. General six-slot equip integration stopped at the missing-contract gate, as requested by An Du.

## Verified sources (not new balance rules)

| Source | Evidence | Meaning |
|---|---|---|
| fixture.mjs:6 | CHARACTER: 148 / 38 / 36 / 8; weapon mock-fixed-sword | Existing final fixture totals, not a separate naked-character base |
| module/dungeon-state.mjs:8 | CULTIVATION_VIEW; sword already counted in attack 36 | Name, realm and Tu Vi remain sourced from the existing provider |
| combat-core.mjs:9–13 | newBattle copies CHARACTER | Battle snapshot owns effective combat fields |
| mock-repository.mjs:53–54 | equippedDefense applied once to a new battle snapshot | Existing legacy jade effect, not a six-slot equipment service |
| world-core.mjs:48 | WARD gives defense 2 iff owned jade is equipped | Existing S/M/MR3 modifier only |
| module/waves-state.mjs:11–12 | Only START/NEXT_WAVE/ACTION/REST | MOD-P2 does not accept EQUIP_JADE |
| tests/world.test.mjs:42–48 | Defense 8 -> equip -> next battle 10 -> unequip -> next battle 8 | Existing modifier affects actual combat snapshot; no mid-battle equip |
| personal-jade-core-v1.js:37 | bangle/pendant/ring/beads CRAFTS | Economic jewelry types are not proven WORLD combat modifiers or ownership mappings |

### Stat provenance

| Category | Current evidence | UX-R2 behavior |
|---|---|---|
| Baseline | Fixed composite fixture totals | Read without decomposing invented naked stats |
| Allocated points | No contract in MOD-P2 | No points created; not treated as zero allocated points |
| Equipment | Sword included in 36; no separate sword bonus; WARD +2 belongs to separate legacy trial | No double-counting; generic jade not mapped to ring/necklace/bracelet |
| Status effects | Guard, shield, weaken resolved by Combat Core per phase | No extra UI stat bonus or fake injury/status |
| Resources | Committed active battle HP/LL, or run HP/LL outside battle | Two current/max meters, read through existing IndexedDB readonly transaction |

## Implemented

- Compact top HUD and thin Tu Vi bar, outside character clear-space.
- Local SVG talisman controls, six fixed UI equipment slots, existing sword detail preserved.
- Single on-demand dialog, one scroll owner, touch/keyboard/Escape supported.
- Bag preview: all nine slots locked, first capacity one and maximum nine only described as future progression. No license, item or capacity granted.
- readStats uses existing mock DB and run identity, readonly transaction; aborts on upgrade instead of creating/migrating data. No dispatch/equip/reward API.
- Failed reads do not continue presenting old numeric values as current data.

## QA evidence

- Node: 103 PASS / 0 FAIL.
- Chrome UX-R2: 116 PASS / 0 FAIL on verified offline Sandbox http://127.0.0.1:4180/?sandbox=1, fresh QA profile.
- Chrome website MOD-P2 / Library / app navigation: 21 PASS / 0 FAIL.
- Chrome Sandbox renderers: 32 PASS / 0 FAIL.
- Viewports: 320x568, 360x640, 390x844, 430x932, 1280x900 (Cyber Phone 344x710).
- UI-only operations preserve the serialized mock run byte-for-byte.
- After actual basic + suppress actions versus Tiểu Nham Thú, popup agrees with committed combat state: HP 142/148, LL 32/38, attack 36, defense 8. These are reference fixture results, not new bonuses.
- Before screenshots: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-Ptgxn4/
- Final screenshots/report: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-OZX2L5/
- MOD-P2 browser evidence: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-12k38a/
- Sandbox renderer evidence: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-EMSv8D/
- Protected-file hashes: five PNGs, shared host, Combat Core and module sources unchanged (14 files checked).
- No external requests or uncaught browser exceptions recorded. Physical phones not tested.

## Decisions still required before equipment integration

1. Naked base vs existing sword-inclusive fixture, supported modifier fields/values/order and rounding.
2. Ownership and slot compatibility; treatment of generic legacy accessories, without forced conversion.
3. Equip/unequip authority, idempotent transaction contract and persistence versioning.
4. Current/max HP/LL behavior when equipment changes; active-battle snapshot policy.
5. Reuse the existing legacy +2 WARD as a deliberately approved mock test item, or define a new fixture in a separate work scope.

UI technical checks passed; An Du visual acceptance remains pending. No equipment-to-MOD-P2 integration, Combat Core edits, production writes, schema/save changes, MOD-P3, commit/push/deploy/reset performed.
