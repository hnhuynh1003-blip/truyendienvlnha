# INTEG-T0 — DUDU website / MOD-P2 mock integration

## VIS-T1 — V1.24 visual foundation

VIS-T1 is now applied only to the integrated website iframe. See [VIS-T1 evidence](VIS-T1.md). Preview URL and gameplay remain unchanged. The original prototype page keeps its original presentation.

Local preview (no dependency install):

```powershell
node tools/tutien-integ-t0/serve.mjs 4180
```

Open **http://127.0.0.1:4180/?sandbox=1**. Close the existing Sandbox account modal if shown. Open Cyber Phone, then **Tu Tiên → Đi phó bản → Tầng 1 → Bắt đầu**. Continue through Tiểu Nham Thú, Nham Thú and Nham Thú Vương. Return with **Về Tu Tiên**, **Về Library**, or the phone back button.

This is the actual local DUDU index/navigation/CSS, with a website-only skin over the original MOD-P2 iframe. No copy of Combat Core, data fixtures, repository or effects. No MOD-P3, gathering, crafting or professions. The adapter has no account/quest/reward bridge. Closing/switching apps removes the iframe; the original IndexedDB repository restores committed progress on reopening. Sandbox `allow-scripts allow-same-origin` supports existing modules/IDB; it is presentation isolation, not a security boundary against untrusted code.

## Preview isolation

The dedicated loopback server serves the website and prototype static resources. For the preview response only, it removes remote SDK scripts, inserts an offline Firebase-shaped stub, forces `sandbox=1`, disables service worker registration, and replaces phone webfont URLs with an empty local stylesheet. It does not edit the real SDK, Auth, Library or production service configuration. CSP denies connections, remote scripts, workers and form submission. Mock service write methods fail closed. This preview does not verify production Auth/Firebase integration.

The server uses a different origin/port from the old prototype. Browser saves remain scoped to their original origin. No database is deleted, copied or migrated. The old prototype and every earlier run remain unchanged. The integrated page uses the existing MOD-P2 mock run at the new preview origin; all combat and receipts remain MOCK_ONLY.

## Verification

```powershell
node --test prototypes/tutien-combat-s/tests/*.test.mjs
node --test tools/tutien-integ-t0/integration.test.mjs
node prototypes/tutien-combat-s/tests/run-browser.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe"
node tools/tutien-integ-t0/run-browser.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

- Prototype Node: **85 PASS / 0 FAIL**.
- Integration Node: **3 PASS / 0 FAIL** (preview transformation, bridge contract, HTTP security).
- Original Chrome regression: **63 PASS / 0 FAIL**, including IDB/two tabs/rollback/legacy compatibility.
- Actual website Chrome: **21 PASS / 0 FAIL**: native touch entry without quest, mobile widths 320/360/390/430 and desktop1280, old slash VFX rendered, Library teardown/reopen, complete three-wave clear, receipt restoration after website reload, navigation to Library/Inventory/Wallet/Quests/Arcade/FUN, no external requests and no uncaught exceptions.

Browser runners use fresh temporary Chrome profiles and loopback servers, not user saves. PNGs/reports are saved to the OS temporary directory by the website runner. Viewport emulation does not certify physical phone behavior or prove gameplay fun. Other-app checks cover navigation/rendering only, not their complete gameplay or live service behavior.

No combat formula or balance changes, no new dependencies/assets/VFX, no production writes, reset, commit, push or deploy. Human acceptance is pending An Du. Stop at INTEG-T0.
