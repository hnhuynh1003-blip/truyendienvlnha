// DUDU World Atlas V65 offline contract checks.
// Run: node tests/world-blueprint-v65.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const win = {};
function run(file) {
  const source = fs.readFileSync(path.join(root,file),'utf8');
  vm.runInNewContext(source,{window:win},{filename:file,timeout:1500});
  return source;
}
run('js/world-registry-v63.js');
const blueprintSource=run('js/world-blueprint-v65.js');
const registry=win.DuduWorldRegistryV63;
const api=win.DuduWorldBlueprintV65;
assert.equal(registry.starterWorlds.length,6);
assert.equal(registry.unverifiedWorlds.length,3);
assert.equal(new Set([...registry.starterWorlds,...registry.unverifiedWorlds].map(w=>w.worldId)).size,9);
assert.ok(Object.isFrozen(registry.starterWorlds[0]));
assert.equal(api.canPublish(),false);
assert.equal(api.makeDraft('dudu-u001'),null);
assert.equal(api.makeDraft('unknown-world'),null);
for (const world of registry.starterWorlds) {
  const draft=api.makeDraft(world.worldId);
  assert.equal(draft.worldId,world.worldId);
  assert.equal(draft.worldName,world.name);
  assert.equal(draft.tier,world.tier);
  assert.equal(draft.state,'draft');
  assert.equal(draft.storyId,null);
  assert.equal(draft.scenarioId,null);
  assert.equal(draft.storyPromptId,null);
  assert.equal(draft.entryModes.join(','),'main,passerby,free');
  assert.equal(api.validateDraft(draft).length,0);
  draft.narrative.premise='User-created plot draft';
  assert.equal(api.validateDraft(draft).length,0,'Narrative may be authored offline');
  draft.access.enabled=true;
  assert.ok(api.validateDraft(draft).includes('access_must_remain_locked'));
  draft.access.enabled=false;
  draft.rewards.currency=100;
  assert.ok(api.validateDraft(draft).includes('rewards_must_remain_disabled'));
  draft.rewards.currency=0;
  draft.storyId='unapproved-story';
  assert.ok(api.validateDraft(draft).includes('binding_requires_review'));
  draft.storyId=null;
  draft.npcIds.push('unapproved-npc');
  assert.ok(api.validateDraft(draft).includes('npc_binding_requires_review'));
}
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
// V65 is archived as an offline format; V66 is the live asset chain.
const assets=[
 'js/world-registry-v63.js','js/world-taxonomy-v66.js',
 'js/world-blueprint-v66.js','js/site-shell-v60.js','js/world-experience-v66.js'
];
let prev=-1;
for(const script of assets){
  const pos=index.indexOf('src="'+script+'?');
  assert.ok(pos>prev,script+' must be loaded after previous scripts');
  prev=pos;
}
assert.ok(index.includes('css/world-experience-v66.css?'));
assert.ok(!/\b(fetch\s*\(|localStorage\.|\.firestore\s*\()/.test(blueprintSource),
  'Draft service must remain local and side-effect-free');
console.log('DUDU V65 world blueprint contract OK');
