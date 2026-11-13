# DUDU Studio — Firestore Standard/Spark review, 2026-10-30

Review-only. The owner supplied the currently deployed `(default)` Firestore Rules in chat. No production deployment or account reset has been made.

## Client path inventory and access model

| Path | Client operations | Query shape | Intended access |
| --- | --- | --- | --- |
| `studio_data/main_library` | get, admin write | single document | public reading, custom-claim admin writes |
| `profiles_v2/{uid}` | get, create, update, transaction | exact UID document | owner only; private **client-mutable** story progress, virtual Xu, Inventory, NPC, Scratch and blind box states |
| `user_profiles/{username}` | legacy get attempt only | exact username | blocked |
| `epub_stories_v49/{storyId}` | create, get, update, read queries | `where(status == published).limit(60)`; `where(ownerUid == uid).limit(60)` | public published, own drafts for custom-claim admin |
| `epub_stories_v49/{storyId}/chapters/{chapterId}` | create, get, list, transaction update | chapter collection get; exact chapter get | public published, admin-owned importing writes and guarded revisions |
| `.../chapters/{chapterId}/revisions/{revId}` | create in transaction, get, list | `orderBy(version desc).limit(20)` | owner/admin only, immutable history |
| `profiles_v2/{uid}/arcade_receipts_v1/{receiptId}` | experimental bridge | exact receipt | **not yet activated**; do not grant now |
| `economy_accounts_v52/{uid}`, `/items`, `/receipts` | pending verified economy | exact doc | owner read-only; no client mint or trading |
| `system_config/economy_v52`, unknown collections | no verified client need | n/a | deny |

## Schema and compatibility checks

- Main auth relies on Firebase Authentication UID. EPUB admin rights rely **only** on a trusted `request.auth.token.admin == true` custom claim, never a mutable profile role.
- `profiles_v2`: `username`, `name`, `title`, `role`, `level`, `exp`, `currency`, `inventory`, `quests`, `lootedChapters`, `readRewards`, `dailyReadLog`, `collectedCharacters`, `storyStates`, `playerAvatar` and optional older reading/phone fields. `storyStates` contains all active C2.3–C2.9 receipts, XP, NPC, shop, tickets and collectible history. Preserve these fields and legacy-present unknowns on update to avoid breaking existing accounts; prevent NEW unknown keys.
- `epub_stories_v49`: `id`, `title`, `author`, `genre`, `desc`, `publicationState`, `status`, `ownerUid`, `chapterCount`, `chapterIndex`, ISO strings for `createdAt`, `updatedAt`, optional `publishedAt`, import and JPEG cover metadata. `chapterCount` 1..160.
- EPUB chapters: `id`, `order`, `title`, `content`, `wordCount`, optional `editVersion`, `editedAt`, `lastRevisionId`. Content at most 420,000 bytes/chars by Firestore-side `.size()`.
- Revision: immutable previous chapter text with `id`, `chapterId`, `ownerUid`, `beforeVersion`, `version`, `createdAt`, `reason`, `title`, `content`, `wordCount`. Requires a matching chapter update in the **same transaction**.
- C2.9 Scratch and blind box only update the owner profile, so no new collection permissions are necessary.
- Web editor flags `EPUB_MANAGEMENT_L2D2_ENABLED`, `EPUB_CHAPTER_TOOLS_L2D5_ENABLED` are `false` until explicit post-deployment verification. Reset flag remains `false`.

## Risks, red-team probes and rollout gates

1. Public list of private drafts: block queries not proven to constrain `status == published`; allow only the intended 60-item public query. Check with emulator.
2. Unauthorized account reads/writes and arbitrary collection writes: deny. Check via guest and second UID.
3. User self-granting admin: restrict profile `role` and new field names, and derive EPUB admin exclusively from custom claim.
4. Invalid profile types, negative Xu, oversized title, new arbitrary fields: deny, including during update.
5. Forged EPUB owner/metadata, status jump, chapter overflow: deny with common validators and immutable fields.
6. Chapter overwrite without backup, forged backup, foreign admin edit, revision overwrite/delete: deny; transaction-linked valid update may succeed.
7. Orphan/foreign subcollection writes: require admin owner on parent book; check `exists`.
8. Arcade receipts: when local game currency is self-reported, enabling 10:1 exchange before production bridge authorization is risky. Keep its feature gate and collection permission off.
9. Published EPUB chapter confidentiality: **not a paid-chapter design**. Public chapters remain readable; must split private content before enabling paywalls.
10. Live user-document schema cannot be inspected from this unauthenticated workstation. A backup and low-stakes smoke test on real signed-in account are rollout prerequisites.

## Validation log

- Local Node suite: **145/145 tests passed** (`node --test tests/*.test.cjs`).
- Firebase Firestore Emulator (demo project `demo-dudu-standard`, zero production connections): **67/67 permission/transaction probes passed**, including denied public drafts, unbounded queries, cross-account access, role escalation, invalid fields, giant title/map, forged EPUB editing, unbacked revisions, and Arcade conversion receipts; accepted publication lifecycle, atomic chapter backup, own profile progress, C2.9 ticket/box states, inventory and reset-shaped write.
- Emulator compiled and executed `firestore.rules` successfully. `firebase deploy --dry-run` was attempted but **could not authenticate**, and was never used against the production project. Syntax/behavior is therefore evidenced by the local emulator, **not** by a live deploy.
- `index.html` UI flags for EPUB management/editor and account reset remain **false**. Rules were **not** published and no live profile was modified.
- Known boundary: the older virtual currency/profile inventory are intentionally self-editable, so these Rules do not establish anti-cheat or real-value reward authority. Published EPUB chapter text remains public.
- **Before the owner's one-time Console Publish:** save a copy of current Rules and backup one actual `profiles_v2` document, then smoke-test reading, playing, buying/selling, Scratch and blind box after publishing. If an older document has a different field type than the assumed schema, stop and adjust validation against the backup before enabling editor flags.
