import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const original=read('./fixtures/vangioi-g2m-v49-owner-only.rules');
const gated=read('./fixtures/vangioi-g2s-v49-server-publish-only.rules');
const manual=read('./manual/vangioi-g2s-publish-gate-emulator.mjs');
const client=read('../../js/epub-production-v49.js');

test('G2S fixture is precisely the scoped G2M copy plus a client publish veto',()=>{
 let expected=original.replace(
  '// G2M -- ISOLATED FIRESTORE EMULATOR CANDIDATE, NOT A DEPLOYABLE PROJECT RULESET.',
  '// G2S -- ISOLATED FIRESTORE EMULATOR PUBLISH GATE, NOT A DEPLOYABLE PROJECT RULESET.\n'+
  '// Forked from G2M candidate for rehearsal ONLY; G2M stays unchanged.');
 expected=expected.replace(
  "return (before.status == 'importing' && after.status == 'draft' &&\n"+
  "          changes.hasOnly(['status','updatedAt'])) ||\n"+
  "        (before.status == 'draft' && after.status == 'published' &&\n"+
  "          changes.hasOnly(['status','updatedAt','publishedAt']));",
  "// Owners may finalize an import, but NEVER publish from a client.\n"+
  "      // Publishing requires a separate trusted server workflow (not built here).\n"+
  "      return before.status == 'importing' && after.status == 'draft' &&\n"+
  "        changes.hasOnly(['status','updatedAt']);");
 expected=expected.replace(
  "validBookV49(request.resource.data, storyId) &&\n"+
  "        allowedStatusUpdate(resource.data, request.resource.data);",
  "validBookV49(request.resource.data, storyId) &&\n"+
  "        request.resource.data.status != 'published' &&\n"+
  "        allowedStatusUpdate(resource.data, request.resource.data);");
 assert.notEqual(expected,original,'expected patches must apply');
 assert.equal(gated,expected,'G2S must not drift from audited G2M except publish veto');
});

test('G2S retains schema validators and owner import but denies every client publish path',()=>{
 for(const part of ['validBookV49(request.resource.data, storyId)',
  'validChapterV49(request.resource.data, storyId, chapterId)',
  "request.resource.data.status == 'importing'",
  "before.status == 'importing' && after.status == 'draft'",
  "request.resource.data.status != 'published'",
  "allow delete: if false",
  "match /{everythingElse=**} { allow read, write: if false; }"])
  assert.ok(gated.includes(part),part);
 assert.doesNotMatch(gated,/before.status == 'draft' && after.status == 'published'/);
 assert.doesNotMatch(gated,/match \/vg_fixture_v49_epochs_g2r\//);
});

test('G2S retains public V49 query and private owner boundary',()=>{
 assert.match(client,/collection\(COLLECTION\)\.where\('status','==','published'\)/);
 assert.match(gated,/data.status == 'published' \|\| isVerifiedOwner\(data.ownerUid\)/);
 assert.match(gated,/isVerifiedV49Author\(\) && uidUnchanged/);
 assert.match(gated,/uidNotModified\(resource.data, request.resource.data\)/);
 assert.match(client,/await ref.update\(\{status:'published',publishedAt:now\(\),updatedAt:now\(\)\}\)/);
});

test('G2S manual tests real V49 publisher denial and privileged SDK bypass separately',()=>{
 for(const part of ['epub.publishDraft(', 'err?.code===\'permission-denied\'',
  'atomic-owner-publish-and-epoch-bypass',
  'owner-publish-overwrite','guest-published-query',
  'owner-finalize-to-draft','serverSdkBypassesRules:true',
  'serverCanStillPublishWithoutEpoch:true',
  'publicParentMetadataStillExposed:true'])
  assert.ok(manual.includes(part),part);
 assert.match(manual,/GOOGLE_APPLICATION_CREDENTIALS/);
 assert.match(manual,/FIRESTORE_EMULATOR_HOST!==HOST/);
 assert.match(manual,/demo-vangioi-g2s/);
});

test('G2S contains no live Rules configuration or production wiring',()=>{
 assert.deepEqual(JSON.parse(read('../../tools/vangioi/firebase-emulator-g2s.json')),
  {emulators:{firestore:{host:'127.0.0.1',port:18085}}});
 assert.equal('firestore' in JSON.parse(read('../../firebase.json')),false);
 for(const path of ['../src/index.mjs','../../js/epub-import-v48.js',
  '../../security/firestore-epub-v49.rules.review'])
  assert.equal(read(path).includes('vangioi-g2s'),false,path);
});
