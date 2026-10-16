# R9 — NPC portrait catalog: gender, world and temperament
Sandbox branch `feat/identity-npc-editor-v2` (2026-10-15). NOT merged, NOT deployed.

## Implemented
- Portrait catalog expanded **24 → 72**: 24 female, 24 male-presenting, 24 gender-neutral vector avatar prototypes. Existing `portrait-f-01...24` IDs are unchanged; saved portraits remain compatible.
- Each item has explicit stable ID, presentation category, world (`modern / historical / fantasy`), temperament label and small appearance variants.
- NPC author editor offers controls for gender, story world and accent-insensitive Vietnamese temperament search; filtered gallery remains selectable and preserves images even if the current filter hides the selected item.
- Original female NPCs Ôn Tri Hành, Tô Thanh Lạc and Thẩm Cẩm Thư remain female in preview for seed IDs `c2/c4/c3` and sample IDs `c_otk/c_ttl/c_tct`. A newly created/unrecognized NPC defaults to ALL presentations rather than inheriting those profiles.
- Choosing another portrait cancels any unfinished local image upload from overwriting the choice. Sandbox images remain stored only in IndexedDB under the current sandbox identity and story, not remotely.
- The illustrations are **stylized vector placeholders**. They are not a finished anime character gallery or canon designs. No new NPC is automatically created or unlocked.

## Verification / release gates
- Node and Chromium suites test 72 unique presets, search, old 24 ID compatibility, existing 3 female NPCs, portrait selection, and private upload behavior.
- Production photo upload needs authenticated secure object storage, signature and content validation, per-author ownership, quotas, moderation, retention, revocation, deletions and migration/backups before release.
- Canonical designs and genuine high-quality portrait assets must be approved by the story author before inclusion in the shared library.
- Still no merge or deployment to `fixapp`, Firebase, or Cloudflare. Sandbox smoke is not production security certification.
