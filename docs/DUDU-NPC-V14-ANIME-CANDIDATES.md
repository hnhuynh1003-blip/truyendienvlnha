# DUDU V14 — Anime NPC concept portrait picker

**Date:** 15 Oct 2026  
**Branch:** `feat/identity-npc-editor-v2` (Draft PR)  
**Safety:** No merge, no Worker deploy, no production Firestore or reader-save updates.

## Scope delivered

- Reuse four previously generated **female anime portrait candidates**: moonlit blue, violet moon, peach court and female adventurer.
- Embed all four as a single compact WebP preview sprite in `js/npc-anime-candidates-v14.js` (four 120×160 frames). This is actual raster artwork, not the old procedurally generated vector avatar style.
- Present a dedicated **author-selectable** candidate gallery in the existing NPC editor. Nothing is automatically assigned to Ôn Tri Hành, Tô Thanh Lạc or Thẩm Cẩm Thư; gender, character IDs and original author text remain intact.
- When the author explicitly chooses an anime candidate, persist its stable `portraitAnimeId` in the character draft and display that selection in Cyber Phone/character Codex. Reopening the editor restores the same choice.
- Preserve both the original selectable 60 female/12 male vector prototypes and all legacy IDs. Choosing an old vector portrait later clears the anime setting and restores the previous mode. Uploading one's own image takes priority and cancels an outstanding preview choice.
- No additional NPC creation, automatic unlock, affection, trust, gift, currency, inventory or collectible grant.
- Gallery images are embedded locally and do not incur remote image hosting requests.

## Image quality and next stage

- The embedded WebP sprite is deliberately **thumbnail-quality** to avoid adding large assets to the existing single-page browser application.
- The earlier V13 downloadable art pack still includes four 480×640 WebP portraits for author trial uploads; **those full-resolution files are not yet hosted in GitHub or Cloudflare**.
- The four images remain artwork *candidates*, not canon. Selecting a candidate makes it the NPC's Sandbox portrait but does not signify public release approval.
- Later, store high-resolution, author-approved art in authenticated object storage with quotas, validation, deletion and per-author ownership. Server and device synchronization are out of scope until explicitly approved.

## Tests and outstanding release gates

- Node tests validate four distinct candidates, decoded WebP bytes, stable selection IDs and Sandbox-only integration.
- Chromium browser test exercises actual selection, reopening the editor, portrait rendering, reverting to the old vector gallery and isolated save.
- Real iOS/Android QA, authorization review, save migration audits and production image-storage flows must precede release. All current tests use mocked Firebase.

**No automatic merge/deploy.**
