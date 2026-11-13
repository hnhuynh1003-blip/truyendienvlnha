# F4.2D — 29 approved catalog artworks

Base main: d0662ea86afdf34b989fc28d1fdbdf93d87fffbb.

29/29 ZIP filenames match the historical missing-art CSV by ID and rank. All 29 decoded images are distinct and transparent; contact-sheet inspection matches their catalog subjects. Original PNGs remain outside the deployed repository.

66/66 physical prizes now have individual art. The original 37 full images and thumbnails remain unchanged. New art uses transparent WebP (1024 px maximum long edge, quality .93), with 180 px thumbnails (quality .86). All dimensions preserve aspect ratio; shared rendering uses contain for new silhouettes. Normal rendering no longer selects SVG for these 29 IDs; emergency error fallback remains available for failed network loads.

The existing canonical stream automatically resolves all 66 images. It retains 12 objects, three depth paths, recent-ID avoidance, rank-specific effects, 14 decoded images and two concurrent loads. It never preloads all full-resolution artworks. Shared image metadata is used by retrieval, prize results, inventory and museum surfaces; museum rarity/album rules are unchanged.

Validation: 1,246 unit tests; 35 Functions/gateway/NPC tests; browser retrieval with real isolated transaction engine for 1/5/10, coins, skips, retries, touch cancel/pull, mouse drag, account and screen exit, reduced motion and five widths. New chip/glasses prizes match inventory IDs and debit once. All 29 full images decode at 320/390/1280 px without horizontal overflow or silhouette cropping. Museum regression passes.

120-second browser observation: 63 distinct IDs, 196 emissions, max decoded residency 14, 63 thumbnail requests, longest observed long task 0 ms. Ordinary items dominate; rare ranks remain sparse. This is desktop Chrome with Android-width/touch emulation, not a physical Android thermal measurement.

No catalog, economy, transaction, account, Firebase Rules or Library logic changed. Current 66-item audit: VANTUONG_F42D_IMAGE_AUDIT.csv. Source/output hashes and dimensions: VANTUONG_F42D_IMAGE_MAPPING.json. Prior F4.2B.1 audit files remain historical.
