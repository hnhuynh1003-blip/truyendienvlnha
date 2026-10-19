# DUDU Studio — World Atlas V63 (2026-10-19)

## Why V63 supersedes V62 Worlds
- Library owns published stories. Worlds must **not** loop over novels or repeat book cards.
- The World Atlas is a registry of coordinates / play spaces to support future approved narrative prompts and scenario building.
- A world coordinate is not a published story, a playable scenario or a promise of available NPCs.
- This delivery changes **display-only client assets** on `main`, with no Firestore data migration, rules, currency, chat or story changes.

## Six starter worlds
| Stable ID | Display name | Tier | Direction |
|---|---|---|---|
| dudu-w001 | Thị trấn Sương Mai | F | Everyday mystery / exploration |
| dudu-w002 | Học viện Tinh Vân | F | School fantasy / hidden rules |
| dudu-w003 | Rừng Vọng Nguyệt | F | Nature / navigation mystery |
| dudu-w004 | Cảng Lam Phong | E | Maritime exploration |
| dudu-w005 | Phố Đèn Lạc | E | Nighttime city investigation |
| dudu-w006 | Phế Tích Đồng Hồ | E | Ruins / puzzles |

These are **preliminary setting concepts**, not canonized story plots. They are low-tier F/E, all `status:'planned'`, all locked.

## Unverified coordinates
- `dudu-u001`: Tọa độ Vô Danh
- `dudu-u002`: Vùng Nhiễu Sương
- `dudu-u003`: Cổng Ngoài Bản Đồ

These have status `unverified`, no rank, no gameplay or unlock button, and remain separate from the six starter worlds.

## Future prompt attachment contract
Source of truth: `js/world-registry-v63.js` exports `window.DuduWorldRegistryV63`.
Each world defines immutable `worldId` plus `storyPromptId:null`, `scenarioId:null`, `storyId:null` and `npcIds:[]` until a separately tested implementation attaches a reviewed storyline.

1. Draft and approve a scenario prompt, NPC list, access rules and rewards **for an existing worldId**.
2. Link the prompt and scenario by worldId, never by translated display name or by array index.
3. Keep `storyId` optional and separate from published novels; one world is not automatically one book.
4. Do not set any world live or enable a teleport CTA until server authority, identity isolation, unlock state, safety and tests are ready.
5. Add versioned migrations for real user progress only when gameplay is released. Current V63 intentionally saves **no** world progress.

## UI acceptance
- Worlds is not a clone of Library, now or when thousands of books are published.
- Six low-rank cards plus a distinct strip of three sealed unknown signals.
- Compact sci-fantasy HUD, responsive desktop/mobile. No dense essay panels.
- No guest/reader/author privileges granted by front-end display; no fake plays/rewards.

## QA
- Regression checks added in `tests/browser-smoke.cjs`: exact card counts, unique IDs, unbound placeholders, zero duplicated book cards, zero gameplay links, no Firestore writes and mobile layout.
- GitHub commits can be confirmed independently of browser tests and deployment. Report browser/deploy status separately.
- Rollback baseline: `1f18cd333c20fd1f6c8849aa54b24b917bb3ad6b` (V62 before V63 series).
