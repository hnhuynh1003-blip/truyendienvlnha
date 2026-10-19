# DUDU Studio — Master Plan V67: DUDU System Steward & Cyber Phone 2.0
Date: 2026-10-19 | Target branch: `main` | Planning-only delivery (no runtime edits)

## Decision & order of work
Keep V66 World Atlas as a **temporary** six-genre browsing UI. Its 48 F/E examples are unpublished mission seeds, not playable content. Prioritize:
**DUDU authority architecture → DUDU messaging/phone UX → controlled system action bridge → informed pact → progression/quest service → revisit world UI**.

DUDU should feel like the soul/interface of the system, a persistent character the player speaks with. **Important trust boundary:** DUDU's dialogue/LLM never holds raw authority to issue contracts, modify rank, grant currency/items, assign paid/rewarding quests, or mutate accounts. Only authenticated server services can perform verified actions.

## Current repo audit (before implementation)
- `js/companion-ui-v43.js` uses `DuduCompanionRulesV43.reply()` for DUDU's replies; this is largely scripted. Non-sandbox state is stored per current UID in browser `localStorage` (`dudu:companion:local:v51:<uid>`), with up to 50 history messages / 550 characters each. Its old sandbox check-in can pay TEST coins, but production companion explicitly does not grant real coins.
- `js/companion-rules-v43.js`: greeting, collecting streaks and a small keyword-driven reply table. These rules are not aware of V66 genre gates, pact state, mission grades or progression.
- `js/phone-inbox-v33.js`: DUDU pinned ahead of NPC threads; separate inbox/contact modes, own back navigation and NPC messaging view. Avoid creating a second DUDU thread or separate app that duplicates this inbox.
- `css/companion-v43.css`, `css/phone-inbox-v33.css`, `css/chat-messenger-v56-12.css`, `css/phone-compact-v50.css`: layered layouts. V43 chat mixes head, streaks, collapsible diary, messages, quick buttons and bottom input within a small Cyber Phone.
- `js/ai-proxy.js` already provides the Firebase-token-authenticated Cloudflare Worker AI gateway for *NPC/author chat*. DUDU's companion `rules.reply()` is not automatically AI-backed by this existing NPC pipeline.
- `js/world-taxonomy-v66.js`: six categories and unpublished F/E seeds; client preview generator is not an assignment source; existing entry checks deny play.
- Existing NPC reader identity A/B/C is **per story**; future DUDU knowledge must never merge or corrupt individual NPC memory/roles.

## Product definition: three logical layers
1. **DUDU Character / Conversational Experience:** a consistent voice, greetings, task explanations, user-facing notifications and guided onboarding. The AI may paraphrase server facts but cannot invent status, balances or unlocks.
2. **System Steward / Orchestrator:** deterministic intent router and read-only query tools (profile, pact status, verified rank, eligible mission grades, active mission status, reader guide, inventory overview). Calls pass Firebase identity to server and return structured, validated results. Actions with side effects require explicit UI confirmation, server authorization, idempotency, and response-specific feedback.
3. **System Authority / Backend:** stores canonical pact, rank/progression, assignment status, rewards and audit events. Auth checks UID, concurrency and quotas. Server validates every action regardless of what DUDU says.

DUDU remains the welcoming personality, never the sole source of truth.

## Proposed implementation batches

### V67.1 — DUDU identity, contract with existing app, migration inventory
- Audit every existing V43/V33/V56 DUDU/NPC message route, CSS and state.
- Define one DUDU service `DuduSteward` with versioned read-only `getSystemSummary()` and `getCapabilities()`; return `unknown / not-launched` when authoritative data is unavailable. Do **not** synthesize `contractSigned:false` if it has not been checked.
- Define intent categories `chat | howto | account_status | pact_info | world_catalog | mission_info | progression_info | help`.
- Define role separation DUDU(system contact) vs NPC(story + identity): distinct memory domains.
- Save migration strategy: read historical per-UID local companion messages; preserve original until verified import, avoid duplicates and unintended cross-UID migration. No destructive resets.
- Add unit tests for unauthorized/unknown state, identity switching and preserving old messages.

### V67.2 — Cyber Phone / DUDU Messenger 2.0 (UI first)
- Keep one contacts list: DUDU permanently first, NPC conversations underneath; do not repeat the list inside an open chat.
- Tap DUDU thread to open one direct full-height conversation with consistent avatar/character portrait, simple title, online/system state and **one back button**.
- Chat pane gets the remaining height. Composer stays in view above mobile keyboard; multiline textarea with auto-resize, single clearly visible Send button and visible sending/error states; Enter submits only where appropriate, Shift+Enter is newline on desktop, handle IME composition.
- Long responses render in readable bubbles, support copy/retry; scroll follows bottom only if already near bottom, and never loses an unsent draft.
- Move streaks, daily check-in and collectibles into an optional `Nhật ký` drawer or profile sheet. Quick actions via one compact icon or horizontally scrollable chips, collapsed by default. **No large instruction banners or duplicated entry CTA.**
- Desktop Cyber Phone remains compact, mobile uses nearly/full viewport with safe-area inset and appropriate keyboard behavior. Test 320, 375, 390, 430, 768 and desktop; Android Chrome, iOS Safari if possible.
- Preserve all old NPC chats, wallpapers, gifts, role selectors, phone app navigation and reader overlay.

### V67.3 — DUDU can explain/control approved *read-only* system views
- Add one route `DUDU → intent → trusted query → structured result → short reply + optional action`.
- Start with read-only world catalog F/E status, profile/account, available reader tools, NPC/shelf help and feature readiness.
- Structured status must distinguish `ready`, `locked`, `pending`, `unavailable`, `unknown` and never claim live quest success.
- DUDU AI may be used for wording/conversation but only receives necessary, permission-scoped context. Use existing authenticated Worker gateway with a separate allowlisted DUDU purpose and quota; do not expose API keys or simply reuse NPC prompts.
- Low-cost deterministic help is the fallback when AI times out; UI should show transparent mode (e.g. offline/help-only). Avoid unlimited LLM calls and hidden chargeable providers.
- Add tests for forged tool requests, cross-UID data, server timeouts, quotas and no unauthorized mutation.

### V68 — Pact creation, after the steward and UX are reliable
- DUDU offers a clear system explanation, never auto-signs. A **separate versioned pact** screen displays obligations, capabilities and consent choice.
- Authentication required; the server records UID, pactVersion, verified acceptance timestamp, current status, revocation/suspension and audit metadata.
- Decline/cancel must leave reading and NPC chat functional, while real transmigration tasks remain locked. Reopen later.
- DUDU receives verified pact status and guides the next step without pretending that chat text alone signs anything.
- Verify duplicate clicks, replay, stale login, new-device login, loss of connection, UID switching and revocation; no invented pact state.

### V69 — System progression and real mission lifecycle
- Decide and approve **system rank** separately from **mission grade**. Both F and E are introductory *mission grades*; server policy determines grade eligibility. Do not assume system rank 'F' equals mission grade 'F'.
- Server-owned mission assignment selects among **published**, eligible versions only. Use player history and recent genres to minimize repetition; use F/E seed catalog only after story/quest content is reviewed/published.
- Mission state machine: offered → accepted → in_progress → completed/failed/abandoned. One active assignment policy and deadlines/retries require explicit balancing decision.
- Outcomes, XP/level promotion and any currency/items are server-verified and idempotent. DUDU reads back only confirmed outcome and narrates it.
- Per-mission narrative identity (main/passerby/free) and NPC memory scoped by account + mission/story; never leak between stories.
- Prioritize event logs, auth and consistency tests before any economy or reward delivery.

## Design acceptance
- Within one tap from Contacts, user can chat DUDU; no additional scroll-to-find or duplicate contact panels.
- On a typical 390×844 mobile viewport: header ≲58 CSS px, conversation occupies the main area, composer always accessible; nonchat widgets do not permanently consume more than one small row.
- No false pact signature, no fake mission rewards or rank changes in UI.
- Existing V43 companion history, V56 NPC chat/identity and V50 wallpaper/avatar survive migration.
- All actual state mutations are server-validated; AI narrative cannot elevate rights.
- Do not add another general home/dashboard that repeats existing navigation and world cards.

## Testing, release and rollback
Each batch: schema/JS syntax, browser smoke (mock Firebase), no cross-account state leaks, phone viewport regressions, keyboard focus, Android/iOS, NPC chat, reader, EPUB and Firestore no-write regression. Commit directly to `main` as coherent large reviewed steps but do not claim full deployment before verifying Pages and Worker independently. Maintain a revert point per batch.

**Not being implemented by this plan:** pact API, signing, rank/XP thresholds, mission rewards, gameplay dispatch and visual redesign of V66 world tiles. These require later explicit implementation/verification.

## Decisions reserved for later
- DUDU personality and tone (system guide vs playful friend), portrait/voice assets and how much freeform AI conversation the quota allows.
- Pact text, responsibilities, revocation behavior and age/consent requirements.
- System rank nomenclature, upgrade thresholds and failed-mission penalties.
- Permissible replay/cooldown and how strongly mission randomization prioritizes new genres.
