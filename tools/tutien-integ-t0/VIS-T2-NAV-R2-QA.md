# VIS-T2 NAV R2 — 08/11/2026

Branch work/tutien-world-v1, HEAD 6adc79707eea7808589448ca08e30f6c2277d361. Existing uncommitted/untracked work preserved. Backup: tools/local-backups/vis-t2-nav-r2-20261108/.

## Changes

- css/tutien-nav-skin-r1.css: equal 1fr/1fr primary columns, 8px gap, common 48px horizontal jade frame, same 12px labels and shared 36px symbol viewport. Disabled breakthrough uses a darker palette, not reduced size or whole-button opacity.
- js/tutien-nav-skin-r1.mjs: wraps existing primary art in a symbol span. Existing live label nodes, buttons, callbacks and disabled state remain intact.
- No new image: existing lock remains square and uniformly scaled. Existing temple is displayed from the temple area of the V1 plaque, with its natural aspect ratio preserved.
- Added tools/tutien-integ-t0/run-nav-r2.mjs for before/after measurement and screenshots.

## Actual dimensions (each button)

| Viewport | Đột phá | Đi phó bản | Gap |
|---|---|---|---|
| 320x568 | 143x48 | 143x48 | 8px |
| 360x640 | 163x48 | 163x48 | 8px |
| 390x844 | 178x48 | 178x48 | 8px |
| 430x932 | 198x48 | 198x48 | 8px |
| 1280x900 | 148x48 | 148x48 | 8px |

Desktop phone stays 344x710. Six lower buttons, stage, dock, background and character geometry match the before baseline within 0.1px. No new row or page overflow. Labels and symbol boxes fit, and rendered image ratios match their source images. Dungeon entry works; breakthrough remains disabled with its existing reason. Bag selection/aura preserved.

## Tests

- Node: 106 PASS / 0 FAIL.
- NAV R2 dimensions/state/callback/data integrity: 33 PASS / 0 FAIL.
- Existing NAV interaction regression: 111 PASS / 0 FAIL.
- Website MOD-P2/navigation regression: 21 PASS / 0 FAIL.
- 110 protected files unchanged, including all assets, host, scene layout, popup code/styles and prototype logic.
- UI-only navigation preserves the full serialized mock save. No external requests or runtime exceptions recorded. Tests use fresh Chrome profiles and loopback preview; physical phones not tested.

## Evidence

- Before: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-UXIjKZ/
- Final measurements and screenshots: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-wnzi8l/
- NAV regression: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-oZUoYF/
- MOD-P2 regression: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-Rk9Pf9/

## Art limitation and gate

The shared frame is CSS with simpler engraving than the supplied raster plaque. A fully matching illustrated pair would require two approved horizontal frames without baked labels; no new illustration was generated. Technical checks passed; An Du retains visual acceptance. No gameplay, popup, Firebase/save, commit/push/merge/deploy/reset changes. Stop at UI-R2.
