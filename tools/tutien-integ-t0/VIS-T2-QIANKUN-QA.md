# VIS-T2 — Túi Càn Khôn — 08/11/2026

## Scope and baseline

An Du confirmed assets/tu-tien/DUDU_VIS_T2_QIANKUN_LAYERKIT.zip as the approved package. The ZIP remains at that path, unchanged. MASTER HANDOFF V1.48 and the package's VIS_T2_QIANKUN_LAYER_HANDOFF.md were read before implementation. Branch work/tutien-world-v1, HEAD 6adc79707eea7808589448ca08e30f6c2277d361. Existing dirty and untracked work preserved.

Backup: tools/local-backups/vis-t2-20261108/. All 56 protected files match their recorded SHA256 hashes, including ZIP, VIS-T1 assets, shared host, read-only stats provider and original prototype sources.

## Composition

- Base: tutien-qiankun-popup-base.png, kept at original aspect ratio 1024:1536.
- Nine HTML buttons each reuse qiankun-slot-open.png. Transparent padding is compensated with CSS; no original pixels are cropped or overwritten.
- qiankun-lock-overlay.png indicates unavailable slots. qiankun-upgrade-mark.png is used only for an explicitly marked UI preview of a future slot.
- Existing HTML close button uses qiankun-close-button.png skin and retains Escape/focus behavior.
- Upgrade is a disabled HTML button with qiankun-upgrade-button.png skin. Price remains unknown, not zero or inferred from artwork.
- Title, capacity, status and selection feedback are DOM text from an ephemeral presentation view. No item is created from the concept.
- Concept is reference only and is not requested at runtime. Optional cloud ornament is retained but not layered again over the base's existing decoration.
- Originals and handoff extracted without byte changes into assets/tu-tien/vis-t2/. source-manifest.json records hashes.

## Web delivery

Derived PNGs were uniformly resized with the built-in Windows imaging library; WebP derivatives were encoded locally with Chrome canvas. No dependency installation or remote image service.

Six runtime layers total 256,382 bytes, versus 9,002,002 bytes for equivalent source PNGs (97.2% smaller). The optional ornament is excluded from that runtime budget. Images are lazy-loaded and the repeated slot uses one shared URL. This is an asset-size measurement, not a physical-device performance benchmark.

## Data limits

MOD-P2 has no approved license/bag authority. Default view remains unavailable: all nine slots locked, no owned contents, upgrade disabled. The capacity 1 and 9 screenshots are PREVIEW ONLY, with explicit on-screen labels. They do not persist; reopening restores the unavailable view. UI code has no storage, account, inventory, economy, reward or upgrade write API.

## Final tests

| Suite | PASS | FAIL |
|---|---:|---:|
| Node prototype + integration + view policies | 106 | 0 |
| Chrome VIS-T2 on verified offline Sandbox 4180 | 86 | 0 |
| Chrome UX-R2 dialogs, appearances and live stats | 116 | 0 |
| Chrome host/full-bleed alignment | 23 | 0 |
| Chrome website MOD-P2 and navigation | 21 | 0 |

Viewports: 320x568, 360x640, 390x844, 430x932 and 1280x900. Desktop phone stays 344x710. Bag artwork boxes respectively: 295.33x442.98, 343.33x514.98, 382x573, 420x630, 322x483. No horizontal overflow or nested scrolling. Nine tap targets exceed 44px. UI-only operations preserve serialized mock save byte-for-byte. No external requests or runtime exceptions recorded. Physical devices not tested.

## Evidence

- Final default and preview screenshots/report: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-Ramf8q/
- UX regression: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-gPb63H/
- Host regression: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-DdIAoI/
- MOD-P2 regression: C:/Users/TUFF16~1/AppData/Local/Temp/dudu-integ-t0-KQMn7C/

## Visual limitations and pending acceptance

Individual supplied layers are not pixel-identical cuts of the concept. The assembled slot frames have more gold ornament and darker jade; lock proportions differ slightly. Text is live and smaller on the shortest viewport. Default content intentionally differs from the concept's illustrative materials/open slots because those are not owned gameplay data.

No license granting, actual opening, collecting, item transfers, capacity purchase, price formula, upgrade, MOD-P3 or production integration implemented. No commit/push/merge/deploy/reset. Technical QA passed; An Du visual acceptance pending.
