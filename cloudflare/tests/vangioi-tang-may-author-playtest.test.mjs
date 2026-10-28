import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {inspectCreatorQa,parseDraft} from '../../js/vangioi-creator-validation-entry.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {prepareAuthorRoleplayOffline} from '../src/vangioi-author-roleplay-offline.mjs';
import {tangMayWorld,tangMayManifest,tangMayScript,SCI_FI_STORYBOARD}
 from './fixtures/vangioi-tang-may-9-author-world.mjs';

const read=path=>readFileSync(new URL('../../playtests/tang-may-9/'+path,import.meta.url));
const payload=()=>JSON.parse(read('author-content.json').toString('utf8'));
const play=async()=>{const {world,manifest,script}=payload();return prepareAuthorRoleplayOffline(world,manifest,script);};
const go=async(p,session,choiceId,eventId=randomUUID())=>p.choose(session,{choiceId,eventId,expectedRevision:session.revision});
const path=async(p,entryId,...steps)=>{
 const start=await p.start(entryId);assert.equal(start.ok,true);
 let session=start.session;
 for(const id of steps){
  const v=await p.view(session);assert.ok(v.choices.find(x=>x.choiceId===id),'Missing '+id);
  const next=await go(p,session,id);assert.equal(next.ok,true,id);session=next.session;
 }
 return p.view(session);
};

test('G5C-P5 source really contains 3 long authored chapters and an Arc-1 Canon Bible',async()=>{
 const source=readFileSync(new URL('../../contracts/vangioi/samples/tang-may-9/BAN_GHI_SO_0_TAC_PHAM_GOC.md',import.meta.url),'utf8');
 for(const marker of ['CHƯƠNG 01','CHƯƠNG 02','CHƯƠNG 03','STORY BIBLE','Hết Arc 1'])assert.ok(source.includes(marker));
 const {authoring,world}=payload();
 assert.equal(authoring.chapters.length,3);
 assert.ok(authoring.chapters.every(x=>x.text.length>1500));
 assert.deepEqual(authoring.storyboard,SCI_FI_STORYBOARD);
 assert.equal(world.storySource.contentHash,await hashAuthoringJson(authoring.chapters));
 assert.equal(world.genreId,'future');
 assert.equal(world.story.plotBeats.length,3);
 assert.match(source,/My.*sống sót|My.*đã được chuyển/u);
});

test('G5C-P5 source map covers ALL scenes, each image byte SHA matches asset metadata',()=>{
 const {authoring,world}=payload();
 assert.equal(world.scenes.length,11);
 assert.equal(new Set(authoring.storyboard.map(x=>x.sceneId)).size,11);
 assert.deepEqual(new Set(world.scenes.map(x=>x.sceneId)),new Set(authoring.storyboard.map(x=>x.sceneId)));
 const files={'art-city-cover':'thanh-pho','art-city':'thanh-pho','art-archive':'kho-ky-uc',
  'art-relay':'tram-relay','art-lam':'vai-0','art-khai':'vai-1','art-nhi':'vai-2',
  'art-k07':'vai-3','art-tuyen':'ong-tuyen'};
 for(const asset of world.assets){
  const name=files[asset.assetId];assert.ok(name,'Unknown asset '+asset.assetId);
  const bytes=read('assets/'+name+'.webp');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.contentHash);
 }
 assert.equal(world.characterAppearances[0].showOn,'dialogue_start');
 assert.equal(world.npcs[0].mode,'scripted');
});

test('G5C-P5 Creator G3C can import whole author world with 4 profiles and no permission grant',async()=>{
 const {world,manifest,script}=payload(),qa=inspectCreatorQa(world);
 assert.equal(parseDraft(JSON.stringify(world)).ok,true,'Must import using the real Creator draft parser');
 assert.equal(qa.valid,true,JSON.stringify(qa.errors));
 assert.deepEqual(qa.reachability.issues,[]);
 assert.equal(qa.reachability.profiles.length,4);
 assert.ok(qa.reachability.profiles.every(p=>p.possibleEndingCount===3));
 assert.deepEqual(manifest,await tangMayManifest(world));
 assert.deepEqual(script,await tangMayScript(world));
 assert.deepEqual(world.playerEntryProfiles.map(x=>x.mode),
  ['cast_possession','cast_possession','native_extra','system_cover']);
 assert.equal(world.missions[0].rewardRequest.exp,0);
 assert.equal(world.items.length,0);assert.equal(world.shops.length,0);
 assert.equal(world.aiPolicy.aiNpcRequested,false);
 assert.equal((await play()).ok,true);
});

test('G5C-P5 actor-specific entry scenes and access cannot be invented from a synthetic badge',async()=>{
 const p=await play(),v=[];
 for(const entry of p.entryProfiles){const s=await p.start(entry.entryId);v.push(await p.view(s.session));}
 assert.deepEqual(v.map(x=>x.sceneId),['scene-archive','scene-relay','scene-arrival','scene-arrival']);
 assert.equal(new Set(v.map(x=>x.roleReaction)).size,4);
 assert.ok(v[0].choices.some(x=>x.choiceId==='read-record'));
 assert.ok(v[1].choices.some(x=>x.choiceId==='inspect-relay'));
 assert.ok(v[2].choices.some(x=>x.choiceId==='find-witness'));
 assert.ok(!v[3].choices.some(x=>x.choiceId==='enter-archive'));
 assert.ok(!v[3].choices.some(x=>x.choiceId==='go-relay'));
 const s=await p.start('entry-k07');
 assert.equal((await go(p,s.session,'enter-archive')).ok,false);
 assert.equal((await p.start('entry-admin')).code,'unknown-entry');
});

test('G5C-P5 K-07 gains conditional archive access by evidence, not self-asserted role',async()=>{
 const p=await play();
 const blocked=await path(p,'entry-k07','ask-tuyen');
 assert.equal(blocked.sceneId,'scene-tuyen');
 assert.ok(!blocked.choices.some(x=>x.choiceId==='permission-archive'));
 const verified=await path(p,'entry-k07','scan-public','trace-tuyen','permission-archive');
 assert.equal(verified.sceneId,'scene-archive');
 assert.ok(verified.flags.includes('verified_trace'));
 assert.equal(verified.rewardAuthorized,false);
});

test('G5C-P5 no instant public truth: both archived record and witness needed',async()=>{
 const p=await play(),s=await p.start('entry-lam');
 assert.ok(!(await p.view(s.session)).choices.some(x=>x.choiceId==='publish-file'));
 const record=await path(p,'entry-lam','read-record');
 assert.ok(!record.choices.some(x=>x.choiceId==='publish-record'));
 const published=await path(p,'entry-lam','read-record','seek-voice','record-testimony',
  'enter-archive','publish-file');
 assert.equal(published.narrativeEndingId,'ending-publish');
});

test('G5C-P5 three asymmetric what-if endings, no Canon or item reward',async()=>{
 const p=await play();
 const leak=await path(p,'entry-nhi','find-witness','send-tape');
 assert.equal(leak.narrativeEndingId,'ending-leak');
 const seal=await path(p,'entry-khai','inspect-relay','diagnose-loop','follow-alarm',
  'inspect-relay','isolate-loop');
 assert.equal(seal.narrativeEndingId,'ending-seal');
 const blocked=await path(p,'entry-lam','leave-archive','find-witness');
 assert.ok(!blocked.choices.some(x=>x.choiceId==='send-tape'));
 for(const v of [leak,seal]){
  assert.equal(v.missionCompleted,false);assert.equal(v.rewardAuthorized,false);
  assert.equal(v.rewardCommitted,false);assert.equal(v.saveCommitted,false);
  assert.equal(v.productionAuthorized,false);assert.equal(v.endingVerified,false);
 }
});

test('G5C-P5 local author edit really re-pins source, world and engine before preview',async()=>{
 const {world,manifest,script,authoring}=payload(),changed=structuredClone(authoring.chapters);
 changed[0].text+='\n\nCÂU MỚI DO TÁC GIẢ THỬ NGHIỆM.';
 const draft=structuredClone(world),engine=structuredClone(manifest),pages=structuredClone(script);
 draft.storySource.contentHash=await hashAuthoringJson(changed);
 draft.story.opening=changed[0].text.slice(0,250);
 pages.pages[0].narration='CẢNH THỬ DO TÁC GIẢ ĐÃ SỬA.';
 assert.equal((await prepareAuthorRoleplayOffline(draft,engine,pages)).ok,false);
 engine.contentHash=await hashAuthoringJson(draft);
 pages.contentHash=engine.contentHash;
 const p=await prepareAuthorRoleplayOffline(draft,engine,pages);
 assert.equal(p.ok,true,p.code);
 const s=await p.start('entry-nhi');const v=await p.view(s.session);
 assert.equal(v.narration,'CẢNH THỬ DO TÁC GIẢ ĐÃ SỬA.');
 assert.equal(v.saveCommitted,false);
});

test('G5C-P5 G4B retry and tamper-guard remain in the author-to-play path',async()=>{
 const p=await play(),s=await p.start('entry-nhi'),eventId=randomUUID();
 const first=await go(p,s.session,'find-witness',eventId);
 const again=await p.choose(first.session,{choiceId:'find-witness',eventId,expectedRevision:0});
 assert.equal(again.ok,true);assert.equal(again.duplicate,true);
 assert.deepEqual(again.receipt,first.receipt);
 const conflict=await p.choose(first.session,{choiceId:'scan-public',eventId,expectedRevision:0});
 assert.equal(conflict.code,'event-id-conflict');
 const forged=structuredClone(first.session);forged.state.flags.push('chose_publish');
 assert.equal((await p.view(forged)).ok,false);
});

test('G5C-P5 public author page is readable, local-only and linked from VẠN GIỚI',()=>{
 const html=read('index.html').toString('utf8'),css=read('style.css').toString('utf8'),
  js=read('app.js').toString('utf8'),json=read('author-content.json').toString('utf8');
 assert.match(html,/AUTHOR TEST/);assert.match(html,/id="chapter-text"/);
 assert.match(html,/id="narration-edit"/);assert.match(html,/id="validate-button"/);
 assert.match(html,/img-src 'self'/);assert.match(html,/noindex,nofollow/);
 assert.match(css,/17px\/1\.75/);assert.match(css,/@media\(max-width:570px\)/);
 assert.ok(js.length>10000);
 for(const banned of ['PRIVATE_AUTHOR_CANON','firebase-admin','indexedDB','localStorage',
  'securetoken@system.gserviceaccount.com','https://www.googleapis.com']){
  assert.equal([html,js,json].join('\n').includes(banned),false,banned);
 }
 const shell=readFileSync(new URL('../../js/site-shell-v60.js',import.meta.url),'utf8');
 assert.match(shell,/playtests\/tang-may-9\//);
 for(const path of ['../src/index.mjs','../../js/vangioi-creator.js'])
  assert.equal(readFileSync(new URL(path,import.meta.url),'utf8').includes('tang-may-author-playtest-entry'),false);
});
