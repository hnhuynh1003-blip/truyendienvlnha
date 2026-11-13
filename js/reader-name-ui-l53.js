/* L5.3 — read-only name aliases for the shared Web/EPUB reader.
 * The source paragraphs remain in a WeakMap and no story data is persisted.
 */
(function(root){
 'use strict';
 if(root?.DuduReaderNameIntelligenceL54)return; // L5.4 owns the same reader adapter API.
 const lib=root?.DuduReaderNameDictionaryL53;
 if(!lib||!root.document)return;
 let storage=null;
 try{storage=root.localStorage;}catch(_){/* private mode may disable it */}
 const dictionary=lib.create({storage});
 const originals=new WeakMap();
 const el=id=>root.document.getElementById(id);
 let storyId=null,candidate='',initialized=false,selectionTimer=null;
 const hasStory=()=>typeof storyId==='string'&&!!storyId;
 function status(message,error=false){
  const node=el('reader-name-status-l53');
  if(node){node.textContent=message;node.dataset.error=String(error);}
 }
 function hideHint(){
  const hint=el('reader-name-hint-l53');if(hint)hint.hidden=true;
 }
 function close(){
  const panel=el('reader-name-modal-l53');if(panel)panel.hidden=true;
  hideHint();
 }
 function setStory(id){
  const next=id==null?null:String(id);
  if(next!==storyId){storyId=next;candidate='';close();}
 }
 function bindParagraph(node,original){
  if(!node)return;
  const source=String(original||'');
  originals.set(node,source);
  try{node.textContent=hasStory()?dictionary.render(storyId,source):source;}
  catch(_){node.textContent=source;/* reading always takes priority */}
 }
 function refresh(){
  if(!hasStory())return;
  for(const node of el('reader-content')?.querySelectorAll(':scope > p')||[]){
   if(originals.has(node)){
    try{node.textContent=dictionary.render(storyId,originals.get(node));}
    catch(_){node.textContent=originals.get(node);}
   }
  }
  hideHint();
 }
 function listNames(){
  const host=el('reader-name-list-l53');if(!host)return;
  host.replaceChildren();
  const items=hasStory()?dictionary.read(storyId):[];
  for(const item of items){
   const row=root.document.createElement('div');row.className='reader-name-row-l53';
   const label=root.document.createElement('span');label.textContent=item.from+' → '+item.to;
   const edit=root.document.createElement('button');edit.type='button';
   edit.textContent='Sửa';edit.addEventListener('click',()=>{
    el('reader-name-from-l53').value=item.from;
    el('reader-name-to-l53').value=item.to;
    el('reader-name-to-l53').focus();
   });
   const remove=root.document.createElement('button');remove.type='button';
   remove.textContent='Xóa';remove.addEventListener('click',()=>{
    if(!root.confirm?.('Bỏ quy tắc “'+item.from+' → '+item.to+'” trong truyện này?'))return;
    try{
     dictionary.remove(storyId,item.from);refresh();listNames();
     status('Đã bỏ quy tắc. Nội dung gốc vẫn nguyên vẹn.');
    }catch(error){status(String(error?.message||error),true);}
   });
   row.append(label,edit,remove);host.append(row);
  }
  const count=el('reader-name-count-l53');
  if(count)count.textContent=items.length+'/'+lib.MAX_ENTRIES+' cách gọi';
 }
 function openManager(from=''){
  if(!hasStory())return false;
  // The permanent "Aa Tên riêng" control doubles as a mobile fallback:
  // it can pick up the current reader selection without using the native menu.
  const initial=from||selectedName();
  hideHint();
  el('reader-name-modal-l53').hidden=false;
  el('reader-name-from-l53').value=initial;
  el('reader-name-to-l53').value='';
  listNames();
  status('');
  if(initial)el('reader-name-to-l53').focus();
  return true;
 }
 function openSelected(){return openManager(candidate);}
 function save(){
  if(!hasStory())return false;
  const from=el('reader-name-from-l53').value,to=el('reader-name-to-l53').value;
  try{
   const item=lib.clean(from,to);
   if(!item.from.includes(' ')&&item.from.length<=4&&
      !root.confirm?.('“'+item.from+'” là từ ngắn, có thể xuất hiện với nghĩa thông thường. Vẫn áp dụng trong cả truyện này?'))
    return false;
   const existing=dictionary.read(storyId).find(entry=>
    entry.from.toLocaleLowerCase('vi')===item.from.toLocaleLowerCase('vi'));
   if(existing&&existing.to!==item.to&&!root.confirm?.(
    'Thay quy tắc “'+existing.from+' → '+existing.to+'” bằng “'+item.to+'”?'))return false;
   dictionary.add(storyId,item.from,item.to);
   refresh();listNames();
   status('Đã lưu “'+item.from+' → '+item.to+'”. Các chương của truyện này sẽ hiển thị tên chuẩn.');
   el('reader-name-from-l53').value='';
   el('reader-name-to-l53').value='';
   return true;
  }catch(error){status(String(error?.message||error),true);return false;}
 }
 function selectionParagraph(node){
  const element=node?.nodeType===1?node:node?.parentElement;
  const p=element?.closest?.('p');
  return p?.parentElement===el('reader-content')?p:null;
 }
 function selectedName(){
  const selection=root.getSelection?.();
  if(!selection||selection.isCollapsed||!selection.rangeCount)return '';
  const p1=selectionParagraph(selection.anchorNode);
  const p2=selectionParagraph(selection.focusNode);
  const text=selection.toString().replace(/\s+/gu,' ').trim();
  return p1&&p1===p2&&text&&text.length<=lib.MAX_PHRASE&&/\p{L}/u.test(text)
   ?text:'';
 }
 function isMobileReader(){
  return root.matchMedia?.('(max-width: 600px)')?.matches??root.innerWidth<=600;
 }
 function updateHint(){
  if(!hasStory()||!el('reader-name-modal-l53')?.hidden||
     root.document.getElementById('reader-view')?.style.display==='none'){
   hideHint();return;
  }
  const text=selectedName();
  if(!text){hideHint();return;}
  candidate=text;
  const hint=el('reader-name-hint-l53');
  const btn=el('reader-name-hint-button-l53');
  if(!hint||!btn)return;
  btn.textContent='✎ Sửa “'+(text.length>25?text.slice(0,25)+'…':text)+'”';
  if(isMobileReader()){
   // Android/iOS selection menus (Copy, Search, etc.) are native overlays near
   // the selected text. Dock our action away from that menu, within thumb reach.
   hint.style.top='';hint.style.left='';
  }else{
   const rect=root.getSelection().getRangeAt(0).getBoundingClientRect();
   const top=Math.min(root.innerHeight-58,Math.max(10,rect.top-50));
   const left=Math.min(root.innerWidth-190,Math.max(10,rect.left));
   hint.style.top=top+'px';hint.style.left=Math.max(10,left)+'px';
  }
  hint.hidden=false;
 }
 function init(){
  if(initialized||!el('reader-name-modal-l53'))return;
  initialized=true;
  root.document.addEventListener('selectionchange',()=>{
   root.clearTimeout(selectionTimer);
   selectionTimer=root.setTimeout(updateHint,180);
  });
  el('reader-content')?.addEventListener('mouseup',updateHint);
  el('reader-content')?.addEventListener('touchend',()=>root.setTimeout(updateHint,250),{passive:true});
  el('reader-name-hint-button-l53')?.addEventListener('mousedown',event=>event.preventDefault());
  el('reader-name-modal-l53')?.addEventListener('click',event=>{
   if(event.target===el('reader-name-modal-l53'))close();
  });
  root.document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&!el('reader-name-modal-l53').hidden)close();
  });
  root.addEventListener('scroll',()=>{
   if(!isMobileReader()){hideHint();return;}
   // Android can scroll automatically when dragging text-selection handles.
   // Keep the docked action as long as the selection remains valid.
   root.clearTimeout(selectionTimer);
   selectionTimer=root.setTimeout(updateHint,200);
  },{passive:true});
 }
 if(root.document.readyState==='loading')
  root.document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 root.DuduReaderNamesL53=Object.freeze({setStory,bindParagraph,refresh,
  openManager,openSelected,save,close});
})(typeof window!=='undefined'?window:null);
