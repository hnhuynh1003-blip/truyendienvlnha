import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {prepareAuthorRoleplayOffline} from '../src/vangioi-author-roleplay-offline.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';

const payload=()=>JSON.parse(readFileSync(new URL('../../playtests/tang-may-9/author-content.json',import.meta.url),'utf8'));
const prepare=async(content=payload())=>prepareAuthorRoleplayOffline(content.world,content.manifest,content.script);
const advance=async(engine,entryId,...choices)=>{
 const started=await engine.start(entryId);assert.equal(started.ok,true);
 let session=started.session;
 for(const choiceId of choices){
  const view=await engine.view(session);
  assert.ok(view.choices.some(choice=>choice.choiceId===choiceId),`Missing ${choiceId} for ${entryId}`);
  const result=await engine.choose(session,{choiceId,eventId:randomUUID(),expectedRevision:session.revision});
  assert.equal(result.ok,true,choiceId);session=result.session;
 }
 return engine.view(session);
};

test('G5C-P6 four author-written identity briefings explain prior life, incident and goal',async()=>{
 const p=await prepare();assert.equal(p.ok,true,p.code);
 assert.equal(p.entryBriefings.length,4);
 assert.deepEqual(p.entryBriefings.map(b=>b.entryId),
  ['entry-lam','entry-khai','entry-nhi','entry-k07']);
 const distinct=new Set(p.entryBriefings.map(b=>b.incitingIncident));assert.equal(distinct.size,4);
 for(const b of p.entryBriefings){
  for(const key of ['worldContext','roleMemory','incitingIncident','objective','boundaries'])
   assert.ok(b[key].length>50,`${b.entryId} missing ${key}`);
 }
 assert.match(p.entryBriefings[2].roleMemory,/bà bán cháo/i);
 assert.match(p.entryBriefings[3].boundaries,/không có quyền tự mở kho/i);
 assert.equal(p.entryBriefings[2].worldPublished,undefined);
});

test('G5C-P6 same arrival scene is written in the actual actor POV, never asking Nhi to meet Nhi',async()=>{
 const p=await prepare();
 const nhi=await advance(p,'entry-nhi'),k07=await advance(p,'entry-k07');
 assert.equal(nhi.sceneId,'scene-arrival');assert.equal(k07.sceneId,'scene-arrival');
 assert.match(nhi.narration,/Nhi vừa cúi xuống/);
 assert.match(nhi.dialogue,/Nhi! Sang đây/);
 assert.match(k07.narration,/thẻ thanh tra mới kích hoạt/);
 assert.notEqual(nhi.narration,k07.narration);
 assert.ok(nhi.choices.every(c=>!c.label.includes('Gặp Nhi')));
 assert.match(nhi.choices.find(c=>c.choiceId==='find-witness').label,/bà đang gọi mình/);
 assert.match(k07.choices.find(c=>c.choiceId==='find-witness').label,/người giao hàng/);
 assert.match(nhi.context,/mười bảy phút/);
});

test('G5C-P6 Nhi hears the elderly witness, not her own disembodied NPC',async()=>{
 const p=await prepare();
 const v=await advance(p,'entry-nhi','find-witness');
 assert.equal(v.sceneId,'scene-witness');
 assert.match(v.narration,/Nhi lách qua mái bạt/);
 assert.match(v.dialogue,/Bà bán cháo/);
 assert.equal(v.choices.find(c=>c.choiceId==='send-tape').label,
  'Tự mang bản sao tới các gia đình chờ tin.');
 assert.doesNotMatch(v.dialogue,/Nhi nói:/);
 const lam=await advance(p,'entry-lam','read-record','seek-voice');
 assert.match(lam.dialogue,/Nhi nói:/);
 assert.match(lam.context,/người bán cháo/);
});

test('G5C-P6 replay-derived scene visits change the prose, never replay opening incident after return',async()=>{
 const p=await prepare();
 const first=await advance(p,'entry-nhi');assert.equal(first.visitCount,1);
 assert.match(first.narration,/Nhi vừa cúi xuống/);
 const back=await advance(p,'entry-nhi','find-witness','record-testimony');
 assert.equal(back.sceneId,'scene-arrival');assert.equal(back.visitCount,2);
 assert.match(back.narration,/Nhi trở lại cầu tàu/);
 assert.doesNotMatch(back.narration,/vừa cúi xuống kiểm tra kiện hàng/);
 const other=await advance(p,'entry-k07','scan-public','back-arrival');
 assert.equal(other.visitCount,2);assert.match(other.narration,/K-07 trở lại cầu tàu/);
 assert.equal(other.rewardAuthorized,false);
});

test('G5C-P6 opening scenes for Lam and Khải establish why they are already there',async()=>{
 const p=await prepare();
 const lam=await advance(p,'entry-lam'),khai=await advance(p,'entry-khai');
 assert.match(lam.narration,/Lam mở kho lưu trữ bằng chìa khóa/);
 assert.match(lam.narration,/My/);
 assert.match(khai.narration,/Khải đang trực kỹ thuật/);
 assert.match(khai.context,/cầu dao cơ khí/);
 assert.ok(!lam.choices.some(c=>c.choiceId==='publish-file'));
 assert.ok(!khai.choices.some(c=>c.choiceId==='engineer-vault'&&c.label.includes('tự do sửa')));
});

test('G5C-P6 K-07 can meet Tuyên at reception, not cross the archive door without evidence',async()=>{
 const p=await prepare();
 const start=await advance(p,'entry-k07');
 assert.ok(!start.choices.some(c=>c.choiceId==='enter-archive'));
 const reception=await advance(p,'entry-k07','ask-tuyen');
 assert.match(reception.context,/quầy tiếp nhận bên ngoài/);
 assert.match(reception.narration,/Cánh cửa lưu trữ phía sau ông Tuyên vẫn khóa/);
 assert.ok(!reception.choices.some(c=>c.choiceId==='permission-archive'));
 const archive=await advance(p,'entry-k07','scan-public','trace-tuyen','permission-archive');
 assert.match(archive.narration,/Sau khi trình dấu vết phát sóng/);
 assert.equal(archive.rewardAuthorized,false);
});

test('G5C-P6 author modifications to actor-specific text and briefing are in local script only',async()=>{
 const data=payload(),newData=structuredClone(data);
 newData.script.entryBriefings[2].incitingIncident='THỬ TÁC GIẢ VIẾT LẠI MỞ ĐẦU NHI.';
 newData.script.pages[0].roleScenes['entry-nhi'].narration='CẢNH NHI ĐƯỢC TÁC GIẢ VIẾT LẠI.';
 newData.script.pages[0].roleScenes['entry-nhi'].choiceLabels['find-witness']='HỎI BÀ BÁN CHÁO THEO CÂU TÁC GIẢ.';
 newData.script.pages[0].context='NGUYÊN NHÂN CỦA CẢNH ĐƯỢC TÁC GIẢ BIÊN TẬP.';
 assert.equal((await prepare(newData)).ok,true);
 const engine=await prepare(newData),v=await advance(engine,'entry-nhi');
 assert.equal(engine.entryBriefings[2].incitingIncident,'THỬ TÁC GIẢ VIẾT LẠI MỞ ĐẦU NHI.');
 assert.equal(v.narration,'CẢNH NHI ĐƯỢC TÁC GIẢ VIẾT LẠI.');
 assert.equal(v.choices.find(c=>c.choiceId==='find-witness').label,'HỎI BÀ BÁN CHÁO THEO CÂU TÁC GIẢ.');
 assert.match(v.context,/NGUYÊN NHÂN/);
 const untouched=await prepare();assert.notEqual(untouched.entryBriefings[2].incitingIncident,
  engine.entryBriefings[2].incitingIncident);
 assert.equal(v.saveCommitted,false);assert.equal(v.rewardAuthorized,false);
});

test('G5C-P6 forged entry profile, choice labels and malformed prologue fail closed',async()=>{
 const data=payload(),invalid=[
  x=>{x.script.entryBriefings[0].entryId='entry-admin';},
  x=>{x.script.entryBriefings.pop();},
  x=>{x.script.entryBriefings[1].boundaries='';},
  x=>{x.script.pages[0].roleScenes['entry-admin']={narration:'Forged scene'};},
  x=>{x.script.pages[0].roleScenes['entry-nhi'].choiceLabels['grant-exp']='Cấp 1000 EXP';},
  x=>{x.script.pages[0].context='';},
  x=>{x.script.pages[0].roleScenes['entry-nhi'].returnNarration='';}
 ];
 for(const mutation of invalid){const draft=structuredClone(data);mutation(draft);
  assert.equal((await prepare(draft)).ok,false,'Expected invalid draft to be rejected');}
});

test('G5C-P6 old G5C-P4 public demo retains script compatibility with engine extension',async()=>{
 const old=JSON.parse(readFileSync(new URL('../../playtests/ben-suong/demo-content.json',import.meta.url),'utf8'));
 const p=await prepare(old);assert.equal(p.ok,true,p.code);assert.deepEqual(p.entryBriefings,[]);
 const s=await p.start(p.entryProfiles[0].entryId);assert.equal((await p.view(s.session)).ok,true);
});

test('G5C-P6 new writer UI contains editable per-actor POV and real identity-accept gate',()=>{
 const html=readFileSync(new URL('../../playtests/tang-may-9/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../../tools/vangioi/tang-may-author-playtest-entry.mjs',import.meta.url),'utf8');
 for(const id of ['scene-role-select','context-edit','return-narration-edit','briefing-select','briefing-memory',
  'briefing-incident','briefing-objective','briefing-stage','accept-identity','scene-context-display'])
  assert.ok(html.includes(`id="${id}"`),id);
 assert.match(js,/page\.roleScenes\[entry\]/);
 assert.match(js,/script\.entryBriefings=clone\(briefings\)/);
 assert.match(js,/previewBriefing\(entry\)/);
 assert.equal(html.includes('firebase'),false);
});
