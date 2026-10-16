# DUDU Studio V43.6 — integration + Sandbox acceptance

Date: 2026-10-17. Target: `main`, no new branch.

## Scope

Five connected modules in the Sandbox profile only:

1. **DUDU MARKET**: canonical common goods and Frequency Cell only may be bought. Non-sale realm, story and DUDU/system records remain read-only. Purchase deducts Xu once and stores a concrete inventory instance.
2. **Kho Xuyên Thế Giới**: the Frequency Cell remains a **functional tool**, retains its SHOP provenance, and may clear the *phone* 2-minute cooldown at most twice per local day. Chapter collection claims are unchanged. Chapter/phone loot halts at 500 physical inventory instances, independent of visual stacks.
3. **Nhiệm vụ**: add `q_daily_fun` (one claimed minigame, +10 Xu/+10 EXP) and `q_daily_npc` (one accepted NPC gift, +10 Xu/+15 EXP), without replacing existing quest records. Events are keyed/idempotent per local day. Existing first-run quest progress remains intact; daily rollover resets only daily quests.
4. **DUDU FUN**: each free box/ticket is created before reveal. The single Sandbox profile save now commits its game payout, daily quest event, and ledger together; retry cannot give another game payout.
5. **NPC**: accepted gifts consume one actual instance and advance the NPC quest in the same Sandbox profile save. Rejection or cooldown does not consume the item or create a quest event. Bond milestones remain preview-only in the Museum.

## Integrity constraints

- All of this is browser-local **Sandbox** data. It is not a trusted Firestore transaction, verifiable ownership proof, or a server-side anti-abuse implementation.
- Do not mint real collectibles, overwrite verified Museum records, or write to production Firebase/Cloudflare.
- Source-scoped chapter/realm items remain controlled by chapter/story context. The Market must not sell rare/system/author records.
- The local calendar day is used consistently for daily reading and economic quests; NPC gift cooldown maintains its existing UTC-day contract.
- Existing local account inventories, NPC progress, old quest IDs, unlocks and chapter claims are preserved.

## Automated test matrix

| Flow | Test target | Expected |
| --- | --- | --- |
| Shop → inventory | `tests/v43-6-integration.test.cjs`, Chromium smoke | Common/tool purchase changes Xu and one stored instance; realm/rare never sold |
| Inventory → consumable | Pure tests, Chromium V43.5.3 regression | TOOL category, correctly sourced, only phone cooldown reset, twice/day |
| Reading/loot → quest | Pure + Chromium V43.5 regression | Unique chapter/open or drop event per day; repeat does not progress |
| FUN → wallet/inventory → quest | Pure tests + Chromium V43.6 | One minigame prize; one daily quest completion, even if both games are played |
| NPC accepted gift → inventory + quest | Pure tests + Chromium V43.6 | One item consumed; accepted relationship update and one quest event |
| Daily rollover | Pure tests + Chromium V43.5 regression | Only DAILY tasks reset; existing MAIN tasks survive |
| Server isolation | Chromium smoke and static policy checks | No production Firestore writes from Sandbox |
| Previous screens | `tests/browser-smoke.cjs` | Existing NPC, inventory, Museum, phone and FUN regression suite remains green |

Run locally (Node 22):

```bash
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm install --no-save playwright@1.56.1
npx playwright install chromium
node tests/browser-smoke.cjs
```

Or view **DUDU Phase 1 Smoke** GitHub Actions on `main` (includes browser and Cloudflare Worker tests).

### Browser acceptance

Open [Sandbox](https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=43-6). Test with a Sandbox account: DUDU MARKET → Kho → Nhiệm vụ → DUDU FUN → an unlocked NPC. A private browser profile avoids accidentally reusing test progression. The production/no-sandbox URL is **not** changed into a trusted backend economy.

### Release caution

The existing GitHub Pages deploy and any connected production workers are separate: pushing `main` alone does not prove Pages deployed or server grants are enabled. Do not treat green unit tests as verification of Firebase permissions or cloud ownership.
