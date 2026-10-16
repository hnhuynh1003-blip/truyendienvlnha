# DUDU V19 — Signed server evidence and private R2 image quarantine

**Date:** 15 October 2026  
**Branch:** `feat/identity-npc-editor-v2` (Draft PR). **Do not merge/deploy or enable flags without a separate owner-reviewed release.**

## 1. Server-issued frame proofs

- New internal route `POST /v1/internal/frame-evidence`, **not** exposed as a browser UI action or a self-award claim. The endpoint is disabled unless **both** `AVATAR_AWARD_ISSUER_ENABLED=true` and `AVATAR_AWARDS_ENABLED=true`. Both are currently `false`.
- Request raw JSON is authenticated with an HMAC-SHA256 signature using `AVATAR_EVENT_HMAC_SECRET` (never stored in GitHub/JS), a 13-digit signed timestamp, an exact-size body cap (2 KiB) and a 5-minute request-time window. The event body is authenticated byte-for-byte. Browser requests with an `Origin` header are rejected; this is an additional boundary, not the actual authentication.
- The signed event schema: `{uid,frameId,source,evidenceId,eventId,occurredAt}`. Only `legend` / `VERIFIED_STORY_MILESTONE` or `soulbond` / `VERIFIED_NPC_BOND` are accepted. Fields, lengths, IDs and timestamps are strictly validated. A verified signer, rather than a client-supplied Firebase profile claim, nominates the beneficiary.
- Each verified beneficiary's Durable Object owns `award_events` (replay IDs) and `frame_awards` (unique frame and server evidence), written in **one SQLite transaction**. Duplicate calls do not add repeated awards or change previously stored proof. Server-bound `appearanceFrames` still reads only this ledger.
- **Crucial qualification:** an HMAC validates *which server sent the event*; it does not independently establish that the user finished a story milestone or reached the NPC relationship milestone. **No trusted story/NPC issuer is wired up or approved**, so no genuine events can be delivered. These special frames remain **unavailable to users**. A future trustworthy producer must derive completion from its own authoritative, tamper-resistant data, issue a unique event ID and protect/rotate its secret.

## 2. Private R2 photo drafts

- New staging-only, **disabled** `POST /v1/avatar-drafts/upload` and `POST /v1/avatar-drafts/delete`, both protected by Firebase JWT. `AVATAR_R2_ENABLED=false`, and `DUDU_AVATAR_PRIVATE_BUCKET` is **not bound or created**. No live cloud storage or traffic resulted from this PR.
- Upload accepts at most **5 MiB** of JPEG, PNG or WebP; streamed input is capped and checked using the V18 header policy. Image dimensions are preflight validated. The filename and owner are **never** taken from form fields: Firebase-verified UID plus server-generated UUIDv4 derive the key `drafts/players/<verifiedUid>/<opaqueId>.bin`.
- Each user's private Durable Object reserves a slot transactionally; cap is **3 active draft objects**, with stale pending records purged after ten minutes. The private object is stored as `application/octet-stream`, `state=QUARANTINED`, and must never be served to browsers directly. The API returns only an opaque asset ID and `publishable:false` — not R2 keys, public URLs or signed download links.
- Delete requires the same verified UID, UUIDv4 and an existing **QUARANTINED** draft owned in that person's Durable Object. It removes that exact private R2 object before removing the ledger row.
- **NOT ready for public use:** Header checks are only preflight. These raw objects may have EXIF, malformed payloads or unwanted content. A secure decoder/transcoder, metadata stripping, actual decode, moderation/review, cleanup job for abandoned uploads, byte-usage accounting, anti-abuse rate limits, real-R2 staging tests and owner approval are mandatory. There is intentionally **no GET**, finalize/publish route or ability to select quarantined images as profile avatars.

## 3. Compatibility, tests and release boundary

- Cloudflare Node tests cover verified HMAC vs tampering, strict event scope/time/size, feature gates, private R2 mock bucket writes, max-three quota, deletion/account isolation, corrupt or over-limit image headers, and absent public read endpoints.
- Browser smoke tests ensure the existing NPC, Cyber Phone and V16 player-avatar functionality are unchanged. They do not establish production security or real-device quality.
- The avatar stored in Sandbox/IndexedDB remains local and is **not** uploaded remotely. No changes to old save/profile, NPC identity, kỷ vật ownership, currency or reader rights. V17's existing metadata sync flag also remains OFF.
- Feature flags in `cloudflare/wrangler.toml`: `PLAYER_AVATAR_SYNC_ENABLED=false`, `AVATAR_AWARDS_ENABLED=false`, `AVATAR_AWARD_ISSUER_ENABLED=false`, `AVATAR_R2_ENABLED=false`. No `r2_buckets` binding; no new Firebase or R2 credentials in source code.

## 4. Future work (separate release decisions)

1. Establish the authoritative story completion and NPC bond ledger (trusted producer), with end-to-end tests proving client actions cannot forge events.
2. Create a private, paid R2 staging bucket only after discussing access/cost limits, and run actual upload/delete/isolation tests with two separate Firebase accounts.
3. Implement image decode/normalization, EXIF removal, moderation, quotas/rate limits, garbage collection and safe finalized variants.
4. Add explicit client opt-in synchronization with conflict review, retain old avatar on failed sync, and conduct real mobile QA before any merge/deployment.

**V19 completes staging contracts and mock-backed validation only. It does not make frame rewards or cross-device avatar image synchronization live.**
