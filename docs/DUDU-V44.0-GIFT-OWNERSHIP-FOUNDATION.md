# DUDU V44.0 — Ownership, author recipient and gift transfer trust boundary

**Date:** 2026-10-17. **Scope:** Phase 1 of the approved V44.0–V44.4 program. **Deployment:** GitHub `main` website and test-only Cloudflare source. **No server gift endpoint or live recipient transfer.**

## Existing state found during audit
- `studio_data/main_library` is a shared, publicly readable Firestore library. The browser editor's author role/admin switch is **not** an authenticated `ownerUid` for each story.
- The verified Cloudflare collectibles ledger stores `ownership(uid,story_id,item_id)` separately from editable browser inventory and virtual currency. It must not be converted to a transferable gift ledger without an explicit server migration.
- V43.9 `inventoryTradeV439.history` includes `GIFT` records **only from a local Sandbox profile**. These are historical personal notes, never verified author receipts.
- The existing NPC gift calculation is a separate affinity/trust system; do not treat NPC delivery as author wallet ownership.

## Recipient types (one transfer, one destination)
| Destination | Actual recipient | Authoritative rule |
| --- | --- | --- |
| `AUTHOR` | Verified Firebase UID bound to a published story in a trusted, server-held author registry | Author may accept/decline. UID must never be read from the user's UI, public book metadata, or browser profile. |
| `STORY` | Dedicated story-support vault `storyId` | Author is notified, but cannot directly claim personal ownership without separately reviewed rules. |
| `CHAPTER` | Dedicated support vault `storyId::chapterId` | Chapter must belong to the published story. |
| `NPC` | Existing server-verified NPC interaction scope, to be integrated separately | **Never** silently adds to author inventory. |

Public-facing `authorBindingStatus` deliberately returns a verification indicator, not private UID.

## New backend contracts
- `cloudflare/src/gift-contract-v44.mjs`: pure `quoteGift`, `transition`, `authorBindingStatus` and enumerated recipient types/state transitions.
- `cloudflare/src/gift-preflight-v44.mjs`: strict inbound allowlist `storyId`, `chapterId`, `itemInstanceId`, `destination`, `note`; independently loads **story**, **chapter**, **author binding** and **owned instance** via trusted backend adapters. Caller identity comes from signed Firebase token, never JSON.
- No arbitrary client-provided `recipientUid`, `authorUid`, `ownerUid`, `item`, `isAdmin`, `binding` or `proof` is accepted. A valid browser request cannot mint or transfer an item.
- Only the server item ledger can vouch for an owned instance. Reject unverified inventory, system relics, functional tools, unique/locked/non-giftable items, mismatched world/story/chapter. Even a B–SSS author-defined chapter item is locked unless the **server-held** issuer explicitly approves its transfer.
- Preview returns `previewOnly:true`, `canTransferNow:false`, and does not expose author UID. No accepted plan is a receipt or reserved escrow.
- Transaction state contract: `PENDING → ACCEPTED | DECLINED | CANCELLED`; sender may cancel while pending; **author UID** alone may accept/decline an author gift; repeated identical final action is idempotent; terminal state cannot be changed by a different action. Expiry/automatic return requires a **trusted server worker**, never a browser-provided timestamp.
- **Important:** the pure contract is not an atomic server transaction by itself. Real escrow requires database unique constraints and one transaction for movement, ownership records, receipt and inbox notification.

## Reader UX now

Inventory gift inspector explicitly distinguishes:
- **Ủng hộ truyện · nhật ký Sandbox**: available for eligible local items. Preserves existing V43.9 behavior, which consumes the **Sandbox local** instance and writes a `STORY_SANDBOX / LOCAL_JOURNAL_ONLY` history entry.
- **Gửi trực tiếp tác giả · chưa mở**: visible as locked with UID/ownership requirements. No browser author display name is used to claim delivery.
- Existing `GIFT` personal history without `recipientKind` remains readable as **old Sandbox history**, never auto-upgraded to verified transfer.

UI lives only inside `?sandbox=1`; live reader behavior and existing inventory fields are preserved.

## Mandatory prerequisites before real gift/author inbox feature (V44.2–44.3)

1. Trusted published-story registry and verified `ownerUid` associations, with editor audit trail and takeover/reassignment process. Account display names are not proof.
2. Author-only acceptance using verified JWT UID; separate story/chapter support-vault ownership from personal author inventory. Explicit user-facing recipient selection.
3. Server-owned inventory ledger for transferable COMMON/REALM/STORY/CHAPTER instances; no import of `profiles_v2.inventory` as proof.
4. SQL/DO escrow with globally unique `instanceId`, `transferId`, idempotency key and transactionally enforced state. Ensure an item cannot be in sender inventory, escrow, recipient inventory simultaneously.
5. Public comment moderation and sender rate limit; block/deletion of a comment must **not** mint refunds or transfer a gift again. Denial/timeouts must return a verified instance even if sender inventory is full (recovery inbox).
6. Two independently authenticated Firebase identities, cross-device retry/concurrency, wrong-world/chapter, offline recovery and author ownership change tests in staging before any feature gate activation.
7. Keep `COLLECTIBLES_ENABLED=false` and do not authorize unique verified memorial transfer without separate consent and a reviewed migration.

## Next phases, not included here
**V44.1** expands six world pools from 5 to 20 items each (90 additions, 160 overall with the original 70 catalog). Preserve all IDs and saves, make drop probabilities meaningful and never expose unreleased story items. **V44.2** is public chapter/story comments and moderation. **V44.3** is authenticated author inbox and exact-once gift settlement. **V44.4** hardens integration. Auction remains deferred.

## Smoke/test checklist
- 9 server contract tests, 4 backend gateway tests, 3 client contract tests and browser gift inspector assertions.
- Browser author recipient locked, local journal receipts tagged and no Firestore transfer. `cloudflare/tests/*.test.mjs` suite continues.
- No new generated item art, Cloudflare deploy, production author inbox, public comments or gift grants in V44.0.
