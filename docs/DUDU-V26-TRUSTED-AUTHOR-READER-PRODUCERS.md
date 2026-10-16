# DUDU V26 — Author/reader validated milestone receipt producers (Sandbox backend contract)

**Date:** 16 October 2026  
**Branch:** `feat/dudu-v26-verified-producers` stacked on V25.  
**Delivery state:** isolated Draft PR, server-only module and mock-backend tests. **No merge, deploy, Firebase staging write, R2 setup, live award or new public endpoint**.

## Scope and why
V25 stores receipts in a server ledger but left the receipt producer as an external dependency. V26 implements a private producer that **derives reader identity from an independent authentication service**, checks author/story ownership, published chapters, approved NPC milestone scope and independently held story/NPC evidence before signing a V25 receipt. Its methods are backend capabilities, NOT browser operations.

- `cloudflare/src/milestone-producer-v26.mjs` — `V26TrustedMilestoneProducer`
- `cloudflare/tests/milestone-producer-v26.test.mjs` — Node SQLite integration tests across two mock Firebase identities plus admin/reader rejection cases.
- `cloudflare/src/milestone-ledger-v25.mjs` — internal `getApprovalHead` for immutable revision enforcement, including revoked heads.
- CI trigger extended to test stacked V26 PRs against V25.

## Trusted adapter contracts
The constructor needs *all* six backend source methods. Each must read authoritative, access-controlled backend data, not the client-provided request body. The test adapter intentionally mocks them; **not a real Firebase session or a real read-completion service**.

| Adapter | Trusted responsibility |
| --- | --- |
| `authenticate(credential)` | Verify real Firebase ID token server-side, project/issuer/signature/expiration, return UID/admin from trusted claims only |
| `getStory(storyId)` | Return published story and authoritative ownerUid |
| `getChapter(storyId,chapterId)` | Ensure published chapter belongs to the specified published story |
| `getNpc(storyId,npcId)` | Ensure active NPC belongs to that story |
| `getChapterEvidence({uid,storyId,chapterId})` | Return stored proof from independent, audited chapter-completion service only |
| `getBondEvidence({uid,storyId,npcId,milestoneId})` | Return server-verified NPC relationship proof only; no local affection or browser roleplay data |

**Security boundary:** A browser session can ask to perform an operation **only after a separate, audited gateway is deployed**; the browser must never select the recipient UID, supply `admin` in JSON, send a proof object, or obtain any producer secret. V26 does not add such a gateway. The `credential` parameter is passed only to the trusted server authentication adapter; the producer does not accept a raw `{uid,admin}` principal.

## Receipt generation & rules
1. **Author publish:** Verified `admin===true` **and** ownerUid equals the verified actor. Story and chapter must be published; a Tri Kỷ approval must reference an active NPC of that story. A Legend approval must not reference an NPC. Check `expectedRevision` against V25's immutable approval head; sign `APPROVAL_PUBLISHED`.
2. **Author revoke:** Same author rights, exact expected revision and active approval. Sign `APPROVAL_REVOKED`; V25 records next immutable revision.
3. **Chapter verified:** Use the verified reader's UID (never browser-supplied UID); require an independently recorded `STORY_READ_SERVICE` chapter-completion record for that exact UID/story/chapter and a valid server timestamp before signing `CHAPTER_VERIFIED`.
4. **NPC bond verified:** Get approved V25 milestone and exact NPC; require independently recorded `NPC_RELATIONSHIP_SERVICE` evidence for same UID/story/NPC/milestone, trust threshold and date before signing `BOND_VERIFIED`.
5. **Milestone completion:** Read already-signed V25 chapter/bond proofs from the server ledger. Only if exact approved revision and all prerequisites are present, sign `MILESTONE_COMPLETED`. V24 then rechecks independently before V19 can issue a server-authorized frame event.

**Important:** These contracts only enforce trusted-service provenance. Evidence of *human attention or comprehension* cannot be inferred from browser dwell-time or clicks. Real anti-farm design, content visibility and reward policy require product/security review.

## Two-account acceptance in mock staging
- Author token `author_v26` can approve only a story it owns; ordinary reader, forged token and unrelated admin cannot.
- Reader A's chapter and Legend proof cannot be used by Reader B; completion cannot choose a recipient UID.
- Reader B earns a Tri Kỷ proof only with a matching approved NPC, independent private chapter and NPC trust record.
- Different story/NPC, wrong revision, browser-origin affection/timers, stale/stolen authorization, payload tampering and absent trusted source fail closed.
- Revocations invalidate further issuance without overwriting earlier ledger audit rows or changing existing save. Already granted permanent frames are not revoked automatically.

## Keep disabled
- No V26 imports in public `cloudflare/src/index.mjs`; no V26 public route and no persisted production write.
- `AVATAR_AWARDS_ENABLED=false`, `AVATAR_AWARD_ISSUER_ENABLED=false`, `PLAYER_AVATAR_SYNC_ENABLED=false`, `AVATAR_R2_ENABLED=false`.
- No trusted producers are connected to actual Firebase Auth / Firestore data or the staging Durable Object.
- Do not expose server keys in source code, Wrangler public vars, Firebase hosting or client JS.

## Release blockers
1. Implement/test real `authenticate` Firebase credential validation plus token revocation policy, project/issuer binding, approved admin claim and authoritative story ownership rules.
2. Build separate restricted server writers for actual published chapter-read events and NPC relationship transitions; verify anti-farming, idempotency, expiry/retractions and privacy.
3. Deploy a private V25 Durable Object with controlled service-to-service ingress/egress and secret storage, and audit caller permissions and costs. No public signing or direct receipt ingestion from browsers.
4. Run end-to-end tests using **two separate real Firebase accounts**, including sign-out, account switch, cross-account spoof, multiple devices, legacy saves and Android/iOS browser. The existing tests are **mock sessions** only.
5. Manual review of migration, backup, rollback, data retention/erasure, award revocations, release/merge/deploy before any feature flag is enabled.

## Validate code (not deployment)
```sh
npm test --prefix cloudflare
npm run build --prefix cloudflare
```

The latter is a Wrangler **dry-run**, not live Cloudflare publication. Both V25 and V26 modules are deliberately unimported by the public Worker.

**Result:** V26 adds the audited-integration-ready receipt producer **boundary and tests**; genuine Firebase/staging end-to-end verification is still a separate task and not claimed as complete.
