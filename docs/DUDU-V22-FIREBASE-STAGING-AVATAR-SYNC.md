# DUDU V22 — Staging-ready Firebase avatar preference synchronization

**Date:** 16 October 2026
**PR:** #1 Draft, branch `feat/identity-npc-editor-v2` targeting `fixapp`; **no merge or deployment.**

## Implemented

V22 integrates the V17 signed-token preference client and V20 conflict planner into the existing V16 Cyber Phone avatar editor, without activating remote storage automatically.

- Open the branch in `?sandbox=1&avatarSync=staging` to reveal a separate **Firebase staging sync** section. Normal Sandbox (`?sandbox=1`) and the live reader site do not display remote sync controls.
- A user must explicitly click **Xác thực Google**, then **Đọc staging**. A real Firebase SDK session provides an ID token; the browser never uses the local nickname as proof of ownership. Before any read/save, the UID from `firebase.auth().currentUser` must match the current Sandbox profile key *exactly*. No silent relinking of existing local test accounts.
- Firebase ID token is sent only to the hardcoded staging Worker origin `https://dudu-ai-staging.dudu-studio-ai.workers.dev` over HTTPS. The Worker independently verifies the JWT and derives the per-UID Durable Object name. Neither a recipient UID nor an image/photo payload is included in requests.
- Once a staging read succeeds, the UI compares the **real verified server snapshot** with the current profile and displays the server revision. Both directions need a **separate explicit click**: “giữ avatar thiết bị” performs a server metadata write using the read revision; “dùng avatar máy chủ” updates only the currently matching UID's sandbox-local playerAvatar data.
- **Conflicts (HTTP 409) stop immediately**; users must explicitly read staging again and rechoose. Different Firebase UID, local profile modified since inspection, closing the editor or an account switch invalidate prior plans.
- Self-uploaded pictures and non-basic reward frames **cannot be transferred or overwritten** through this pipeline. Photos remain isolated in local IndexedDB; staged metadata consists only of kind, presetId and freely selectable frameId.
- Previously existing V21 mock comparison stays clearly labeled *mô phỏng* and remains available for offline UI demonstration. V22 is a separate section with entirely distinct labeling; avoid confusing fake demo revisions and real staging revisions.

## Important activation limits

The current `cloudflare/wrangler.toml` explicitly sets `PLAYER_AVATAR_SYNC_ENABLED = "false"` and the Worker has **not been deployed with these features**. Clicking “Đọc staging” while the server stays disabled should report an unavailable/disabled status and leave the avatar untouched. V22's browser UI is only available after passing the explicit Sandbox query flag and real Firebase sign-in; **do not describe it as live cross-device synchronization**.

Before enabling synchronization, an authorized operator must review and deploy the separate Worker release onto a controlled staging environment, verify `ALLOWED_ORIGIN`, JWT test accounts and audit/quota/rollback. User approval is required for any merge/deploy.

## Verification

- Node tests: two clients sharing a mock revision store; explicit read/save, read-only application, 409 conflict, no automatic retries, local photo protection, mismatched UID, invalidated account and unchanged old profile.
- Chromium: actual V16 avatar UI, stage-specific control visibility, mocked Firebase authenticated user, staged server read, both confirmation buttons, version conflict, photo protection, UID mismatch and zero fake Firestore writes.
- Existing Cloudflare Worker, security tests, item/NPC/browser regressions still run.
- Tests use fake sessions/mocked backend; they **do not** substitute for testing with two real Firebase UIDs on a deployed staging Worker.

## Remaining release steps

1. Confirm staging Worker deployment and enable only `PLAYER_AVATAR_SYNC_ENABLED` after verification. Keep award and R2 flags disabled.
2. Run two real Firebase account/device acceptance tests, include 409, expired tokens, sign-out, same-UID multi-device conflicts and browser reload.
3. Support normal authenticated reader profiles only after Sandbox staging passes; UI V16 is currently Sandbox-only and must not be silently exposed on live pages.
4. Keep R2 photo sync and rare reward-frame entitlements blocked until an independent, audited server process is ready.

**No merge, no Cloudflare deploy, no image upload, no production data write in this commit.**
