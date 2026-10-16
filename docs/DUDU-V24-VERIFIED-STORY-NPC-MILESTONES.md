# DUDU V24 — Server-verified story/NPC milestones → Legendary / Tri Kỷ frames

**Date:** 16 October 2026  
**Branch:** `feat/dudu-v24-verified-milestones` stacked on V23 `feat/identity-npc-editor-v2`.  
**Delivery:** staging-only source + tests; **NO merge to `fixapp`, NO Worker deploy, NO Firebase/R2 production writes.**

## 1. V23 check / inherited safety
- V23's local avatar delete flow remains intact, including explicit confirmation, local IndexedDB owner isolation, initials fallback and preservation of a valid avatar frame.
- V23's private R2 quarantined/processed photo handling remains disabled. It is an audited integration *contract*, not a production decoder, permissioned image-serving service or live multi-device photo sync.
- Known V23 blocker: finalization writes private object before metadata write, without an atomic claim/recovery strategy for concurrent delete/retry; do not enable the R2 flag. V24 does not claim to fix it.

## 2. V24 implementation
`cloudflare/src/avatar-milestone-verifier-v24.mjs` adds a **server-only, fail-closed adapter** atop the existing V19 signed webhook and V20 trusted event issuer:

1. A verified completion record must match the same Firebase UID, evidenceId, source, storyId, milestoneId and an author-approved milestone revision. Proof must explicitly be `VERIFIED_COMPLETE` / `TRUSTED_SERVER`, with a sane timestamp.
2. An independent server-owned approval record must be published, `APPROVED`, version-matched, scoped to the right frame, story and chapter, and approved **before** completion.
3. An independent UID-scoped server chapter ledger must confirm the approved chapter and completion timestamp. Browser timers, chapter text and localStorage are NOT accepted as proof.
4. **Legendary / Huyền Thoại** uses `VERIFIED_STORY_MILESTONE`; it does not accept NPC IDs.
5. **Soulbond / Tri Kỷ** requires all above *plus* approved NPC ID and minimumTrust 50–100, and an independent server-bond ledger with a verified relationship stage and trust meeting the approved threshold. Existing Sandbox affection/trust levels are not read as authoritative data.
6. Successful verification produces only a V20-compatible evidence object for a server-only HMAC event. The existing V19 webhook verifies the signature and its UID-scoped Durable Object handles idempotent frame-award writes. This module itself does not grant anything.

**Crucial dependency:** `loadCompletion`, `loadApproval`, `loadChapterProof`, `loadBondProof` MUST be trusted server adapters backed by independently authenticated, access-controlled databases. They are **not yet implemented or wired into a live trusted producer**. An HMAC by itself does not prove gameplay occurred, and a client-controlled callback would invalidate the design. No browser route exposes or imports the verifier.

## 3. Existing NPC save is preserved
- Old affinity, trust, dialogue memory, relationships, unlocked NPC IDs, stories and money are not modified or reset.
- High old affinity (e.g. 99) is retained as gameplay progress but **does not automatically issue** a locked Tri Kỷ frame. Only future validated server evidence can award it.
- NPC author milestone drafts from R7 remain `verified:false` in Sandbox until a reviewed backend exists. No draft milestone becomes approved merely because it was saved locally.

## 4. Automated acceptance (mock-ledger tests)
`cloudflare/tests/avatar-milestone-verifier-v24.test.mjs` covers:
- Story and NPC frame evidence creation, successful V19 HMAC verification, exact UID/scopes.
- Rejection of client-claimed progress, wrong UID/NPC/story, changed approval revision, draft/unpublished milestones, fake chapter timer, missing/below-threshold bond proof and inconsistent times.
- Offline reader failure and missing trusted adapter; old local affinity remains untouched.
- Regression that Worker imports no V24 issuer, award feature flags stay OFF and V23 private photo lifecycle stays private.

Run:
```sh
npm test --prefix cloudflare
npm run build --prefix cloudflare
```
Tests use mock data and do not prove a real trusted story/NPC database, secure approval workflows, external callers, Firestore auth rules or a real production rollout.

## 5. Remaining before enabling V24
1. Build and audit **server-written** story chapter completion and NPC relationship event ledgers. Ensure Firebase UID is verified, ownership and approval revisions are enforced, concurrency/rate limits and replay are audited.
2. Implement approved author milestone publishing/revocation with immutable version snapshots and independent server checks. Sandbox drafts are not an approved source.
3. Wire these four server-trusted readers into an isolated issuer job; protect and rotate the HMAC secret and verify origin/authentication beyond an absent Origin header. Add idempotent event scheduling and recovery.
4. Conduct end-to-end real staging tests using **two distinct Firebase accounts**, negative spoof/replay and rollback tests, and verify UI award read/save rules.
5. After explicit approval, consider enablement on controlled staging **only**; retain `AVATAR_AWARDS_ENABLED=false`, `AVATAR_AWARD_ISSUER_ENABLED=false`, `PLAYER_AVATAR_SYNC_ENABLED=false`, `AVATAR_R2_ENABLED=false` until then.

**Result:** V24 includes a concrete verifier and regression tests, not a fabricated achievement system or a live rare-frame unlock.
