# Sandbox testA/testB discussion

Open the application with `?sandbox=1`, then open a story cover or chapter. The shared Sandbox board provides explicit fictional roles testA, testB and AUTHOR. These roles are independent of profile login and require no Firebase identity or Worker activation. The phone no longer exposes the live Pilot login panel.

One dedicated localStorage key, `dudu-sandbox-shared-discussion-v1`, contains comments, replies, recipient notifications and reports. Story-level discussion (chapterId null) and each chapter are separate scopes. Switching roles preserves this ledger; it never copies private journals or modifies profile storage. AUTHOR can inspect simulated reports; they are not delivered to a real moderator. Notifications represent replies to another role's root comment.

Reload preserves data. Same-origin tabs receive storage events and refresh visible boards. This is a local simulation: different devices, browsers, browser profiles, private windows and origins (including different localhost ports) do not share data. Concurrent tab writes are best-effort read/modify/write and may overwrite one another; this is not a transactional multi-user service. Use sequential role switching for reliable tests. Clearing browser storage removes the ledger. Storage errors are shown without applying an in-memory write.

The ordinary application path does not render or access this ledger. No Firebase/Cloudflare configuration or deployment is needed. Pushing main runs smoke and browser tests; the staging deployment workflow remains manual and must not be invoked for this feature.
