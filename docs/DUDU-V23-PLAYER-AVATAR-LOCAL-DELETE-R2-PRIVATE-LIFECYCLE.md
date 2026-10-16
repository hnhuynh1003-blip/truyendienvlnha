# DUDU V23 — Local avatar deletion and private R2 photo lifecycle

**Date:** 16 October 2026  
**Branch:** `feat/identity-npc-editor-v2`, Draft PR #1 targeting `fixapp`.  
**Deployment:** No merge, no Cloudflare deployment, no R2 bucket creation/binding, no Firebase production writes.

## Shipped in Sandbox UI

1. Added **“Xóa ảnh đã tải trên máy này”** within Cyber Phone → Cá Nhân → Đổi avatar & khung → Ảnh của tôi. The button appears only when the current draft points to a locally uploaded photo.
2. Pressing delete requires explicit confirmation. Canceling makes no change. A confirmed deletion changes the player avatar to initials (preserving a valid decorative frame) and deletes **only the photo associated with the current Sandbox username + player-avatar namespace + image ID** from IndexedDB.
3. A distinct, always-visible status explains deletion success or partial cleanup failure. If IndexedDB cleanup fails, the local avatar still safely falls back to initials rather than pointing at missing photo bytes.
4. The existing Sandbox player profile, NPC portraits, other usernames’ images and currency/relationship/story saves are not migrated or touched.
5. UI uses existing V16 styles and keeps Cyber Phone/editor keyboard behavior; no automatic R2 upload.

## Cloudflare staging code (all disabled)

- Introduced **`GET /v1/avatar-drafts/mine`** under the same disabled `AVATAR_R2_ENABLED` gate as upload/delete. On future staging, a verified Firebase ID token selects the caller's UID-scoped Durable Object. The response contains up to three **private metadata records** (asset ID, quarantined status, timestamps and whether a private sanitized variant exists), with **no image bytes, R2 key or URL**.
- Durable Object now has `photo_variants` table and `markPrivateVariant` / `listPrivatePhotoDrafts` support, keeping prepared derivatives separate from untrusted raw uploads.
- Added **`cloudflare/src/avatar-photo-finalize-v23.mjs`** as a trusted-service-only adapter. It checks the UID-scoped quarantined object, requires independently injected image decoding and EXIF stripping and approved moderation (V20), checks output dimensions/size again, then writes to a **private** `private/players/<verifiedUID>/<assetId>.webp` (or `.jpg`) key. It records existence in the per-UID ledger and returns `publishable:false`. No consumer can currently invoke it through the public Worker.
- Deleting a private quarantined draft now also deletes its processed derivative when present, then removes the owner's ledger rows. Deletion never accepts user-controlled R2 paths.
- **Feature flags remain OFF**: `PLAYER_AVATAR_SYNC_ENABLED`, `AVATAR_R2_ENABLED`, `AVATAR_AWARDS_ENABLED`, `AVATAR_AWARD_ISSUER_ENABLED`. No `r2_buckets` bindings are present. This code does **not** promise live photo synchronization.

## Tests

- Cloudflare tests: mocked R2 original and sanitized private storage, enforced MIME/processor approval, privacy of returned metadata, deletion of both versions, UID-path validation, malformed inputs and disabled deployment.
- Browser smoke: confirm/cancel avatar removal, IndexedDB deletion, save fallback, other local account isolation and zero fake Firestore writes.
- Existing V1–V22 Node, Worker and Chromium tests remain in CI. These tests do not validate a production image codec or live Cloudflare R2: the test processor is deliberately mocked.

## To try the UI now

1. Update the local VS Code checkout of branch `feat/identity-npc-editor-v2` (not `fixapp`).
2. Run Live Server on the project root's `index.html`. In VS Code, install/enable **Live Server** by Ritwick Dey; if `Go Live` is absent, right-click `index.html` and choose **Open with Live Server**.
3. Open `http://127.0.0.1:5500/index.html?sandbox=1` (adjust the port if Live Server shows a different one).
4. Open **Cyber Phone → Cá Nhân → Đổi avatar & khung → Ảnh của tôi**, upload a picture, click **Lưu avatar**. Reopen the editor, choose **Ảnh của tôi**, click the delete button, and confirm. Verify fallback to initials, preserving the selected frame.
5. Do not test R2 against a live backend yet; `/v1/avatar-drafts/mine` intentionally returns disabled/unavailable until reviewed staging configuration exists.

## Production blockers / required review

1. The current V23 processor is an **integration contract**, not a hardened image-decoding service. Do not activate it without a real audited decoder/EXIF-remover and moderation service. Basic image header checks cannot prove safety.
2. Finalization is not yet concurrency-serialized against simultaneous uploads/deletes; needs per-asset transactional claims, crash recovery, and orphan/object lifecycle cleanup to avoid stale private variants.
3. Staging needs a private R2 bucket, authorized UID tests, quotas by bytes/requests, rate limits, retention and deletion audit, plus review of storage/processing costs.
4. No secure public/private delivery endpoint for approved avatars exists, so browser use of R2 photos remains prohibited; a signed, owner-authorized read and metadata transition needs separate review.
5. Keep V22 explicit server-sync choices and browser-upload fallback. Never auto-migrate IndexedDB images without the user's deliberate consent.

**Result:** V23 adds a usable local deletion feature and mock-tested backend privacy lifecycle. Actual R2 photo synchronization and public rollout are deliberately not switched on.
