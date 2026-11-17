# DUDU Studio — Library L6-P2C4B: Firebase R1.2 Emulator security gate

**Date:** 17 November 2026. **Status:** review-only emulator test harness, no production Rules update and no R2 activation.

## Why not paste new Rules into Firebase now?

The catalog R2 Rules are a small addition to the currently Published owner-provided R1.2 Rules, not a replacement. The old repository firestore.rules is a stale REVIEW CANDIDATE with different EPUB-public-read policy and MUST NEVER overwrite the currently deployed R1.2.

The currently Published text was not exported in this development session. Consequently **the actual R1.2+catalog policy has not yet been exercised in the Firebase Emulator.** Static test coverage proves only the harness configuration, not live permissions. Never call this security-gate approved until all 13 emulator cases pass against an export of the actual Published Rules.

## Files

- scripts/l6p2c4-prepare-rules.cjs — existing strict local-only merging helper; rejects absent R1.2 helpers, duplicate catalog and overwriting firestore.rules
- security/epub-catalog-r2-v1.rules.review — existing catalog review fragment, GET only for approvedReader published / owner admin; denies list/create/update/delete
- tests/emulator-l6p2c4b/deny-all.rules — secure initial default for emulator before the merged owner rules are applied
- tests/emulator-l6p2c4b/firebase.emulator.json — local-only Firestore emulator on 127.0.0.1:8189
- tests/emulator-l6p2c4b/rules.integration.mjs — 13 tests with @firebase/rules-unit-testing; tests authenticated/anonymous mock users and bypasses security rules ONLY for test fixture setup
- tests/emulator-l6p2c4b/package.json — isolated dev-only dependency set, not loaded by GitHub Pages or Worker
- tests/l6p2c4b-emulator-static.test.cjs — CI static gate for deny-by-default configuration. **Does not run a real emulator**.

## Local Windows PowerShell instructions (after owner exports Published rules)

From the repository root:

1. On Firebase Console, open Firestore Database -> Rules, copy the exact **Published** Rules R1.2 into a file outside the Git repository, for example `$env:USERPROFILE\Documents\DUDU_Rules_Review\live-r12.rules`. Do not use repository firestore.rules.
2. Define paths and generate a separate review-only file:

```powershell
$rulesDir = "$env:USERPROFILE\Documents\DUDU_Rules_Review"
New-Item -ItemType Directory -Path $rulesDir -Force | Out-Null
# Save the CURRENT Published Rules in "$rulesDir\live-r12.rules" first.
node scripts/l6p2c4-prepare-rules.cjs "$rulesDir\live-r12.rules" "security\epub-catalog-r2-v1.rules.review" "$rulesDir\l6-r12-catalog-emulator.rules"
```

3. Run the emulator from an isolated test folder (requires Node 22 and a supported Java installation; does not require login to Firebase production):

```powershell
Push-Location tests\emulator-l6p2c4b
npm install
$env:L6_RULES_FILE = "$rulesDir\l6-r12-catalog-emulator.rules"
npm run emulator
Pop-Location
```

The command uses **demo-dudu-library-rules**, never the real Firebase project; the emulator binds only to localhost and initially loads deny-all rules. initializeTestEnvironment then installs the explicitly supplied owner Rules into the emulator. It must report **13/13** before the proposed Rules change can be approved.

If any test fails, DO NOT use Publish in Firebase Console. Check differences in the actual Published R1.2; the helper currently expects named approvedReader/approvedPlayer/admin and legacy profiles_v2 logic. Existing Rules may require careful adjustment of fixtures, not weakening authorization.

## Emulator test matrix

| Role | Published catalog | Draft catalog | Special checks |
|---|---|---|---|
| Guest, no login | DENY | DENY | Web studio_data/main_library remains public |
| Logged-in unapproved | DENY | DENY | Authenticated alone is insufficient |
| Approved enabled:true | ALLOW | DENY | No list/write |
| Legacy profiles_v2 without approval doc | ALLOW | DENY | Grandfather |
| Explicit enabled:false with profile | DENY | DENY | Explicit revocation |
| Owner with admin claim | ALLOW | ALLOW | Client write still denied |
| Another admin (not owner) | Published per approvedReader | DENY | Never get draft of other owner |
| Every client | List DENY | Create/update/delete DENY | Catalog is server-managed |

## Remaining blockers

- Owner export of CURRENT Published R1.2 Rules is required before the real Emulator matrix can run.
- No trusted server-side create-only Firestore writer is connected to this catalog yet; Admin SDK/IAM may bypass Rules and must enforce owner identity and a server-held draft session separately.
- No pilot book has been uploaded or fully verified; no Worker production deployment and no reader cutover.
- No EPUB deletion, Game changes or change to live firestore.rules, firebase.json, Cloudflare Wrangler, index.html or account data.
- After actual Emulator PASS and owner approval, only append approved catalog scope to Published Rules, export and compare again; keep a known-good rollback copy of R1.2.
