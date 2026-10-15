# DUDU — NPC V2 R5–R6 + inventory & portrait preview
**2026-10-15 · only feat/identity-npc-editor-v2 · NOT MERGED OR DEPLOYED**

## Implemented in local Sandbox
- R5: one scripted `🤝 Hỏi thăm` dialogue choice per **unlocked** NPC per UTC day, grants **+3 trust** for attentive responses or **+1 trust** for casual responses (max 100) and saves only local sandbox profile. Event IDs deduplicated, no AI/EXP/coins/collectibles; no automatic NPC unlock. No server-authoritative progression yet.
- Relationship affection ceiling: trust 0–19 → 40, 20–49 → 70, 50+ → 100; historical affection is not reduced.
- R6: local-only preview presets for the three existing NPC IDs: `c_otk`, `c_ttl`, `c_tct`. This is a **provisional gameplay test** (not canonical character lore). An author-set `giftPreferences` takes precedence. No NPC is created, rewritten or unlocked.
- Gift tags are manually assigned to catalog IDs for practical supplies, coffee, keepsakes and dangerous items. No guessing by AI text.
- Inventory: sandbox-only search, food / weapons / items filtering; filtered removal correctly refers to original inventory index. Unique DUDU collector items cannot be discarded via the legacy inventory button.
- Cyber Phone: portrait slots for player and NPC with initial-letter fallback, compact R4 panel and help. These **are placeholder visuals, not final illustrations**; user-approved art assets can later replace the fallback without modifying saved identity.

## Remaining for full production readiness
- Real **trusted server** should validate event proof/ownership and award transactions before trust, quest items or collectible bonuses have economic value.
- Chapter milestones / character story arcs need author-approved events with verifiable evidence; no script or AI chat should alone award trust or reveal unpublished lore.
- Author editing UI for preferences, actual portrait files and user profile portrait customization, proper responsive UX on real devices, more robust rewards balancing, offline retry/merge strategy are outstanding.
- Browser/Node smoke tests use mock Firebase and local sandbox. They do **not** certify backend security, production mobile behavior or cross-device sync.
- Keep staging Worker current configuration safe (AI and chapter self-claim disabled) and do not accidentally deploy local variables.
- Before any merge/deploy: full mobile accessibility review, Firestore rules review, manual 2-account checks, staged backend transactions, backups and rollback.

## Rules
- Never turn temporary R5 check-in into an authenticated server reward based solely on client localStorage.
- Never merge/deploy from this implementation task.
