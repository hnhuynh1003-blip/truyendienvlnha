# DUDU V52 — Trusted Firebase Economy: production release gate

**Status:** source code shipped to GitHub `main`; Firebase deployment and economy enablement are **NOT** implied. No existing profiles or assets were migrated.

## Verified design
- Dedicated collection: `economy_accounts_v52/{auth.uid}`, with `items/{instanceId}` and `receipts/{transactionId}`.
- Callable Functions in `asia-southeast1`: `duduEconomyStatus`, `duduEconomyDailyCheckIn`, `duduEconomyPurchase`.
- Existing AI callable endpoints remain unchanged; App Check is required (`enforceAppCheck:true`) on the new endpoints.
- Every mutation runs as a Firestore transaction. Client sends only `itemId` and a UUID purchase request ID. The canonical server catalog supplies prices.
- For first activation, server wallet starts at **0 Xu**, regardless of legacy `profiles_v2.currency`; no unverified inventory or EXP is migrated.
- Server check-in: 8 Xu + 8 EXP, once per **UTC day**, stored in a durable receipt. Replays cannot mint again.
- Purchases: 12 fixed COMMON items from V43 catalog, max 8/day, max 3 of each item/day, max 500 verified items, server transaction idempotency.
- No direct user writes to the wallet, items, receipts or production feature gate.
- Sandbox is unchanged. Legacy userProfile values may still be used by other local simulations but NEVER authorize V52 purchases.
- `DUDU FUN` is still for local practice; NPC gifts, auction, tools, event and quest reward grants remain unavailable until trustworthy server proofs exist.
- Live UI now has a separate **server balance** and **verified inventory panel**, so old/unsigned balance is not silently treated as genuine.

## Fail-closed activation checklist — human Firebase administrator required
1. **Backup:** export existing Firestore `profiles_v2`, `studio_data`, and any economy collections. Confirm restore procedure and the Firebase project ID `truyendienvl`.
2. **Billing:** check that Cloud Functions v2/Firestore can run in the intended project and configure budget alerts.
3. **Firebase App Check:** register GitHub Pages origin `hnhuynh1003-blip.github.io` with reCAPTCHA v3 for this compatibility integration. Copy the **PUBLIC** site key into `js/appcheck-sitekey-v52.js` (the shipped value is blank), then load the refreshed website. The App Check SDK activates only for nonempty keys, before any Firestore access. Never put the secret reCAPTCHA key into frontend code. Without a valid site key, `enforceAppCheck:true` correctly rejects the V52 callable Functions. App Check setup and monitoring should precede turning on the economy gate.
4. **Rules:** inspect the actually deployed Firestore Rules, and merge `security/firestore-economy-v52.rules.review` with existing rules *without overwriting them*. Existing overlapping wildcard `allow` statements must be audited, since deny rules cannot override an allow.
5. **Deploy only the three new Functions** (not all functions unless explicitly approved):
   `firebase deploy --only functions:duduEconomyStatus,functions:duduEconomyDailyCheckIn,functions:duduEconomyPurchase --project truyendienvl`.
6. **Keep switch OFF:** missing `system_config/economy_v52` or missing `schemaVersion:52` or `enabled:true` means Functions reject mutations. This is the expected default.
7. **After read-only checks,** set `system_config/economy_v52` via trusted Firebase Console/Admin SDK to `{schemaVersion: 52, enabled: true}`. Do not permit clients to set this document.
8. **Live acceptance, with signed-in account and App Check:** status obtains 0 starting server Xu, daily check-in yields exactly 8, immediate repeat yields none, purchases use canonical price, insufficient funds rejected, same `requestId` replays safely, second account cannot access first account, sandbox cannot call production wallet. Test offline/refresh after an ambiguous purchase to validate request replay.
9. **Backout:** switch `enabled:false` from the trusted admin console. This stops all check-ins/purchases without deleting balances, receipts or items.

## Not completed and NOT claimed
- Firebase deployment, App Check key, actual Firestore Rules and billing are **not verified by GitHub Actions**.
- No migration of legacy balances or inventories; plan a reviewed, auditable migration separately.
- Server-issued quest completion for reading, looting, gifting, NPC interactions, FUN, or coupon/tool consumption needs verified server event producers.
- Verified item consumption, gift transfer, real auction/escrow and any user-to-user transfers are out of scope.
- Before calling V52 production-ready, run true Firebase Emulator tests with strict Rules plus authenticated integration tests, not only pure Node/browser tests.
