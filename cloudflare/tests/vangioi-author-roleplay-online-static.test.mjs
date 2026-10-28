import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {prepareAuthorRoleplayOffline} from '../src/vangioi-author-roleplay-offline.mjs';
import {lighthouseWorld,lighthouseEngineManifest,lighthousePlaytestScript}
 from './fixtures/vangioi-author-playtest-world.mjs';

const asset=name=>readFileSync(new URL('../../playtests/ben-suong/'+name,import.meta.url),'utf8');
const data=()=>JSON.parse(asset('demo-content.json'));
const prepare=async()=>{
 const {world,manifest,script}=data();
 return prepareAuthorRoleplayOffline(world,manifest,script);
};
const choose=async(play,session,choiceId)=>play.choose(session,{choiceId,
 eventId:randomUUID(),expectedRevision:session.revision});

test('G5C-P3 public static build contains all four same-origin assets, no external services',()=>{
 const html=asset('index.html'),js=asset('app.js'),css=asset('style.css');
 assert.match(html,/type="module"/);
 assert.match(html,/src="\.\/app\.js"/);
 assert.match(html,/href="\.\/style\.css"/);
 assert.match(html,/script-src 'self'; style-src 'self'; connect-src 'self'/);
 assert.match(html,/DEMO ONLINE · KHÔNG LƯU/);
 assert.match(html,/noindex,nofollow/);
 assert.match(css,/@media \(max-width:390px\)/);
 assert.ok(js.length>10000);
 assert.equal(html.includes('https://'),false);
});

test('G5C-P3 redacts the private source truth and never bundles server auth or private source',()=>{
 const payload=data(),raw=[asset('index.html'),asset('app.js'),
  asset('style.css'),asset('demo-content.json')].join('\n');
 assert.notEqual(payload.world.story.secretTruth,lighthouseWorld().story.secretTruth);
 assert.match(payload.world.story.secretTruth,/không được phân phối/);
 for(const banned of ['PRIVATE_DEMO_CANON','securetoken@system.gserviceaccount.com',
  'firebase-admin','localStorage','indexedDB','jose','wrangler deploy'])
  assert.equal(raw.includes(banned),false,banned);
 assert.equal(raw.includes('https://www.googleapis.com'),false);
});

test('G5C-P3 re-pins manifest and narrative script after public redaction',async()=>{
 const {world,manifest,script}=data();
 assert.deepEqual(manifest,await lighthouseEngineManifest(world));
 assert.deepEqual(script,await lighthousePlaytestScript(world));
 assert.equal((await prepare()).ok,true);
});

test('G5C-P3 website engine keeps distinct character reactions and two author choices',async()=>{
 const play=await prepare();
 assert.deepEqual(play.entryProfiles.map(x=>x.mode),['native_extra','system_cover']);
 const a=await play.start('entry-local'),b=await play.start('entry-inspector');
 const va=await play.view(a.session),vb=await play.view(b.session);
 assert.notEqual(va.roleReaction,vb.roleReaction);
 assert.deepEqual(va.choices.map(c=>c.choiceId),['choice-rescue','choice-beacon']);
 assert.equal(va.productionAuthorized,false);
});

test('G5C-P3 online rescue ending is narrative only, not mission evidence or reward',async()=>{
 const play=await prepare(),start=await play.start('entry-local');
 const a=await choose(play,start.session,'choice-rescue');
 const b=await choose(play,a.session,'choice-finish-rescue');
 const end=await play.view(b.session);
 assert.equal(end.narrativeEndingId,'ending-rescue');
 for(const field of ['endingVerified','missionCompleted','rewardAuthorized',
  'rewardCommitted','saveCommitted','productionAuthorized','rightsVerified'])
  assert.equal(end[field],false);
});

test('G5C-P3 online beacon branch gives different consequence with no backend',async()=>{
 const play=await prepare(),start=await play.start('entry-inspector');
 const a=await choose(play,start.session,'choice-beacon');
 const b=await choose(play,a.session,'choice-finish-beacon');
 const end=await play.view(b.session);
 assert.equal(end.narrativeEndingId,'ending-beacon');
 assert.equal(end.saveCommitted,false);
 assert.equal(end.worldPublished,false);
 assert.equal(end.choices.length,0);
});

test('G5C-P3 online G4B retry cannot replay or change a choice',async()=>{
 const play=await prepare(),start=await play.start('entry-local'),eventId=randomUUID();
 const first=await play.choose(start.session,{choiceId:'choice-rescue',eventId,expectedRevision:0});
 const retry=await play.choose(first.session,{choiceId:'choice-rescue',eventId,expectedRevision:0});
 assert.equal(retry.ok,true);assert.equal(retry.duplicate,true);
 assert.equal(retry.session.revision,1);
 const conflict=await play.choose(retry.session,{choiceId:'choice-beacon',eventId,expectedRevision:0});
 assert.equal(conflict.code,'event-id-conflict');
});

test('G5C-P3 website never imports demo into live Worker/Creator or publishes world status',()=>{
 const html=asset('index.html'),source=readFileSync(new URL('../../tools/vangioi/online-roleplay-entry.mjs',import.meta.url),'utf8');
 assert.equal(html.includes('Gửi duyệt'),false);
 assert.equal(source.includes('author-roleplay-browser-server'),false);
 for(const path of ['../src/index.mjs','../../js/vangioi-creator.js'])
  assert.equal(readFileSync(new URL(path,import.meta.url),'utf8').includes('online-roleplay-entry'),false);
});
