# DUDU V44.2 — Discussion UI, threaded comments and moderation prototype

**Release target:** Sandbox GitHub Pages (`?sandbox=1&v=44-2`).
**Explicit status:** An account-local demonstration of story/chapter comments, **not public shared UGC**. The current GitHub repository includes only **review-only** Firestore rules (`security/firestore.rules.review`); no verified cross-account comment storage, public moderation endpoint or trusted author-recipient registry is deployed. No Cloudflare Worker deployment or live Firestore rules change is made here.

## Implemented

- A small **collapsed** discussion section after the chapter index on a story cover, and after the reading content on each chapter. Hiding by default avoids pushing the story content off small screens.
- Reader/Sandbox-specific comments by permanent storyId and optional chapterId. Reading chapter A never shows comments from chapter B; story-level comments stay separate.
- Posting 2–600 characters, 45-second cooldown per user, 20 posts per local calendar day, 220 local comments max. Content rendered only through `textContent`, no arbitrary HTML.
- One-level replies; rejects unknown reply parents and cross-story/chapter replies; local in-app reply notifications keyed to the parent author's ID, manually marked read.
- Report menu (spam, harassment, spoilers, other), local-only reporter identity, one report per user/comment, own-comment reporting prohibited.
- Own-comment *hide in personal view*, **not global moderation/delete**. Reports do **not** reach a moderator, and notification badges do **not** go to other accounts.
- A visible **🎁 Đính kèm quà** button remains disabled, with tooltip explaining the requirement for authenticated inventory, escrow and author inbox in V44.3. No currency/inventory/NPC affinity is deducted, no Firestore writes.
- Author/commenter display names are untrusted UI strings and never confer staff authority. No false "public" or "delivered" status.
- Account-scoped new Sandbox profile field `commentsV442`; older saves and all quests, items, drops, gifts, role data, and author story metadata untouched. Browser-local profile persistence stays in the existing save pipeline.

## Security and launch blockers — before calling these comments public

1. Deploy server-backed, authenticated comment storage with immutable Firebase UID, verified published story/chapter mapping (not submitted from browser) and rate limits/captcha as appropriate; secure revisions, deletion, cursor pagination.
2. Store reports in a moderation inbox available **only to trusted reviewers**. Content cannot become public without spam/moderation controls; use trusted author bindings for author notification access, not the UI's author name or role switch.
3. Server-side policy for edits/deletions, blocked users, retention and appeals. Avoid collecting emails/PII in comments.
4. Server-generated notification inbox for distinct authenticated UIDs, opt-out and read receipts (no false in-browser delivery).
5. Atomic verified item escrow linking commentId and giftReceiptId with exactly-once settlement, refund and author receipt — reserved for V44.3.
6. Real multi-account tests across devices; do not promote `commentsV442` local records to public server comments without explicit user's action and a migration policy.

## Tests

- Unit tests for story/chapter scope isolation, reply ancestry, rate limits, note bounds, duplicate submit, gift-transfer rejection, report deduplication/ownership, local notifications/read flags, legacy save compatibility and safe DOM rendering.
- Chromium Sandbox smoke on both story cover and chapter reader: closed by default, post sample, scope isolation, gift button disabled, 0 Firestore writes.
- Unchanged Cloudflare Worker deployment gates, verified collectibles and author ownership constraints. Auction deferred.

**Later V44.2 public rollout** requires source of truth for story/chapter IDs and backend + auth deployment. Continue only after those have been verified; do not present Sandbox comments as other readers' messages.
