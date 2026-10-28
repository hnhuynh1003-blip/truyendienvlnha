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
 const {p,view}=await advance('entry-tu-du');
 const b=p.entryBriefings.find(x=>x.entryId==='entry-tu-du');
 assert.match(b.roleMemory,/không thể nhận biết mặt người/i);
 assert.match(view.narration,/không phân biệt được khuôn mặt/);
 assert.match(view.narration,/giọng khàn/);
 assert.equal(view.sceneId,'scene-gate');
 assert.ok(view.choices.some(x=>x.choiceId==='enter-class'));
});

test('P7 unverified system-cover cannot cross the school gate or open a private lawyer file',async()=>{
 const first=await advance('entry-cover');
 assert.match(first.view.narration,/không có xác minh/);
 assert.equal(first.view.choices.some(x=>x.choiceId==='enter-class'),false);
 assert.ok(first.view.choices.some(x=>x.choiceId==='visit-public-show'));
 const publicNet=await advance('entry-cover','go-net');
 assert.equal(publicNet.view.sceneId,'scene-netroom');
 assert.equal(publicNet.view.choices.some(x=>x.choiceId==='ask-lawyer'),false);
 assert.ok(publicNet.view.choices.some(x=>x.choiceId==='return-school'));
 const show=await advance('entry-cover','visit-public-show');
 assert.match(show.view.narration,/khu vực khách xem chương trình/);
});

test('P7 classmate has local school knowledge but never inherits Tử Du private history',async()=>{
 const {p,view}=await advance('entry-classmate');
 assert.equal(view.sceneId,'scene-classroom');
 assert.match(view.narration,/không biết chuyện xét nghiệm huyết thống/);
 assert.doesNotMatch(view.narration,/bạn là Khương Tử Du/i);
 assert.ok(view.choices.some(x=>x.choiceId==='share-lunch'));
 assert.equal(p.entryBriefings.find(x=>x.entryId==='entry-classmate').roleMemory.includes('Khối rubik'),false);
});

test('P7 lawyer begins at the legal desk without being teleported into 7B',async()=>{
 const {view}=await advance('entry-luc-thien');
 assert.equal(view.sceneId,'scene-contract');
 assert.match(view.narration,/Lục Thiển đang kiểm/);
 assert.match(view.dialogue,/Thư ký báo/);
 assert.equal(view.choices.some(x=>x.choiceId==='enter-class'),false);
});

test('P7 Tử Du follows a coherent 6→7 chain and ending is never Canon/reward',async()=>{
 const {view,session}=await advance('entry-tu-du','enter-class','share-lunch','walk-net','ask-lawyer','attend-show','protect-quiet');
 assert.equal(view.sceneId,'scene-quiet');
 assert.equal(view.narrativeEndingId,'ending-quiet');
 assert.equal(view.rewardAuthorized,false);assert.equal(view.worldPublished,false);
 assert.equal(view.productionAuthorized,false);assert.equal(view.missionCompleted,false);
 assert.equal(view.saveCommitted,false);assert.equal(session.revision,6);
});

test('P7 G4B event replay and CAS reject stale attempts while preserving receipt',async()=>{
 const p=await prepared();const started=await p.start('entry-tu-du');assert.equal(started.ok,true);
 const event={choiceId:'enter-class',eventId:randomUUID(),expectedRevision:started.session.revision};
 const once=await p.choose(started.session,event);assert.equal(once.ok,true);
 const twice=await p.choose(once.session,event);
 assert.equal(twice.ok,true);assert.equal(twice.duplicate,true);
 assert.deepEqual(twice.receipt,once.receipt);
 const stale=await p.choose(once.session,{choiceId:'follow-rehearsal',eventId:randomUUID(),expectedRevision:0});
 assert.equal(stale.ok,false);assert.equal(stale.rewardAuthorized,false);
});

test('P7 return narrative changes after revisiting school or private room',async()=>{
 const {view}=await advance('entry-tu-du','go-net','return-school');
 assert.equal(view.sceneId,'scene-gate');assert.equal(view.visitCount,2);
 assert.match(view.narration,/quay lại cổng trường/);
 assert.doesNotMatch(view.narration,/vừa bước xuống xe/);
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
