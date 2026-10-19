# DUDU Studio V67.2 — DUDU Messenger 2.0
Source date: 2026-10-19 | Target: GitHub `main`.

## Goal
Upgrade the **old DUDU companion chat**, not the modern V56 NPC AI backend. Keep exactly one system contact pinned in the existing V33 inbox, avoid duplicate app icons or scroll-heavy dashboards. Prioritize mobile keyboard ergonomics, readable conversation and data preservation.

## What changed
- `js/companion-ui-v43.js`: keeps all V43 state keys, sandbox/prod access rules, check-in economy paths, 50-message archive and scripted `rules.reply()` semantics. The visual DOM is now only **header + chat log + composer**.
- Compact DUDU identity header. The streak counters, diary/check-in button, milestone list and three pre-existing help shortcuts moved into one native `details` menu at the right of the header.
- Composer is a 500-character multiline `textarea` with auto-size, Send disabled for empty/whitespace-only input, Enter to send / Shift+Enter newline on desktop; skip submit during IME composition.
- Failed local save keeps the draft and shows a short error. Success clears and disables send. No new AI calls and no claims about a signed pact, system ranks or unlocks.
- The chat `render()` preserves manual scrollback if already reading older messages; new outgoing message takes the viewer to the bottom.
- `css/dudu-messenger-v67-2.css`: isolated `dudu-v43-companion-open` styling, spacious chat bubbles and collapsed tools. DUDU chat alone uses fullscreen on small phones with safe-area padding; **NPC messages and avatars are untouched**.
- `js/dudu-messenger-v67-2.js`: use `visualViewport` when available to fit the keyboard, dismiss diary on outside taps/Escape, remove temporary viewport properties on chat/phone exit, and work with the existing `dudu:phone:lifecycle` events. No storage/network/backend writes.
- `index.html` loads the new CSS after all other phone styles, refreshes V43 script cache to `v=67-2`, and loads the helper after V67.1 lifecycle.

## Compatibility and security
- DUDU **remains scripted/local** in V67.2. A genuine AI steward, authoritative status tools and backend-approved actions are deferred to V67.3.
- The old sandbox streak/reward code remains sandbox-only and unchanged. Production DUDU check-in continues to store device-local milestones without granting real currency/items.
- DUDU's per-UID localStorage data key for production, original sandbox data shape, login guard and NPC/roleplay/EPUB code are preserved.
- V67.1 keeps the account-switch privacy boundary. Closing the Phone or navigating away hides the transient DUDU controller, while account-scoped messages survive.
- No changes to Firebase Rules, Worker secrets, account claims, quotas, Cloudflare endpoints, economy functions or world mission unlocks.
- Keep the existing V33 inbox and V56 NPC role selection; avoid moving or deleting their elements.

## Verification
- `tests/dudu-messenger-v67-2.cjs`: mock DOM integration test checks 3-part layout, header diary, textarea send, historical saved messages, keyboard guards, scroll retention and companion hide.
- `tests/dudu-messenger-viewport-v67-2.cjs`: simulated mobile visual viewport, diary outside click/Escape, Phone close cleanup and lack of backend calls.
- Expanded `tests/browser-smoke.cjs` companion checks for layout/textarea/controls along with existing sandbox check-in and V33 inbox tests.
- The two isolated JS mocks have been run in an ephemeral tool harness; they passed. The **full Chromium browser smoke, live Pages deployment and physical Android/iOS keyboard behavior have not yet been confirmed**, as the container cannot resolve github.com to checkout the repo. Never describe those checks as passed.

## Further development
1. Browser/multidevice regression gate: 320/375/390/430/768 widths; focus, virtual keyboard, scrollback, account A/B changes, check-in, NPC chat, gifting, inventory, cover/chapter and reader identity.
2. V67.3 DUDU System Steward: distinguish casual conversation from deterministic, authenticated, read-only system queries, with explicit `unavailable/unknown/verified` states. Create separate allowlisted Worker AI purpose and quota. Never treat chat text as authorization.
3. V68 server-authorized pact; V69 real quest lifecycle/progression; only then publish playable F/E missions.

## Rollback
Before V67.2: `8f97184d45a0aea818e4660d485270a0353eb9a0` was the V67.1 master roadmap milestone. To rollback this UI, revert V67.2 changes to `js/companion-ui-v43.js` and `index.html`, remove the new CSS/helper/test assets. Keep V67.0/V67.1 app inventory, lifecycle, user profiles and all stored chats.
