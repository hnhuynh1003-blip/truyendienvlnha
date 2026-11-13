# DUDU World Atlas V64 — compact visual navigation

## Reason
V63 was correct as an independent registry, but the world cards were too tall and text-heavy, particularly on phone-sized screens. This version changes presentation only.

## Approved visual direction
- Minimal DUDU HUD with one short title, one small global "Đang kiến tạo" state, and six collectible-style coordinate tiles.
- Only coordinate number, tier, world name and a concise category are visible on a normal tile. Long lore and repetitive locked-story descriptions stay in the registry, not the browsing UI.
- Six fixed starter coordinates from `js/world-registry-v63.js` retain their exact `worldId` and existing null story/scenario/NPC bindings.
- No fake play buttons, auto-generated story links, progress changes or external service calls.
- Three unverified coordinates live in a closed-by-default native `details` section, expandable via keyboard/touch. Disclosure preference survives normal shell refresh.
- Responsive layout: 3 columns on desktop; 2 columns on tablet and mobile (including 320px). Cards are 164px tall on desktop and 149px on phones, with 153px on very small phones.
- Gradient sigils use CSS and existing symbols; no external font/image dependency.
- Mobile navigation and Cyber Phone remain in place.

## Implementation
- `js/site-shell-v60.js`: V64 compact world card rendering + collapsible unknowns and shortened atlas heading.
- `css/site-shell-v60.css`: replace V63 display styles with isolated V64 classes, preserving thematic accent colors.
- `index.html`: update JS/CSS cache query versions so phones can fetch latest resources.
- `tests/browser-smoke.cjs`: asserts the six fixed world IDs, three unknown coordinates, zero mirrored book cards, zero gameplay links, narrow layout columns and disclosure behavior.

## Release checks
- Confirm syntactic validity and manifest sequence; inspect final files on `main`.
- Browser smoke in a mocked environment (no production Firestore) should be run before claiming functional/mobile sign-off.
- Verify 320, 390, 768, 1280 widths and confirm tap/keyboard disclosure, no horizontal overflow, working bottom navigation, reader and phone.
- GitHub commits do not prove GitHub Pages has deployed the new assets.

## Rollback
Prior stable atlas source was V63 at `3c5046061fc40243b133a6c1751bd69ac65d355d`. Revert only V64 UI-related commits if needed. Do not reset registry content, story data or profiles.
