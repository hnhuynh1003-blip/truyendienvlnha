# DUDU V13 — Item miniatures and female NPC portrait candidates
Date: 2026-10-15 | Branch: `feat/identity-npc-editor-v2` | Draft PR, **not merged or deployed**.

## Implemented in Sandbox
- `js/item-visuals-v13.js` generates **deterministic, self-contained SVG thumbnails** for known item types and nine approved rarity tiers F/E/D/C/B/A/S/SS/SSS.
- `css/item-visuals-v13.css` adds rarity-color frames and subtle glows, scoped to the V11 Cyber Phone Sandbox body class only.
- Inventory cards and read-only detail panel use the same art component; artwork **does not** add, consume, award or alter inventory, collectibles, XP, or coins.
- Unknown/legacy items receive safe type or default illustration; no unsafe HTML from an item's name or description is injected into SVG.
- Browser and Node CI cover icon count, item ranks, data-URI SVG, read-only inventory and original UX.
- **Images are mini vector illustrations, not yet custom-painted full-resolution collectible art.**

## Existing portrait artworks
- Four previously generated **anime female concept portraits** were recovered from the conversation attachments: moonlit blue, lilac moon, peach court, and adventurer.
- These were resized to WebP and bundled as a separate downloadable artist candidate pack. **The user must choose/approve which image depicts which canonical NPC**; no character, gender, portrait ID or reader history was changed automatically.
- The existing Sandbox NPC editor can import these WebP files through the optional browser-local upload. There is **no automatic upload into the GitHub repository**, no Cloudflare storage, no cross-device synchronization and no change to live reader portraits.
- Asset ZIP exists as a conversation download artifact, not a repository asset. Do not claim it is deployed or present in `assets/npc/`.

## Priorities for a production art pipeline
1. Confirm canonical facial designs and ownership/licensing for Ôn Tri Hành, Tô Thanh Lạc and Thẩm Cẩm Thư.
2. Curate/upload approved image bytes into controlled storage with authenticated author permissions, content/MIME verification, quotas and deletion.
3. After staging review, persist stable image IDs/URLs and cross-device synchronization; preserve existing portrait and save references.
4. Real Android/iOS visual QA and staging backend security checks before merge/deploy.
