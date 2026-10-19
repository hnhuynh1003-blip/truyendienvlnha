# DUDU Studio V67.3 — System Steward, read-only phase
Date: 2026-10-19 | Branch: `main` | Baseline V67.2: `44d86a0c2bfd1431c3f0f89a325f00457142c0d5`

## What this release does
V67.3 makes DUDU aware of the **real architecture** before opening the contract or mission systems. It does not conflate a conversational character with a privileged admin API.

- `js/dudu-system-steward-v67-3.js` provides a deterministic, read-only intent router and a typed snapshot. No network, localStorage, Firestore, AI request or direct game action.
- Supported topics: system overview, account readiness, world categories, F/E mission seed pool, pact prerequisites, progression model, economy verification limitations.
- Catalog facts derive from the loaded **V66 registry**, not narrative hallucinations. There are six main genres and 48 F/E **unpublished seed missions** (30 F, 18 E).
- Pact and progression fields use explicit `not_launched` with `verified:false` and `null` system rank/EXP/assignment. The browser does **not** infer rank from `userProfile.level`, or treat a chat agreement as signing the pact.
- Account readiness uses existing `DuduAuth.uid()` and `isReady()` only when it matches current owner. Sandbox is explicitly marked unverified.
- Xu/inventory claims are not fabricated: DUDU points to **read-only, server-verified** views in existing Shop/Inventory when those functions are deployed. DUDU's chat currently cannot read a verified wallet balance.
- Unrecognized conversational queries fall back to `DuduCompanionRulesV43.reply()` unchanged, preserving V43 friendliness, guided collecting/reading tips, check-in and saved messages.
- Existing V67.2 Messenger shows one optional action chip under the **latest** relevant system answer: `Xem Vạn Giới`, `Xem Cửa hàng` or `Mở Hồ sơ`. Navigation only occurs following an explicit button click and only to a hardcoded allowlist. Never based on arbitrary model output.
- Existing V33 contacts, NPC chat via authenticated Worker, A/B/C reader identities, economy and collectibles APIs, Firestore rules and authored novels are untouched.

## Explicit authority boundaries
- **Do not** reuse `DuduAI.generate('chat',...)` for DUDU System Steward; that existing purpose is for NPC conversation, not a security authority. There is no confirmed separate server allowlist and quota for `dudu-steward`.
- The DUDU chat reply is local and rule-based. `snapshot().ai.status==='scripted'` explicitly describes this. It is not generative AI and must not be marketed as such.
- No commands to sign/void pacts, assign/complete quests, increase system rank, issue currency/items or alter NPC memory.
- `canSignPact()`, `canAssignMission()`, and `canGrantReward()` always return `false`, including for a user asking to bypass rules.
- No authoritative world progress, identity permissions or server status can be established from local narrative state alone.
- **V68** will implement a separate, authenticated, versioned pact service after schema, UI disclosure, consent and server-side checks are reviewed.
- **V69** will implement server-validated, idempotent mission assignment, grade eligibility, rewards and promotion.

## QA / rollback
- `tests/dudu-steward-v67-3.cjs`: deterministic source contract for taxonomy, routing, pact/mission/rank lock, account readiness and allowlisted UI navigation.
- `tests/browser-smoke.cjs`: adds a DUDU pact refusal check through the real existing V43 sandbox messaging flow.
- `tests/dudu-messenger-v67-2.cjs` and `tests/dudu-messenger-viewport-v67-2.cjs`: retained with updated version assertions.
- Static JS plus unit mocks have been exercised in an isolated tool runtime. Full Playwright/Chromium, Pages deployment and real Android/iOS checks **have not been confirmed**. Do not claim real account/back-end availability until tested.
- To roll back: remove V67.3 JS/CSS includes and companion routing/button additions, retain V67.2 Messenger, V67.1 lifecycle and all existing user data.
