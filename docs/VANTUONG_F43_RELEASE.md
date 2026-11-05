# F4.3 — Truy bảo, sưu tầm và nhiệm vụ

Base main: 37896caa7894a3fdf94930b53274da99d3e17675.

## Delivery

1. Approach 3500 ms, recall 900 ms; opening 2000 ms, S 2600 ms, SS 3000 ms, SSS 3600 ms. Reduced motion removes delays. Existing skip, batch summary and explicitly dismissed reward popup stay receipt-driven.
2. Tap any rendered inventory detail image for the full source in an image-only fullscreen viewer. Native pointer pinch/pan, wheel zoom, Escape/X, detail/scroll restoration and account/app-exit cleanup.
3. Vạn Tượng awards now keep every physical instance, including duplicates. Canonical 66 IDs and catalog fields are unchanged; maxOwned/unique legacy catalog labels are not used to discard a real award. UI groups only canonical matching records; modified/variant records remain separate. Existing inventory, receipts, collection album and past auto-sale history stay intact. No retroactive copies.
4. Quantity sale selects concrete unlocked IDs, confirms quantity and total, checks all copies again in one owner transaction, preserves museum album, journals sales and reuses a durable pending request on lost response. Up to 100 copies per sale. Existing per-copy favorite locks (max 100) remain; copy selector makes each physical lock accessible in a stack.
5. Eleven collection quests: 3 cards, 7 A items, 5 fossils, 3 realms, 5 distinct fossil types held, full DREAM and ORIGIN sets held, 50 fossils, 100 cards, 9 realms, and delivery of 3 f32-fossil-fern. Rewards 20–200 EXP and decorative completion badges; normal existing EXP level-up rules apply, including their existing 30-Xu level-up reward. No new fixed quest coin reward.

## Data semantics

__duduCollectionF43 contains bounded per-catalog-ID receive counters and 11 claim records. Receive progress starts with successful F4.3 award transactions, never backfills incomplete historical receipts or sold duplicates, and survives sale/delivery. Ownership quests read real currently held instances; duplicate IDs count once for distinct-type tasks. Delivery checks exact confirmed IDs and excludes locked/equipped/kept copies. Complete badge/reward receipt remains after ownership changes.

No migration, subcollections, Firebase Rules, Library or Vạn Giới changes. Existing storyStates and inventory structures are reused. 500 physical slots remain; UI stacking does not create capacity. Existing Vạn Bảo reward rules are unchanged. New quest metadata is bounded; award/sale/quest writes reject a JSON UTF-8 estimate above 750 KiB. This conservative guard leaves overhead below Firestore's 1 MiB document limit; it is not a capacity increase or exact Firestore size calculator. Larger capacity requires separate measurement and an approved storage plan.

## Validation

Each stage was tested before the next. 1,257 application tests and 35 Functions/gateway/NPC tests pass. Browser checks cover 1/5/10, real isolated transactions, receipt retries, skip, touch/mouse retrieval, slow timing, image decode, wheel/pinch/pan, Escape/X and detail/scroll return, quantity sale with protected copy retained, delivery cancel/confirm, completed badge and account/Sandbox isolation. Museum regression and production main/auth browser flows pass without external writes. Android checks use Chrome touch emulation and mobile widths; physical Android thermal performance is not measured.

Preserved: draw costs, pool/weights, A+ pity, sell values, two currencies, 66 individual art mappings and existing account data. No S guarantee for x10.
