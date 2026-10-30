import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runG2XAudit,loadG2XSource,inspectG2XInventory,ROOT}
 from '../../tools/vangioi/audit-v49-writers-g2x.mjs';

const inventory=JSON.parse(readFileSync(new URL(
 '../../contracts/vangioi/v49-writer-inventory-g2x.json',import.meta.url),'utf8'));
const sources=loadG2XSource(ROOT,inventory);
const check=(manifest=inventory,source=sources)=>inspectG2XInventory(manifest,source);

test('G2X clean baseline reports seven V49 writers and one Admin SDK source',()=>{
 const result=runG2XAudit();
 assert.equal(result.ok,true);
 assert.equal(result.writerCount,7);
 assert.equal(result.adminSdkCount,1);
 assert.equal(result.pinnedCount,10);
 assert.deepEqual(result.problems,[]);
 assert.equal(result.productionEnforced,false);
 assert.equal(result.iamChanged,false);
});
test('G2X pins the owner chapter revision writer and reviews Map-only EPUB UI separately',()=>{
 assert.ok(inventory.writerFiles.some(x=>x.path==='js/epub-chapter-editor-l2d3.js'));
 assert.deepEqual(inventory.reviewedNonWriterFiles.map(x=>x.path),
  ['js/library-epub-edit-ui-l2d5.js']);
 const path='js/library-epub-edit-ui-l2d5.js';
 assert.match(sources[path],/chapters\.set\(/);
 const changed={...sources,[path]:sources[path]+'\n// changed Map-only UI\n'};
 assert.ok(check(inventory,changed).problems.includes('pinned-source-drift:'+path));
 assert.ok(check(inventory,changed).problems.includes('unknown-v49-writer:'+path));
});
test('G2X pins the legacy browser publication path and caller, separately',()=>{
 assert.ok(inventory.writerFiles.some(x=>x.path==='js/epub-production-v49.js'));
 assert.ok(inventory.watchFiles.some(x=>x.path==='js/epub-import-v48.js'));
 assert.ok(sources['js/epub-production-v49.js'].includes('async function publishDraft('));
});
test('G2X can distinguish the Firestore G1T reader from a write target',()=>{
 assert.ok(sources['cloudflare/src/vangioi-v49-firestore-reader.mjs']
  .includes('readOnly:true'));
 assert.ok(!inventory.writerFiles.some(x=>x.path.endsWith('firestore-reader.mjs')));
 assert.equal(check().ok,true);
});
test('G2X finds a newly added V49 Admin writer outside the inventory',()=>{
 const changed={...sources,'functions/rogue-v49-writer.js':
  "import {getFirestore} from 'firebase-admin/firestore';\n"+
  "getFirestore().collection('epub_stories_v49').doc(id).update({status:'published'});\n"};
 const result=check(inventory,changed);
 assert.equal(result.ok,false);
 assert.ok(result.problems.includes('unknown-v49-writer:functions/rogue-v49-writer.js'));
 assert.ok(result.problems.includes('unknown-admin-sdk:functions/rogue-v49-writer.js'));
});
test('G2X catches unregistered V49 client/server updates',()=>{
 const result=check(inventory,{...sources,
  'js/unreviewed-epub-writer.js':
  "const target='epub_stories_v49'; ref.update({status:'published'});"});
 assert.ok(result.problems.includes('unknown-v49-writer:js/unreviewed-epub-writer.js'));
});
test('G2X detects dangerous edits to the already-known G2T publisher',()=>{
 const path='cloudflare/src/vangioi-v49-emulator-publish-g2t.mjs';
 const changed={...sources,[path]:sources[path]+'\n// G2X drift test\n'};
 assert.ok(check(inventory,changed).problems.includes('pinned-source-drift:'+path));
});
test('G2X detects edits to the currently non-V49 privileged Function',()=>{
 const path='functions/index.js';
 const changed={...sources,[path]:sources[path]+"\nconst leaked='epub_stories_v49';\n"};
 assert.ok(check(inventory,changed).problems.includes('pinned-source-drift:'+path));
});
test('G2X detects edits to the client publish button caller',()=>{
 const path='js/epub-import-v48.js';
 const changed={...sources,[path]:sources[path]+'\n// changed caller\n'};
 assert.ok(check(inventory,changed).problems.includes('pinned-source-drift:'+path));
});
test('G2X refuses missing pinned files or missing classified writers',()=>{
 const copy={...sources};delete copy['js/epub-production-v49.js'];
 const p=check(inventory,copy).problems;
 assert.ok(p.includes('missing-pinned-file:js/epub-production-v49.js'));
 assert.ok(p.includes('missing-or-reclassified-v49-writer:js/epub-production-v49.js'));
});
test('G2X catches new Admin SDK imports even when no V49 target string occurs',()=>{
 const p=check(inventory,{...sources,'functions/new-privileged.js':
  "const {getFirestore}=require('firebase-admin/firestore');\n"}).problems;
 assert.ok(p.includes('unknown-admin-sdk:functions/new-privileged.js'));
});
test('G2X does not mistake unrelated Cloudflare collectibles publishDraft for V49',()=>{
 const x=sources['cloudflare/src/index.mjs'];
 assert.ok(x.includes('bucket.publishDraft('));
 assert.equal(check().ok,true);
});
test('G2X rejects malformed or duplicate inventory records',()=>{
 assert.throws(()=>check({...inventory,schemaVersion:99}),/invalid-manifest/);
 assert.throws(()=>check({...inventory,watchFiles:[...inventory.watchFiles,
  inventory.watchFiles[0]]}),/invalid-path/);
 assert.throws(()=>check({...inventory,watchFiles:[{path:'../.env',sha256:'a'.repeat(64)}]}),
  /invalid-path/);
});
test('G2X detects missing registered Admin SDK source',()=>{
 const copy={...sources};delete copy['functions/index.js'];
 const p=check(inventory,copy).problems;
 assert.ok(p.includes('missing-admin-sdk:functions/index.js'));
});
test('G2X cannot claim production protection from a passing lexical source scan',()=>{
 const clean=check();
 assert.equal(clean.ok,true);
 assert.equal(clean.productionEnforced,false);
 assert.equal(clean.iamChanged,false);
});
