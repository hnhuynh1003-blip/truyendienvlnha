# DUDU Studio — Security checkpoint before NPC relationship V2
**15/10/2026 — branch-only: `feat/identity-npc-editor-v2`. DO NOT merge `fixapp` or deploy automatically.**

## What staging testing actually confirmed
The owner manually confirmed author vs reader access, an empty reader museum, persistence after relogin, release != ownership, and a duplicate grant of an F-rank story test collectible being recorded only once. These are valuable smoke tests, not a full security review or proof that client-edited economy is safe.

## High-priority issue fixed in the *GitHub branch only*
Previously, `POST /v1/collectibles/admin/grant` authenticated a Firebase `admin:true` caller, but accepted an arbitrary recipient `uid` in the JSON body. The UI self-test used its own UID, but callers with admin credentials could send other UIDs or attempt to award other eligible published `STORY_EVENT` collectibles.

The **updated Worker source**:
1. Derives the recipient exclusively from `verifyFirebaseIdToken(req).uid` and rejects a supplied *different* UID (accepting a matching legacy UID for backwards compatibility).
2. Performs the test eligibility validation **inside the Durable Object transaction**, with published release data held in SQLite. Only `rank=F`, `method=STORY_EVENT`, `chapter_id IS NULL`, `disabled=0`, and name containing **“kiểm thử”** are eligible. No real/rare/chapter collectible can be self-granted.
3. Browser client no longer includes recipient UID. It blocks authentication switches while obtaining the token.
4. CORS for locally hosted UI is restricted to `http://localhost:5500` and `http://127.0.0.1:5500`, besides the explicitly configured GitHub Pages origin. CORS is not a substitute for Firebase JWT authentication.
5. Keeps `AI_ENABLED=false`, `COLLECTIBLE_SELF_CLAIM_ENABLED=false` and current item ownership rows unchanged.

Tests: `cloudflare/tests/collectibles-config.test.mjs`, `cloudflare/tests/collectible-rules.test.mjs` and `tests/collectibles-selfgrant.test.cjs`, in addition to existing browser, authorization and catalog smoke suites.

## Deployment warning / current live status
These code changes have **NOT** been deployed to `dudu-ai-staging.dudu-studio-ai.workers.dev`. The currently deployed Worker still uses its older `/admin/grant` implementation until explicitly replaced. The user's local Wrangler config was previously changed to `COLLECTIBLES_ENABLED=true`; the **GitHub copy** intentionally remains `COLLECTIBLES_ENABLED=false` to fail closed on accidental deployment.

Because backend and frontend contracts evolved together, **update the Worker first**, after owner approval and review of staging settings, and then the localhost frontend. Before any deployment, verify `AI_ENABLED=false`, `COLLECTIBLE_SELF_CLAIM_ENABLED=false`; choose `COLLECTIBLES_ENABLED` intentionally, do not copy stale `wrangler.toml` blindly. Keep a stable rollback procedure (flip `COLLECTIBLES_ENABLED=false`), confirm `/health`, auth, /mine and a duplicate F test. No production GitHub Pages deployment needed.

## Security risks that remain open
- `profiles_v2/{uid}` lets its owner update XP, xu, inventory, affinity, quests, and progress: **client-authoritative economy remains spoofable**. Do not represent such client state as trustworthy currency/market/exclusive gift entitlement; redesign Firestore rules and backend transactions first.
- The chapter `begin/claim` timer is not proof of reading; **self-claim must stay disabled**.
- Cloudflare Free has quotas/cost limits: the authenticated `/mine` and author editing routes do not yet have an explicit per-UID rate-limit. Add abuse protection + monitoring before opening widely.
- The Firebase admin custom claim authorizes administrative actions. Do not share an admin session or token, and do not put it into screenshots, files or chat.
- Secret `private_drafts` are admin-only, but older `novel.specialItems` in the public Firestore library can expose spoilers. Audit before public release; an archived public story item may remain accessible from backups/caches.
- For future award-to-reader workflows, create a **separate, audited event service** with verified recipient and evidence. Do not turn the self-test route into a general reward-minting API.
- NPC memory/gift logs are scoped locally per UID and story, but are **not cryptographically trusted facts**. AI narrative output should never mint currency, gifts or relationship rewards.

## Release gate
No merge until server-side economy, spoiler review, rate protection, end-to-end staging checks and rollback are reviewed. Test accounts and published collectibles are retained; this patch does not delete any real user data.
