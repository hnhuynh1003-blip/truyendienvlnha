/* Shared Web/EPUB display adapter. Source paragraphs stay in a WeakMap.
 * Edit mode uses caret hit-testing, not native Android selection handles. */
(function(root){
 'use strict';
 const engine=root?.DuduReaderNameIntelligenceL54,doc=root?.document;
 if(!engine||!doc)return;
 let storage=null;try{storage=root.localStorage;}catch(_){}
 const dictionary=engine.create({storage}),originals=new WeakMap(),details=new WeakMap();
 const el=id=>doc.getElementById(id),content=()=>el('reader-content');
 let storyId=null,editing=false,selected=null,automatic=[],results=[],initialized=false,chapter=0,scanning=false;
 let returnFocus=null,anchor=null,priorOverflow='',activeProfile='',managerView=false;
 const nodes=()=>Array.from(content()?.querySelectorAll(':scope > p')||[]);
 const ui=Object.freeze({
  markup:`<section class="reader-name-dialog-l53 l54-dialog" tabindex="-1">
   <div class="reader-name-head-l53"><div><small>DUDU SYSTEM</small><h3 id="reader-name-title-l53">Tên riêng</h3></div><button type="button" data-name-action="close" aria-label="Đóng">×</button></div>
   <nav class="l54-tabs" aria-label="Công cụ tên riêng"><button type="button" data-name-action="editor">Sửa tên</button><button type="button" data-name-action="dictionary">Từ điển</button><button type="button" data-name-action="scan">Dò tên</button></nav>
   <div id="reader-name-editor-l54">
    <label for="reader-name-from-l53">Tên được chọn<input id="reader-name-from-l53" maxlength="90" autocomplete="off"></label>
    <div class="l54-range"><button type="button" data-name-action="shrink">− 1 từ</button><button type="button" data-name-action="grow">+ 1 từ</button><button type="button" data-name-action="phrase" hidden>Chọn cả cụm</button></div>
    <label for="reader-name-to-l53">Tên hiển thị<input id="reader-name-to-l53" maxlength="90" autocomplete="off"></label>
    <label for="reader-name-link-l54">Nhân vật<select id="reader-name-link-l54"><option value="">Tạo hồ sơ riêng</option></select></label>
    <p id="reader-name-evidence-l54" class="l54-evidence"></p>
    <div class="reader-name-actions-l53 l54-confirm"><button type="button" data-name-action="cancel">Hủy</button><button type="button" data-name-action="save" class="l54-primary">Xác nhận</button></div>
   </div>
   <div id="reader-name-manager-l54" hidden>
    <input id="reader-name-search-l54" type="search" placeholder="Tìm nhân vật hoặc cách gọi" aria-label="Tìm trong từ điển">
    <div class="l54-manager-actions"><button type="button" data-name-action="add">+ Cách gọi</button><button type="button" data-name-action="undo">Hoàn tác</button><button type="button" data-name-action="export">Xuất</button><button type="button" data-name-action="import">Nhập</button></div>
    <input id="reader-name-import-l54" type="file" accept=".json,application/json" hidden>
    <div class="reader-name-list-head-l53"><strong id="reader-name-list-title-l54">Nhân vật</strong><span id="reader-name-count-l53"></span></div>
    <div id="reader-name-list-l53" class="reader-name-list-l53"></div>
   </div>
   <p id="reader-name-status-l53" role="status" aria-live="polite"></p>
  </section>`
 });
 function status(message,error=false){const node=el('reader-name-status-l53');if(node){node.textContent=message;node.dataset.error=String(error);}}
 function button(text,handler){const b=doc.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',handler);return b;}
 function captureAnchor(){
  const p=doc.elementFromPoint?.(Math.min(root.innerWidth/2,root.innerWidth-15),Math.min(150,root.innerHeight/3))?.closest?.('#reader-content > p');
  return {node:p,top:p?.getBoundingClientRect().top,x:root.scrollX,y:root.scrollY};
 }
 function restoreAnchor(saved){if(!saved)return;const delta=saved.node?.isConnected?saved.node.getBoundingClientRect().top-saved.top:0;root.scrollTo(saved.x,saved.y+delta);}
 function syncViewport(){
  const panel=el('reader-name-modal-l53'),v=root.visualViewport;if(!panel||panel.hidden)return;
  panel.style.top=(v?.offsetTop||0)+'px';panel.style.height=(v?.height||root.innerHeight)+'px';
 }
 function modalOpen(){return el('reader-name-modal-l53')&&!el('reader-name-modal-l53').hidden;}
 function clearHighlight(){if(selected?.node?.isConnected&&details.has(selected.node))selected.node.textContent=details.get(selected.node).text;}
 function close(){
  const panel=el('reader-name-modal-l53');if(!panel||panel.hidden)return;
  doc.activeElement?.blur?.();panel.hidden=true;doc.body.style.overflow=priorOverflow;
  clearHighlight();selected=null;restoreAnchor(anchor);returnFocus?.focus?.({preventScroll:true});anchor=null;
 }
 function show(){
  if(!storyId||!initialized)return false;
  root.DuduReaderPreferencesL2C?.close();root.DuduReaderFocusL2B?.hide();
  if(!modalOpen()){anchor=captureAnchor();returnFocus=doc.activeElement;priorOverflow=doc.body.style.overflow;doc.body.style.overflow='hidden';}
  el('reader-name-modal-l53').hidden=false;syncViewport();status('');
  el('reader-name-modal-l53').querySelector('section').focus({preventScroll:true});return true;
 }
 function setMode(value){
  editing=!!value;content()?.classList.toggle('l54-selecting',editing);
  const done=el('reader-name-done-l54');if(done)done.hidden=!editing;
  el('reader-name-edit-toggle-l54')?.setAttribute('aria-pressed',String(editing));
  if(!editing){close();clearHighlight();selected=null;}
 }
 function setStory(id){
  const next=id==null?null:String(id);
  if(next!==storyId){close();setMode(false);storyId=next;automatic=[];results=[];chapter++;}
 }
 function prepareChapter(paragraphs){
  close();setMode(false);chapter++;results=[];automatic=[];
  if(!storyId)return;
  // This examines just the incoming chapter. New or uncertain names never open UI.
  const text=Array.isArray(paragraphs)?paragraphs.join('\n'):String(paragraphs||'');
  automatic=engine.analyze(text,dictionary.read(storyId)).filter(r=>r.auto);
 }
 function bindParagraph(node,source){
  if(!node)return;originals.set(node,String(source||''));
  try{const rendered=storyId?dictionary.detailed(storyId,source,automatic):{text:String(source||''),segments:[],source:String(source||'')};details.set(node,rendered);node.textContent=rendered.text;}
  catch(_){node.textContent=String(source||'');}
 }
 function refresh(){
  const saved=anchor||captureAnchor();
  for(const node of nodes())if(originals.has(node))bindParagraph(node,originals.get(node));
  restoreAnchor(saved);if(anchor)anchor=captureAnchor();
 }
 function view(manager,title='Tên riêng'){
  managerView=manager;el('reader-name-editor-l54').hidden=manager;el('reader-name-manager-l54').hidden=!manager;el('reader-name-title-l53').textContent=title;
 }
 function updateLinks(from,preferred=''){
  const select=el('reader-name-link-l54'),profiles=dictionary.characters(storyId),links=engine.connections(from,profiles);
  select.replaceChildren();const empty=doc.createElement('option');empty.value='';empty.textContent='Tạo hồ sơ riêng';select.append(empty);
  for(const p of [...profiles].sort((a,b)=>Number(links.some(l=>l.id===b.id))-Number(links.some(l=>l.id===a.id)))){
   const option=doc.createElement('option');option.value=p.id;option.textContent=(links.some(l=>l.id===p.id)?'↔ ':'')+p.name;select.append(option);
  }
  select.value=preferred;
  const evidence=el('reader-name-evidence-l54');
  evidence.textContent=links.length>1?'Trùng cách gọi: chọn nhân vật trước khi liên kết.':links.length?'Có thể liên kết: '+links.map(p=>p.name).join(', '):'';
  evidence.dataset.suspect=String(links.length>1);
 }
 function fill(from,to,profileId=''){
  const stored=dictionary.read(storyId).find(r=>!r.disabledAuto&&engine.fold(r.from)===engine.fold(from));
  el('reader-name-from-l53').value=from;el('reader-name-from-l53').readOnly=!!selected||!!stored;
  el('reader-name-to-l53').value=to??stored?.to??engine.title(from);
  updateLinks(from,profileId||stored?.characterId||'');
  el('reader-name-modal-l53').querySelector('.l54-range').hidden=!selected;
 }
 function openManager(from=''){
  if(!show())return false;
  activeProfile='';
  if(from){view(false);fill(from);}else{view(true,'Từ điển nhân vật');listNames();}
  return true;
 }
 function sourceRange(node,start,end){
  const detail=details.get(node);if(!detail)return {from:node.textContent.slice(start,end),start,end};
  const touching=detail.segments.filter(s=>s.end>start&&s.start<end);
  if(!touching.length)return {from:'',start,end};
  const first=touching[0],last=touching.at(-1);
  const a=first.replaced&&!first.aligned?first.sourceStart:first.sourceStart+(start-first.start);
  const b=last.replaced&&!last.aligned?last.sourceEnd:last.sourceStart+(end-last.start);
  return {from:detail.source.slice(a,b),start:a,end:b};
 }
 function paintSelection(){
  if(!selected)return;
  const {node,tokens,a,b}=selected,text=details.get(node)?.text||node.textContent,start=tokens[a].start,end=tokens[b].end;
  const mark=doc.createElement('mark');mark.className='l54-selected';mark.textContent=text.slice(start,end);
  node.replaceChildren(doc.createTextNode(text.slice(0,start)),mark,doc.createTextNode(text.slice(end)));
  const range=sourceRange(node,start,end);selected.from=range.from;
  fill(engine.norm(range.from));
  const phrase=el('reader-name-modal-l53').querySelector('[data-name-action="phrase"]');phrase.hidden=!selected.phrase||selected.phrase.a===a&&selected.phrase.b===b;
  el('reader-name-modal-l53').querySelector('[data-name-action="shrink"]').disabled=b===a;
  el('reader-name-modal-l53').querySelector('[data-name-action="grow"]').disabled=b===tokens.length-1&&a===0;
 }
 function choose(node,offset){
  const text=details.get(node)?.text||node.textContent,tokens=engine.words(text);
  const index=tokens.findIndex(w=>offset>=w.start&&offset<w.end);if(index<0)return false;
  clearHighlight();selected={node,tokens,a:index,b:index,phrase:null};
  // Work with rendered text so even a differently-sized existing replacement
  // maps back to its original alias, rather than creating a dead replacement.
  const candidates=engine.analyze(text,dictionary.read(storyId));
  const occurrence=candidates.flatMap(r=>r.occurrences).filter(o=>o.start<=tokens[index].start&&o.end>=tokens[index].end).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
  if(occurrence){const a=tokens.findIndex(w=>w.start===occurrence.start),b=tokens.findIndex(w=>w.end===occurrence.end);if(a>=0&&b>=a)selected.phrase={a,b};}
  if(!show())return false;view(false);paintSelection();root.getSelection?.()?.removeAllRanges();return true;
 }
 function adjust(delta){
  if(!selected)return;
  const s=selected,text=details.get(s.node).text;
  if(delta<0&&s.b>s.a)s.b--;
  if(delta>0){
   if(s.b<s.tokens.length-1&&/^\s+$/u.test(text.slice(s.tokens[s.b].end,s.tokens[s.b+1].start)))s.b++;
   else if(s.a>0&&/^\s+$/u.test(text.slice(s.tokens[s.a-1].end,s.tokens[s.a].start)))s.a--;
  }
  paintSelection();
 }
 function save(){
  if(!storyId)return false;
  const from=el('reader-name-from-l53').value,to=el('reader-name-to-l53').value,profile=el('reader-name-link-l54').value;
  try{
   const cleaned=root.DuduReaderNameDictionaryL53.clean(from,to);
   if(!cleaned.from.includes(' ')&&!root.confirm('Đây là một từ đơn, có thể có nghĩa thông thường. Áp dụng trong cả truyện?'))return false;
   const existing=dictionary.read(storyId).find(r=>!r.disabledAuto&&engine.fold(r.from)===engine.fold(from));
   if(existing&&existing.to!==cleaned.to&&!root.confirm('Thay quy tắc hiện có cho “'+existing.from+'”?'))return false;
   const reassign=!!(profile&&existing?.characterId&&existing.characterId!==profile);
   if(reassign&&!root.confirm('Chuyển cách gọi “'+existing.from+'” sang nhân vật đã chọn? Cách gọi này chỉ thuộc một nhân vật trong truyện.'))return false;
   dictionary.add(storyId,cleaned.from,cleaned.to,profile,{allowReassign:reassign});refresh();close();return true;
  }catch(error){status(error.message,true);return false;}
 }
 function listNames(){
  const host=el('reader-name-list-l53');host.replaceChildren();
  const query=engine.fold(el('reader-name-search-l54').value),profiles=dictionary.characters(storyId);
  el('reader-name-count-l53').textContent=profiles.length+' nhân vật';
  el('reader-name-list-title-l54').textContent=activeProfile?'Cách gọi':'Nhân vật';
  el('reader-name-modal-l53').querySelector('[data-name-action="undo"]').disabled=!dictionary.canUndo(storyId);
  if(activeProfile){
   const profile=profiles.find(p=>p.id===activeProfile);if(!profile){activeProfile='';return listNames();}
   const header=doc.createElement('div');header.className='l54-profile-head';
   const field=doc.createElement('input');field.value=profile.name;field.maxLength=90;field.setAttribute('aria-label','Tên hồ sơ nhân vật');
   header.append(button('← Danh sách',()=>{activeProfile='';listNames();}),field,button('Đổi tên hồ sơ',()=>{try{dictionary.rename(storyId,profile.id,field.value);listNames();status('Đã đổi tên hồ sơ. Các cách xưng hô giữ riêng.');}catch(e){status(e.message,true);}}));host.append(header);
   for(const row of profile.aliases.filter(r=>engine.fold(r.from+' '+r.to).includes(query))){
    const item=doc.createElement('div');item.className='reader-name-row-l53';
    const label=doc.createElement('span');label.textContent=row.from+' → '+row.to;
    item.append(label,button('Sửa',()=>{selected=null;view(false);fill(row.from,row.to,profile.id);}),button('Xóa',()=>{
     if(!root.confirm('Xóa quy tắc “'+row.from+'”?'))return;
     try{dictionary.remove(storyId,row.from);refresh();listNames();status('Đã khôi phục văn bản gốc. Có thể hoàn tác.');}catch(e){status(e.message,true);}
    }));host.append(item);
   }
  }else{
   for(const profile of profiles.filter(p=>engine.fold(p.name+' '+p.aliases.map(a=>a.from+' '+a.to).join(' ')).includes(query))){
    const b=button(profile.name,()=>{activeProfile=profile.id;listNames();});b.className='l54-character';
    const count=doc.createElement('small');count.textContent=profile.aliases.length+' cách gọi';b.append(count);host.append(b);
   }
  }
  if(!host.children.length){const p=doc.createElement('p');p.textContent='Chưa có tên phù hợp.';host.append(p);}
 }
 async function scan(){
  if(scanning||!show())return;
  scanning=true;const token=chapter,id=storyId;view(true,'Dò tên trong chương');el('reader-name-list-title-l54').textContent='Đang dò…';el('reader-name-count-l53').textContent='';el('reader-name-list-l53').replaceChildren();
  await new Promise(resolve=>root.setTimeout(resolve,0));
  try{
   const text=nodes().map(n=>originals.get(n)||n.textContent).join('\n');
   results=engine.analyze(text,dictionary.read(id));
   if(id!==storyId||token!==chapter)return;
   const host=el('reader-name-list-l53');host.replaceChildren();
   for(const [category,label] of [['confirmed','Đã xác nhận'],['high','Gợi ý có độ tin cậy cao'],['suspect','Nghi vấn cần kiểm tra']]){
    const group=results.filter(r=>r.category===category);const heading=doc.createElement('h4');heading.textContent=label+' · '+group.length;host.append(heading);
    for(const result of group){
     const row=doc.createElement('div');row.className='l54-result';row.dataset.suspect=String(category==='suspect');
     const name=doc.createElement('span');name.textContent=result.to+' · '+result.count+' lần';
     const evidence=doc.createElement('small');evidence.textContent=result.reason+(result.links.length?' · '+result.links.map(p=>p.name).join(', '):'');
     row.append(name,evidence,button(category==='confirmed'?'Xem':'Kiểm tra',()=>{selected=null;view(false);fill(result.from,result.to);el('reader-name-evidence-l54').textContent=evidence.textContent;el('reader-name-evidence-l54').dataset.suspect=String(category==='suspect');}));host.append(row);
    }
   }
   el('reader-name-list-title-l54').textContent='Kết quả chương hiện tại';el('reader-name-count-l53').textContent=results.length+' tên';
   status(results.length?'Chỉ lưu khi bạn xác nhận.':'Chưa có tên đủ căn cứ trong chương.');
  }catch(error){status(error.message,true);}finally{scanning=false;}
 }
 function exportBackup(){
  try{const blob=new root.Blob([dictionary.backup(storyId)],{type:'application/json'}),url=root.URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download='DUDU_tu_dien_'+storyId.replace(/[^a-zA-Z0-9_-]/g,'_')+'.json';a.click();root.setTimeout(()=>root.URL.revokeObjectURL(url),1000);status('Đã xuất bản sao lưu.');}catch(e){status(e.message,true);}
 }
 function actions(action){
  if(action==='close'||action==='cancel')return close();
  if(action==='save')return save();
  if(action==='grow'||action==='shrink')return adjust(action==='grow'?1:-1);
  if(action==='phrase'&&selected?.phrase){Object.assign(selected,selected.phrase);return paintSelection();}
  if(action==='dictionary'){view(true,'Từ điển nhân vật');activeProfile='';return listNames();}
  if(action==='scan')return scan();
  if(action==='editor'||action==='add'){clearHighlight();selected=null;view(false);return fill('',undefined,activeProfile);}
  if(action==='undo'){try{if(dictionary.undo(storyId)){refresh();listNames();status('Đã hoàn tác.');}}catch(e){status(e.message,true);}return;}
  if(action==='export')return exportBackup();
  if(action==='import')el('reader-name-import-l54').click();
 }
 function init(){
  const panel=el('reader-name-modal-l53');if(initialized||!panel||!content())return;initialized=true;
  panel.innerHTML=ui.markup;panel.classList.add('l54-overlay');
  el('reader-name-hint-l53')?.remove();
  const old=el('reader-name-open-l53');if(old)old.hidden=true;
  const tools=doc.createElement('div');tools.className='l54-tools';
  const toggle=button('Sửa tên',()=>{setMode(!editing);root.DuduReaderPreferencesL2C?.close();});toggle.id='reader-name-edit-toggle-l54';toggle.setAttribute('aria-pressed','false');
  tools.append(toggle,button('Dò tên',scan),button('Từ điển',()=>openManager()));
  el('reader-settings-popover')?.append(tools);
  const done=button('✓ Xong',()=>setMode(false));done.id='reader-name-done-l54';done.hidden=true;el('reader-view')?.append(done);
  let modalPointerDown=false;
  panel.addEventListener('pointerdown',()=>{modalPointerDown=true;});
  panel.addEventListener('pointercancel',()=>{modalPointerDown=false;});
  panel.addEventListener('click',event=>{
   // Android may retarget the compatibility click from the prose to the newly
   // opened sheet. Only gestures that began here may activate its controls.
   const eligible=modalPointerDown||event.detail===0;modalPointerDown=false;
   if(!eligible){event.preventDefault();event.stopPropagation();return;}
   const action=event.target.closest('[data-name-action]')?.dataset.nameAction;if(action)actions(action);else if(event.target===panel)close();
  });
  el('reader-name-search-l54').addEventListener('input',()=>{activeProfile='';listNames();});
  el('reader-name-from-l53').addEventListener('input',event=>{el('reader-name-to-l53').value=engine.title(event.target.value);updateLinks(event.target.value,el('reader-name-link-l54').value);});
  el('reader-name-import-l54').addEventListener('change',async event=>{
   const file=event.target.files[0],id=storyId,token=chapter;event.target.value='';if(!file)return;
   try{if(file.size>500000)throw Error('Bản sao lưu quá lớn.');const data=await file.text();if(id!==storyId||token!==chapter)return;dictionary.restore(id,data);refresh();listNames();status('Đã nhập từ điển. Có thể hoàn tác.');}catch(e){status(e.message,true);}
  });
  let down=null;
  content().addEventListener('pointerdown',event=>{if(editing)down={x:event.clientX,y:event.clientY,id:event.pointerId};},{passive:true});
  content().addEventListener('pointercancel',()=>{down=null;},{passive:true});
  content().addEventListener('pointerup',event=>{
   if(!editing||!down||down.id!==event.pointerId)return;
   const tap=Math.hypot(event.clientX-down.x,event.clientY-down.y)<8;down=null;if(!tap)return;
   const p=event.target.closest?.('#reader-content > p');if(!p||!details.has(p))return;
   const hit=doc.caretPositionFromPoint?.(event.clientX,event.clientY),range=!hit&&doc.caretRangeFromPoint?.(event.clientX,event.clientY);
   const node=hit?.offsetNode||range?.startContainer,offset=hit?.offset??range?.startOffset;
   if(!node||!p.contains(node))return;
   const pre=doc.createRange();pre.selectNodeContents(p);try{pre.setEnd(node,offset);}catch(_){return;}
   event.preventDefault();const at=pre.toString().length,token=chapter;
   // Let the tap's compatibility click finish before mounting an overlay under
   // the finger; otherwise Android can immediately click the new backdrop.
   root.setTimeout(()=>{if(editing&&token===chapter&&p.isConnected)choose(p,at);},0);
  });
  content().addEventListener('click',event=>{if(editing){event.preventDefault();event.stopPropagation();}},true);
  content().addEventListener('contextmenu',event=>{if(editing)event.preventDefault();});
  content().addEventListener('selectstart',event=>{if(editing)event.preventDefault();});
  doc.addEventListener('keydown',event=>{
   if(event.key==='Escape'){if(modalOpen())close();else if(editing)setMode(false);}
   if(event.key==='Tab'&&modalOpen()){
    const list=Array.from(panel.querySelectorAll('button,input,select,[tabindex="0"]')).filter(n=>!n.disabled&&n.getClientRects().length);
    const first=list[0],last=list.at(-1);
    if(event.shiftKey&&(doc.activeElement===first||!list.includes(doc.activeElement))){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(doc.activeElement===last||!list.includes(doc.activeElement))){event.preventDefault();first?.focus();}
   }
  });
  root.visualViewport?.addEventListener('resize',syncViewport);root.visualViewport?.addEventListener('scroll',syncViewport);root.addEventListener('resize',syncViewport);
  // Leaving the reader must release the modal scroll lock and edit state.
  if(root.MutationObserver){const reader=el('reader-view');if(reader)new root.MutationObserver(()=>{if(reader.style.display==='none'){close();setMode(false);}}).observe(reader,{attributes:true,attributeFilter:['style']});}
 }
 root.DuduReaderNamesL53=Object.freeze({setStory,prepareChapter,bindParagraph,refresh,openManager,openSelected:()=>openManager(),save,close,setMode,scan});
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:null);
