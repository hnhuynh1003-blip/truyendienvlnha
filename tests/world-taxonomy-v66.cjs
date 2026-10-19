// DUDU V66 taxonomy and pact-first preview contract.
// Run: node tests/world-taxonomy-v66.cjs (no Firestore or live account).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const win={};
function source(file){return fs.readFileSync(path.join(root,file),'utf8');}
for(const file of ['js/world-taxonomy-v66.js','js/world-blueprint-v66.js'])
  vm.runInNewContext(source(file),{window:win},{filename:file,timeout:1500});
const api=win.DuduWorldTaxonomyV66,author=win.DuduWorldBlueprintV66;
assert.equal(api.genres.length,6);
assert.deepEqual(Array.from(api.genres,g=>g.name),
 ['Cổ đại','Hiện đại','Niên đại','Tương lai','Tu tiên','Mạt thế']);
assert.equal(api.missions.length,48);
assert.equal(new Set(Array.from(api.missions,m=>m.missionId)).size,48);
assert.equal(api.missions.filter(m=>m.tier==='F').length,30);
assert.equal(api.missions.filter(m=>m.tier==='E').length,18);
assert.ok(api.genres.every(g=>api.byGenre(g.genreId).length===8));
assert.ok(api.missions.every(m=>m.status==='seed'&&!m.available&&!m.scenarioId));
assert.equal(api.contractPolicy.required,true);
assert.equal(api.contractPolicy.verifiedByServer,true);
assert.equal(api.contractPolicy.starterMissionTiers.join(','),'F,E');
assert.equal(api.entryCheck({missionId:api.missions[0].missionId}).reason,'pact_required');
assert.equal(api.entryCheck({pactVerified:true,authorizedMissionTiers:['F'],
 missionId:'dudu-m-an-e01',scenarioPublished:true}).reason,'rank_locked');
assert.equal(api.entryCheck({pactVerified:true,authorizedMissionTiers:['F','E'],
 missionId:'dudu-m-an-e01',scenarioPublished:true}).reason,'scenario_unpublished');
const seen=[];
for(let i=0;i<30;i++){
 const m=api.pickPreview({tier:'F',seenMissionIds:seen,random:()=>0});
 assert.ok(m&&m.tier==='F');
 assert.ok(!seen.includes(m.missionId),'Do not repeat before all F candidates shown');
 seen.push(m.missionId);
}
assert.equal(new Set(seen).size,30);
const next=api.pickPreview({tier:'F',seenMissionIds:seen,random:()=>0});
assert.ok(next,'After exhaustion a new preview rotation is allowed');
const recentGenres=['ancient','modern'];
const varied=api.pickPreview({tier:'F',seenMissionIds:[],recentGenreIds:recentGenres,random:()=>0});
assert.ok(!recentGenres.includes(varied.genreId),'Prefer genre variety when alternatives exist');
assert.equal(author.makeDraft('dudu-w001'),null,'Genre is not a mission');
for(const mission of api.missions){
 const d=author.makeDraft(mission.missionId);
 assert.ok(d);
 assert.equal(d.genreId,mission.genreId);
 assert.equal(d.tier,mission.tier);
 assert.equal(d.schemaVersion,2);
 assert.equal(d.pactRequired,true);
 assert.equal(d.access.requiresContract,true);
 assert.equal(d.state,'draft');
 assert.equal(author.validateDraft(d).length,0);
 assert.equal(author.canPublish(d),false);
 d.access.requiresContract=false;
 assert.ok(author.validateDraft(d).includes('contract_required'));
 d.access.requiresContract=true;
 d.progression.systemExp=1;
 assert.ok(author.validateDraft(d).includes('progression_must_remain_locked'));
 d.progression.systemExp=0;
 d.rewards.currency=1;
 assert.ok(author.validateDraft(d).includes('rewards_must_remain_disabled'));
}
const html=source('index.html');
const scripts=['js/world-registry-v63.js','js/world-taxonomy-v66.js',
 'js/world-blueprint-v66.js','js/site-shell-v60.js','js/world-experience-v66.js'];
let last=-1;
for(const p of scripts){
 const current=html.indexOf('src="'+p+'?');
 assert.ok(current>last,'Incorrect asset order: '+p);last=current;
}
assert.ok(html.includes('css/world-experience-v66.css?'));
for(const file of ['js/world-taxonomy-v66.js','js/world-blueprint-v66.js']){
 assert.ok(!/\b(fetch\s*\(|localStorage\.|\.firestore\s*\()/.test(source(file)),
  file+' must not have live storage or network side effects');
}
console.log('DUDU V66: 6 genre gates, 48 mission seeds, contract-first and no-repeat preview OK');
