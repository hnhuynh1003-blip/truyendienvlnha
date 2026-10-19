/* DUDU Foundation: isolated F story playtest. Never unlocks real missions. */
(function(root){
 'use strict';
 const doc=root.document,engine=root.DuduStoryEngineV1,story=root.DuduPilotFStoryV1;
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
  return 'dudu:pilot-f-v1:'+encodeURIComponent(uid||'guest');
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
  const img=el('img');img.src=v.place.background;img.alt='Khung cảnh: '+v.place.label;
  img.loading='eager';
  imageWrap.append(img,el('span','dudu-pilot-place','⌖  '+v.place.label));
  const notice=el('p','dudu-pilot-notice',
   'BẢN THỬ KHÉP KÍN · Không ký khế ước, không tính khảo hạch, không cấp EXP/Xu/vật phẩm');
  const content=el('section','dudu-pilot-content');
  content.append(el('h3','',v.ending?v.ending.title:v.title),
   el('p','dudu-pilot-description',v.ending?v.ending.text:v.text));
  if(!v.ending&&v.npc)content.append(el('p','dudu-pilot-npc','Nhân vật: '+v.npc));
  if(v.ending){
   content.append(el('p','dudu-pilot-result',v.status==='success'?
    'KẾT THÚC · MỤC TIÊU ĐẠT (CHỈ BẢN THỬ)':'KẾT THÚC · CHƯA ĐẠT MỤC TIÊU'));
  }
  const evNames={receipt:'Sổ trực đêm',broken_seal:'Dấu niêm phong vỡ',
   guard_statement:'Lời khai Lục Tam'};
  if(v.evidence.length){
   const evidence=el('div','dudu-pilot-evidence');
   evidence.append(el('strong','','Manh mối đã ghi nhận'));
   const tags=el('div','dudu-pilot-tags');
   v.evidence.forEach(k=>tags.append(el('span','',evNames[k]||k)));
   evidence.append(tags);content.append(evidence);
  }
  const actions=el('div','dudu-pilot-actions');
  if(v.ending){
   const again=el('button','dudu-pilot-action dudu-pilot-primary','↻ Thử tuyến khác');
   again.type='button';again.addEventListener('click',reset);actions.append(again);
  }else{
   v.choices.forEach(c=>{
    const btn=el('button','dudu-pilot-action',c.label);
    btn.type='button';btn.disabled=c.locked;
    if(c.locked)btn.title=c.requirementHint;
    btn.addEventListener('click',()=>{
     if(key()!==owner){load();render();return;}
     const result=engine.decide(story,state,c.id);
     if(!result.accepted)return;
     state=result.state;save();render();
    });
    actions.append(btn);
   });
  }
  const foot=el('footer','dudu-pilot-foot');
  const resetButton=el('button','dudu-pilot-reset','Làm lại từ đầu');
  resetButton.type='button';resetButton.addEventListener('click',reset);
  foot.append(el('span','','Tiến độ phiên thử: '+state.step+' bước'),resetButton);
  container.append(bar,imageWrap,notice,content,actions,foot);
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
 mount();
 root.DuduPilotUIV1=Object.freeze({open,mount,reset:()=>{
  if(!state)load();reset();return true;
 }});
})(typeof window!=='undefined'?window:null);
