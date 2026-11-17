'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'emulator-l6p2c4b');
const file=n=>fs.readFileSync(path.join(dir,n),'utf8');
test('Firestore emulator points to deny-all rules until explicit R1.2 Rules load',()=>{
 const config=JSON.parse(file('firebase.emulator.json'));
 assert.equal(config.firestore.rules,'./deny-all.rules');
 assert.equal(config.emulators.firestore.host,'127.0.0.1');
 assert.equal(config.emulators.firestore.port,8189);
 assert.match(file('deny-all.rules'),/allow read, write: if false/);
});
test('Test harness never uses live project, credentials or deploy commands',()=>{
 const s=file('rules.integration.mjs');
 assert.match(s,/demo-dudu-library-rules/);
 assert.match(s,/L6_RULES_FILE/);
 assert.match(s,/initializeTestEnvironment/);
 assert.match(s,/assertFails/);
 assert.match(s,/assertSucceeds/);
 assert.doesNotMatch(s,/https:\/\/firestore.googleapis.com|serviceAccount|firebase deploy|GOOGLE_APPLICATION_CREDENTIALS/);
});
test('Official emulator test harness checks approved, revoked, grandfather and admin owners',()=>{
 const s=file('rules.integration.mjs');
 for(const check of ['anonymous','newbie','reader','legacy','revoked','owner','otherAdmin',
  'epub_catalog_r2_v1','studio_data','approved_accounts_v1','profiles_v2'])
  assert.ok(s.includes(check),check);
 assert.match(s,/Catalog create is denied/);
 assert.match(s,/Catalog update is denied/);
 assert.match(s,/Catalog delete is denied/);
});
