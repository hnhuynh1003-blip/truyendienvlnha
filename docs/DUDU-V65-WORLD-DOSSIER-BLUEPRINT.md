# DUDU Studio V65 — World Dossiers & Scenario Blueprint (2026-10-19)

## Scope
Production `main`. This is the first **World Atlas interaction / author preparation** tranche after V64. No published story, NPC, inventory, Firestore rules, Cloudflare Worker or economy changes.

## Reader behavior
- Atlas remains six compact tiles (2 columns on phone). The three unknown coordinate cards stay collapsed under the existing disclosure.
- Click/tap or keyboard Enter/Space on a starter tile opens one compact, read-only dossier dialog.
- Dossier reveals existing registry data on demand: title, low tier, setting category, teaser and locked portal state.
- There is **no** playable portal, chapter duplication, quest generation, teleport, rewards or story-to-world binding.
- Dialog is native with Escape, visible Close button, proper accessible title and focus handling.

## Author behavior
- Only when existing `canEditStories()` permits the author entry: one `Khung kịch bản` control in Author Studio.
- Select one of the fixed `dudu-w001` ... `dudu-w006` coordinates.
- Download an **offline JSON draft** for future plot writing; inspect an edited JSON file in the browser without uploading/saving it.
- Three independent proposed roleplay modes in template: `main`, `passerby`, `free`.
- Unknown worlds are not eligible for the template generator.
- A draft is never a server-authorized published scenario. No admin-claim semantics from this UI; the author role gate is presentational only.
- Locked access (`enabled:false`, `serverValidated:false`) and rewards (`enabled:false`, 0 currency, empty items) are mandatory.
- Unreviewed story/scenario/prompt/NPC IDs are reported by validator, not activated.
- Maximum local JSON inspection file: 256 KiB. Files are read locally; no server upload or persistent account store.

## Contracts and future integration
- Immutable identity and look of the nine coordinates remains in `js/world-registry-v63.js`.
- New `js/world-blueprint-v65.js` creates `schemaVersion:1` author draft JSON via `makeDraft(worldId)`; `validateDraft(draft)` rejects unknown IDs, unapproved bindings, privilege and reward flags; `canPublish` always returns false.
- Future narrative work can fill `narrative.premise`, `opening`, `objectives`, `scenes`, `branches`, `endings`, and identity mode descriptions.
- Future publication requires a **separate, authenticated, server-validated pipeline**, distinct NPC/story isolation, content moderation, scenario versioning, rollback, rate limits and tested permissions. Merely uploading a JSON elsewhere must not enable gameplay.
- Visual implementation: `js/world-experience-v65.js` and `css/world-experience-v65.css`. The old shell offers just the author entry and is otherwise intact.

## Verification
- New runnable pure Node test: `node tests/world-blueprint-v65.cjs`.
- Expanded mock-Firebase Playwright test in `tests/browser-smoke.cjs`: read-only dossier and Escape/Enter/Close, guest access denial, role-gated author opening, zero Firestore writes, 6+3 identifiers and V64 mobile layout.
- Unit/syntax checks can be performed on fetched repository source. Full browser smoke, live deployment and device tests require separate execution; do not claim those passed merely because GitHub accepted commits.

## Rollback
Start baseline: `fc43ac57ae6a5b7d72e4683b9a5f8489a56347bd` (V64 final).
Remove V65 script/style includes, revert the author-entry button, and revert V65 add-on assets/tests only. Keep V63 world registry, V64 tile layout, stories and all user state.
