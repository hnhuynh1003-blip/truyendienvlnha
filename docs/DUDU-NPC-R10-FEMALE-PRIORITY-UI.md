# DUDU NPC R10 — Female-first portrait selection and interface

**Branch**: `feat/identity-npc-editor-v2`. **Scope**: Sandbox only. **Production**: do not merge/deploy.

## Approved ratio
- **72 actively selectable vector prototypes**: 60 female and 12 male.
- Three existing NPCs (Ôn Tri Hành / Tô Thanh Lạc / Thẩm Cẩm Thư) remain female. Their saved IDs and authored profile text are not altered.
- **Backward compatibility:** all original 24 female IDs keep their previous identifiers and appearance metadata; older male IDs `portrait-m-13` through `portrait-m-24` and neutral IDs `portrait-n-01` through `portrait-n-24` remain resolvable for existing saved choices but are excluded from the new picker. A previously saved legacy ID displays its old portrait and a `lưu từ bản cũ` label. These extra compatibility assets are **not** counted in the newly selectable 72.
- A chosen uploaded/custom photo still takes precedence according to the existing safe local storage fallback order.

## Interface
- Compact fantasy-violet card treatment on the author NPC editor only, with dynamic gender, world and temperament filters, accessible selection labels, selected-card halo, and 3-column portrait grid on narrow screens.
- Existing story-reader pages and public NPC progression are unchanged.
- Images are still lightweight vector **prototypes**, not the high-resolution anime character art produced as separate visual concepts. This stage does **not** upload generated images into GitHub or production storage.

## Tests and follow-up
- Validate 60F/12M active counts and world/temperament search.
- Validate 36 hidden legacy IDs remain readable and persist through editing.
- Browser smoke checks filtering, old portrait round-trip, image upload and overwrite race.
- A true photo-based library needs author-approved anime art files and production storage/permissions/moderation. Do not imply the current data URLs are downloadable or shared remotely.
- Keep GitHub PR Draft; preserve all reader data and all existing character records.
