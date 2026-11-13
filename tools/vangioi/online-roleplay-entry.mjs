// G5C-P4 public visual demo. User prose is mapped to existing author rules,
// never executed as code, an AI request, privileged event or world mutation.
import {prepareAuthorRoleplayOffline} from '../../cloudflare/src/vangioi-author-roleplay-offline.mjs';

const el=id=>document.getElementById(id);
const start=el('start'),story=el('story'),roles=el('roles'),choices=el('choices');
const sceneArt={
 'scene-quay':['cau-cang.webp','Cầu cảng'],'scene-lan':['cau-cang.webp','Mái hiên cầu cảng'],
 'scene-ropes':['cau-cang.webp','Dây neo dưới mưa'],'scene-tower':['thap-den.webp','Phòng đèn'],
 'scene-log':['thap-den.webp','Sổ trực hải đăng'],'scene-shelter':['nha-tru-bao.webp','Kho trú bão'],
 'scene-rescue':['cau-cang.webp','Một người trở về'],'scene-beacon':['thap-den.webp','Ánh sáng ngoài vịnh'],
 'scene-witness':['nha-tru-bao.webp','Những người ở lại']};
const roleInfo={
 'entry-protagonist':{image:'vai-0.webp',group:'Nhập vào nhân vật có sẵn · vai chính',
  description:'An · giữ chìa khóa tháp, biết sổ trực; có quyền nhưng cũng gánh trách nhiệm.'},
 'entry-supporting':{image:'vai-1.webp',group:'Nhập vào nhân vật có sẵn · vai phụ',
  description:'Minh · thủy thủ thông luồng nước; có thể cứu người trực tiếp, nhưng không có quyền giữ đèn.'},
 'entry-bystander':{image:'vai-2.webp',group:'Nhân vật nền vốn tồn tại · người qua đường',
  description:'Hảo · người bốc vác quen dân bến; bắt đầu trong kho trú bão, biết nơi để dây khô.'},
 'entry-virtual':{image:'vai-3.webp',group:'Hệ thống cấp thân phận ảo',
  description:'Người thanh tra · giấy tờ chưa được kiểm chứng; cần quan sát trước khi bà Lan tin.'}};
const endingTitles={'ending-rescue':'Một người trở về','ending-beacon':'Ánh sáng qua đêm',
 'ending-shelter':'Những người ở lại'};
let play=null,session=null,view=null,currentEntry=null,pendingEvent=null,working=false;
const announce=message=>{el('notice').textContent=message||'';};
function button(label,description,action,extra=''){
 const b=document.createElement('button');b.type='button';b.className='choice '+extra;
 const title=document.createElement('strong');title.textContent=label;b.append(title);
 if(description){const small=document.createElement('small');small.textContent=description;b.append(small);}
 b.addEventListener('click',action);return b;
}
function busy(value){
 working=value;document.querySelectorAll('button,input').forEach(b=>b.disabled=value);
}
async function render(sessionValue){
 const result=await play.view(sessionValue);
 if(!result.ok)throw Error(result.code||'invalid-session');
 session=sessionValue;view=result;start.hidden=true;story.hidden=false;
 const info=roleInfo[currentEntry.entryId],art=sceneArt[view.sceneId];
 if(!info||!art)throw Error('unknown-scene-or-role');
 el('role-name').textContent=currentEntry.label;
 el('role-description').textContent=info.description;
 el('role-portrait').src='./assets/'+info.image;
 el('role-portrait').alt='Chân dung '+currentEntry.label;
 el('scene-image').src='./assets/'+art[0];el('scene-image').alt=art[1];
 el('scene-place').textContent=art[1];el('scene-number').textContent='Lượt '+String(view.revision+1);
 el('narration').textContent=view.narration;
 const npc=el('npc-block'),ambient=el('ambient-dialogue');
 npc.hidden=view.sceneId!=='scene-lan';ambient.hidden=!npc.hidden;
 el('dialogue').textContent=npc.hidden?'':view.dialogue;
 ambient.textContent=npc.hidden?view.dialogue:'';
 const reaction=el('reaction');reaction.textContent=view.roleReaction||'';
 reaction.hidden=!view.roleReaction;
 const ending=!!view.narrativeEndingId;
 el('choice-block').hidden=ending;el('ending').hidden=!ending;
 choices.replaceChildren();
 if(!ending){
  view.choices.forEach((c,i)=>choices.append(button(c.label,'',()=>choose(c.choiceId),i===0?'primary':'')));
  el('action-input').value='';
 }else el('ending-title').textContent=endingTitles[view.narrativeEndingId]||'Khép lại đêm bão';
 announce('');
}
async function begin(entry){
 if(working||!play)return;
 busy(true);
 try{
  const created=await play.start(entry.entryId,'anonymous-demo-'+crypto.randomUUID(),
   'web-demo-'+crypto.randomUUID());
  if(!created.ok)throw Error(created.code);
  currentEntry=entry;pendingEvent=null;
  await render(created.session);story.scrollIntoView({behavior:'instant',block:'start'});
 }catch{announce('Không thể bắt đầu bản thử. Hãy tải lại trang để thử lại.');}
 finally{busy(false);}
}
async function choose(choiceId){
 if(working||!play||!session||!view)return;
 if(!pendingEvent||pendingEvent.choiceId!==choiceId)
  pendingEvent={choiceId,eventId:crypto.randomUUID(),expectedRevision:session.revision};
 busy(true);
 try{
  const result=await play.choose(session,pendingEvent);
  if(!result.ok)throw Error(result.code);
  await render(result.session);pendingEvent=null;
  story.scrollIntoView({behavior:'instant',block:'start'});
 }catch{announce('Hành động chưa được áp dụng. Hãy bấm lại lựa chọn hoặc khởi động phiên khác.');}
 finally{busy(false);}
}
const aliases=[
 [/ba lan|hoi ba|noi chuyen|tro chuyen/,['choice-talk','choice-call-lan','choice-warning','choice-access']],
 [/day neo|kiem tra day|kiem tra neo|day thung/,['choice-ropes','choice-bring-rope','choice-rescue-rope']],
 [/cuu|keo nguoi|xuong thuyen/,['choice-direct','choice-rescue-rope','choice-bring-rope']],
 [/thap|den bien|hai dang/,['choice-tower','choice-access','choice-report','choice-beacon','choice-signal-log']],
 [/so truc|so den|nhat ky|doc so/,['choice-read-log','choice-share-log']],
 [/kho|tru bao|tre nho|nguoi gia/,['choice-warn-shelter','choice-share-log','choice-visit-quay']],
 [/cau cang|quay lai|tro lai/,['choice-descend','choice-leave-lan','choice-back-quay','choice-visit-quay','choice-close-log']]];
function normalize(value){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .replace(/đ/g,'d').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
el('action-form').addEventListener('submit',event=>{
 event.preventDefault();if(working||!view)return;
 const input=normalize(el('action-input').value);
 if(!input){announce('Hãy nhập một ý định, hoặc chọn hành động được hiển thị.');return;}
 if(/\b(exp|xu|vat pham|cap thuong|phe duyet|quyen admin|cheat|hack)\b/.test(input)){
  announce('Bản thử không chấp nhận lệnh cấp thưởng, đặc quyền hoặc sửa thế giới. Trạng thái không thay đổi.');
  return;
 }
 const available=new Map(view.choices.map(c=>[c.choiceId,c]));
 const hit=view.choices.find(c=>normalize(c.label).includes(input))||
  aliases.flatMap(([re,ids])=>re.test(input)?ids:[]).map(id=>available.get(id)).find(Boolean);
 if(!hit){
  announce('Kịch bản chưa có hành động đó ở cảnh này. Chỉ ý định được tác giả khai báo mới có hệ quả; trạng thái không thay đổi.');
  return;
 }
 choose(hit.choiceId);
});
el('restart').addEventListener('click',()=>{
 if(working)return;
 session=null;view=null;currentEntry=null;pendingEvent=null;
 story.hidden=true;start.hidden=false;announce('');
 start.scrollIntoView({behavior:'instant',block:'start'});
 roles.querySelector('button')?.focus();
});
try{
 const response=await fetch('./demo-content.json',{cache:'no-store',credentials:'omit'});
 if(!response.ok)throw Error('demo-content-unavailable');
 const content=await response.json();
 if(!content||Object.keys(content).sort().join(',')!=='manifest,script,world')throw Error('invalid-shape');
 play=await prepareAuthorRoleplayOffline(content.world,content.manifest,content.script);
 if(!play.ok)throw Error(play.code);
 roles.replaceChildren();
 play.entryProfiles.forEach(entry=>{
  const info=roleInfo[entry.entryId];if(!info)throw Error('unexpected-role');
  const b=button(entry.label,info.group+' · '+info.description,()=>begin(entry),'role-card');
  const img=document.createElement('img');img.src='./assets/'+info.image;
  img.alt='Chân dung '+entry.label;img.width=475;img.height=475;
  b.prepend(img);roles.append(b);
 });
}catch{
 roles.replaceChildren();
 announce('Không tải được bản thử online. Hãy tải lại trang sau ít phút.');
}
