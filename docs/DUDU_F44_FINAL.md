# T0 + F4.4 FINAL — Ngũ Tử Trận Các

## Released scope

One shared Phone/Library/Tu Tiên identity: name, selected portrait/frame, account EXP and level. All 72 portrait choices and owned frames stay intact. No new character, EXP counter, automatic realm conversion, migration or Rules deployment. Archived Vạn Giới engines and routes remain gated; manual archived tests are retained.

AI lobby with Vật phẩm / Chinh Phục / Vô Tận navigation, a vertical five-branch map and an interactive intersection board with black/white stones. Only one Back control plus balance remains above Vạn Bảo. The game selector collapses. Cards support existing quantity, locks, sales and full-size inventory viewer. Existing 19 treasures and 66 Vạn Tượng IDs/images remain unchanged.

Conquest retains its durable first-win records and original reward table. Replays are free practice. Unlocks are 3 Novice, min(5, published Easy count), min(5, published Medium count), min(5, published Hard count). Branch completion gives a derived decorative mark, not additional currency. Existing pending Conquest/legacy boxes stay claimable. Legacy blind-box new purchases/free openings are removed from the UI; after first Endless entry the old transaction module also refuses new starts. Existing paid/free box receipts and collection records are never deleted.

## Honest content limits

**12 distinct proof-verified 9x9 puzzles**: 4 Novice, 4 Easy, 4 Medium; 0 Hard, 0 Master. Certificates cover every legal defender response, not only the shipped AI. No rotations/reflections are counted as extra content. The target 100 is not complete.

Six mode cards are visible. **Four modes are playable**: Novice, Easy, Medium Endless and Đại Sư Đối Cục. Hard/Master preparation screens explicitly say unreleased and disable Start; no fee can be collected there. Their published rates are reserved tables, not a claim that their puzzle banks exist.

Endless currently selects from the verified bank and avoids the last two puzzles within its tier. It is repeatable rewarding play, not a certified infinite puzzle generator. It does not invent unverified paid positions. Additional authored Hard/Master banks and a genuine generator remain future work.

Đối Cục starts with a genuinely empty board and alternates human black/white by **duel count**, independent of other modes. If human plays white, AI makes the first black move. Freestyle 5-or-more wins, blocked ends still count, no Renju restrictions; full board without winner is a draw. The AI uses deterministic selective four-ply alpha-beta, immediate win/block logic, board evaluation and a 4,500-node budget. Search runs in a short-lived Web Worker. It is not a fixed move sequence or random weak bot. Tactical/legal full-game tests are included; no human Master strength rating is claimed.

## Economy and transactions

One shared free Endless entry per Vietnam day (UTC+7, reset 00:00); later entries cost **20 Xu**, with no purchased-entry count limit. Entry is charged atomically and persists the exact initial board, role, mode, sequence and three shuffled offers. Old UTC free-box use is conservatively counted during the transition to prevent a second free entry. Backwards device dates are rejected. This preserves the existing owner-profile/honest-play Firebase architecture; it adds no new server-secret RNG or anti-cheat backend.

Every new valid winning round, including repeat puzzles, can select exactly one box. Lose/draw/forfeit grants nothing and consumes the entry. Move retries use the persisted move index, Start retries use round ID plus monotonic sequence, and choice/claim are atomic. Reload resumes the same round/offers; a later sequence cannot replay a previous claim. Only one active round is allowed. A bounded recent list and active receipt avoid an ever-growing round ledger. Inventory remains 500 physical instances and the conservative 750-KiB profile guard remains active. Full inventory/wallet leaves the fixed choice pending.

Connection failure does not start another round or trigger another debit. User exit does not refund. An engine-version mismatch or recorded AI-worker technical fault allows one transactional refund, restoring the paid 20 Xu or the free entry as appropriate. No refund can follow a win/claim. The worker failure rolls back the attempted human move before recording the fault.

Each win fixes one TREASURE, one CARD and one COIN chest, Fisher–Yates shuffled from crypto uint32 draws. Unchosen boxes use exactly the same closed-chest image; contents appear only after durable choice. Duplicates create distinct inventory instances and never auto-sell. No Endless EXP grants are added.

The approved coin table is applied unchanged: every column is exactly 10,000 basis points. Conditional means are 20 / 28.85 / 31.30 / 38.60 / 50 Xu (Duel uses Master). After hidden choice, its contribution is one third of that.

Treasure weights are explicit per item/rank in `js/vanbao-endless-f44.js`; card weights are 70% E, 25% D, 5% C inside the card chest. Ordinary S is available at Easy with a very small probability. SS/SSS Endless drops are exclusive to Master/Duel. No new card or economic treasure ID is created from an illustration. Sell prices remain E/D/C/B/A/S/SS/SSS = 3/6/12/26/55/120/320/900 Xu for old treasure, and 1/2/4 Xu for the three existing blanks.

| Mode | Coin chest mean | All three groups, after hidden choice and selling everything | Paid break-even win rate |
|---|---:|---:|---:|
| Novice | 20 | 8.5524 | Above 100%; collection sink |
| Easy | 28.85 | 11.7861 | Above 100%; collection sink |
| Medium | 31.30 | 13.0972 | Above 100%; collection sink |
| Hard (unreleased) | 38.60 | 16.3864 | Above 100% |
| Master (unreleased) / Duel | 50 | 21.6364 | 92.4367% |

These include treasure liquidation and 1.4-Xu expected card value, assume every selected item can be sold, and exclude retained collection value. They are not expected profit per entry: entry EV is win probability × reward EV − 20. The daily free turn is a small recurring source. The coin probabilities were not modified to force a different outcome. Raw calculations: `DUDU_F44_BALANCE.json`; all 22 IDs × six modes with conditional and after-choice rates: `DUDU_F44_LOOT_RATES.csv`.

## Art handoff

All three supplied ZIPs were checked: **46 distinct source images**, no exact SHA-256 duplicates, no missing files, expected transparent cutouts present. Contact sheets were visually inspected. All are optimized as WebP without cropping/stretching; the 12 Vạn Bảo assets also have 320px thumbnails. The runtime currently uses nine new original illustrations: two backgrounds, four chest states, and three blanks mapped to existing IDs (Tố → AncientPaper, Linh Văn → SpiritWood, Tinh Phách → Astral). The other three blank concepts and 34 Tu Tiên concepts are stored for future use, not granted as items. High-resolution card images are shared by Kho, viewer and rewards; only visible mode/chest art uses thumbnails.

`DUDU_F44_ART_MANIFEST.csv` has **65 assets: 28 production (19 existing + 9 new) and 37 future concepts**. `DUDU_F44_FINAL_ART.json` records original filenames, SHA-256, dimensions, transparency and actual WebP paths. No 72-portrait files are replaced. New skills, sects, alchemy, combat and upgrade recipes are not released.

## Acceptance

Unit/transaction tests cover exact coin expectations, cross-mode free/paid entries, Vietnam midnight, legacy transition, rapid retries, persistent boards/offers, repeated wins, single grants, full inventory, immutable choice, locks/quantity sales, refunds, role alternation, AI tactics, complete legal duel, malformed terminal state and account changes. Browser tests cover native touch/mouse, all six honest mode states, five branches, catalogue hunting links, identical masked chests, real Worker move, resume/loss, account/Sandbox isolation and 320/360/390/1280px layouts. Existing Vạn Tượng, Kho, Bảo Tàng, Library and Arcade regression checks remain enabled. Android is Chrome touch emulation, not a physical-device heat/battery benchmark.
