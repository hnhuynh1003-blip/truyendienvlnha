# L5.4 — Từ điển tên riêng thông minh

Base: `f5dc4bda0e012afed4e76139e99a8c1682f11f30` (main, F4.2B Vạn Tượng).
Independent clone / branch: `library-l54`, `library/l54-smart-names`.

## Delivered

- **L5.4a:** Sửa tên / Dò tên / Từ điển in existing reader settings. Edit mode uses whole-word caret hit testing, optional phrase selection, −/+ one word, selection marks and Xong. Native text selection is disabled only in edit mode; touch swipes remain available. Hologram sheet uses pale frosted glass, cyan / rose borders, restrained animation and reduced-motion support. VisualViewport keeps the sheet within the keyboard viewport. Pointer-origin checks prevent Android's compatibility click from closing or activating the newly opened sheet.
- **L5.4b:** deterministic Vietnamese surname / compound surname / given-name evidence, chapter-local repetition and speech context, confirmed dictionary evidence and tentative links. Automatic display capitalization requires at least three mentions and two contextual mentions. Suspected translated words and ambiguous aliases remain suggestions. No external AI or paid API. Known rules override inferred capitalization in a single longest-match pass.
- **L5.4c:** explicit character profiles with individually preserved display aliases, per-story search, edit/delete, profile labels, on-demand categorized chapter scan, twenty in-session undo steps, validated JSON export/import with merge-conflict and wrong-story rejection. Names cannot silently move between established character profiles. Removing a rule restores original display and suppresses automatic recognition for that alias.

## Data and integration

- Uses the same `dudu-reader-names-l53:<encoded story ID>` device key and JSON array. Old rows remain readable and are not rewritten at startup. Optional `characterId` / `characterName` fields materialize only on an explicit save or link.
- Up to 300 active aliases, ordered before at most 300 `disabledAuto` markers; L5.3's existing 300-row reader can still read every active alias. If more than 300 different names have been removed, the oldest ignore marker expires. Existing readers ignore the optional metadata.
- Character grouping is explicit. Legacy rows start as separate profiles; identical display text alone does not merge people. A shared ambiguous short alias cannot be assigned two contradictory global substitutions; use full names to distinguish those characters.
- Import accepts L5.4 exports and legacy arrays. It validates the complete input before a single storage write, preserves existing entries and rejects conflicts. A backup from another story ID is rejected; use the same story record on the destination device.
- Undo is session-local; it refuses to overwrite a dictionary changed by another tab. Local storage failures leave the previous saved value intact. No automatic cloud sync or Firebase Rules changes.
- Existing shared Web/EPUB `setStory` / `bindParagraph` adapter remains in place, with one `prepareChapter(paragraphs)` call before rendering. Original paragraph strings remain in a WeakMap. Saving re-renders display paragraphs and restores the viewport anchor; it never reloads a chapter, edits an EPUB, writes bookmarks or changes rewards.
- Analysis is limited to the current chapter. Pattern plans are cached per dictionary value and chapter, and repeated occurrence indexing uses maps rather than quadratic scans. No whole-book traversal.

## Recognition limits

This is a conservative heuristic, not recovery of Chinese source names. Rare names, unfamiliar given syllables, common-word aliases and names without sufficient context need owner confirmation. A suspected mistranslation can suggest a possible character, never assert an original spelling or automatically rewrite it. A confirmed alias applies throughout that story, so ordinary single words require an explicit warning confirmation.

## Validation

1. `node --test` over reader names, reader preferences/focus/shortcuts/status, reading-return and EPUB wiring tests: 50 passed.
2. `node tests/browser-reader-names-l54.cjs`: PC + touch mobile widths 320/390/430; whole-word / phrase / range adjustment, source-to-display mapping, ordinary mode restoration, swipe scrolling, save position, chapter and story isolation, automatic capitalization, manual scans, profiles, delete / undo and backup / import passed. Keyboard behavior is tested by shrinking the visual viewport to 420px, not by opening a real Android IME.
3. `node tests/browser-library-reading-return-c443.cjs`: full Sandbox application, real floating settings, name selection/save, immutable source chapter, mobile layout, browser Back, refresh/scroll restoration, no repeated chapter EXP and no external writes passed.
4. New JavaScript and inline HTML script syntax checks, `git diff --check`, visual inspection of PC, Android sheet and full application screenshots.

Browser tests use Playwright. If bundled Chromium is unavailable, the L5.4 fixture accepts `L54_CHROME_PATH` or `L54_BROWSER_CHANNEL`; the existing regression can use the installed browser through its runner. All fixtures use fresh browser contexts. No production stories or dictionaries are modified by tests.

## Owner acceptance on real devices

1. On Android, open one EPUB and one Web story; use the lower-left floating settings → Sửa tên. Tap a two/three-word name at a line wrap; test −/+ and Chọn cả cụm.
2. Open the real keyboard, change the display name, confirm and check that the sheet stays usable and the current reading position stays put. Use Xong and verify ordinary selection / Copy and scrolling return.
3. Dò tên: inspect the three categories; confirm a full name, add a shortened alias to that character and check that the short form stays short in the prose.
4. Delete a rule and undo it. Export a dictionary, then import it into the same story on another device; check that existing L5.3 rules, bookmarks and source chapters are preserved.

Real Android keyboard / OEM selection-menu behavior remains a physical-device acceptance step. Browser emulation cannot certify those native overlays.
