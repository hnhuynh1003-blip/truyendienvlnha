# Canonical Vạn Tượng stream thumbnails

Generated from the 37 existing item-specific images exposed by item-visuals-v13.js and the real reward POOL. Each filename is the unchanged catalog item ID.

- Long edge: at most 180 pixels; aspect ratio and alpha retained.
- WebP quality: 0.86; original art is unchanged.
- The other 29 valid prize IDs keep their own existing SVG fallback glyphs, without the inventory card background.
- Runtime loads only visible thumbnails, with 14 cache entries and two concurrent decodes.
- Regenerate from the repository root with node scripts/build-vantvat-stream-thumbs-f42b1.cjs (Playwright required).
