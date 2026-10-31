# C4.38 — Sổ Báu Vật

This is a **read-only discovery folio**, not a second inventory or a verified
server-owned collectible ledger. Existing Arcade saves continue unchanged.

## What the first release indexes

| World | Catalogue | Discovery evidence | Entries |
| --- | --- | --- | ---: |
| Trạm Neon | Three completed contracts | `neon.contracts` | 3 |
| Địa Tầng 07 | All original mineral/fossil discoveries | `mine.found[ore]` | 10 |
| Vườn Sương | Quý+ fish only (commons remain in Sổ Cá) | `garden.fishAlbum[id]` | 11 |
| Ngọc Phường | Complete 7-grade × 8-color historical album | `jade.album[grade-color]` | 56 |
| Mùa 01 | Four relic concepts and the final legacy crest | **preview only** | 5 |

There are 80 permanent discovery entries plus five season previews. This
does not mean 85 objects have been issued to users. Discovery counts are
historical and do not promise a currently held sellable item. The game-side
catalogues and rarities are the source of truth; no new currency or claims
are created. Fine art reuses existing, correctly themed sprites.

## Guardrails

- Read the same `dudu-personal-arcade:v1:<encoded-owner>` local key that the
  four games already own; never write it from Sổ Báu Vật.
- Separate Sandbox usernames and Firebase UIDs. A missing account or save
  does not grant any discovery.
- Never treat `season.records.s01.relics` as ownership proof, even if a local
  save contains four entries. Preview art is disabled and marked *Xem trước*.
- Concealed Huyền thoại entries with no discovery have no artwork or real
  name rendered in the phone DOM.
- The previous save format is consumed by `DuduPersonalArcadeCoreV1.norm`; no
  migration or Firestore rule change is required.
- Historical discover dates do not exist for these saves. Display “chưa ghi
  nhận” rather than manufacture a timestamp.

## Testing

`node --test tests/arcade-treasure-c438.test.cjs`

`node --test tests/*.test.cjs`

The existing browser acceptance script opens Sổ from Arcade, filters
Địa Tầng 07 and Season 01, checks preview locks, mobile overflow at
320/390/430px, then returns to Arcade. Manual phone QA: Arcade → ◈,
Sổ Vinh Danh → ◈; try game / season / rarity / state filters and the
inline “Xem nguồn gốc” disclosures.
