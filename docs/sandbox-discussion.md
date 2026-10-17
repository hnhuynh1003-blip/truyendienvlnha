# Sandbox testA/testB discussion

Open the application with `?sandbox=1`, then open a story cover or chapter. The shared Sandbox board provides explicit fictional roles testA, testB and AUTHOR. These roles are independent of profile login and require no Firebase identity or Worker activation. The phone no longer exposes the live Pilot login panel.

One dedicated localStorage key, `dudu-sandbox-shared-discussion-v1`, contains comments, replies, recipient notifications and reports. Story-level discussion (chapterId null) and each chapter are separate scopes. Switching roles preserves this ledger; it never copies private journals or modifies profile storage. AUTHOR can inspect simulated reports; they are not delivered to a real moderator. Notifications represent replies to another role's root comment.

Reload preserves data. Same-origin tabs receive storage events and refresh visible boards. This is a local simulation: different devices, browsers, browser profiles, private windows and origins (including different localhost ports) do not share data. Concurrent tab writes are best-effort read/modify/write and may overwrite one another; this is not a transactional multi-user service. Use sequential role switching for reliable tests. Clearing browser storage removes the ledger. Storage errors are shown without applying an in-memory write.

The ordinary application path does not render or access this ledger. No Firebase/Cloudflare configuration or deployment is needed. Pushing main runs smoke and browser tests; the staging deployment workflow remains manual and must not be invoked for this feature.

## V46 moderation and reliability (fictional only)

- Select `AUTHOR` in the Sandbox board to inspect simulated reports, **hide** a comment, or **restore** it. Hiding a root also hides its direct replies from testA/testB. AUTHOR can still view all saved comments. Reports and moderation are **not real privileged backend operations**.
- Each reply notification now displays the replying role, excerpt and local timestamp, with per-role read state. Older V45 notifications remain readable; missing timestamps are displayed as legacy entries.
- New posts are capped at **30 per fictional role per UTC day**, require **6 seconds** between posts by the same role, and reject equivalent text from that role in the same story/chapter within **10 minutes**. An identical requestId remains idempotent even within these windows. Older V45 posts without timestamps remain visible and are not retroactively counted toward the cap.
- The **Đặt lại bình luận Sandbox** control is available only to fictional AUTHOR and asks for confirmation. It deletes **only** `dudu-sandbox-shared-discussion-v1`; it never touches user profile, private journals, coin balance, inventory, Firebase or Worker data.
- Script URLs are versioned `v=46-1` to prevent stale caches. Scoped mobile stylesheet: `css/sandbox-discussion-v46.css`.
- Model unit coverage: `node --test tests/sandbox-discussion*.test.cjs`; browser coverage: `node --test tests/browser-sandbox-discussion.cjs` (requires Playwright Chromium). The automated CI checks both.

**Limitations:** Author privileges, rate limits and reports here are deliberately *local simulations*: users can freely switch roles or manipulate browser storage. No cross-device sync, server transaction, actual account authentication, real moderation, or production safety enforcement is implied. Real-world deployment requires independent server-side identity, quotas, audit logs and moderation controls.
