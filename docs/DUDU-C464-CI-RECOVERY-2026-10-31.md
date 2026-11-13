# C4.6.4 — Restore main smoke checks (2026-10-31)

## Cause and scope

At `354da13` and its parent `e011e8b`, GitHub Pages and the browser job passed,
but `DUDU Phase 1 Smoke / smoke` failed **seven** assertions in the Cloudflare
test batch. The same failures predated C4.6.3. No Firebase production failure
was inferred from the CI indicator.

## Narrow changes

- V44.2 comment test: assert the current sandbox-only persistence contract,
  including rollback on failed save. The obsolete `commentState` assignment
  was removed long ago; public comments remain gated off.
- V57.3 NPC connection UI: display only the already-validated eight-hex-character
  correlation reference (`Mã kiểm tra`) on a failed upstream reply. No token,
  prompt, raw upstream body or secret is shown.
- G1G static creator validation: reproduce the checked-in browser bundle with
  the repository's pinned `esbuild`; no source or server writer changes.
- G2X source inventory: classify the existing `js/epub-chapter-editor-l2d3.js`
  as the seventh V49 writer, refresh reviewed hashes for the existing EPUB
  publisher/importer, and separately pin the library UI's false-positive
  `Map.set` operations. That UI is skipped by the lexical writer scan **only
  while its exact checked-in SHA-256 matches**. Any code drift still fails the
  source hash gate and re-enters the unknown-writer check.

No World/Vạn Giới gameplay, published story, Arcade balance, wallet, inventory,
Firebase Rules or live Firebase/Cloudflare services were changed.

## Verification

- `node tools/vangioi/audit-v49-writers-g2x.mjs` — 7 writers, 1 Admin SDK,
  10 pinned sources, zero problems.
- `node cloudflare/scripts/build-vangioi-creator.mjs --check` — passes.
- `npm test --prefix cloudflare` — 1065/1065 tests pass, including G2X
  unknown-writer and reviewed-UI drift failure checks.
- `node --test tests/*.test.cjs` — 148/148 tests pass.
- `npm run build --prefix cloudflare` — dry-run bundle passes; no deployment.

GitHub Actions checks must still complete on `main` before claiming remote CI
green. Production Firestore Rules publication is an independent operator action.
