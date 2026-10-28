// G5C-P3: Browser-only PUBLIC demo — G4A/G4B are the actual local engine.
// Public payload is redacted at build time. Never grants rewards, roles,
// evidence, durable save or production world access.
import {prepareAuthorRoleplayOffline} from '../../cloudflare/src/vangioi-author-roleplay-offline.mjs';

const byId=id=>document.getElementById(id);
const start=byId('start'),story=byId('story'),roles=byId('roles'),choices=byId('choices');
const notice=byId('notice');
let play=null,session=null,view=null,entryLabel='',pendingEvent=null,working=false;
const announce=message=>{notice.textContent=message||'';};

function button(label,description,action){
 const b=document.createElement('button');b.type='button';b.className='choice';
 const title=document.createElement('strong');title.textContent=label;b.append(title);
 if(description){const small=document.createElement('small');small.textContent=description;b.append(small);}
 b.addEventListener('click',action);return b;
}
function busy(value){
 working=value;
 document.querySelectorAll('.choice,.reset').forEach(b=>b.disabled=value);
}
async function render(sessionValue){
 const result=await play.view(sessionValue);
 if(!result.ok)throw new Error(result.code||'invalid-session');
 session=sessionValue;view=result;
 start.hidden=true;story.hidden=false;
 byId('role-name').textContent=entryLabel;
 byId('scene-number').textContent='Cảnh '+String(view.revision+1);
 byId('narration').textContent=view.narration;
 byId('dialogue').textContent=view.dialogue;
 const reaction=byId('reaction');reaction.textContent=view.roleReaction||'';
 reaction.hidden=!view.roleReaction;
 choices.replaceChildren();
 const ending=!!view.narrativeEndingId;
 byId('choice-block').hidden=ending;
 byId('ending').hidden=!ending;
 if(!ending)view.choices.forEach(choice=>choices.append(button(choice.label,'',()=>choose(choice.choiceId))));
 announce('');
 if(ending)byId('restart').focus();
 else choices.querySelector('button')?.focus();
}
async function begin(entry){
 if(working||!play)return;
 busy(true);
 try{
  const created=await play.start(entry.entryId,'anonymous-demo-'+crypto.randomUUID(),
   'web-demo-'+crypto.randomUUID());
  if(!created.ok)throw new Error(created.code);
  entryLabel=entry.label;pendingEvent=null;
  await render(created.session);
 }catch{announce('Không thể bắt đầu bản thử. Hãy làm mới trang để thử lại.');}
 finally{busy(false);}
}
async function choose(choiceId){
 if(working||!play||!session||!view)return;
 if(!pendingEvent||pendingEvent.choiceId!==choiceId)
  pendingEvent={choiceId,eventId:crypto.randomUUID(),expectedRevision:session.revision};
 busy(true);
 try{
  const result=await play.choose(session,pendingEvent);
  if(!result.ok)throw new Error(result.code);
  await render(result.session);
  pendingEvent=null;
 }catch{announce('Lựa chọn không được áp dụng. Thử bấm lại hoặc tải lại trang để bắt đầu phiên mới.');}
 finally{busy(false);}
}
byId('restart').addEventListener('click',()=>{
 if(working)return;
 session=null;view=null;pendingEvent=null;
 story.hidden=true;start.hidden=false;announce('');
 roles.querySelector('button')?.focus();
});

try{
 const response=await fetch('./demo-content.json',{cache:'no-store',credentials:'omit'});
 if(!response.ok)throw Error('demo-content-unavailable');
 const content=await response.json();
 if(!content||Object.keys(content).sort().join(',')!=='manifest,script,world')
  throw Error('demo-content-shape');
 // This is local self-consistency only; neither a licence nor authority proof.
 play=await prepareAuthorRoleplayOffline(content.world,content.manifest,content.script);
 if(!play.ok)throw Error(play.code);
 const explain={native_extra:'Người đã quen con nước và Bà Lan.',
  system_cover:'Người lạ mang danh nghĩa thanh tra tín hiệu.'};
 roles.replaceChildren();
 play.entryProfiles.forEach(entry=>roles.append(button(entry.label,
  explain[entry.mode]||entry.mode,()=>begin(entry))));
}catch{
 roles.replaceChildren();
 announce('Không tải được bản demo online. Hãy tải lại trang sau ít phút.');
}
