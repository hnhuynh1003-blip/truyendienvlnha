# DUDU Studio V43.8 · Vật phẩm chức năng & Kho 2.0

**Release:** 2026-10-17 · **Branch:** main · **Scope:** Sandbox only.

## Catalog

Existing canonical 70-item collection, story/realm bindings, NPC gifting and V43.5 frequency cell are preserved. New entries are **functional shop-only catalog definitions outside the 70 collectible items**:

| Stable item ID | Item | Shop price | Gameplay outcome | Daily purchase/use |
|---|---|---:|---|---|
| `dudu-tool-frequency-cell-v43` | Bộ Nạp Tần Số | 30 Xu | Clear 2-minute Phone-loot cooldown | 2 / 2 |
| `dudu-tool-time-pulse-v438` | Xung Thời Gian | 16 Xu | Reduce Phone-loot cooldown 60s | 2 / 2 |
| `dudu-tool-supply-kit-v438` | Gói Tiếp Tế Hành Trình | 20 Xu | Consume kit; generate 1 canonical common bottled water + 1 canonical common biscuit | 2 / 2 |
| `dudu-tool-discount-v438` | Phiếu Ưu Đãi DUDU | 9 Xu | Consume to activate a one-purchase 25% discount, maximum 12 Xu, on common-store goods on the **same calendar day** | 1 / 1 |

Purchases still count toward the pre-existing total of **8 transactions per day**. New types cannot be purchased/used for unlimited Xu, rare collectibles or server entitlements. Since all new tokens originate in the local Sandbox shop, forged/non-shop items and duplicate instance IDs are denied by functional-item quote plans.

## UX and lifecycle

- Shop > Chức năng previews four tools with price, description and current limits. Shop > Mua sắm shows applied coupon savings and adjusted purchase prices when a voucher is active.
- Kho > ⚡ Công cụ filters the inventory. Item detail modal shows effect, daily quota, disabled reason, and context-specific use button. The compact toolbar displays `N/500` instances and owned tools; view stacks never mutate physical item identities.
- Supply pack checks maximum 500 physical owned items **after** consuming its source instance. Its two outputs are deterministically common items tagged `EVENT / DUDU_SUPPLY_V438` and cannot be mistaken for unique Museum relics.
- Time Pulse modifies only the account-scoped 2-minute phone-loot timestamp; never changes per-chapter drop rights. Legacy frequency-cell semantics are unchanged.
- Coupon consumes one concrete shop instance on activation and persists an account-scoped, day-bound `pending` state. Only one voucher may be pending. Buying a qualified common good uses the saved voucher in the same local profile write as the purchase, market ledger, and quest progress. Coupons cannot discount another tool or an ineligible item; pending coupon expires when the day changes.
- `q_daily_tool` is appended to Quest 2.0: use one **new** functional item for +6 Xu and +8 EXP. Unique `ITEM_USE` events are recorded in the existing client Sandbox ledger. Duplicate/failing actions do not advance.
- No new item art in this batch; existing emoji/item art fallback remains to minimize download costs and preserve current visual assets.

## Compatibility and test matrix

- Additive `userProfile.functionalV438` state; absent fields normalize cleanly. Per-user browser profile scoping unchanged.
- Pure Node tests cover four-tool catalog, history/day rollover, daily use/purchase limits, 500-capacity edges, discount math, deterministic common-only kit, phone-only pulse, and refusal of forged items.
- Existing V43.7/43.6 Node tests remain, updated where expected tool count and daily task count legitimately change.
- Chromium tests cover live Sandbox shop purchases → owned tools → inventory inspector → consume pack → Pulse → coupon activation/discount purchase → daily quest → browser profile restoration, with assertions for **zero Firestore writes**.
- No changes to server grant APIs, collectible ledger, Firestore rules, Cloudflare Workers, verified story items, or NPC gift acceptance.
- Sandbox progress is **not a secure production economy**. A player can modify their browser storage; authoritative anti-cheat and cross-device reward claims need a separate backend migration.

## Open Sandbox

https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=43-8
