# DUDU — Story dates + NPC portrait library (Sandbox QA)
Date: 2026-10-15. Branch: `feat/identity-npc-editor-v2`. Do NOT merge/deploy without separate release approval.

## Correct story dates
- Bug: `getNovelLatestDate` read the **last listed chapter** date and ignored a newer story update, while Firestore hydration silently filled every missing timestamp with `2026-10-09`.
- Fix: `DuduStoryDates.latest` selects the latest **valid existing** created/updated YYYY-MM-DD across the story and **every** chapter. Missing records stay unknown (shown as `Chưa có ngày`); do not rewrite historical timestamps.
- Story/chapter new changes use the **Asia/Ho_Chi_Minh calendar day** so midnight UTC does not cause yesterday's date to display for Vietnamese readers.
- Old demo novel and demo chapter genuinely contain `2026-10-09` as original seed metadata: these historical entries are intentionally preserved. A real newer update wins.
- Until a tested branch is released, readers on the current deployed site will still see old behavior.

## Portrait gallery: NOT LIMITED TO THREE NPCS
- There are currently **24 distinct female vector prototype portraits** with personality/mood labels, shown in the Sandbox NPC character editor. They are deliberately lightweight illustrative thumbnails, **not completed anime paintings or approved canon art**.
- Author may assign a portrait to **any existing or future** NPC; it does not create/unlock/reward an NPC.
- User confirms Ôn Tri Hành, Tô Thanh Lạc and Thẩm Cẩm Thư are **female**. Their sandbox default illustrations and preview metadata reflect this even for the original seed character IDs `c2/c4/c3`, as well as sample IDs `c_otk/c_ttl/c_tct`.
- Author can upload JPEG / PNG / WebP up to 5 MB. Browser crops/resizes to 256x256 JPEG; max stored data URL length 180000; the binary is stored only in local **IndexedDB**, namespaced to sandbox username + story + upload ID. Public story characters store only a reference ID; other sandbox users cannot load the original binary from a different identity scope.
- Portrait render priority: chosen uploaded file (if available on this browser), allowed packaged image path (`assets/npc/`), chosen gallery prototype, otherwise sandbox preset/fallback initials.
- Gallery and uploads are strictly **Sandbox-only**, not connected to Firebase Storage, Cloudflare R2, production accounts or shared moderation. Thus custom uploaded images will **not sync across devices** and can disappear if browser local data is cleared.

## Production follow-up
- Curate/approve real high-quality character paintings and rights/licenses, organized by gender, age presentation, art style, personality and world. Expand thumbnail library beyond the initial 24 female prototype variants.
- Build authenticated upload with storage quotas, allowed MIME/type and actual file signature validation, moderation/abuse controls, deduplication, thumbnails, signed URLs or controlled public access, deletion and author-role enforcement. Never store base64 images inside Firestore novel documents.
- Manually verify VN timezone across devices; maintain immutable original creation date when available, and separate latest update date.
- Existing CI tests mock Firebase and use sandbox/local stores; they are not live-server security verification.
