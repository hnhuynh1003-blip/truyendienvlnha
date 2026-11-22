# Static Firestore candidate inventory

Baseline scan: 887 tracked code files. Candidates include definitions, comments and possible Map.get false positives; these are not runtime/billed counts. No production metadata is included.

| Public source file | Classification | Candidate line references |
| --- | --- | --- |
| cloudflare/src/library-r2-firestore-acl-v1.mjs | backend-deployment-not-inferred | modular: 58,78,81,93; rest: 60; get: 86 |
| cloudflare/src/vangioi-v49-authority-visibility-g2u.mjs | backend-deployment-not-inferred | transaction: 101; get: 105,106 |
| cloudflare/src/vangioi-v49-emergency-hold-g2v.mjs | backend-deployment-not-inferred | transaction: 65,121,197; get: 69,125,126,149,153,201,202,219 |
| cloudflare/src/vangioi-v49-emulator-epoch-g2r.mjs | backend-deployment-not-inferred | transaction: 56; get: 60,69,119 |
| cloudflare/src/vangioi-v49-emulator-publish-g2t.mjs | backend-deployment-not-inferred | transaction: 104; get: 108,126,130 |
| cloudflare/src/vangioi-v49-firestore-reader.mjs | backend-deployment-not-inferred | transaction: 30; get: 33,55 |
| cloudflare/src/vangioi-v49-guarded-publisher-g2w.mjs | backend-deployment-not-inferred | transaction: 64; get: 70,71,89,93 |
| cloudflare/tests/manual/dudu-standard-spark-rules-emulator.mjs | backend-deployment-not-inferred | get: 67,68,69,70,71,72,73,74,75,76,80,82,84,116,123,133,138,139,140,156,167,176,177,178,195,217,241,256,275,283,303,320,323,328,329,331; transaction: 121,131,194,274,282,322 |
| cloudflare/tests/manual/vangioi-g2k-emulator.mjs | backend-deployment-not-inferred | get: 38 |
| cloudflare/tests/manual/vangioi-g2l-v49-rules-emulator.mjs | backend-deployment-not-inferred | get: 45,46,47,48,49,50,66,71 |
| cloudflare/tests/manual/vangioi-g2m-owner-rules-emulator.mjs | backend-deployment-not-inferred | get: 62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,111,115,116,132,133,136,139 |
| cloudflare/tests/manual/vangioi-g2r-source-epoch-emulator.mjs | backend-deployment-not-inferred | get: 51,78,79,80,81,82,83,95,102 |
| cloudflare/tests/manual/vangioi-g2s-publish-gate-emulator.mjs | backend-deployment-not-inferred | get: 73,74,75,76,77,78,80,81,82,83,85,86,106,107,125,130,134,135,136; transaction: 129 |
| cloudflare/tests/manual/vangioi-g2t-publish-emulator.mjs | backend-deployment-not-inferred | get: 38,79,80,91,92,117,118,119,120,121,123,125,172,190,218,220,222 |
| cloudflare/tests/manual/vangioi-g2u-takedown-emulator.mjs | backend-deployment-not-inferred | get: 36,68,69,85,86,87,90,108,109,110,111,112,113,115,116,118,121,157,167 |
| cloudflare/tests/manual/vangioi-g2v-emergency-emulator.mjs | backend-deployment-not-inferred | get: 41,46,104,106,108,119,120,121,122,123,125,148,157,158,159,160,175,186,187,199,200,211,221 |
| cloudflare/tests/manual/vangioi-g2w-writer-fence-emulator.mjs | backend-deployment-not-inferred | get: 40,44,55,118,119,120,129,130,131,132,150,155,164,178,179,180,190,199,200,211,212,227,228,229,230,232,234,236,249,250,264,265 |
| cloudflare/tests/manual/vangioi-v49-firestore-emulator.mjs | backend-deployment-not-inferred |  |
| cloudflare/tests/vangioi-g2k-emulator-boundary.test.mjs | backend-deployment-not-inferred | get: 14; rest: 35 |
| cloudflare/tests/vangioi-g2x-writer-inventory.test.mjs | backend-deployment-not-inferred |  |
| cloudflare/tests/vangioi-g3a-reachability.test.mjs | backend-deployment-not-inferred |  |
| cloudflare/tests/vangioi-g3b-mobile-assets.test.mjs | backend-deployment-not-inferred |  |
| functions/index.js | backend-deployment-not-inferred | transaction: 45,58,176,212; get: 46,59,113,154,158,178,214 |
| index.html | entrypoint-or-directly-loaded | get: 2595,2616,2629,3607,3644,3686,3828,4790,4822,4845,5518,5530,5583,5807,8144,8145,8280; snapshot: 7229 |
| js/account-approval-v1.js | entrypoint-or-directly-loaded | get: 40,51,63,85,97; transaction: 62,96 |
| js/account-invite-r11.js | entrypoint-or-directly-loaded |  |
| js/arcade-unified-xu-r32.js | entrypoint-or-directly-loaded | transaction: 44; get: 45 |
| js/auth-v2.js | entrypoint-or-directly-loaded | rest: 144,156; get: 200 |
| js/collection-quests-f43.js | entrypoint-or-directly-loaded | get: 26; transaction: 26 |
| js/collection-transactions-f43.js | entrypoint-or-directly-loaded | get: 8; transaction: 8 |
| js/dudu-casino-slot-receipt-v1.js | other-source-tool-or-transitive | get: 65,77; transaction: 76 |
| js/epub-bulk-save-l2d5b.js | entrypoint-or-directly-loaded | get: 39,59 |
| js/epub-chapter-editor-l2d3.js | entrypoint-or-directly-loaded | transaction: 81,109; get: 82,90,112,125,138,142 |
| js/epub-production-v49.js | entrypoint-or-directly-loaded | get: 75,121,150,156,171,219,222,262,283,317,332,339,357,359; transaction: 261,282 |
| js/epub-recovery-journal-l2d5c.js | entrypoint-or-directly-loaded | get: 150,163,184 |
| js/firestore-profile-fallback-v56-7.js | entrypoint-or-directly-loaded | rest: 67 |
| js/library-capacity-r1.js | entrypoint-or-directly-loaded | get: 58,130 |
| js/library-epub-edit-ui-l2d5.js | entrypoint-or-directly-loaded | get: 53,60,187,389,461,469 |
| js/personal-blind-box-c29.js | entrypoint-or-directly-loaded | get: 61,74; transaction: 73 |
| js/personal-bulk-sale-f34.js | entrypoint-or-directly-loaded | transaction: 42; get: 43,72 |
| js/personal-cloud-v56-9.js | entrypoint-or-directly-loaded | rest: 54 |
| js/personal-companion-checkin-c45.js | entrypoint-or-directly-loaded | transaction: 21; get: 22 |
| js/personal-fun-c25.js | entrypoint-or-directly-loaded | get: 44,60; transaction: 59 |
| js/personal-honor-c46.js | entrypoint-or-directly-loaded | get: 130,160,181,196; transaction: 180 |
| js/personal-npc-exchange-v1.js | entrypoint-or-directly-loaded | transaction: 42; get: 43 |
| js/personal-npc-social-v1.js | entrypoint-or-directly-loaded | transaction: 38; get: 39 |
| js/personal-progress-c23.js | entrypoint-or-directly-loaded | get: 111,214; transaction: 213 |
| js/personal-scratch-c28.js | entrypoint-or-directly-loaded | get: 112,125; transaction: 124 |
| js/personal-spark-exchange-v1.js | entrypoint-or-directly-loaded | transaction: 37; get: 38 |
| js/personal-spark-items-v1.js | entrypoint-or-directly-loaded | get: 44,76,99; transaction: 75 |
| js/personal-vantvat-f31.js | entrypoint-or-directly-loaded | get: 57,68,143; transaction: 67,142 |
| js/personal-vantvat-f33.js | entrypoint-or-directly-loaded | transaction: 21; get: 22 |
| js/profile-save-c23.js | entrypoint-or-directly-loaded | transaction: 104,123; get: 106,125 |
| js/vanbao-rewards-f44.js | entrypoint-or-directly-loaded | get: 6,7; transaction: 7 |
| js/vanbao-sessions-f44.js | entrypoint-or-directly-loaded | get: 4,6; transaction: 6 |
| tests/browser-smoke.cjs | test-prototype-reference | get: 107,108,109,110,111,112,113,114,115,116,117 |
| tests/emulator-l6p2c4b/rules.integration.mjs | test-prototype-reference | modular: 26,55,65 |
| tests/l6p2c4b-emulator-static.test.cjs | test-prototype-reference | rest: 19 |
| tests/personal-arcade-integration-v1.test.cjs | test-prototype-reference |  |
