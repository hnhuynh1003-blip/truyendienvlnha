# DUDU Studio — Master Delivery Plan (2026-10-19)

## Source of truth
- Production repository: `hnhuynh1003-blip/truyendienvlnha`, default `main`.
- Baseline before this continuation: `627c593` (V60.3 homepage dedup).
- Keep the sandbox and its experiments separate. Do not replace production data with sandbox data.
- Delivery policy: bundle related changes by coherent large tranche, commit to main, and report exact commits, verification, and rollback. Large tranche does **not** mean bypassing checks.
- Keep reading accessible without requiring quests, coins, NPC interaction, or account upgrades.

## Existing baseline — verified from GitHub commits / current shell source
- V58/V58.2: Gemini/Workers AI integration and error/fallback messaging code; **deployment and provider health are separate from code presence**.
- V60: home, library, worlds placeholder, bookshelf, author entry; legacy reader and EPUB remain underneath.
- V60.2/V60.3: compact System Portal, no duplicate home quick-link cards, one NPC contact shortcut, one resume block.
- A successful commit is **not** proof of production deployment or full browser smoke success.

## Tranche A — Discovery / Site Shell (implemented, regression testing pending)
- Preserve a compact sci-fantasy system atmosphere; avoid dense explanatory text, redundant CTAs, oversized cards and fake content.
- Homepage: published book discovery, real update ordering, one resume card, genre entry, compact system status.
- Library: real search/filter, authentic works only, clear no-results and empty states, card cover/title/chapter count, no broken links.
- Bookshelf: existing bookmarks only, prioritize most recently read where timestamp data exists, respect older bookmarks.
- Navigation: desktop top tabs / mobile bottom tabs, accessible current page, no overlay on Cyber Phone or reader controls.
- Worlds: distinguish released, locked and planned functions; never present unavailable world gameplay as live.
- Author entry: respect current permissions; do not manufacture roles or modify Firestore rules in a UI tranche.
- Test widths 320/375/390/768/desktop; back/forward, refresh, auth guest/author, empty and populated catalog, EPUB chapters, reading progress.

## Tranche B — World Atlas / Scenario Foundations (V63–V65 implemented; release testing pending)
- V63: six F/E starter worlds with immutable IDs and three sealed unverified coordinates; **Worlds must never repeat the novel list** from Library.
- V64: compact 2-column mobile atlas with brief labels and optional collapsed anomaly section.
- V65: world dossiers open on demand with no gameplay, plus author-only offline JSON prompt blueprint creation/validation for six starter worlds.
- Preserve three roleplay paths (`main`, `passerby`, `free`) as draft contract; do not claim per-story identity selection is activated by V65.
- Scene, plot, NPC and story identifiers remain unbound until individually authored and tested; no client-side action grants world access or rewards.
- Future stage: separate approved scenario publication, verified world-to-story/NPC bindings, account-isolated memory and server-authorized unlocks, with read-only previews before release.
- Story recommendations remain exclusively in Library/Home; do not copy complete catalogs into World Atlas.

## Tranche C — Identity, NPC and Cyber Phone (pending)
- Maintain per-story A/B/C role selection: main character, passerby, or independent traveler; preserve existing profiles.
- Audit isolated story memory, correct NPC addressing, affinity/trust, gifts and dialogue session limits.
- Streamline Contacts, chat, gifts, phone wallpapers and profile avatars without duplicate lists or permanently expanded instructions.
- Verify AI fallback on both author and reader flows; no accidental paid-tier activation or leaked keys.

## Tranche D — Economy, Events and Author Studio (pending)
- Synchronize shop item types: system artifacts, story-specific objects, world-bound items and functional consumables.
- Event mini-games (blind box / lottery) must have server-authoritative rewards, limits and anti-abuse safeguards.
- Improve author EPUB upload, NPC-to-story binding, object editor and publication preview; preserve existing published stories and permissions.
- Never change Firestore rules, quota/Worker billing settings, published content or economy balances without dedicated test/rollback.

## Deployment gates for EVERY tranche
1. Read current main SHA and affected files before changes; avoid overwriting concurrent work.
2. Lint/syntax checks, existing smoke/browser tests where available.
3. Test guest, reader, author, phone and desktop; check console and mobile overflow.
4. Validate reading, EPUB publication/access, bookmarks, NPC chat, user identity, and item ownership appropriate to the changed scope.
5. Record commit links and rollback ref. Deploy verification is separate from GitHub commit.
6. If tests cannot run, say so explicitly and do not claim the tranche is production-verified.

## Continuation checkpoints
- `e4b67b7`: prefer a genuinely last-read bookmark when the saved bookmark includes a date; otherwise leave stable order. Title tracks the active route. No database or AI changes.
- V63 (`3c50460`): stable low-tier World Atlas replacing duplicate book lists.
- V64 (`fc43ac5`): compact mobile-first coordinate UI with no unnecessary descriptions.
- V65: optional world dossier and offline author draft blueprint, built without backend writes or publication workflow. See `docs/DUDU-V65-WORLD-DOSSIER-BLUEPRINT.md`.
- Static JS/registry contract checks have been performed in the connector runtime. Full browser/CI/live deployment verification is **not yet confirmed** for this continuation.
