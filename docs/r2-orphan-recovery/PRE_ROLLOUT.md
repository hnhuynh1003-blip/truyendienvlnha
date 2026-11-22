# PR 44 pre-rollout correction

No merge, deployment, namespace/migration creation, cloud data write or real pending closure was performed.

## Smoke failure

Main baseline `8ae082d44e9138cf8b4f97a09005f0b5d8a7ab1c` and original PR head `601b598c57f92e214fd508c53d77bd584d3c5251` both pass the unmodified Reader Background test on a fast local Chromium run. Allowing the existing 600ms Sandbox welcome timer to run before Reader interaction reproduces the auth-modal interception on **both** trees. The CI failure at the checkbox and local failure at the first settings button share this timer race. No Reader/auth runtime change is needed. The test now waits for the welcome modal and signs into a synthetic Sandbox account through the normal UI before exercising Reader. No force click, modal hiding, skipped test or removed assertion is used.

## Complete production POST audit

The independently downloaded production bundle is SHA-pinned by `build-private.cjs`. Its final exported `createL6Worker` enters `createOwnerPilotGate`, whose `classifyRoute` rejects all unrecognized routes before delegating. Other handler functions in the bundle do not introduce additional reachable top-level endpoints.

| POST path below `/v1/library/r2/` | Backend effect | Guard behavior |
| --- | --- | --- |
| `catalog/ticket` | Validates and signs a ticket; no Firestore/R2 write | Serialize; advance proof epoch; no `active` without mutation |
| `catalog/draft` | Firestore `documents:commit`, create-only importing document | Fence manifest/ticket book identity; persist intent before commit |
| `catalog/{book}/promote` | Validates/readbacks quarantine and target objects; conditional R2 puts | Fence book; observe each R2 put |
| `catalog/{book}/publish` | Verifies staged data; preconditioned Firestore status commit | Fence book; observe commit |
| `stage/original/{book}` | Validates bytes/digest then quarantine R2 put | Fence book; observe put |
| `stage/chapter/{book}/{item}` | Same, chapter validation | Fence book; observe put |
| `stage/layout/{book}/{item}` | Same, layout validation | Fence book; observe put |
| `stage/asset/{book}/{item}` | Same, media validation | Fence book; observe put |

Exact book/item patterns match the pinned production classifier. Native local QA compares both classifiers across all eight routes plus read/status/unrelated/malformed paths and exercises real legacy rejection paths. Unrelated POSTs and wrong-method calls on read routes keep legacy behavior. OPTIONS/GET behavior remains legacy except the explicit recovery routes. OAuth POST and Firestore `runQuery` are reads, not book mutations. The factory transport observes only scoped commit POSTs; the bound R2 proxy observes put and refuses unaudited mutation methods. SHA drift stops preparation before a newer production route can bypass this audit. No production source/bundle/config is published.

## Intent and rollback

Pre-dispatch validation, media, digest, auth, OAuth or Firestore-read errors do not create `active`. Mutation dispatch requires durable intent persistence first. After dispatch, network failure, non-2xx backend response, failed final verification or actor restart keeps the intent. Neither HTTP 200 alone nor elapsed time proves a safe outcome. Existing unknown intents still require a separate authorized read-only investigation; this patch never clears them to unlock recovery.

Both candidate and rollback use the same guard/fence/storage and exact actor name. The rollback artifact hard-disables inspect/close while guarded writes continue honoring permanent closed-book fences and unknown intents. Native QA hot-swaps it after a synthetic close receipt. See [ACCEPTANCE.md](ACCEPTANCE.md) for rollout/rollback approvals.

The final native harness enables the real legacy route flags and uses only synthetic signing material: ticket issuance=200 and signed create-only draft=201 through the actual commit transport. It also loses a synthetic commit response, restarts the actor with the candidate after rollback, and requires the persisted intent to block inspection with `write-outcome-unknown`. This verifies both availability before dispatch and fail-closed behavior after dispatch; cloud mutations remain zero.

## Compatibility and release gate

The compatibility CI job builds a temporary integration tree from PR44 and current #41/#42 refs, applies the reviewed test-only patch, and runs the quota/diagnostic/clock, recovery and Library suites. The output records dependency SHAs. Neither Draft PR is merged or rewritten, and #42's single-flight/fresh-boundary optimization is retained.

Approval remains necessary for the new DO binding/migration/coordination writes, exact private candidate and rollback artifacts, production rollout, verified legacy-writer drain, activation flags and the author's explicit real-session confirmation. CI/native fixture PASS is not proof of a real session's cloud state or a completed recovery.
