# DUDU V67.0 — 12-app Cyber Phone audit and compatibility baseline
Audit date: 2026-10-19. Target: `hnhuynh1003-blip/truyendienvlnha` on `main`.
Scope: source-code inspection of the existing app entrypoints and link graph; this is **not** a live UI/device or server availability certification.

## Decision
Keep working domain engines and server protection layers; do **not** rewrite all apps for cosmetics. First establish a common compatibility map and regression gates; later modernize only older/duplicated flows. Do not conflate code-presence with server permission or operational health.

## Twelve apps
| Canonical app ID | Current lineage / dependency | V67 treatment | Main risk to verify |
|---|---|---|---|
| `profile` | V16 avatar / V50 compact profile, `updatePhoneUI` | **Keep** | Auth identity, avatar cross-account re-render |
| `inventory` | V43/44 inventory, V52 optional server-backed view, `renderInventory` | **Keep engine; later unify status UI** | Distinguish legacy device and server-verified property; no phantom ownership |
| `author-mail` | V44.3 author mail, `renderAuthorMailV443` | **Keep** | Correct role and story scope |
| `lab-v445` | V44.5 multi-actor testing module | **Sandbox only; freeze** | Never show sandbox lab in production |
| `museum` | `renderMuseum` + verified collectibles API + sandbox memories | **Keep** | Never equate local albums with server collectibles |
| `quests` | V43.7 quest UI / V52 server status, `renderQuests` | **Bridge in V67**, no runtime upgrade yet | Legacy task UI vs authoritative pact/mission progression are separate |
| `stories` | V29 phone mini story navigator | **Keep** | Preserve reader routing and avoid duplicating Home/Library |
| `codex` | NPC/reader identity V56 + Codex, `renderCodexList` | **Keep** | UID/story/role-scoped character memory |
| `chat` | V33 inbox + V43 scripted DUDU + V56 NPC AI chat | **Modernize first** | Double routing, old fixed input, DUDU unaware of current system |
| `shop` | V43 market catalog + V52 verified economy, `renderShop` | **Keep engine; later unify status UI** | No unverified currency debits or duplicate purchases |
| `fun` | V43 DUDU FUN; local free play vs sandbox rewards | **Keep** | Do not present live local practice as redeemable rewards |
| `settings` | V35 accordion + V34/V36/V37 gallery + V31 fonts | **Keep with visual polish later** | Wallpaper sync and layers of overlapping CSS |

**Source facts:** `index.html` currently includes 12 `phone-app-*` mounts; `openPhoneApp` and `phoneHome` are legacy central navigation, while V33 wraps `openPhoneApp` to open the inbox. `companion-ui-v43.js` replies using `companion-rules-v43.js` `rules.reply`, stores production companion chat in per-UID browser localStorage, and is NOT the same AI route as V56 NPC chat. `ai-proxy.js` routes authenticated NPC AI through a Cloudflare Worker. V52 economy uses authenticated Firebase callables and denies actions when disabled. DUDU FUN on production does not grant real items.

## Shared integration contract
New `js/phone-app-contract-v67.js` loaded after app scripts:
- Exposes `window.DuduPhoneAppsV67.specs`, `get(appId)`, `snapshot()` and `issues()`.
- Every canonical app has a unique stable ID, DOM mount, current entrypoint, domain and disposition (`retain`, `bridge`, `modernize`, `sandbox`).
- Provides **read-only code-presence** and panel-mount checks; it does not intercept navigation, migrate saves, connect AI, sign contracts, update progress, access external services or claim backend readiness.
- Sandbox lab is marked `sandbox_only` in production regardless of installed code.
- Future work should consume this single manifest rather than creating new home-screen apps or duplicate tabs.
- This is an internal compatibility layer, not a player-facing feature and not a claim that 12 apps are functional.

## Prioritized actual upgrades
**Stage 0 (current):** inventory + cross-app source baseline, add static and mocked-browser compatibility checks; keep all original renderers, UID/state and Firestore unchanged.

**Stage 1:** normalized lifecycle adapter (open/back/home/close events, safe foreground flags, account-switch cleanup) *after* legacy navigation tests are passing; prevent stacked wrappers and residual chat panels.

**Stage 2:** DUDU Messenger first: single pinned system contact, working inbox, comfortable composer, preserved per-UID messages, compact header; dialogue and point/reward logs moved to optional drawer. NPC messaging/role selection must keep working.

**Stage 3:** DUDU System Steward (read-only state interpretation, help intents, safe per-story context) with clear statuses `unknown`, `not_launched`, `locked`, `verified`; connect to existing Worker only with independently approved server prompt/tool allowlist.

**Stage 4:** normalize Quests and Shop/Inventory/Bảo tàng *presentation only*, so DUDU can distinguish old device states, server-verified properties and not-yet-live F/E missions. Never silently migrate or reward.

**Stage 5:** implement server-confirmed pact/mission/level after UX, trusted APIs, migrations and progress validation.

## Release/test gates
- `node tests/phone-app-contract-v67.cjs` checks 12 mounts and stable manifest with mock DOM, sandbox rules, no network/storage usage.
- Added to `tests/browser-smoke.cjs`: all 12 panels and renderer entrypoints must exist with mock Firebase, zero Firestore writes.
- Test guest and signed-in accounts separately, production vs sandbox, logout/account switch, phone opening/closing, each app's back/home, keyboard and mobile overflow at 320/390/430/768, read/EPUB, NPC chat, shop/quest read-only fallback.
- Static/probe status **does not prove** any app works in real life. Execute mocked Chromium and device tests before declaring an app fully functional.
- Stop or rollback any patch that affects verified inventory, purchases, roles, NPC memory, published stories, Firestore rules or live Worker keys.
- Baseline rollback SHA before these changes: `845e63b647dd5a1f64d7dcb862b709a77282befc`.

## Observed UX debt (not yet patched)
- DUDU chat composer is an old one-line input and sits alongside permanent streaks and shortcut rows in a tight phone layout.
- DUDU companion state and NPC chat histories have different storage and UX lifecycles.
- Shared phone entrypoint is wrapped by the V33 inbox; navigation and background renderers need regression tests before modernization.
- Several phone layout styles come from V33/V43/V50/V56 CSS, so broad unscoped CSS replacements would risk NPC chatting, input placement and wallpaper handling.
