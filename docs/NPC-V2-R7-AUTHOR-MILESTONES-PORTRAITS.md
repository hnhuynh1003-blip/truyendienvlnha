# DUDU NPC V2 — R7 authoring, lore gates, safe portraits
**15/10/2026 | Sandbox on `feat/identity-npc-editor-v2` only | NOT deployed / NOT merged**

## What is implemented
- Sandbox author character editor has optional `giftPreferences` tag controls (liked, disliked, refused, response style), preserving NPC IDs, names, and reader save. If the author does not opt in, prior default preview personas are retained; existing user authored preferences override preview presets.
- Portraits accept ONLY local packaged paths matching `assets/npc/<safe-name>.(png|jpg|jpeg|webp)`. Unknown, invalid, missing, or unloaded portrait uses a letter-avatar fallback. No remote HTTP(S), `data:`, SVG or traversal URL is allowed. Artwork has **not** been provided or committed yet.
- Private NPC relationship milestone planning: each row `milestoneId|chapterId|minimumTrust`, 0–12 milestones, chapter IDs must belong to this story; each plan is saved **only in Sandbox localStorage** with its own story/NPC key. The plan is not added to the public `studio_data/main_library` or NPC profile.
- All draft milestones are always `verified:false`, and the stage-reveal gate receives **no trusted completed milestones**. No relationship reward, spoiler, exclusive collectible, quest reward, or backend credit can be minted by entering a draft, editing localStorage, sending a chat or reading a chapter.
- Inventory search/type filtering, filtered-index discard safety and collectible protection remain. R5 daily trust dialogue choices remain local-only (first eligible choice per UTC day).

## Remaining before public release
1. Ship reviewed and approved character art into the repository's `assets/npc/` directory. Do not infer character identity from generic concept art.
2. Add a server-authoritative chapter/milestone service with authenticated UID, story ID, NPC ID, author-approved milestone version and verifiable event evidence, transaction idempotency, and rollback/abuse controls. Only then pass approved/completed milestones into relationship stages; NEVER trust client arrays.
3. Two-account staging review, security rules, Firestore economics, actual mobile QA at 320/375px and desktop, Firebase/Worker quotas and robust synchronization across devices. Current tests use mocked Firebase and headless Chromium.
4. Author preview configuration and local drafts are **not** yet a production system for NPC story quests. Manual approval is required before eventual merge / deploy.

## Rollback / safety
Branch remains Draft. No Worker, Firebase or GitHub Pages production deployment. Do not copy Sandbox-only `localStorage` milestones to the live library or assume artwork is present when it is not.
