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
3. **Firebase App Check (V52.2):** In Firebase Console > Security > App Check > `webtruyendien`, choose **Fraud Defense (formerly reCAPTCHA Enterprise)**. Classic reCAPTCHA is deprecated in the Console and must not be used. In the Google Cloud project `truyendienvl`, create a **score-based Web key** for `hnhuynh1003-blip.github.io` (not a checkbox challenge), then register that **public Enterprise key** in Firebase App Check. Copy only that public key into `js/appcheck-sitekey-v52.js` as `window.DUDU_RECAPTCHA_ENTERPRISE_SITE_KEY` (V52.3: configured with the public production Enterprise site key; validate the key against Firebase registration before enabling transactions). The web SDK activates `new firebase.appCheck.ReCaptchaEnterpriseProvider(key)` with refresh enabled only when the key is set. Never publish an API secret. Do not enforce Firestore or Authentication until valid App Check traffic is verified. With a blank/invalid key, `enforceAppCheck:true` intentionally rejects the V52 callable Functions.
4. **Rules:** inspect the actually deployed Firestore Rules, and merge `security/firestore-economy-v52.rules.review` with existing rules *without overwriting them*. Existing overlapping wildcard `allow` statements must be audited, since deny rules cannot override an allow.
5. **Deploy only the three new Functions** (not all functions unless explicitly approved):
   - A guarded Windows PowerShell helper is available in `scripts/deploy-economy-v52.ps1`. Run it from a **clean up-to-date `main` checkout**, after `npx --yes firebase-tools@latest login` on the trusted local machine.
   - Run `.\\scripts\\deploy-economy-v52.ps1` first for Node 22 / Git main / sync / callable / App Check / unit-test preflight only. Nothing is deployed.
   - Once the project is verified to use **Blaze**, and the exact Firestore gate document `system_config/economy_v52` is confirmed **missing or enabled=false**, run `.\\scripts\\deploy-economy-v52.ps1 -Deploy`. It requires explicit typed confirmations. The helper intentionally does not alter Firestore Rules, Hosting, or the gate.
   - The exact command is `firebase deploy --only functions:duduEconomyStatus,functions:duduEconomyDailyCheckIn,functions:duduEconomyPurchase --project truyendienvl`.
   - Never deploy from an old sandbox checkout or with a shared service-account key pasted into the repo.
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
