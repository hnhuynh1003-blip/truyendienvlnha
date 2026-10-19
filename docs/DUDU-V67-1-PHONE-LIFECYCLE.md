# DUDU Studio V67.1 — Cyber Phone navigation & account lifecycle
Date: 2026-10-19 | Production `main` | Prior baseline: `7533254b7bde3d9dd00cd77c97970379cf5f4d5d`

## Goal
Synchronize navigation/lifecycle across the 12 existing Cyber Phone apps **before** upgrading DUDU chat, phone aesthetics or implementing the system pact. Do not rewrite working inventory, economy, NPC AI, settings or author apps.

## Implementation
- `js/phone-app-contract-v67.js` is the source-of-truth inventory of 12 app mounts and existing renderer entrypoints.
- `js/phone-lifecycle-v67-1.js` installs after the old V33 inbox and companion init. It wraps **final** `window.openPhoneApp`, `window.phoneHome`, and `window.togglePhone` once. Each wrapper invokes the original unchanged; it then observes which app actually displays, rather than assuming the request succeeded.
- A cheap DOM observer tracks the phone shell, mounted app panels and the existing inbox/NPC/DUDU subview classes; events are coalesced using a microtask. Integration clients can listen for `dudu:phone:lifecycle`, with read-only `{reason,open,appId,home,conversation,accountChanged}`.
- Public `window.DuduPhoneLifecycleV671.state`, `refresh(reason)`, `onAccountChanged()` support future integration. The state is a UI snapshot, **never proof of permissions, item ownership, saved pact or completed missions**.
- Navigating to any app or home resets only the volatile DUDU chat **controller**; owner-scoped stored conversation remains untouched.
- On account switch, the phone closes before the new account can view the old chat; ephemeral unsent DUDU/NPC composer text, old visible chat bubbles and unsaved role editor view are cleared. No persistent chat/profile/story memory is deleted.
- Sandbox `handleAuthSubmit()` calls the lifecycle identity-change hook after scoped user data is loaded. On live Firebase, a read-only `onAuthStateChanged` observer detects UID changes even when account profile is still loading.
- No modification to Cloudflare Worker, Firestore Rules, Firebase profiles, rewards, NPC chat API, wallet, inventory, novels or EPUB.

## Intentional non-changes
- No new phone app icon/card; existing 12-app grid persists.
- No new call to AI, no DUDU pact authority and no fake mission unlock.
- No destructive localStorage migration. The old V43 DUDU messages are still stored under existing account-scoped keys.
- No visual overhaul in V67.1; V67.2 handles unified messenger styling/composer after these contracts are verified.
- Does not yet provide validated server status for quests/economy. The V52 economy API remains separate and protected.

## Verification
- `tests/phone-lifecycle-v67-1.cjs`: fake-DOM/unit contract validates phone open/close, inbox, app switching, app home, account-switch privacy, and Firebase auth observation. Test also asserts that the lifecycle layer never calls network or localStorage APIs.
- `tests/phone-app-contract-v67.cjs`: previously added inventory/mount/link baseline.
- `tests/browser-smoke.cjs`: existing V67.0 mocked Firebase baseline; **V67.1 browser interactions have not been added/run in Chromium during this commit**.
- JS syntax / mock-DOM lifecycle test were checked in isolated JS runtime. Full Node/Playwright and manual Android/iOS checks still pending before declaring real-world mobile/production sign-off.

## Follow-on implementation gates
1. Run genuine browser smoke with mock Firebase, verify all 12 app opens/back/home/close and account A→B switching without any cross-account text or storage writes.
2. On mobile verify bottom navigation, overlays, chat composer and keyboard at 320/375/390/430; check foreground and scroll.
3. V67.2 replace the DUDU V43 messenger interface (not its stored history), and harmonize NPC list/avatars/chat through existing inbox. Preserve roleplay A/B/C and verified NPC server path.
4. V67.3 add an authoritative **read-only** System Steward data bridge. Only V68 establishes a server-verified pact.

## Rollback
To revert V67.1: remove the `phone-lifecycle-v67-1.js` script tag, remove its one `onAccountChanged` sandbox hook from `index.html`, revert/delete the corresponding new JS/test, and keep V67.0 app inventory and all user data unchanged.
