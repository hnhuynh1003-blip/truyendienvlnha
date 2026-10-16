# DUDU Multiverse V28 R5 — Asset + Cyber Phone Sandbox

**Branch:** `feat/dudu-v28-multiverse-art-sandbox-r5` (stacked on V27 R4).  
**Production `fixapp` remains unchanged.** No Firebase migration, no forced NPC creation.

## What works in code
- **Cyber Phone → Cài Đặt → Hình nền:** personal mode or automatic-by-story mode. World assets: `xianxia`, `modern`, `cyberpunk`, `gothic`.
- Switches only with author-provided `story.worldArtId` (when set) or known genre/category/tags. Unknown genres fall back to the user's personal wallpaper. Settings are **per-device/per-account localStorage**, not Firestore.
- **NPC author editor:** six V01–V06 portraits exposed as a visual gallery, selecting a photo fills existing `portraitPath`. Clicking an unloaded/missing file is disabled. User must explicitly save the NPC; old saved NPC IDs never change.
- Existing Liên Lạc / Nhân Vật viewer uses the same `portraitPath`, subject to existing author/unlock checks. `assets/npc/*.webp` matches R7 allowlist.
- Cancelling local NPC uploads during an async IndexedDB write no longer leaves an orphaned file in the cancelled owner's album.

## Important: binary assets are NOT in this GitHub PR
The repository connector can write UTF-8 source files but cannot ingest the binary WebP files created in this conversation directly. This draft PR contains the front-end integration **only**. Until the 16 WebP files are copied into the repository, world wallpapers fall back to CSS colors and NPC picker entries display **Chưa cài ảnh**.

Download `DUDU_V28_R5_NPC_WALLPAPER_ASSETS.zip` from the conversation. It contains **16 WebP assets**, `manifest.v28.json`, `asset-integrity.json`. Unzip at the root of a local checkout of this R5 feature branch, preserving the directories:
- `assets/npc/v28-v01-noir.webp` through `assets/npc/v28-v06-violin.webp`
- `assets/npc/v28-v01-noir-avatar.webp` through `assets/npc/v28-v06-violin-avatar.webp`
- `assets/wallpapers/worlds/xianxia.webp` etc.

After adding files to the local Git checkout, verify the 16 pictures before committing:
```powershell
git switch feat/dudu-v28-multiverse-art-sandbox-r5
# Unzip the asset pack into this folder, keeping its assets/ paths.
git add assets/npc assets/wallpapers/worlds
git commit -m "Add DUDU V28 NPC portrait and world wallpaper image assets"
git push origin feat/dudu-v28-multiverse-art-sandbox-r5
```
**Do not merge until image files are present, QA passes and production data/backups are reviewed.**

For a no-Git preview, download the **DUDU_V28_R5_CYBERPHONE_DEMO.zip**, unzip, and open its `index.html`. This is an offline independent demonstration, not the full Firebase website.

## Boundaries
- Pack image IDs **V01–V06 are ART IDs** only, never automatically copied into story/NPC canonical IDs.
- Four world wallpaper IDs are UI genres, not cross-story data scopes.
- Local wallpaper choice does not modify account currencies or story progress.
- New photo resources are generated illustration assets. Reader avatar upload/cross-device sync remains a separate feature.
- Testing on iOS Safari and actual phones should be done before promoting to `fixapp`.

## Release checklist
- [ ] Upload the 16 WebP assets into this R5 branch, verify all return HTTP 200
- [ ] GitHub Actions Node, Cloudflare and Chromium tests pass
- [ ] In Sandbox open Settings: personal, world, story without genre fallback
- [ ] Test reader cannot change locked NPC portraits; author can attach and save image
- [ ] Test switching account and story does not leak settings or NPC portraits
- [ ] Test 320/375/390px and Safari iOS, scrollbar, portrait load/fallback
- [ ] Backup Firestore/novels and audit stacked PRs before merging
