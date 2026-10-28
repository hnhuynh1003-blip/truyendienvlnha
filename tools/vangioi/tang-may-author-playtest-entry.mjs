// G5C-P5: Browser-only author rehearsal and player what-if preview. Drafts and
// sessions stay in RAM; the author cannot submit, publish or grant rewards.
import {hashAuthoringJson} from '../../cloudflare/src/vangioi-authoring.mjs';
import {prepareAuthorRoleplayOffline} from '../../cloudflare/src/vangioi-author-roleplay-offline.mjs';

const el=id=>document.getElementById(id);
const art={
 'scene-arrival':['thanh-pho.webp','Cầu tàu tầng chín'],
 'scene-broadcast':['thanh-pho.webp','Bảng tin chu kỳ 408'],
 'scene-witness':['thanh-pho.webp','Góc cháo dưới cầu tàu'],
 'scene-leak':['thanh-pho.webp','Bản sao gửi người dân'],
 'scene-archive':['kho-ky-uc.webp','Kho ký ức số 09'],
 'scene-record':['kho-ky-uc.webp','Bản ghi số 0'],
 'scene-tuyen':['kho-ky-uc.webp','Bàn của ông Tuyên'],
 'scene-publish':['kho-ky-uc.webp','Phát hành bằng chứng giả lập'],
 'scene-relay':['tram-relay.webp','Trạm chuyển tiếp'],
 'scene-breaker':['tram-relay.webp','Hộp cầu dao cơ khí'],
 'scene-seal':['tram-relay.webp','Tín hiệu cách ly']};
const people={
 'entry-lam':{image:'vai-0.webp',kind:'01 · CAST / VAI CHÍNH',
  description:'Lam có chìa kho ký ức, nhưng không biết danh tính người phát tín hiệu.'},
 'entry-khai':{image:'vai-1.webp',kind:'01 · CAST / VAI PHỤ',
  description:'Khải được chạm cầu dao; để cách ly an toàn cần hiểu vòng lặp tín hiệu.'},
 'entry-nhi':{image:'vai-2.webp',kind:'02 · NATIVE / NGƯỜI QUA ĐƯỜNG',
  description:'Nhi là người giao hàng có thật ở Thiên Khâu; biết nhân chứng và cuộn băng.'},
 'entry-k07':{image:'vai-3.webp',kind:'03 · SYSTEM COVER / THÂN PHẬN ẢO',
  description:'K-07 mang thẻ do hệ thống cấp; phải đưa dấu vết thực trước khi vào kho.'}};
const endingLabels={'ending-publish':'Sự thật lên màn hình',
 'ending-seal':'Đêm thứ hai không tín hiệu','ending-leak':'Băng ghi âm có người nhận'};
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .replace(/đ/g,'d').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const notice=(id,message,error=false)=>{el(id).textContent=message||'';el(id).classList.toggle('error',error);};
let original=null,chapters=[],scenes=[],mapping=new Map(),play=null,session=null,view=null,role=null,
 pendingEvent=null,working=false;
const clone=v=>structuredClone(v);
const chapterIndex=()=>el('chapter-select').selectedIndex;
const sceneIndex=()=>el('scene-select').selectedIndex;
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
 el('narration-edit').value=page.narration;
 el('dialogue-edit').value=page.dialogue;
 const origin=mapping.get(page.sceneId);
 el('scene-source').textContent='Nguồn: '+(chapters.find(c=>c.chapterId===origin?.chapterId)?.title||'Chưa gắn chương')+
  ' · '+(origin?.authorReason||'Chưa có ghi chú chuyển thể');
 const rules=original.manifest.rules.filter(r=>r.fromSceneId===page.sceneId);
 const description=condition=>condition.op==='flag_set'?'cần '+condition.flag:
  condition.op==='flag_unset'?'chưa '+condition.flag:
  condition.op==='all'?'đủ ('+condition.conditions.map(description).join(', ')+')':
  condition.op==='any'?'một trong ('+condition.conditions.map(description).join(' / ')+')':'không xác định';
 el('scene-rules').textContent=page.choices.length?page.choices.map(c=>{
  const rule=rules.find(r=>r.ruleId===c.ruleId);
  return '• '+c.label+'  ['+(rule?description(rule.condition):'KHÔNG CÓ LUẬT')+']';
 }).join('\n'):'Cảnh kết thúc — không có hành động chuyển tiếp.';
}
function setupEditor(){
 chapters=clone(original.authoring.chapters);scenes=clone(original.script.pages);
 mapping=new Map(original.authoring.storyboard.map(row=>[row.sceneId,row]));
 const chaptersSelect=el('chapter-select'),scenesSelect=el('scene-select');
 chaptersSelect.replaceChildren();scenesSelect.replaceChildren();
 for(const chapter of chapters){const option=document.createElement('option');option.value=chapter.chapterId;
  option.textContent=chapter.title;chaptersSelect.append(option);}
 for(const page of scenes){const option=document.createElement('option');option.value=page.sceneId;
  option.textContent=art[page.sceneId]?.[1]||page.sceneId;scenesSelect.append(option);}
 chaptersSelect.selectedIndex=0;scenesSelect.selectedIndex=0;
 chapterRender();sceneRender();
 play=null;session=null;view=null;role=null;pendingEvent=null;
 el('game-pane').hidden=true;el('author-pane').hidden=false;
 notice('author-feedback','Đã nạp 3 chương nguồn và 11 cảnh chuyển thể. Chỉnh trực tiếp rồi bấm Kiểm tra bản thảo & chạy thử.');
}
el('chapter-select').addEventListener('change',chapterRender);
el('scene-select').addEventListener('change',sceneRender);
el('chapter-text').addEventListener('input',()=>{
 if(chapters[chapterIndex()])chapters[chapterIndex()].text=el('chapter-text').value;
 notice('author-feedback','Bản thảo đã đổi trong bộ nhớ. Cần kiểm tra lại để tạo phiên chơi mới.');
});
for(const [id,key] of [['narration-edit','narration'],['dialogue-edit','dialogue']])
 el(id).addEventListener('input',()=>{
  if(scenes[sceneIndex()])scenes[sceneIndex()][key]=el(id).value;
  notice('author-feedback','Cảnh đã đổi trong bộ nhớ. Cần kiểm tra lại trước khi chơi thử.');
 });
el('reset-original').addEventListener('click',()=>{if(original)setupEditor();});

async function validateDraft(){
 if(working||!original)return;
 working=true;el('validate-button').disabled=true;
 try{
  if(chapters.length!==3||chapters.some(c=>c.text.trim().length<250)||
   scenes.some(p=>!p.narration.trim()||p.narration.length>4000||p.dialogue.length>4000))
   throw Error('Chương cần từ 250 ký tự, lời dẫn phải có nội dung, mỗi đoạn tối đa 4.000 ký tự.');
  const world=clone(original.world),manifest=clone(original.manifest),script=clone(original.script);
  world.storySource.contentHash=await hashAuthoringJson(chapters);
  world.story.opening=chapters[0].text.slice(0,250);
  script.pages=clone(scenes);
  // A new version pin covers EVERY local author edit. It is not a signed or
  // server-trusted source hash, nor permission to publish the result.
  const contentHash=await hashAuthoringJson(world);
  manifest.contentHash=contentHash;script.contentHash=contentHash;
  const prepared=await prepareAuthorRoleplayOffline(world,manifest,script);
  if(!prepared.ok)throw Error('Hồ sơ chưa hợp lệ: '+prepared.code);
  play=prepared;session=null;role=null;pendingEvent=null;
  roleCards();el('author-pane').hidden=true;el('game-pane').hidden=false;
  el('role-stage').hidden=false;el('story-stage').hidden=true;
  notice('play-feedback','Đã kiểm tra G3C + G4A/G4B trên bản thảo trong RAM. Chọn một thân phận để kiểm thử các nhánh; không có quyền phát hành.');
  el('game-pane').scrollIntoView({behavior:'auto',block:'start'});
 }catch(e){notice('author-feedback',e.message||'Không thể chuẩn bị bản thử.',true);}
 finally{working=false;el('validate-button').disabled=false;}
}
el('validate-button').addEventListener('click',validateDraft);
el('back-editor').addEventListener('click',()=>{
 if(working)return;
 el('game-pane').hidden=true;el('author-pane').hidden=false;
 session=null;view=null;pendingEvent=null;
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
  b.append(img,group,name,desc);b.addEventListener('click',()=>begin(entry));root.append(b);
 }
}
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
 el('scene-place').textContent=position[1];el('scene-progress').textContent='REV '+String(view.revision).padStart(3,'0');
 el('current-portrait').src='./assets/'+person.image;
 el('current-portrait').alt='Chân dung '+role.label;
 el('current-mode').textContent=person.kind;el('current-role').textContent=role.label;
 el('current-description').textContent=person.description;
 const ch=chapters.find(c=>c.chapterId===sceneChapter(view.sceneId));
 el('chapter-origin').textContent='CHUYỂN THỂ TỪ '+(ch?.title||'CẢNH NGOÀI CHƯƠNG');
 el('source-echo').textContent=sourceSnippet(view.sceneId);
 el('narration').textContent=view.narration;
 const isTuyen=view.sceneId==='scene-tuyen';
 el('npc-card').hidden=!isTuyen;el('ambient-dialogue').hidden=isTuyen;
 el('npc-dialogue').textContent=isTuyen?view.dialogue:'';
 el('ambient-dialogue').textContent=isTuyen?'':view.dialogue;
 el('role-reaction').textContent=view.roleReaction||'';
 el('role-reaction').hidden=!view.roleReaction;
 const ending=!!view.narrativeEndingId;
 el('decision-stage').hidden=ending;el('ending-stage').hidden=!ending;
 const buttons=el('choices');buttons.replaceChildren();
 if(ending)el('ending-title').textContent=endingLabels[view.narrativeEndingId]||'Kết thúc giả lập';
 else {view.choices.forEach(c=>buttons.append(choiceButton(c)));el('intent-input').value='';}
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
 if(working)return;session=null;view=null;role=null;pendingEvent=null;
 el('story-stage').hidden=true;el('role-stage').hidden=false;
 el('role-stage').scrollIntoView({behavior:'auto',block:'start'});
});
// No GPT/AI action execution. Synonyms only select an already eligible
// author-authored choice in the current G4A state.
const synonyms=[
 [/ban tin|tin hieu|phat song/,['scan-public','follow-alarm','compare-report']],
 [/ong tuyen|hoi tuyen|noi chuyen/,['ask-tuyen','ask-tuyen-archive','trace-tuyen','permission-archive']],
 [/ho so|ban ghi|ky uc/,['read-record','question-zero','close-record']],
 [/nhan chung|bang ghi am|cuon bang/,['find-witness','seek-voice','record-testimony','send-tape']],
 [/cau dao|tram|mach dien/,['inspect-relay','diagnose-loop','go-relay','follow-alarm']],
 [/cong bo|phat hanh/,['publish-file','publish-record']],
 [/tro lai|quay lai/,['back-arrival','leave-archive','leave-tuyen','leave-witness','surface-relay','leave-breaker']]];
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
  original.authoring.version!=='g5c-p5-author-sandbox-1'||original.authoring.chapters.length!==3)
  throw Error('invalid-public-author-package');
 setupEditor();
}catch{
 notice('author-feedback','Không tải được hồ sơ tác giả. Hãy tải lại trang, bản thử không cần tài khoản.',true);
 el('validate-button').disabled=true;
}
