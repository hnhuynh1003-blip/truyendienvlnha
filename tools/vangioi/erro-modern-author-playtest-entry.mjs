// G5C-P7: Browser-only author rehearsal of an original adaptation NOTESET;
// the actual ten chapters stay in DUDU Library and were not imported.
// Player what-if preview. Drafts and
// sessions stay in RAM; the author cannot submit, publish or grant rewards.
import {hashAuthoringJson} from '../../cloudflare/src/vangioi-authoring.mjs';
import {prepareAuthorRoleplayOffline} from '../../cloudflare/src/vangioi-author-roleplay-offline.mjs';

const el=id=>document.getElementById(id);
const art={
 'scene-entry':['thi-tran-mo.webp','Trạm tiếp nhận · ngoài Canon'],
 'scene-gate':['thi-tran-mo.webp','Cổng trường số 3'],
 'scene-admission':['thi-tran-mo.webp','Văn phòng hiệu phó · 12 tuổi'],
 'scene-classroom':['thi-tran-mo.webp','Lớp học 7B'],
 'scene-meal':['thi-tran-mo.webp','Nửa củ khoai bên bàn học'],
 'scene-teacher':['thi-tran-mo.webp','Cô Tần Tuệ · chiều mùa hạ'],
 'scene-walk':['thi-tran-mo.webp','Triền đê · năm 15 tuổi'],
 'scene-farewell':['thi-tran-mo.webp','Rặng bạch đàn · năm 15 tuổi'],
 'scene-school-end':['thi-tran-mo.webp','Đêm hội khép lại · bạn học'],
 'scene-town-walk':['thi-tran-mo.webp','Đường công cộng quanh trường'],
 'scene-town-end':['thi-tran-mo.webp','Kết nhánh quan sát'],
 'scene-netroom':['thi-tran-mo.webp','Quán net · VIP số 01'],
 'scene-contract':['thi-tran-mo.webp','VIP01 · Lục Thiển mang canh'],
 'scene-ceremony':['thi-tran-mo.webp','Điểm trường thứ 100 · cuối thu'],
 'scene-river':['thi-tran-mo.webp','Xe dừng ven sông · tuổi 17'],
 'scene-rehearsal':['thi-tran-mo.webp','Đêm văn nghệ · tuổi 15'],
 'scene-quiet':['thi-tran-mo.webp','Rặng bạch đàn · khoảng lặng'],
 'scene-listen':['thi-tran-mo.webp','Rặng bạch đàn · lắng nghe'],
 'scene-distance':['thi-tran-mo.webp','Lối về · đoàn tàu quặng']};
const people={
 'entry-tu-du':{image:'tu-du.webp',kind:'01 · CAST / VAI CHÍNH',
  description:'Tử Du đã rời hai gia tộc, không phân biệt gương mặt và chỉ mong yên tĩnh.'},
 'entry-luc-thien':{image:'luc-thien.webp',kind:'01 · CAST / VAI PHỤ',
  description:'Lục Thiển biết công việc pháp lý nhưng không được quyết định thay Tử Du.'},
 'entry-classmate':{image:'ban-hoc.webp',kind:'02 · NATIVE / BẠN HỌC BẢN ĐỊA',
  description:'Một học sinh lớp 7B, không biết chuyện huyết thống hay CryoTech.'},
 'entry-cover':{image:'than-phan.webp',kind:'03 · SYSTEM COVER / THÂN PHẬN ẢO',
  description:'Hồ sơ người phụ việc chưa được địa phương xác thực; chỉ có thể hỏi và quan sát.'}};
const endingLabels={'ending-quiet':'Một khoảng lặng được giữ lại',
 'ending-listen':'Một lời được nghe trọn','ending-distance':'Lối về qua hàng bạch đàn',
 'ending-school':'Câu chuyện người bạn cùng lớp','ending-observer':'Góc nhìn người quan sát'};
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .replace(/đ/g,'d').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const notice=(id,message,error=false)=>{el(id).textContent=message||'';el(id).classList.toggle('error',error);};
let original=null,chapters=[],scenes=[],briefings=[],mapping=new Map(),play=null,session=null,view=null,role=null,selectedEntry=null,
 pendingEvent=null,working=false;
const clone=v=>structuredClone(v);
const chapterIndex=()=>el('chapter-select').selectedIndex;
const sceneIndex=()=>el('scene-select').selectedIndex;
const briefingIndex=()=>el('briefing-select').selectedIndex;
const sceneChapter=id=>mapping.get(id)?.chapterId;
const sourceSnippet=id=>{
 const chapter=chapters.find(c=>c.chapterId===sceneChapter(id));
 const paragraph=chapter?.text.split(/\n\s*\n/).map(x=>x.trim()).find(Boolean);
 return paragraph?paragraph.slice(0,240)+(paragraph.length>240?'…':''):'';
};
function chapterRender(){
 const chapter=chapters[chapterIndex()];if(!chapter)return;
 el('chapter-text').value=chapter.text;
}
function sceneRender(){
 const page=scenes[sceneIndex()];if(!page)return;
 el('context-edit').value=page.context||'';
 const roleSelect=el('scene-role-select');roleSelect.replaceChildren();
 const options=[{id:'common',label:'Lời dẫn chung của cảnh'},
  ...original.world.playerEntryProfiles.map(p=>({id:p.entryId,label:'Góc nhìn: '+p.label}))];
 for(const {id,label} of options){const option=document.createElement('option');option.value=id;option.textContent=label;roleSelect.append(option);}
 roleSelect.value='common';roleSceneRender();
 const origin=mapping.get(page.sceneId);
 el('scene-source').textContent='Nguồn: '+(chapters.find(c=>c.chapterId===origin?.chapterId)?.title||'Chưa gắn chương')+
  ' · '+(origin?.authorReason||'Chưa có ghi chú chuyển thể');
}
function renderRulesForRole(page,entry){
 const rules=original.manifest.rules.filter(r=>r.fromSceneId===page.sceneId);
 const description=condition=>condition.op==='flag_set'?'cần '+condition.flag:
  condition.op==='flag_unset'?'chưa '+condition.flag:
  condition.op==='all'?'đủ ('+condition.conditions.map(description).join(', ')+')':
  condition.op==='any'?'một trong ('+condition.conditions.map(description).join(' / ')+')':'không xác định';
 el('scene-rules').textContent=page.choices.length?page.choices.map(c=>{
  const rule=rules.find(r=>r.ruleId===c.ruleId);
  return '• '+(page.roleScenes?.[entry]?.choiceLabels?.[c.choiceId]??c.label)+
   '  ['+(rule?description(rule.condition):'KHÔNG CÓ LUẬT')+']';
 }).join('\n'):'Cảnh kết thúc — không có hành động chuyển tiếp.';
}
function renderChoiceEditors(page,entry){
 const root=el('choice-editor');root.replaceChildren();
 if(!page.choices.length){root.textContent='Cảnh kết thúc — không có lựa chọn mới.';return;}
 for(const choice of page.choices){
  const label=document.createElement('label'),input=document.createElement('input');
  input.id='editor-'+choice.choiceId;input.type='text';input.maxLength=200;
  input.value=page.roleScenes?.[entry]?.choiceLabels?.[choice.choiceId]??choice.label;
  label.htmlFor=input.id;label.textContent='Hành động '+choice.choiceId;
  input.addEventListener('input',()=>{
   if(entry==='common')choice.label=input.value;
   else{
    page.roleScenes??={};page.roleScenes[entry]??={};
    page.roleScenes[entry].choiceLabels??={};page.roleScenes[entry].choiceLabels[choice.choiceId]=input.value;
   }
   renderRulesForRole(page,entry);
   notice('author-feedback','Đã sửa câu lựa chọn trong RAM; đích đến và điều kiện không bị thay đổi.');
  });
  root.append(label,input);
 }
}
function roleSceneRender(){
 const page=scenes[sceneIndex()];if(!page)return;
 const entry=el('scene-role-select').value;
 const variant=entry==='common'?page:page.roleScenes?.[entry]||{};
 el('narration-edit').value=variant.narration??page.narration;
 el('dialogue-edit').value=variant.dialogue??page.dialogue;
 el('return-narration-edit').value=variant.returnNarration??page.returnNarration??'';
 renderRulesForRole(page,entry);
 renderChoiceEditors(page,entry);
}
function briefingRender(){
 const briefing=briefings[briefingIndex()];if(!briefing)return;
 el('briefing-memory').value=briefing.roleMemory;
 el('briefing-incident').value=briefing.incitingIncident;
 el('briefing-objective').value=briefing.objective;
}
function setupEditor(){
 chapters=clone(original.authoring.chapters);scenes=clone(original.script.pages);
 briefings=clone(original.script.entryBriefings);
 mapping=new Map(original.authoring.storyboard.map(row=>[row.sceneId,row]));
 const chaptersSelect=el('chapter-select'),scenesSelect=el('scene-select'),briefingSelect=el('briefing-select');
 chaptersSelect.replaceChildren();scenesSelect.replaceChildren();briefingSelect.replaceChildren();
 for(const chapter of chapters){const option=document.createElement('option');option.value=chapter.chapterId;
  option.textContent=chapter.title;chaptersSelect.append(option);}
 for(const page of scenes){const option=document.createElement('option');option.value=page.sceneId;
  option.textContent=(mapping.get(page.sceneId)?.timeLabel||'Mốc chưa rõ')+' · '+(art[page.sceneId]?.[1]||page.sceneId);scenesSelect.append(option);}
 for(const briefing of briefings){const option=document.createElement('option');option.value=briefing.entryId;
  option.textContent=original.world.playerEntryProfiles.find(x=>x.entryId===briefing.entryId)?.label||briefing.entryId;
  briefingSelect.append(option);}
 chaptersSelect.selectedIndex=0;scenesSelect.selectedIndex=0;briefingSelect.selectedIndex=0;
 chapterRender();sceneRender();briefingRender();
 play=null;session=null;view=null;role=null;selectedEntry=null;pendingEvent=null;
 el('game-pane').hidden=true;el('author-pane').hidden=false;
 notice('author-feedback','Đã nạp 2 ghi chú chuyển thể từ chương 6–7, '+scenes.length+' cảnh theo thứ tự 12→15→17 tuổi và 4 hồ sơ mở đầu. Không chứa nguyên văn từ Thư viện. Sửa lời dẫn rồi bấm kiểm tra.');
}
el('chapter-select').addEventListener('change',chapterRender);
el('scene-select').addEventListener('change',sceneRender);
el('scene-role-select').addEventListener('change',roleSceneRender);
el('briefing-select').addEventListener('change',briefingRender);
el('chapter-text').addEventListener('input',()=>{
 if(chapters[chapterIndex()])chapters[chapterIndex()].text=el('chapter-text').value;
 notice('author-feedback','Bản thảo đã đổi trong bộ nhớ. Cần kiểm tra lại để tạo phiên chơi mới.');
});
el('context-edit').addEventListener('input',()=>{
 if(scenes[sceneIndex()])scenes[sceneIndex()].context=el('context-edit').value;
 notice('author-feedback','Mạch truyện đã đổi trong RAM. Cần kiểm tra lại trước khi chơi thử.');
});
for(const [id,key] of [['narration-edit','narration'],['dialogue-edit','dialogue']])
 el(id).addEventListener('input',()=>{
  const page=scenes[sceneIndex()],entry=el('scene-role-select').value;
  if(page){
   if(entry==='common')page[key]=el(id).value;
   else{page.roleScenes??={};page.roleScenes[entry]??={};page.roleScenes[entry][key]=el(id).value;}
  }
  notice('author-feedback','Cảnh đã đổi trong bộ nhớ. Cần kiểm tra lại trước khi chơi thử.');
 });
el('return-narration-edit').addEventListener('input',()=>{
 const page=scenes[sceneIndex()],entry=el('scene-role-select').value;
 if(!page)return;
 const value=el('return-narration-edit').value;
 if(entry==='common'){
  if(value.trim())page.returnNarration=value;
  else delete page.returnNarration;
 }else if(value.trim()){
  page.roleScenes??={};page.roleScenes[entry]??={};page.roleScenes[entry].returnNarration=value;
 }else if(page.roleScenes?.[entry]){
  delete page.roleScenes[entry].returnNarration;
  if(!Object.keys(page.roleScenes[entry]).length)delete page.roleScenes[entry];
  if(!Object.keys(page.roleScenes).length)delete page.roleScenes;
 }
 notice('author-feedback','Đã sửa lời dẫn khi quay lại cảnh. Cần kiểm tra để tái tạo phiên nhập vai.');
});
for(const [id,key] of [['briefing-memory','roleMemory'],['briefing-incident','incitingIncident'],['briefing-objective','objective']])
 el(id).addEventListener('input',()=>{
  if(briefings[briefingIndex()])briefings[briefingIndex()][key]=el(id).value;
  notice('author-feedback','Hồ sơ mở đầu đã đổi trong RAM. Kiểm tra lại để bắt đầu từ thân phận mới.');
 });
el('reset-original').addEventListener('click',()=>{if(original)setupEditor();});

async function validateDraft(){
 if(working||!original)return;
 working=true;el('validate-button').disabled=true;
 try{
  if(chapters.length!==2||chapters.some(c=>c.text.trim().length<250)||
   scenes.some(p=>!p.narration.trim()||p.narration.length>4000||p.dialogue.length>4000||
    !p.context?.trim()||p.context.length>1000)||
   briefings.some(b=>!b.roleMemory.trim()||!b.incitingIncident.trim()||!b.objective.trim()))
   throw Error('Chương cần từ 250 ký tự; lời dẫn, mạch cảnh và hồ sơ thân phận phải có nội dung.');
  const world=clone(original.world),manifest=clone(original.manifest),script=clone(original.script);
  world.storySource.contentHash=await hashAuthoringJson(chapters);
  world.story.opening=chapters[0].text.slice(0,250);
  script.pages=clone(scenes);script.entryBriefings=clone(briefings);
  // Re-pin manuscript/world when source changes. Script prose is validated
  // separately in RAM: script.contentHash pins the WORLD, not signed script
  // bytes. Neither client hash confers author or publication permission.
  const contentHash=await hashAuthoringJson(world);
  manifest.contentHash=contentHash;script.contentHash=contentHash;
  const prepared=await prepareAuthorRoleplayOffline(world,manifest,script);
  if(!prepared.ok)throw Error('Hồ sơ chưa hợp lệ: '+prepared.code);
  play=prepared;session=null;role=null;selectedEntry=null;pendingEvent=null;
  roleCards();el('author-pane').hidden=true;el('game-pane').hidden=false;
  el('role-stage').hidden=false;el('briefing-stage').hidden=true;el('story-stage').hidden=true;
  notice('play-feedback','Đã kiểm tra G3C + G4A/G4B trên bản thảo trong RAM. Chọn vai, đọc phần mở đầu trước khi nhập vai; không có quyền phát hành.');
  el('game-pane').scrollIntoView({behavior:'auto',block:'start'});
 }catch(e){notice('author-feedback',e.message||'Không thể chuẩn bị bản thử.',true);}
 finally{working=false;el('validate-button').disabled=false;}
}
el('validate-button').addEventListener('click',validateDraft);
el('back-editor').addEventListener('click',()=>{
 if(working)return;
 el('game-pane').hidden=true;el('author-pane').hidden=false;
 session=null;view=null;selectedEntry=null;pendingEvent=null;
 el('author-pane').scrollIntoView({behavior:'auto',block:'start'});
});

function roleCards(){
 const root=el('roles');root.replaceChildren();
 for(const entry of play.entryProfiles){
  const person=people[entry.entryId];if(!person)throw Error('Unmapped demo entry');
  const b=document.createElement('button');b.type='button';b.className='role-card';
  const img=document.createElement('img');img.src='./assets/'+person.image;
  img.alt='Chân dung '+entry.label;img.width=500;img.height=500;
  const group=document.createElement('span');group.className='role-group';group.textContent=person.kind;
  const name=document.createElement('strong');name.textContent=entry.label;
  const desc=document.createElement('small');desc.textContent=person.description;
  b.append(img,group,name,desc);b.addEventListener('click',()=>previewBriefing(entry));root.append(b);
 }
}
function previewBriefing(entry){
 if(working||!play)return;
 const briefing=play.entryBriefings.find(b=>b.entryId===entry.entryId);
 if(!briefing){notice('play-feedback','Thiếu phần mở đầu cho thân phận đã chọn.',true);return;}
 selectedEntry=entry;
 const portrait=people[entry.entryId];
 el('briefing-portrait').src='./assets/'+portrait.image;
 el('briefing-portrait').alt='Chân dung '+entry.label;
 el('briefing-mode').textContent=portrait.kind;
 el('briefing-name').textContent=entry.label;
 el('briefing-world').textContent=briefing.worldContext;
 el('briefing-memory-display').textContent=briefing.roleMemory;
 el('briefing-incident-display').textContent=briefing.incitingIncident;
 el('briefing-goal-display').textContent=briefing.objective;
 el('briefing-boundary-display').textContent=briefing.boundaries;
 el('role-stage').hidden=true;el('briefing-stage').hidden=false;
 el('briefing-stage').scrollIntoView({behavior:'auto',block:'start'});
}
el('accept-identity').addEventListener('click',()=>{if(selectedEntry)begin(selectedEntry);});
el('return-roles').addEventListener('click',()=>{
 if(working)return;selectedEntry=null;el('briefing-stage').hidden=true;el('role-stage').hidden=false;
 el('role-stage').scrollIntoView({behavior:'auto',block:'start'});
});
function choiceButton(choice){
 const b=document.createElement('button');b.type='button';b.className='choice';
 b.textContent=choice.label;b.addEventListener('click',()=>choose(choice.choiceId));return b;
}
function busy(value){working=value;document.querySelectorAll('button,input').forEach(node=>node.disabled=value);}
async function render(nextSession){
 const result=await play.view(nextSession);if(!result.ok)throw Error(result.code);
 session=nextSession;view=result;
 const position=art[view.sceneId],person=people[role.entryId];if(!position||!person)throw Error('Unmapped author scene');
 el('role-stage').hidden=true;el('story-stage').hidden=false;
 el('scene-image').src='./assets/'+position[0];el('scene-image').alt=position[1];
 el('scene-place').textContent=position[1];el('scene-progress').textContent=
  'REV '+String(view.revision).padStart(3,'0')+(view.visitCount>1?' · TRỞ LẠI LẦN '+view.visitCount:'');
 el('current-portrait').src='./assets/'+person.image;
 el('current-portrait').alt='Chân dung '+role.label;
 el('current-mode').textContent=person.kind;el('current-role').textContent=role.label;
 el('current-description').textContent=person.description;
 const ch=chapters.find(c=>c.chapterId===sceneChapter(view.sceneId));
 el('chapter-origin').textContent=(mapping.get(view.sceneId)?.timeLabel||'Mốc thời gian chưa rõ')+' · CHUYỂN THỂ TỪ '+(ch?.title||'CẢNH NGOÀI CHƯƠNG');
 el('source-echo').textContent=sourceSnippet(view.sceneId);
 el('scene-context-display').textContent=view.context||'Không có mạch truyện cho cảnh này.';
 const briefing=play.entryBriefings.find(b=>b.entryId===role.entryId);
 el('current-goal').textContent='Mục tiêu của bạn: '+(briefing?.objective||'Khám phá tình huống.');
 const known={'identity-tu-du':'Nhớ việc rời hai gia tộc.','lawyer-knowledge':'Biết phạm vi ủy quyền pháp lý.',
  'classmate-knowledge':'Biết các hoạt động của lớp 7B.','unverified-cover':'Hồ sơ thân phận ảo chưa xác minh.',
  'saw-school-years':'Đã trải qua những năm ở lớp 7B.','kept-public-boundary':'Đã tôn trọng ranh giới công cộng.',
  'chose-quiet':'Đã chọn ranh giới rõ ràng.','chose-listen':'Đã chọn lắng nghe.',
  'chose-distance':'Đã chọn rút lui sớm.'};
 const evidence=view.flags.filter(f=>known[f]).map(f=>known[f]);
 el('evidence-list').textContent=evidence.length?evidence.join(' · '):'Chưa ghi nhận manh mối trong phiên thử.';
 el('narration').textContent=view.narration;
 el('npc-card').hidden=true;el('ambient-dialogue').hidden=false;
 el('npc-dialogue').textContent='';
 el('ambient-dialogue').textContent=view.dialogue;
 el('role-reaction').textContent=view.roleReaction||'';
 el('role-reaction').hidden=!view.roleReaction;
 const ending=!!view.narrativeEndingId;
 el('decision-stage').hidden=ending;el('ending-stage').hidden=!ending;
 const buttons=el('choices');buttons.replaceChildren();
 if(ending)el('ending-title').textContent=endingLabels[view.narrativeEndingId]||'Kết thúc giả lập';
 else {el('decision-title').textContent=view.choices.length>1?'Lựa chọn trong phạm vi nhân vật':'Tiếp tục diễn biến';
  view.choices.forEach(c=>buttons.append(choiceButton(c)));el('intent-input').value='';}
 notice('play-feedback','');
}
async function begin(entry){
 if(working||!play)return;
 busy(true);
 try{
  const started=await play.start(entry.entryId,'anonymous-canon-test-'+crypto.randomUUID(),
   'author-sim-'+crypto.randomUUID());
  if(!started.ok)throw Error(started.code);
  role=entry;pendingEvent=null;await render(started.session);
  el('briefing-stage').hidden=true;
  el('story-stage').scrollIntoView({behavior:'auto',block:'start'});
 }catch(e){notice('play-feedback','Không bắt đầu được nhân vật: '+(e.code||e.message),true);}
 finally{busy(false);}
}
async function choose(choiceId){
 if(working||!session||!view)return;
 if(!pendingEvent||pendingEvent.choiceId!==choiceId)
  pendingEvent={choiceId,eventId:crypto.randomUUID(),expectedRevision:session.revision};
 busy(true);
 try{
  const result=await play.choose(session,pendingEvent);
  if(!result.ok)throw Error(result.code);
  await render(result.session);pendingEvent=null;
  el('story-stage').scrollIntoView({behavior:'auto',block:'start'});
 }catch(e){notice('play-feedback','Hành động không được áp dụng ('+e.message+'). Không có thưởng hoặc thay đổi Canon.',true);}
 finally{busy(false);}
}
el('restart').addEventListener('click',()=>{
 if(working)return;session=null;view=null;role=null;selectedEntry=null;pendingEvent=null;
 el('story-stage').hidden=true;el('briefing-stage').hidden=true;el('role-stage').hidden=false;
 el('role-stage').scrollIntoView({behavior:'auto',block:'start'});
});
// No GPT/AI action execution. Synonyms only select an already eligible
// author-authored choice in the current G4A state.
const synonyms=[
 [/lop|truong|hoc/,['enter-class','return-school','share-lunch']],
 [/khoai|tinh dao|noi chuyen/,['share-lunch','join-rehearsal','follow-rehearsal']],
 [/quan net|phong vip|may tinh/,['go-net','walk-net','leave-office']],
 [/luat su|luc thien|ho so/,['ask-lawyer','leave-office']],
 [/van nghe|hat|san khau/,['follow-rehearsal','join-rehearsal','attend-show']],
 [/lang nghe|noi het/,['stay-and-listen']],
 [/ranh gioi|yen tinh/,['protect-quiet']],
 [/roi di|quay lai|tro lai/,['leave-early','return-school','leave-office']]];
el('intent-form').addEventListener('submit',event=>{
 event.preventDefault();if(working||!view)return;
 const typed=normalize(el('intent-input').value);
 if(!typed){notice('play-feedback','Hãy nhập ý định hoặc chọn một hành động được hiển thị.');return;}
 if(/\b(exp|xu|vat pham|cap thuong|admin|hack|cheat|duyet canon)\b/.test(typed)){
  notice('play-feedback','Hệ thống không chấp nhận lệnh cấp thưởng, sửa Canon hoặc lấy quyền.',true);return;
 }
 const eligible=new Map(view.choices.map(c=>[c.choiceId,c]));
 const hit=view.choices.find(c=>normalize(c.label).includes(typed))||
  synonyms.flatMap(([regex,ids])=>regex.test(typed)?ids:[]).map(id=>eligible.get(id)).find(Boolean);
 if(!hit){notice('play-feedback','Ý định đó chưa được tác giả khai báo ở cảnh này. Không đổi revision hoặc trạng thái.');return;}
 choose(hit.choiceId);
});
try{
 const response=await fetch('./author-content.json',{cache:'no-store',credentials:'omit'});
 if(!response.ok)throw Error('author-package-unavailable');
 original=await response.json();
 if(!original||Object.keys(original).sort().join(',')!=='authoring,manifest,script,world'||
  original.authoring.version!=='g5c-p7-erro-author-sandbox-1'||original.authoring.chapters.length!==2)
  throw Error('invalid-public-author-package');
 setupEditor();
}catch{
 notice('author-feedback','Không tải được hồ sơ tác giả. Hãy tải lại trang, bản thử không cần tài khoản.',true);
 el('validate-button').disabled=true;
}
