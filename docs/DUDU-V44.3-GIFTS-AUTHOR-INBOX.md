# DUDU V44.3 — Gift-attached comments, author mailbox, escrow foundation

**Date:** 2026-10-17 · Release: GitHub Pages Sandbox `?sandbox=1&v=44-3`.
**Deployment boundary:** Cloudflare code is added to main and CI dry-run bundles; **no Worker deploy, no change to Firebase rules, no live cross-UID transfer**.

## What users can test NOW

1. In **Truyện → Bình luận truyện** or **Chương → Bình luận chương**, enter comment and tap **🎁 Đính kèm**. A compact picker shows eligible owned items. Choose one, then **Đăng thử**.
2. A Sandbox transaction saves the comment and local-support gift receipt together: removes one eligible instance from local inventory, records `STORY_SANDBOX / LOCAL_JOURNAL_ONLY` in existing `inventoryTradeV439`, and attaches a clearly labeled gift card to the local comment. A save exception restores both comment and item, so the screen does not claim a posted note if the local profile could not be saved.
3. The picker displays **đích đến = Ủng hộ truyện (Sandbox)** and separately **🔒 Gửi trực tiếp tác giả**, explaining real cross-account author transfer is disabled.
4. New Cyber Phone icon **💌 Hộp thư**. "Thư đến đã xác minh" states no verified incoming gifts; "Thiệp ủng hộ của tôi" displays ONLY personal Sandbox journal items with `Chưa đến tác giả` in every entry. Does not fabricate recipient notifications.
5. Existing ordinary comments, replies, report entries, market sale, NPC gifts, rare item protections, cross-world restrictions, treasure IDs and Chapter collector remain. Auction still deferred.

**No gift is delivered, no XP/Xu is granted, and no message is sent to an author by this demo.** Sandbox local item deductions are not authoritative server transactions.

## Server groundwork: single-writer atomic ownership, feature gate OFF

- `cloudflare/src/gift-requests-v44-3.mjs`: strict client allowlist `requestId/storyId/chapterId/itemInstanceId/destination/note`; no uid, recipient, item object, proof, admin toggle, payment or comment reference accepted from client.
- `cloudflare/src/gift-ledger-v44-3.mjs`: private SQLite Durable Object with **verified-stories registry** (real Firebase UID + revision), chapter registry, server-owned instance holdings and idempotent gift receipts. All read and writes are scoped by authenticated Firebase UID; an issuer must independently provision verified story/item records. **There is no public route that can mint an item or bind a story to an author.**
- One `transactionSync` reserves a server-owned item to escrow and inserts the gift receipt. Author destination waits for the verified author UID to ACCEPT or DECLINE; only sender may CANCEL. Accept transfers owner; decline/cancel restores original owner. Duplicate request ID returns the original receipt, not another deducted item; conflicting payload rejects; stale/finalized changes reject.
- Separate STORY / CHAPTER destinations settle into **story/chapter vaults**, never into the author's personal inventory. Verified author queue is selected exclusively by authenticated recipient UID.
- `/v1/gifts/preview, /send, /outgoing, /author-inbox, /decide` are routed on the Worker, requiring signed Firebase ID token. `GIFTS_ENABLED=false` and `GIFT_SETTLEMENT_ENABLED=false` in staging. Browser does NOT call them yet.
- No bridge to verified collectible awards (those special relics remain nontransferable). No approved trusted-instance issuer connected yet. Until one is installed and real author binding is verified, public gifts must stay OFF.
- **Crucial:** V44.2 public comment store and V44.3 gift ledger are separate Durable Objects. This release does NOT create a distributed atomic comment+gift transaction or a public verified attached gift. The actual comment-to-gift cross-store saga, recovery/outbox, moderation and author-inbox integration must be audited before live activation.

## Constraints before unlocking production cross-account gifts

1. Author story ownership must be verified server-side with immutable UID, signed creator evidence, owner revision and transfer policy; never from public `studio_data` or author's display string.
2. Introduce independently audited issuer/migration for transferable `COMMON/REALM/STORY/CHAPTER` item instances. Existing browser profile is writable by the user and MUST NOT be bulk-imported as proven ownership.
3. Two-user and concurrent-device tests using SQLite Durable Object and authenticated Worker routes, including retries, wrong story/realm, race, transfer reversal, full inventory and identity changes.
4. Design transactional linked comment receipt with cross-DO outbox/reconciliation so comment report/hide/delete cannot mint/refund twice.
5. Finish server-bound author inbox UI, external receipt loading, role verification, report moderation, notification preferences, and no stale local replicas. Distinguish `PENDING`, `ACCEPTED`, `DECLINED`, `RETURNED`, `CANCELLED` visibly.
6. Roll out independently behind `COMMENTS_ENABLED`, `GIFTS_ENABLED` and `GIFT_SETTLEMENT_ENABLED` after approval and backups. This GitHub Pages release alone does not enable them.

## Tests
- Browser Sandbox: actual comment with attached common item, local item removal, log addition, author mailbox outgoing-only, zero Firestore writes, rollback account fixture.
- Node: exact comment/gift pairing, duplicate prevention, cross-world and protected item restrictions, no fake verified receipt.
- Cloudflare: validation rejects UID/recipient/item grants, SQL single writer, idempotent transfers, binding and issuer routes absent, two independent kill switches both off. Existing 296+ tests unchanged except new V44.3 cases.
