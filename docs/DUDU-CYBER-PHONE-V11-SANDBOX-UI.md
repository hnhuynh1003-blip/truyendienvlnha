# DUDU Cyber Phone V11 — UX/UI upgrade (Sandbox)
Date: 2026-10-15. Work branch: `feat/identity-npc-editor-v2`. **PR Draft; no merge or deploy.**

## Design intent
Turn the existing 330×530 flat mini-phone into an immersive, contemporary, responsive fantasy-tech DUDU phone. The new UI aligns with the violet/blue character portrait previews, but does not use mockup images as UI screenshots or imply illustrated NPC assets have been integrated.

## Implemented
- New `css/phone-ui-v11.css` strictly scoped to `body.dudu-phone-v11`; body receives that class only when `?sandbox=1` is active.
- Fantasy glass device chrome, lilac border, refined FAB and status bar, dynamic local-time clock, close button, stronger app icon tiles, rounded cards, refined inventory, quests, chat, chat input and NPC relationship panels.
- Cohesive new button styling in Sandbox for dialogs, site header and reader interface; disabled, hover, active and keyboard-focus-visible states remain distinct. Never repurpose dangerous or administrative button actions.
- App shortcuts are native `button` elements with accessible names. Phone trigger has `aria-controls`/`aria-expanded`, the panel `aria-hidden` state is synchronized, and Escape closes the phone unless a separate modal is open. A home-handle is a native button. The phone remembers the last open sub-app; users can return home explicitly.
- Responsive sizes: mobile phone uses viewport height and safe-area insets, three shortcuts per row at <=330px, four per row elsewhere. Reduced-motion preferences disable entrance/hover animation.
- No modifications to story progress, NPC affinity/trust, inventory ownership, collectible grants, Firestore, Cloudflare workers, AI gateways or production data. Existing IDs and callbacks remain.

## Validation
- Node static checks enforce sandbox-only stylesheet, accessibility and reduced-motion selectors.
- Headless Chromium checks real CSS MIME serving, desktop / 375px / 320px layout, button navigation, close and Escape interactions, focus restoration and absence of horizontal phone overflow.
- CI is still simulated/mock Firebase, **not** a manual QA session on real Android/iOS, nor a staged server rollout.

## Release boundary
Do not merge into `fixapp` or deploy to the production reader app until reviewed with real accounts/devices and save/permissions checks.
