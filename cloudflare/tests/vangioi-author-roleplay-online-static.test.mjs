import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {prepareAuthorRoleplayOffline} from '../src/vangioi-author-roleplay-offline.mjs';
import {inspectCreatorQa} from '../../js/vangioi-creator-validation-entry.mjs';
import {richOnlineWorld,richOnlineManifest,richOnlineScript}
 from './fixtures/vangioi-rich-online-world.mjs';
import {lighthouseWorld} from './fixtures/vangioi-author-playtest-world.mjs';

const asset=name=>readFileSync(new URL('../../playtests/ben-suong/'+name,import.meta.url));
const text=name=>asset(name).toString('utf8');
const data=()=>JSON.parse(text('demo-content.json'));
const prepare=async()=>{
 const {world,manifest,script}=data();
 return prepareAuthorRoleplayOffline(world,manifest,script);
};
const choose=async(play,session,choiceId,eventId=randomUUID())=>play.choose(session,{
 choiceId,eventId,expectedRevision:session.revision});
const advance=async(play,entryId,...choices)=>{
 const started=await play.start(entryId);
 assert.equal(started.ok,true);
 let session=started.session;
 for(const choiceId of choices){
  const view=await play.view(session);
  assert.ok(view.choices.some(c=>c.choiceId===choiceId),choiceId);
  const applied=await choose(play,session,choiceId);
  assert.equal(applied.ok,true,choiceId);
  session=applied.session;
 }
 return play.view(session);
};

test('G5C-P4 source fixture and public world have four roles / three entry mechanisms',async()=>{
 const {world}=data(),qa=inspectCreatorQa(world);
 assert.equal(qa.valid,true);
 assert.deepEqual(qa.reachability.issues,[]);
 assert.equal(qa.reachability.profiles.length,4);
 assert.equal(qa.reachability.profiles.every(x=>x.possibleEndingCount===3),true);
 assert.deepEqual(world.playerEntryProfiles.map(p=>p.mode),
  ['cast_possession','cast_possession','native_extra','system_cover']);
 assert.equal(world.cast.filter(c=>c.playableAsCast).length,2);
 assert.equal(world.npcs[0].mode,'scripted');
 assert.equal(world.aiPolicy.aiNpcRequested,false);
 assert.equal(world.items.length,0);assert.equal(world.shops.length,0);
 assert.equal(world.missions[0].rewardRequest.exp,0);
});

test('G5C-P4 page has real on-site image links, restrictive CSP and no backend',()=>{
 const html=text('index.html'),js=text('app.js'),css=text('style.css');
 assert.match(html,/type="module"/);
 assert.match(html,/src="\.\/assets\/cau-cang.webp"/);
 assert.match(html,/img-src 'self'/);
 assert.match(html,/DEMO ONLINE|PLAYTEST G5C-P4/);
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/id="action-form"/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.ok(js.length>10000);
 assert.equal(html.includes('https://'),false);
});

test('G5C-P4 each registered image is an actual checked-in raster with exact content hash',()=>{
 const content=data().world;
 const links={'art-cover':'cau-cang','art-quay':'cau-cang','art-tower':'thap-den',
  'art-shelter':'nha-tru-bao','art-an':'vai-0','art-minh':'vai-1',
  'art-hao':'vai-2','art-inspector':'vai-3','art-lan':'ba-lan'};
 for(const item of content.assets){
  assert.ok(Object.hasOwn(links,item.assetId));
  const bytes=asset('assets/'+links[item.assetId]+'.webp');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.contentHash);
 }
 assert.ok(asset('assets/cau-cang.webp').length>30000);
});

test('G5C-P4 redacts author source truth, forbids Firebase auth and never claims rights',()=>{
 const payload=data(),raw=['index.html','app.js','style.css','demo-content.json']
  .map(text).join('\n');
 assert.notEqual(payload.world.story.secretTruth,richOnlineWorld().story.secretTruth);
 assert.match(payload.world.story.secretTruth,/không được phân phối/);
 for(const banned of ['PRIVATE_DEMO_CANON','securetoken@system.gserviceaccount.com',
  'firebase-admin','localStorage','indexedDB','jose','wrangler deploy'])
  assert.equal(raw.includes(banned),false,banned);
 assert.equal(raw.includes('https://www.googleapis.com'),false);
 assert.notEqual(payload.world.story.secretTruth,lighthouseWorld().story.secretTruth);
});

test('G5C-P4 repins manifest & script after redaction and uses G4A/G4B verified local engine',async()=>{
 const {world,manifest,script}=data();
 assert.deepEqual(manifest,await richOnlineManifest(world));
 assert.deepEqual(script,await richOnlineScript(world));
 assert.equal((await prepare()).ok,true);
});

test('G5C-P4 character provenance produces different start scenes, permissions and reactions',async()=>{
 const play=await prepare(),entries=play.entryProfiles;
 assert.deepEqual(entries.map(e=>e.entryId),['entry-protagonist','entry-supporting','entry-bystander','entry-virtual']);
 const states=await Promise.all(entries.map(async entry=>{
  const s=await play.start(entry.entryId),v=await play.view(s.session);
  return {entryId:entry.entryId,sceneId:v.sceneId,reaction:v.roleReaction,
   choices:v.choices.map(c=>c.choiceId)};
 }));
 assert.deepEqual(states.map(s=>s.sceneId),['scene-tower','scene-quay','scene-shelter','scene-quay']);
 assert.equal(new Set(states.map(s=>s.reaction)).size,4);
 assert.ok(states[0].choices.includes('choice-beacon'));
 assert.ok(states[1].choices.includes('choice-direct'));
 assert.ok(states[2].choices.includes('choice-warn-shelter'));
 assert.ok(!states[3].choices.includes('choice-tower'));
 assert.ok(!states[3].choices.includes('choice-direct'));
 assert.equal((await play.start('entry-forged-admin')).code,'unknown-entry');
});

test('G5C-P4 inspector cannot claim tower access without real author-declared steps',async()=>{
 const play=await prepare(),s=await play.start('entry-virtual');
 const talk=await choose(play,s.session,'choice-talk');
 assert.deepEqual((await play.view(talk.session)).choices.map(c=>c.choiceId),
  ['choice-warning','choice-leave-lan']);
 const denied=await choose(play,talk.session,'choice-access');
 assert.equal(denied.ok,false);
 const evidence=await advance(play,'entry-virtual','choice-ropes','choice-back-quay',
  'choice-talk','choice-access');
 assert.equal(evidence.sceneId,'scene-tower');
 assert.ok(evidence.flags.includes('checked_mooring'));
 assert.ok(evidence.flags.includes('trusted_access'));
});

test('G5C-P4 protagonist, sailor, bystander can reach distinct endings with different choices',async()=>{
 const play=await prepare();
 const beacon=await advance(play,'entry-protagonist','choice-beacon');
 assert.equal(beacon.narrativeEndingId,'ending-beacon');
 const rescued=await advance(play,'entry-supporting','choice-direct');
 assert.equal(rescued.narrativeEndingId,'ending-rescue');
 const shelter=await advance(play,'entry-bystander','choice-warn-shelter');
 assert.equal(shelter.narrativeEndingId,'ending-shelter');
 const ropeRescue=await advance(play,'entry-bystander','choice-bring-rope','choice-rescue-rope');
 assert.equal(ropeRescue.narrativeEndingId,'ending-rescue');
 for(const v of [beacon,rescued,shelter,ropeRescue]){
  assert.equal(v.missionCompleted,false);
  assert.equal(v.endingVerified,false);
  assert.equal(v.rewardAuthorized,false);
  assert.equal(v.saveCommitted,false);
  assert.equal(v.productionAuthorized,false);
  assert.deepEqual(v.choices,[]);
 }
});

test('G5C-P4 talking, investigating, reading and returning are replayable deterministic steps',async()=>{
 const play=await prepare();
 const v=await advance(play,'entry-protagonist','choice-read-log','choice-share-log',
  'choice-visit-quay','choice-talk','choice-warning','choice-back-quay');
 assert.equal(v.sceneId,'scene-quay');
 assert.ok(v.flags.includes('saw_log'));
 assert.ok(v.flags.includes('log_shared'));
 assert.ok(v.flags.includes('heard_lan'));
 assert.ok(v.revision===6);
});

test('G5C-P4 rejected choice cannot invent an ending or reward',async()=>{
 const play=await prepare(),s=await play.start('entry-virtual');
 const denied=await choose(play,s.session,'choice-beacon');
 assert.equal(denied.ok,false);
 const checked=await play.view(s.session);
 assert.equal(checked.revision,0);
 assert.equal(checked.narrativeEndingId,null);
 assert.equal(checked.rewardCommitted,false);
});

test('G5C-P4 duplicate G4B event receipt, conflict and replay guards still apply',async()=>{
 const play=await prepare(),s=await play.start('entry-bystander'),eventId=randomUUID();
 const a=await choose(play,s.session,'choice-bring-rope',eventId);
 const retry=await play.choose(a.session,{choiceId:'choice-bring-rope',eventId,expectedRevision:0});
 assert.equal(retry.ok,true);assert.equal(retry.duplicate,true);
 assert.deepEqual(retry.receipt,a.receipt);
 assert.equal(retry.session.revision,1);
 const conflict=await play.choose(a.session,{choiceId:'choice-warn-shelter',eventId,expectedRevision:0});
 assert.equal(conflict.code,'event-id-conflict');
 const forged=structuredClone(a.session);forged.state.flags.push('chose_rescue');
 assert.equal((await play.view(forged)).ok,false);
});

test('G5C-P4 visual demo is linked from Vạn Giới without touching live Worker/Creator',()=>{
 const shell=readFileSync(new URL('../../js/site-shell-v60.js',import.meta.url),'utf8');
 assert.match(shell,/playtests\/ben-suong\//);
 assert.match(shell,/Ngọn đèn cuối ở Bến Sương/);
 const entry=readFileSync(new URL('../../tools/vangioi/online-roleplay-entry.mjs',import.meta.url),'utf8');
 assert.equal(entry.includes('author-roleplay-browser-server'),false);
 for(const path of ['../src/index.mjs','../../js/vangioi-creator.js']){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.equal(source.includes('online-roleplay-entry'),false);
 }
});
