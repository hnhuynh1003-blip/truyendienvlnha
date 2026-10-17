# DUDU Studio V53 — Spark Personal (single-reader priority)
This is a lean FREE-tier plan for one owner/reader. The only required cloud resources are Firebase Authentication and Firestore (within Spark limits), plus free GitHub Pages. No Cloud Functions deployment, no billing upgrade, no Storage bucket upload and no mandatory Gemini/Cloudflare inference.

## Working behavior after V53 UI deploy
- Main production site (without `?sandbox=1`) runs `DUDU_SPARK_PERSONAL_MODE`.
- Reading existing stories, profile progress and book editor retain existing behavior.
- Opening Shop, Quests or Inventory no longer pings the **undeployed** V52 economy Functions. The existing V51 catalogue/quests stays browse-only and legacy features are unchanged. There are no new server-issued Xu, rewards or ownership claims.
- NPC chat: greetings use existing `DuduNpcLite.script()`; all other texts get a conservative `DuduNpcLite.offlineReply()`. Replies are explicitly scripted, never represented as generative AI. Chat remains saved per UID/story/NPC on this device. Scripts cannot change EXP, Xu, trust, affection, or item ownership.
- DUDU system contact / local DUDU FUN remain on-device with no real-world financial or server rewards.
- EPUB import UI hides **Storage backup** (typically needs Blaze on newer Storage projects). Parsed chapter-text drafts still use Firestore and do not depend on Storage or Functions.

## One essential remaining manual step for EPUB
Existing screenshot of the live Firestore Rules only covers `studio_data/main_library`, `profiles_v2` and `user_profiles`; it does **not** permit the `epub_stories_v49` collection.
The separate V49 EPUB import therefore cannot be declared working until the rules are merged/deployed.

File `security/firestore-spark-personal-v53.rules.review` is a **reviewed draft, not a deployed rule**. Before applying:
1. Backup the currently DEPLOYED Firestore Rules in Firebase Console (including any changes since the screenshot). Keep the previous revision for rollback.
2. Confirm the signed-in author has the Firebase **custom claim `admin: true`**. A UI badge marked “Tác Giả” alone is not proof.
3. Merge only the required EPUB matches with CURRENT rules; keep existing authorization and other collections intact. Do NOT simply paste the draft if the live Rules have been modified.
4. Run emulator Rules tests, especially guest read of published metadata/chapter, guest denial for drafts, non-admin denial of author writes, admin import/publish, and private profile isolation.
5. Once published, validate with one small EPUB (2–3 chapters) before importing large books. Keep an offline copy of source EPUB. Do not upload copyrighted books without rights/permission.
6. A standard Firestore document is limited to 1 MiB; every chapter gets its own document, and the importer already enforces per-chapter size. Large libraries still consume read/write/storage quota on Spark.

## Deferred until a later stage
- Blaze migration, Firebase Functions V52 economics, cloud wallets, transactions and machine-verified gifts/quest rewards.
- Cloudflare/Gemini NPC dialogue: may have its own quotas, setup or usage costs; NOT required for offline scripted chats.
- Storage backup of the original EPUB file, cross-device chat sync, multiuser marketplace, auction and public discussion.

## Data boundaries
- Existing Google login and profile Firestore sync still work as before.
- Chat histories/local activities can be lost if browser storage is cleared or a new device is used. They are *not* server-synchronized.
- Browsing/public story metadata is Firestore-based. Separate EPUB publication does not delete or overwrite the legacy shared library.
- The production economy feature gate remains disabled; do NOT deploy Functions or enable it for this Spark-only plan.

## Before calling personal site fully ready
- Verify login, manual story/chapter save and read on live GitHub Pages.
- Apply/test EPUB Rules and verify a small complete EPUB round trip.
- Verify NPC chat for one unlocked character without network AI requests and check it persists after refresh.
- Confirm Firestore usage remains well within Spark limits, and monitor project usage periodically.
