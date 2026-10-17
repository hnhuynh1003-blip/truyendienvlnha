# DUDU V43.7 · Nhiệm vụ 2.0 · Main/Sandbox release

Date: 2026-10-17. Branch: `main`. This is a **browser-local Sandbox** update, not a production-server reward system.

## Implementation scope

- New compact Quest 2.0 app UI (six tabs): Tất cả / Ngày / Tuần / Truyện / NPC / Sự kiện. Complete/ready/in-progress states, progress tracks, receipts and recent history. Mobile layout is isolated under `body.dudu-phone-v11`.
- Preserve all existing V43.6 quests and old profiles. Append nine new tasks (one daily DUDU check-in, four weekly, one reading milestone, two NPC milestones and one same-day FUN event). Legacy MAIN quests remain visible in Truyện tab and keep their original IDs, progress and payouts.
- Week runs Monday–Sunday in the user's browser-local calendar. DAILY and EVENT reset when the day changes. WEEKLY resets when a new Monday is reached. STORY/NPC milestones are persistent. No manual rerolls.
- Event linkage: `READ_CHAPTER`, `LOOT_SUCCESS`, `FUN_CLAIM`, `NPC_GIFT`, `NPC_CHECKIN`, `MARKET_PURCHASE` and `DUDU_CHECKIN`. Event IDs are deduplicated before progress changes. Lifetime distinct chapter IDs are recorded separately so rereading the same chapter tomorrow does not farm the STORY quest.
- Reward claim now uses one Sandbox profile write to persist the quest's claimed state, Xu, EXP, level-up (+30 Xu per level), optional common-item reward and receipt history. No speculative cloud grants.
- Two common-item prize choices: Bánh Quy Khô (NPC milestone), Nước Uống Đóng Chai (story milestone); only known canonical catalog IDs. Limit 500 owned instances and max 1 billion Xu, even with level-up bonuses.
- Market purchases, FUN claims and accepted NPC gifts now save the Quest 2.0 progress in the same local profile write as their original transaction. Rejected gifts and failed purchases do not advance. Valid DUDU check-ins and NPC daily check-ins also register quest events.

## Economic budget for the nine new quests

| Type | Number | Exp | Xu | Additional |
|---|---:|---:|---:|---|
| Daily DUDU check-in | 1/day | 8 | 8 | none |
| Weekly story opens | 1/week | 35 | 35 | none |
| Weekly loot | 1/week | 30 | 25 | none |
| Weekly DUDU FUN | 1/week | 25 | 20 | none |
| Weekly shop purchases | 1/week | 15 | 12 | 2 genuine purchases required |
| Story milestone | once | 45 | 30 | 1 common water bottle |
| NPC gift milestone | once | 30 | 25 | 1 common biscuit |
| NPC check-in milestone | once | 25 | 20 | none |
| Daily DUDU FUN event | 1/day | 12 | 10 | complete both free games |

All rewards are Sandbox Xu/EXP, not redeemable or verified collectibles. If a player misses a day/week, there is no paid catch-up. This release does not introduce new item art, gacha sales, purchaseable lottery tickets, backend quota changes, or verified story collectibles.

## Test acceptance

```sh
node --test tests/*.test.cjs
node --test functions/tests/*.test.cjs
npm test --prefix cloudflare
node tests/browser-smoke.cjs
node tests/browser-auth-private.cjs
```

[GitHub Sandbox](https://hnhuynh1003-blip.github.io/truyendienvlnha/?sandbox=1&v=43-7) supports a local test account. Verify that Quest 2.0 has six tabs, each event increments a relevant task, ready tasks can be claimed once, receipt history survives reopening, and guest/other account data is not leaked. Existing item, NPC, Museum and Cloudflare test suites continue to run.

### Limitations / production gate

- LocalStorage is not an authoritative economy ledger, audit trail or proof of reading. A client may modify its own Sandbox data.
- Server-enforced access checks, replay-safe idempotency, multi-device synchronization and verified reward delivery are **not implemented** in V43.7. Do not enable production rewards on this basis.
- Story reading is counted on chapter opening as an activity indicator; it is not a verified completion signal.
- The weekly NPC task counts accepted daily NPC interactions, not AI token usage.
