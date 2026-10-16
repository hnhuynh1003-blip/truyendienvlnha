# DUDU V15 — Full-screen NPC Portrait Gallery and Hi-Res Art

**Date:** 2026-10-15  
**Branch:** `feat/identity-npc-editor-v2` (Draft PR; no merge or deployment)  
**Status:** Implemented and tested in client Sandbox; cross-device upload remains **not implemented**.

## Delivered

1. Added a 1,920×640 WebP atlas, `assets/npc/concepts/female-anime-candidates-v15.webp`, with four individually addressable 480×640 portraits. These are the same four earlier anime concept candidates; no new character identities were created.
2. Extended the existing stable concept IDs (`anime-moon-blue`, `anime-moon-violet`, `anime-peach-court`, `anime-adventurer`) with a **lazy high-resolution upgrade**. Small embedded V14 WebP thumbnails show immediately. Once the packaged atlas loads and matches the expected dimensions, Cyber Phone portraits and the character editor preview switch to the crisp V15 imagery. Missing/failed high-resolution assets leave the previous preview unchanged.
3. Added a full-screen responsive portrait viewer to **Sổ Tay Nhân Vật**, and a “Xem ảnh” action within **Liên Lạc NPC**. Viewer supports desktop and 320–375px mobile dimensions, focus restoration, close button, Escape, modal click-outside, meaningful image labels and reduced-motion preferences.
4. Only an author/editor or a reader who has genuinely unlocked a specific NPC can open that NPC’s large portrait. Server-unverified relationship milestones cannot be used to open a locked NPC. The author-only character note is hidden from readers until a future explicitly designed reveal system.
5. Existing portrait choices remain: custom locally uploaded image, manually selected anime concept, safe packaged path, author-selected vector, preset/initials fallback. **No automatic assignment** to Ôn Tri Hành, Tô Thanh Lạc or Thẩm Cẩm Thư, all of whom are female.
6. No inventory, reward, collectible, trust, affection, currency, chapter unlock or save-schema migration is part of this UI change. Images remain same-origin.

## Verification

- Node unit test validates WebP RIFF/VP8 magic, 1920×640 source dimensions, stable asset IDs, DOM security gates and reduced-motion styles.
- Chromium smoke test exercises the large portrait view, local high-resolution atlas, 375px viewport bounds, focus and Escape, locked-reader denial and zero fake Firestore writes.
- Smoke checks are local/mock Firebase, not production security authorization or manual tests on actual Android/iOS.

## R16 — Cross-device author image storage: contract to implement later

Never claim that V15 already synchronizes uploads. A future production design should:

- Require verified Firebase Auth identity **and server-side author ownership** of the specific story before creating, replacing or deleting any image. The client is not permitted to nominate an arbitrary owner UID.
- Use a controlled Cloudflare R2 bucket with upload-token issuance, short-lived scoped upload URLs, UUID/opaque object keys, allowed MIME + verified actual image bytes, dimensions, 5 MB max, quota/retention and transactional metadata.
- Strip EXIF and transcode images server-side before public release. Generate responsive WebP/AVIF variants, separate private drafts from published illustrations, and require moderation/approval before public delivery.
- Use immutable asset IDs with owner UID/story ID/NPC ID/version metadata. Characters reference an asset ID **only after** the upload has been verified and finalized by the server; old portrait references remain valid during migrations.
- Include explicit delete/revoke controls, orphan cleanup, staged testing with two accounts, audit trail, rollback and missing-image fallback. No raw base64 photo payloads should be written into Firestore story documents.
- Preserve Sandbox-only IndexedDB uploads as independent local tests until an opt-in migration workflow is designed. Never silently upload local images to a remote bucket.

**Not approved/triggered:** `fixapp` merge, real-user rollout, R2 bucket creation, Worker deploy, Firebase data migrations.
