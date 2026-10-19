# DUDU Studio 2.0 — Site Shell + Discovery (large delivery)

Date: 2026-10-19. Production branch: main.

## Scope
Add public discovery home, responsive primary navigation, separate library, worlds introduction, personal bookshelf using the V56.8 reader bookmark API, author shortcuts for permitted authors. Preserve the existing cover, reader, authentication, EPUB import, Firestore and Cyber Phone.

## Non-goals
No World AI, quest gameplay, paid service, backend permissions, data migration, new Firestore collections, or fake public worlds. 'Worlds' marks unreleased content honestly.

## Integration points
- The original home-view remains the canonical library grid/filter, using its old renderHome logic and published EPUB merge.
- The new site shell reads existing novels without writing user/story data.
- Calls to existing openCover, readChapter and goHome are wrapped to hide discovery pages without changing core reading logic; legacy goHome still persists bookmarks.
- No new author claims; tools call existing openStoryModal and openEpubImportV48.
- CSS is isolated to site shell/page IDs; reader and phone behavior remains supported.

## Smoke checklist
1. First load as Guest: home sections only use genuine published novels; Library searches and status filter work.
2. Click a card, open chapter, use next/previous, back to TOC, back to library; check saved bookmark after reload.
3. Load published Firestore EPUB; open cover and chapter; check chapter fetch still succeeds.
4. Mobile: bottom nav does not obstruct Cyber Phone; close/open phone; landscape and small screen.
5. Auth: guest sees no author shortcuts; admin reader role vs author role toggles links correctly.
6. Worlds: no playable CTA or fake data; bookshelf: only existing bookmarks are shown.
7. Browser history: #/home, #/library, #/worlds, #/shelf; deep refresh on GitHub Pages.
8. JS errors, console warnings, existing CI and visual layout.

## Rollback
Record prior main commit before deployment. Revert only this delivery commit if the shell causes regressions; do not reset database or alter EPUB/auth collections.
