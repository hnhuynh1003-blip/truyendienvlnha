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
 assert.match(view.narration,/\btôi\b/i);
 assert.match(view.narration,/gương mặt.*nhòe/);
 assert.match(view.narration,/giọng đàn ông khàn/);
 assert.equal(view.sceneId,'scene-gate');
 assert.ok(view.choices.some(x=>x.choiceId==='begin-enrolment'));
 assert.equal(view.choices.some(x=>x.choiceId==='go-net'),false);
 assert.equal(view.choices.some(x=>x.choiceId==='visit-public-show'),false);
 assert.match(view.context,/12 TUỔI/);
});

test('P7 unverified cover stays in the same afternoon, never accesses school, VIP01 or future years',async()=>{
 const first=await advance('entry-cover','enter-school-entry');
 assert.match(first.view.narration,/^Tôi /);
 assert.match(first.view.narration,/giấy giới thiệu/);
 assert.deepEqual(first.view.choices.map(x=>x.choiceId),['ask-public-way']);
 const road=await advance('entry-cover','enter-school-entry','ask-public-way');
 assert.equal(road.view.sceneId,'scene-town-walk');
 assert.match(road.view.context,/12 TUỔI/);
 assert.deepEqual(road.view.choices.map(x=>x.choiceId),['visit-public-library','ask-public-station']);
 const stopped=await advance('entry-cover','enter-school-entry','ask-public-way','visit-public-library','finish-public-library');
 assert.equal(stopped.view.narrativeEndingId,'ending-observer');
 assert.equal(stopped.view.flags.includes('kept-public-boundary'),true);
});

test('P7 classmate has local school knowledge but never inherits Tử Du private history',async()=>{
 const {p,view}=await advance('entry-classmate','enter-classmate-entry');
 assert.equal(view.sceneId,'scene-classroom');
 assert.match(view.narration,/\btôi\b/i);
 assert.match(view.narration,/cô Tần vừa vào lớp/i);
 assert.doesNotMatch(view.narration,/CryoTech|gia tộc|kết quả xét nghiệm/i);
 assert.doesNotMatch(view.narration,/tôi đã rời hai gia tộc/i);
 assert.deepEqual(view.choices.map(x=>x.choiceId),['class-engage','class-observe']);
 assert.equal(p.entryBriefings.find(x=>x.entryId==='entry-classmate').roleMemory.includes('Khối rubik'),false);
});

test('P7 lawyer begins at the legal desk without being teleported into 7B',async()=>{
 const {view}=await advance('entry-luc-thien','enter-lawyer-entry');
 assert.equal(view.sceneId,'scene-contract');
 assert.match(view.narration,/^Tôi /);
 assert.match(view.narration,/VIP01/);
 assert.match(view.narration,/canh hạt sen/);
 assert.match(view.dialogue,/Em chưa đói/);
 assert.equal(view.choices.some(x=>x.choiceId==='follow-teacher'),false);
 assert.match(view.context,/17 TUỔI/);
});

test('P7 Tử Du must traverse school enrollment, friendships and years before VIP01 or legal case',async()=>{
 const {view,session}=await advance('entry-tu-du',
  'enter-school-entry','begin-enrolment','follow-teacher','class-engage','finish-class-talk',
  'share-care','finish-meal-care','grow-years','prepare-show','listen-invitation',
  'years-to-seventeen','hear-knock','prioritize-meal','finish-lawyer-care',
  'drive-through-rain','protect-quiet');
 assert.equal(view.sceneId,'scene-quiet');
 assert.equal(view.narrativeEndingId,'ending-quiet');
 assert.equal(view.rewardAuthorized,false);assert.equal(view.worldPublished,false);
 assert.equal(view.productionAuthorized,false);assert.equal(view.missionCompleted,false);
 assert.equal(view.saveCommitted,false);assert.equal(session.revision,16);
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
 assert.equal(scenes.size,28);
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
 assert.deepEqual(scenes.get('scene-classroom').transitions.map(t=>t.toSceneId),['scene-class-talk','scene-class-quiet']);
 assert.deepEqual(scenes.get('scene-contract').transitions.map(t=>t.toSceneId),['scene-lawyer-care','scene-lawyer-report']);
});

test('P7 school friend sees 15-year-old farewell but cannot jump to 17-year-old legal events',async()=>{
 const {view}=await advance('entry-classmate','enter-classmate-entry','class-observe','finish-class-quiet',
  'share-music','finish-meal-music','grow-years','prepare-show','listen-invitation','leave-as-classmate');
 assert.equal(view.sceneId,'scene-school-end');
 assert.equal(view.narrativeEndingId,'ending-school');
 assert.equal(view.flags.includes('saw-school-years'),true);
});

test('P7 lawyer has an independent age-17 legal timeline and cannot undo Canon refusal',async()=>{
 const {view}=await advance('entry-luc-thien','enter-lawyer-entry','review-file-first','finish-lawyer-report','drive-through-rain');
 assert.equal(view.sceneId,'scene-river');
 assert.match(view.narration,/\btôi\b/i);
 assert.match(view.narration,/rút tay khỏi tay tôi/);
 assert.match(view.narration,/Câu trả lời rõ ràng/);
 assert.ok(view.choices.every(c=>!/đồng ý|đáp lại tình yêu/.test(c.label)));
});

test('P7.2 classroom, lunch, lawyer and cover decisions produce distinct first-person outcomes',async()=>{
 const pairs=[
  ['entry-tu-du',['enter-school-entry','begin-enrolment','follow-teacher'],['class-engage','class-observe']],
  ['entry-classmate',['enter-classmate-entry'],['class-engage','class-observe']],
  ['entry-tu-du',['enter-school-entry','begin-enrolment','follow-teacher','class-engage','finish-class-talk'],['share-care','share-music']],
  ['entry-luc-thien',['enter-lawyer-entry'],['prioritize-meal','review-file-first']],
  ['entry-cover',['enter-school-entry','ask-public-way'],['visit-public-library','ask-public-station']]
 ];
 for(const [entry,prefix,ids] of pairs){
  const first=await advance(entry,...prefix,ids[0]);
  const second=await advance(entry,...prefix,ids[1]);
  assert.notEqual(first.view.sceneId,second.view.sceneId,entry+': branch destinations');
  assert.notEqual(first.view.narration,second.view.narration,entry+': branch response');
  assert.match(first.view.narration,/\btôi\b/i);assert.match(second.view.narration,/\btôi\b/i);
  for(const x of [first,second]){
   assert.equal(x.view.rewardAuthorized,false);
   assert.equal(x.view.productionAuthorized,false);
   assert.equal(x.view.saveCommitted,false);
  }
 }
});

test('P7.2 protagonist can explore separate what-if without rewriting canon or receiving reward',async()=>{
 const prefix=['enter-school-entry','begin-enrolment','follow-teacher','class-engage','finish-class-talk',
  'share-care','finish-meal-care','grow-years','prepare-show'];
 const original=source(),before=JSON.stringify(original.authoring.chapters);
 const canonical=await advance('entry-tu-du',...prefix,'listen-invitation');
 const divergent=await advance('entry-tu-du',...prefix,'imagine-with-tinhdao');
 assert.equal(canonical.view.sceneId,'scene-farewell');
 assert.equal(divergent.view.sceneId,'scene-whatif-tinhdao');
 assert.equal(divergent.view.narrativeEndingId,'ending-whatif-tinhdao');
 assert.match(divergent.view.narration,/\btôi\b/i);
 assert.equal(divergent.view.flags.includes('chose-whatif-tinhdao'),true);
 assert.equal(divergent.view.rewardAuthorized,false);
 assert.equal(divergent.view.saveCommitted,false);
 assert.equal(JSON.stringify(source().authoring.chapters),before);
 const friend=await advance('entry-classmate','enter-classmate-entry','class-engage','finish-class-talk',
  'share-music','finish-meal-music','grow-years','prepare-show');
 assert.deepEqual(friend.view.choices.map(x=>x.choiceId),['listen-invitation']);
});

test('P7.2 every non-entry scene reachable by each role speaks only from first-person POV',async()=>{
 const plans={
  'entry-tu-du':['enter-school-entry','begin-enrolment','follow-teacher','class-observe','finish-class-quiet',
   'share-music','finish-meal-music','grow-years','prepare-show','listen-invitation','years-to-seventeen',
   'hear-knock','review-file-first','finish-lawyer-report','drive-through-rain','stay-and-listen'],
  'entry-classmate':['enter-classmate-entry','class-engage','finish-class-talk','share-care','finish-meal-care',
   'grow-years','prepare-show','listen-invitation','leave-as-classmate'],
  'entry-luc-thien':['enter-lawyer-entry','prioritize-meal','finish-lawyer-care','drive-through-rain','leave-early'],
  'entry-cover':['enter-school-entry','ask-public-way','ask-public-station','finish-public-station']
 };
 for(const [entry,choices] of Object.entries(plans)){
  const p=await prepared();assert.equal(p.ok,true,p.code);
  let {session}=await p.start(entry);
  for(const choiceId of choices){
   const action=await p.choose(session,{choiceId,eventId:randomUUID(),expectedRevision:session.revision});
   assert.equal(action.ok,true,entry+'/'+choiceId+': '+action.code);
   session=action.session;
   const view=await p.view(session);
   assert.match(view.narration,/\btôi\b/i,entry+'/'+view.sceneId);
   assert.doesNotMatch(view.narration,/\b(?:CANON|G4A|G4B|SYSTEM|revision)\b|bản thử|không có quyền|nhánh giả định/i,
    entry+'/'+view.sceneId+': authoring jargon must not interrupt literary POV');
   assert.equal(view.productionAuthorized,false);
  }
 }
});

test('P7.3 authored role scenes use paragraph beats, natural narration, and avoid repeated system dialogue',async()=>{
 const data=source();
 for(const page of data.script.pages){
  if(page.sceneId==='scene-entry')continue;
  for(const [role,variant] of Object.entries(page.roleScenes||{})){
   assert.ok(variant.narration?.includes('\n\n'),page.sceneId+'/'+role+': lacks prose pacing');
   assert.match(variant.narration,/\btôi\b/i,page.sceneId+'/'+role+': not role-first person');
   assert.doesNotMatch(variant.narration,/\b(?:G4A|G4B|CANON|SYSTEM|revision)\b|bản thử|không có quyền/i,
    page.sceneId+'/'+role+': leaked author-console text');
  }
 }
 const byId=id=>data.script.pages.find(x=>x.sceneId==='scene-'+id);
 assert.equal(byId('rehearsal').roleScenes['entry-tu-du'].dialogue,'');
 assert.equal(byId('cover-library').roleScenes['entry-cover'].dialogue,'');
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
 const css=readFileSync(new URL('../../playtests/he-thong-erro/style.css',import.meta.url),'utf8');
 for(const id of ['chapter-select','scene-role-select','context-edit','briefing-select','briefing-stage',
  'accept-identity','system-toast','return-narration-edit'])assert.ok(html.includes(`id="${id}"`));
 for(const removed of ['scene-context-display','source-echo','evidence-list','current-goal'])
  assert.equal(html.includes(`id="${removed}"`),false);
 assert.match(html,/Không sao chép nguyên văn truyện/);
 assert.match(html,/không phát hành thế giới/i);
 assert.match(js,/prepareAuthorRoleplayOffline/);
 assert.match(css,/\.story-prose/);
 assert.match(css,/Georgia,Cambria/);
 assert.match(css,/\.choice::before/);
 assert.equal(html.includes('firebase'),false);
});
