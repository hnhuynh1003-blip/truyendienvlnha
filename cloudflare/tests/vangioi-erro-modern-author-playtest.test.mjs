import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareAuthorRoleplayOffline} from '../src/vangioi-author-roleplay-offline.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';

const source=()=>JSON.parse(readFileSync(new URL('../../playtests/he-thong-erro/author-content.json',import.meta.url),'utf8'));
const prepared=async(data=source())=>prepareAuthorRoleplayOffline(data.world,data.manifest,data.script);
async function advance(entry,...steps){
 const p=await prepared();assert.equal(p.ok,true,p.code);
 const first=await p.start(entry);assert.equal(first.ok,true,first.code);
 let session=first.session;
 for(const choiceId of steps){
  const view=await p.view(session);
  assert.ok(view.choices.some(x=>x.choiceId===choiceId),`Ineligible ${choiceId} from ${view.sceneId} / ${entry}`);
  const r=await p.choose(session,{choiceId,eventId:randomUUID(),expectedRevision:session.revision});
  assert.equal(r.ok,true,r.code);session=r.session;
 }
 return {p,session,view:await p.view(session)};
}

test('P7 read-only story citation is not a forged Library source permit',()=>{
 const data=source(),ref=data.authoring.sourceReference;
 assert.equal(ref.title,'Hệ Thống ERR...O');
 assert.equal(ref.author,'Kẻ Lang Bạt');
 assert.deepEqual(ref.chapters,[3,4,5,6,7,8,9,10,11,12]);
 assert.equal(ref.verifiedLibrarySource,false);
 assert.equal(ref.sourcePermitVerified,false);
 assert.equal(data.world.storySource.kind,'original');
 assert.match(data.world.storySource.storyId,/adaptation-notes/);
 assert.equal(data.authoring.chapters.length,2);
 for(const c of data.authoring.chapters)assert.match(c.text,/GHI CHÚ CHUYỂN THỂ, KHÔNG PHẢI NGUYÊN VĂN/);
});

test('P7 world/scene/role metadata passes real G3C + G4A + G4B offline preparation',async()=>{
 const p=await prepared();assert.equal(p.ok,true,p.code);
 assert.deepEqual(p.entryProfiles.map(x=>x.mode),['cast_possession','cast_possession','native_extra','system_cover']);
 assert.equal(p.entryBriefings.length,4);
 for(const briefing of p.entryBriefings){
  for(const key of ['worldContext','roleMemory','incitingIncident','objective','boundaries'])
   assert.ok(briefing[key].length>35,briefing.entryId+': '+key);
 }
});

test('P7 Tử Du identity memory and first-person sensory limitations stay distinct',async()=>{
 const {p,view}=await advance('entry-tu-du','enter-school-entry');
 const b=p.entryBriefings.find(x=>x.entryId==='entry-tu-du');
 assert.match(b.roleMemory,/không thể nhận biết mặt người/i);
 assert.match(view.narration,/không phân biệt được khuôn mặt/);
 assert.match(view.narration,/giọng khàn/);
 assert.equal(view.sceneId,'scene-gate');
 assert.ok(view.choices.some(x=>x.choiceId==='begin-enrolment'));
 assert.equal(view.choices.some(x=>x.choiceId==='go-net'),false);
 assert.equal(view.choices.some(x=>x.choiceId==='visit-public-show'),false);
 assert.match(view.context,/12 TUỔI/);
});

test('P7 unverified cover stays in the same afternoon, never accesses school, VIP01 or future years',async()=>{
 const first=await advance('entry-cover','enter-school-entry');
 assert.match(first.view.narration,/không có xác minh/);
 assert.deepEqual(first.view.choices.map(x=>x.choiceId),['ask-public-way']);
 const road=await advance('entry-cover','enter-school-entry','ask-public-way');
 assert.equal(road.view.sceneId,'scene-town-walk');
 assert.match(road.view.context,/12 TUỔI/);
 const stopped=await advance('entry-cover','enter-school-entry','ask-public-way','record-public-only');
 assert.equal(stopped.view.narrativeEndingId,'ending-observer');
 assert.equal(stopped.view.flags.includes('kept-public-boundary'),true);
});

test('P7 classmate has local school knowledge but never inherits Tử Du private history',async()=>{
 const {p,view}=await advance('entry-classmate','enter-classmate-entry');
 assert.equal(view.sceneId,'scene-classroom');
 assert.match(view.narration,/không biết chuyện xét nghiệm huyết thống/);
 assert.doesNotMatch(view.narration,/bạn là Khương Tử Du/i);
 assert.ok(view.choices.some(x=>x.choiceId==='meet-classmate'));
 assert.equal(p.entryBriefings.find(x=>x.entryId==='entry-classmate').roleMemory.includes('Khối rubik'),false);
});

test('P7 lawyer begins at the legal desk without being teleported into 7B',async()=>{
 const {view}=await advance('entry-luc-thien','enter-lawyer-entry');
 assert.equal(view.sceneId,'scene-contract');
 assert.match(view.narration,/hai mươi lăm tuổi/);
 assert.match(view.dialogue,/Em chưa đói/);
 assert.equal(view.choices.some(x=>x.choiceId==='follow-teacher'),false);
 assert.match(view.context,/17 TUỔI/);
});

test('P7 Tử Du must traverse school enrollment, friendships and years before VIP01 or legal case',async()=>{
 const {view,session}=await advance('entry-tu-du',
  'enter-school-entry','begin-enrolment','follow-teacher','meet-classmate','continue-term','grow-years',
  'prepare-show','listen-invitation','years-to-seventeen','hear-knock',
  'advance-to-ceremony','drive-through-rain','protect-quiet');
 assert.equal(view.sceneId,'scene-quiet');
 assert.equal(view.narrativeEndingId,'ending-quiet');
 assert.equal(view.rewardAuthorized,false);assert.equal(view.worldPublished,false);
 assert.equal(view.productionAuthorized,false);assert.equal(view.missionCompleted,false);
 assert.equal(view.saveCommitted,false);assert.equal(session.revision,13);
});

test('P7 G4B event replay and CAS reject stale attempts while preserving receipt',async()=>{
 const p=await prepared();const started=await p.start('entry-tu-du');assert.equal(started.ok,true);
 const event={choiceId:'enter-school-entry',eventId:randomUUID(),expectedRevision:started.session.revision};
 const once=await p.choose(started.session,event);assert.equal(once.ok,true);
 const twice=await p.choose(once.session,event);
 assert.equal(twice.ok,true);assert.equal(twice.duplicate,true);
 assert.deepEqual(twice.receipt,once.receipt);
 const stale=await p.choose(once.session,{choiceId:'begin-enrolment',eventId:randomUUID(),expectedRevision:0});
 assert.equal(stale.ok,false);assert.equal(stale.rewardAuthorized,false);
});

test('P7 canonical graph strictly increases in sequence with no accidental time-travel backedges',()=>{
 const data=source(),scenes=new Map(data.world.scenes.map(s=>[s.sceneId,s])),board=new Map(data.authoring.storyboard.map(s=>[s.sceneId,s]));
 assert.equal(scenes.size,19);
 for(const scene of scenes.values()){
  assert.equal(board.has(scene.sceneId),true);
  for(const transition of scene.transitions){
   assert.ok(board.get(transition.toSceneId).sequence>board.get(scene.sceneId).sequence,
    'Backward or equal-time edge: '+scene.sceneId+' -> '+transition.toSceneId);
  }
 }
 assert.deepEqual(scenes.get('scene-gate').transitions.map(t=>t.toSceneId),['scene-admission','scene-town-walk']);
 assert.deepEqual(scenes.get('scene-entry').transitions.map(t=>t.toSceneId),['scene-gate','scene-classroom','scene-contract']);
 assert.deepEqual(scenes.get('scene-farewell').transitions.map(t=>t.toSceneId),['scene-netroom','scene-school-end']);
 assert.deepEqual(scenes.get('scene-netroom').transitions.map(t=>t.toSceneId),['scene-contract']);
});

test('P7 school friend sees 15-year-old farewell but cannot jump to 17-year-old legal events',async()=>{
 const {view}=await advance('entry-classmate','enter-classmate-entry','meet-classmate','continue-term','grow-years',
  'prepare-show','listen-invitation','leave-as-classmate');
 assert.equal(view.sceneId,'scene-school-end');
 assert.equal(view.narrativeEndingId,'ending-school');
 assert.equal(view.flags.includes('saw-school-years'),true);
});

test('P7 lawyer has an independent age-17 legal timeline and cannot undo Canon refusal',async()=>{
 const {view}=await advance('entry-luc-thien','enter-lawyer-entry','advance-to-ceremony','drive-through-rain');
 assert.equal(view.sceneId,'scene-river');
 assert.match(view.narration,/đã bày tỏ tình cảm/);
 assert.match(view.narration,/từ chối/);
 assert.ok(view.choices.every(c=>!/đồng ý|đáp lại tình yêu/.test(c.label)));
});

test('P7 prose edits are permitted locally but forged roles/actions are rejected',async()=>{
 const original=source(),draft=structuredClone(original);
 draft.script.entryBriefings[0].incitingIncident='TÁC GIẢ SỬA LẠI ĐIỂM VÀO THÂN PHẬN.';
 draft.script.pages[0].roleScenes['entry-tu-du'].narration='LỜI DẪN TỬ DU ĐƯỢC SỬA TRONG RAM.';
 assert.equal((await prepared(draft)).ok,true);
 const p=await prepared(draft),s=await p.start('entry-tu-du');
 assert.equal((await p.view(s.session)).narration,'LỜI DẪN TỬ DU ĐƯỢC SỬA TRONG RAM.');
 const wrong=structuredClone(original);wrong.script.pages[0].roleScenes['entry-admin']={narration:'forged'};
 assert.equal((await prepared(wrong)).ok,false);
 const reward=structuredClone(original);reward.script.pages[0].roleScenes['entry-tu-du'].choiceLabels={'grant-exp':'Cấp 100 EXP'};
 assert.equal((await prepared(reward)).ok,false);
});

test('P7 source notes can be rehashed without ever granting source or server authority',async()=>{
 const data=source(),draft=structuredClone(data);
 draft.authoring.chapters[0].text+='\nGhi chú thử diễn biến trường học.';
 draft.world.storySource.contentHash=await hashAuthoringJson(draft.authoring.chapters);
 draft.manifest.contentHash=await hashAuthoringJson(draft.world);
 draft.script.contentHash=draft.manifest.contentHash;
 assert.equal((await prepared(draft)).ok,true);
 assert.equal(draft.authoring.sourceReference.sourcePermitVerified,false);
});

test('P7 public author pane shows source reference, editable actor POV and clear no-production notice',()=>{
 const html=readFileSync(new URL('../../playtests/he-thong-erro/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../../tools/vangioi/erro-modern-author-playtest-entry.mjs',import.meta.url),'utf8');
 for(const id of ['chapter-select','scene-role-select','context-edit','briefing-select','briefing-stage',
  'accept-identity','scene-context-display','return-narration-edit'])assert.ok(html.includes(`id="${id}"`));
 assert.match(html,/Không sao chép nguyên văn truyện/);
 assert.match(html,/không phát hành thế giới/i);
 assert.match(js,/prepareAuthorRoleplayOffline/);
 assert.equal(html.includes('firebase'),false);
});
