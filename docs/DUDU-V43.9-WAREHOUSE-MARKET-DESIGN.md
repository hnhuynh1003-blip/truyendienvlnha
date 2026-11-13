# DUDU V43.9 — Kho Xuyên Thế Giới · Giao dịch & Ký gửi Sandbox

Release: 2026-10-17 · target: main · Sandbox-only. This is a **warehouse-first update**, preceding any further reward expansion.

## UX

- Warehouse hero: exact physical slots used /500, working consumables, saleable items, current escrow lots and virtual Xu balance.
- Archive note (C2.4b, 30/10/2026): **Quà truyện** is no longer offered in the Kho UI. The active modes are **Kho đồ**, **Bán thường** and **Đấu giá**. Legacy journal entries remain readable; this older document records the Sandbox prototype, not a feature planned for `main`.
- Inventory item tiles show actionable labels: **Dùng**, **Bán**, **Ký gửi**, **Tặng**, **Lưu trữ**, **Khóa**. An explicit **Dùng được** filter separates the four genuine V43.x functional devices from older tools/props that are incorrectly perceived as usable.
- Inspector gives bounded context-dependent actions and source details. Invalid/unimplemented tools show "chưa có hiệu ứng tiêu hao", not a dead use button.

## Transaction contracts

### Sell ordinary items

- Only catalog-canonical common items with genuine per-instance ownership fields and sellable flags; no rare (B+), author, special story, uniquely owned, tools or DUDU memorial items.
- Sell **one physical item** at a time. For shop-priced common items, stable buyback ~35% of retail, minimum 1 Xu; other ordinary catalog items by rank (F=1, E=2, D=4, C=6). Daily limit 12; virtual wallet max 1 billion Xu.
- A successful Sandbox profile write saves physical removal, virtual Xu increase, per-day counter and journal entry together; exception restores prior local state. No transaction against real wallets/accounts.

### Rare auction / escrow preview

- Test-only *listing and withdrawal*, **no fabricated buyers, bots, real bids, winner, clearing, transfer or settlement**. Asking prices 10–5,000 virtual Xu are proposals, not money owed.
- Only canonical **realm** items rank **B–SSS**, obtained from an existing chapter whose story/chapter realm metadata matches the item's catalog realm. Merely renaming a local record, taking an item from the global pool, or carrying one from the wrong world does not qualify.
- User-authored STORY/CHAPTER collectibles have `tradeable:false` and remain locked, even if their rank is SSS, until explicit author permissions and server verified ownership exist. System memorials never enter the auction.
- Listing puts that *exact* item object in Sandbox profile escrow, removing it from ordinary inventory. Up to 8 listed; cancellable with 1 free capacity slot; returned instance identity is retained. Auction escrow survives calendar changes and account reloads.
- No item is shown as a verified server collectible. Auction settlement needs a dedicated authenticated server transaction and anti-duplication ledger in a subsequent phase.

### Story gifting with a note

- Reader opens any **eligible owned item** and selects **Tặng cho truyện**, optionally selects a matching chapter and types up to 160 characters.
- Common items may be dedicated to any story in the reader's library; realm items only to their **original source story and a chapter with matching realm**, never another book/world.
- System memorials, exclusive author collectibles, user-created unknown entries and functional tools stay protected.
- Successful Sandbox action consumes one physical item and creates a **local personal journal note**, not a public comment or verified gift to an author/NPC. No fictitious author notification. A public **bình luận kèm quà** requires comment persistence, moderation, author inboxes, recipient confirmation and item escrow on the server.

## Compatibility and test matrix

- Original 70 canonical catalog records, starter aliases, V43.8 tools, V43.7 quests, NPC gifts, existing book/chapter references and collectible guards untouched. Additive account-scoped field `inventoryTradeV439`.
- New pure engine `js/inventory-trade-v43-9.js`, UI `js/inventory-hub-v43-9.js`, style `css/inventory-v43-9.css`. No new images/assets or backend deploy.
- Unit tests cover daily cap, buyback, wallet cap, precise instance, no sell/auction of protected items, actual story/realm/chapter provenance, escrow/reverse, invalid ask, local note max length, no cross-world gifts, day rollover and no server grants.
- Browser end-to-end smoke checks upgraded warehouse, usable-only filtering, safe sale, escrow listing/cancellation, matching story gift note and no Firestore calls.
- Release URL: https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=43-9

## Deferred — do not imply complete

1. Public comments, gift delivery to author and recipient account inbox.
2. Real-time auction matching, bidder balances, offers, authenticated holdings, settlement, dispute/reversal.
3. New item functions for decorative older tool classifications. These are deliberately marked non-usable until a defined recipe/effect and authoritative rules are designed.
4. Verified story/chapter collectible minting, reward rebalancing and full cross-device sync.
