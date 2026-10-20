/* DUDU Foundation: isolated F story playtest. Never unlocks real missions. */
(function(root){
 'use strict';
 const doc=root.document;
 const upgraded=!!(root.DuduStoryEngineV2B&&root.DuduPilotFStoryV2B);
 const engine=upgraded?root.DuduStoryEngineV2B:root.DuduStoryEngineV1;
 const story=upgraded?root.DuduPilotFStoryV2B:root.DuduPilotFStoryV1;
 if(!doc||!engine||!story||engine.validate(story).length)return;
 const id=s=>doc.getElementById(s);
 const el=(tag,cls,txt)=>{
  const n=doc.createElement(tag);if(cls)n.className=cls;
  if(txt!==undefined)n.textContent=String(txt);return n;
 };
 let dialog=null,state=null,owner=null;
 function key(){
  let uid=null;
  try{const auth=root.DuduAuth;uid=auth?.isReady?.()?auth.uid():null;}catch{}
  if(!uid){try{uid=root.firebase?.auth?.()?.currentUser?.uid||null;}catch{}}
  return (upgraded?'dudu:pilot-f-fair-evidence-v6-1:':'dudu:pilot-f-v1:')+encodeURIComponent(uid||'guest');
 }
 function load(){
  owner=key();
  try{state=engine.restore(story,root.sessionStorage?.getItem(owner)||'')||engine.begin(story);}
  catch{state=engine.begin(story);}
 }
 function save(){
  if(key()!==owner){load();return;}
  try{root.sessionStorage?.setItem(owner,engine.serialize(story,state));}catch{}
 }
 function ensure(){
  if(dialog)return dialog;
  dialog=el('dialog','dudu-pilot-dialog');dialog.id='dudu-pilot-dialog-v1';
  dialog.setAttribute('aria-labelledby','dudu-pilot-heading');
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  doc.body.append(dialog);return dialog;
 }
 function close(){
  if(!dialog)return;
  if(dialog.open&&dialog.close)dialog.close();
  else dialog.removeAttribute('open');
 }
 function reset(){
  state=engine.begin(story);save();render();
 }
 function render(){
  if(!dialog)return;
  if(key()!==owner)load();
  const v=engine.view(story,state);
  const container=el('div','dudu-pilot-shell');
  const bar=el('header','dudu-pilot-top');
  const brand=el('div','dudu-pilot-brand');
  brand.append(el('span','dudu-pilot-label','DUDU / PILOT · F'),
   el('h2','',story.title));
  brand.querySelector('h2').id='dudu-pilot-heading';
  const closeButton=el('button','dudu-pilot-x','×');closeButton.type='button';
  closeButton.setAttribute('aria-label','Đóng truyện thử nghiệm');
  closeButton.addEventListener('click',close);
  bar.append(brand,closeButton);
  const imageWrap=el('div','dudu-pilot-visual');
  const img=el('img');img.src=v.place.background;img.alt='Khung cảnh: '+(v.place.publicName||v.place.label);
  img.loading='eager';
  // Optional cinematic photo: load only when the WebP exists, and retain the SVG fallback.
  // Pilot assets are not yet present on main. Do not block the story while probing.
  const photoPath=v.place.photo;
  if(photoPath&&typeof root.Image==='function'){
   const preview=new root.Image();
   preview.onload=()=>{
    if(img.isConnected&&img.getAttribute('src')===v.place.background){
     img.src=photoPath;img.setAttribute('data-render-style','cinematic');
    }
   };
   preview.onerror=()=>{};
   preview.src=photoPath;
  }
  imageWrap.append(img);
  if(v.storyPhase)imageWrap.append(el('span','dudu-pilot-phase',v.storyPhase));
  imageWrap.append(el('span','dudu-pilot-place','⌖  '+(v.place.publicName||v.place.label)));
  const notice=el('p','dudu-pilot-notice',
   'BẢN THỬ KHÉP KÍN · Không ký khế ước, không tính khảo hạch, không cấp EXP/Xu/vật phẩm');
  const content=el('section','dudu-pilot-content'+(v.sceneType==='prologue'?' dudu-pilot-prologue':''));
  content.append(el('h3','',v.ending?v.ending.title:v.title));
  if(v.passageReaction)content.append(el('p','dudu-pilot-reaction',v.passageReaction));
  const passage=el('div','dudu-pilot-prose');
  String(v.ending?v.ending.text:v.text).split(/\n\s*\n/).filter(Boolean)
   .forEach(part=>passage.append(el('p','dudu-pilot-description',part.trim())));
  content.append(passage);
  if(!v.ending&&v.npcDetails){
   const npcBox=el('div','dudu-pilot-persona');
   const avatar=el('span','dudu-pilot-npc-mark',v.npcDetails.name.charAt(0));
   avatar.setAttribute('aria-hidden','true');
   const dialogue=el('div','dudu-pilot-npc-dialogue');
   dialogue.append(el('p','dudu-pilot-npc',v.npcDetails.name+' · '+v.npcDetails.role),
    el('blockquote','dudu-pilot-voice',v.npcDetails.text));
   npcBox.append(avatar,dialogue);
   content.append(npcBox);
  }else if(!v.ending&&v.npc){
   content.append(el('p','dudu-pilot-npc','Nhân vật: '+v.npc));
  }
  if(v.ending){
   content.append(el('p','dudu-pilot-result',
    upgraded?'KHÉP LẠI MỘT ĐÊM MƯA · MỘT TRONG NHIỀU KẾT CỤC':
    (v.status==='success'?'KẾT THÚC · MỤC TIÊU ĐẠT (CHỈ BẢN THỬ)':'KẾT THÚC · CHƯA ĐẠT MỤC TIÊU')));
  }
  const evNames={receipt:'Sổ trực đêm',broken_seal:'Dấu niêm phong vỡ',
   guard_statement:'Lời khai Lục Tam'};
  if(v.evidence.length){
   const evidence=el('details','dudu-pilot-evidence');
   evidence.append(el('summary','dudu-pilot-evidence-toggle','▤ Sổ tay của bạn'));
   const note=el('p','dudu-pilot-evidence-note','Những gì bạn đã quan sát hoặc nghe được. Không cần thu đủ mọi manh mối để bắt đầu suy nghĩ.');
   evidence.append(note);
   const tags=el('div','dudu-pilot-tags');
   if(v.clueDetails){v.clueDetails.forEach(clue=>tags.append(el('span','',clue.label)));}
   else v.evidence.forEach(k=>tags.append(el('span','',evNames[k]||k)));
   evidence.append(tags);content.append(evidence);
  }
  const choiceSection=el('section','dudu-pilot-choice-section');
  if(!v.ending)choiceSection.append(el('p','dudu-pilot-choice-prompt',
   v.sceneType==='prologue'?'Tiếp theo':'Bạn muốn làm gì?'));
  const actions=el('div','dudu-pilot-actions'+(v.choices.length===1?' dudu-pilot-single-action':''));
  if(v.ending){
   const again=el('button','dudu-pilot-action dudu-pilot-primary','↻ Thử tuyến khác');
   again.type='button';again.addEventListener('click',()=>{reset();if(dialog)dialog.scrollTop=0;});actions.append(again);
  }else{
   v.choices.forEach(c=>{
    const btn=el('button','dudu-pilot-action'+(v.choices.length===1?' dudu-pilot-next':'')); 
    const badge=el('span','dudu-choice-key',String.fromCharCode(65+(actions.children.length%26)));
    const item=el('span','dudu-choice-label',c.label);
    btn.append(badge,item);
    btn.dataset.choiceKind=c.kind||'action';
    btn.type='button';btn.disabled=c.locked;
    if(c.locked){btn.title=c.requirementHint;
     btn.append(el('small','dudu-pilot-choice-hint',c.requirementHint));
    }
    btn.addEventListener('click',()=>{
     if(key()!==owner){load();render();return;}
     const result=engine.decide(story,state,c.id);
     if(!result.accepted)return;
     state=result.state;save();render();if(dialog)dialog.scrollTop=0;
    });
    actions.append(btn);
   });
  }
  const foot=el('footer','dudu-pilot-foot');
  const resetButton=el('button','dudu-pilot-reset','Làm lại từ đầu');
  resetButton.type='button';resetButton.addEventListener('click',reset);
  foot.append(el('span','',upgraded?'Tiến trình đọc lưu tạm trong phiên':'Tiến độ phiên thử: '+state.step+' bước'),resetButton);
  choiceSection.append(actions);
  container.append(bar,imageWrap,notice,content,choiceSection,foot);
  dialog.replaceChildren(container);
 }
 function open(){
  load();const d=ensure();render();
  if(typeof d.showModal==='function'&&!d.open)d.showModal();
  else if(typeof d.showModal!=='function'){d.setAttribute('open','');d.setAttribute('role','dialog');}
  d.querySelector('.dudu-pilot-x')?.focus();return true;
 }
 function mount(){
  const list=id('d60-worlds-list');
  if(!list||id('dudu-pilot-entry-v1'))return;
  // The site shell now renders an explicit stable playtest link itself.
  // Keep old auto-mount only as a fallback for pages with an older shell.
  if(typeof list.querySelector==='function'&&list.querySelector('.dudu-pilot-entry-inline'))return;
  const entry=el('aside','dudu-pilot-entry');
  entry.id='dudu-pilot-entry-v1';
  const copy=el('div','dudu-pilot-entry-copy');
  copy.append(el('span','dudu-pilot-entry-kicker','KHẢO NGHIỆM CỐT TRUYỆN · KHÔNG GHI THƯỞNG'),
   el('strong','',story.title),
   el('span','dudu-pilot-entry-desc','Một truyện F có biến cố, NPC, chứng cứ và nhiều kết thúc.'));
  const action=el('button','dudu-pilot-launch','Chơi thử ↗');action.type='button';
  action.addEventListener('click',open);
  entry.append(copy,action);list.parentNode.insertBefore(entry,list);
 }
 // The site's initial Worlds render runs in a microtask; wait until that
 // render finishes so we do not create a second pilot card before it appears.
 if(typeof queueMicrotask==='function')queueMicrotask(mount);
 else root.setTimeout?.(mount,0);
 root.DuduPilotUIV1=Object.freeze({open,mount,reset:()=>{
  if(!state)load();reset();return true;
 }});
})(typeof window!=='undefined'?window:null);
