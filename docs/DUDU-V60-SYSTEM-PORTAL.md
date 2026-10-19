# DUDU Studio 2.0 — Compact System Portal

## Approved design direction
- Homepage feels like a fantasy-system interface, not a plain library, without becoming a noisy game dashboard.
- Hero is compact (desktop <300px, mobile <280px), one headline, one micro-tagline, two primary choices.
- An ornamental CSS-only world-gate replaces the oversized decorative star; no external image, token cost, animation loop or fake story art.
- Four quick-entry modules: reading/resume, library, NPC contact, world introduction.
- Story cards use real loaded titles/art; four updates shown prominently, genre chip count limited to seven.
- World gateway marked unreleased. Counts reflect only the locally loaded library, not server usage/ranking.
- No changes to reading UI, bookmarks, EPUB import, Firebase/Worker, AI or game mechanics.

## Validation
Syntax check for JS and browser smoke for desktop/mobile hero size, four modules, world status, no horizontal overflow. Continue existing Phase 1 tests and GitHub Pages deployment. Manual real-device test should confirm the bottom nav and Cyber Phone do not overlap.

## Rollback
Revert this one commit if visual regression appears. Do not modify Firestore or user data.
