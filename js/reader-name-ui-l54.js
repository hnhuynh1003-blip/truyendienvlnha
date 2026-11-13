/* Shared Web/EPUB display adapter. Source paragraphs stay in a WeakMap.
 * Edit mode uses caret hit-testing, not native Android selection handles. */
(function(root){
 'use strict';
 const engine=root?.DuduReaderNameIntelligenceL54,doc=root?.document;
 if(!engine||!doc)return;
 let storage=null;try{storage=root.localStorage;}catch(_){}
 const dictionary=engine.create({storage}),originals=new WeakMap(),details=new WeakMap();
 const lookup=root.DuduReaderNameLookupL55;
 const el=id=>doc.getElementById(id),content=()=>el('reader-content');
 let storyId=null,editing=false,selected=null,automatic=[],results=[],initialized=false,chapter=0,scanning=false;
 let returnFocus=null,anchor=null,priorOverflow='',activeProfile='',managerView=false;
 let lookupRequest=0,managerRequest=0,viewRevision=0,targetDirty=false,autoInferred=false,autoPending=false;
 try{autoInferred=JSON.parse(storage?.getItem('dudu-reader-lookup-settings-l55')||'{}').automatic===true;}catch(_){}
 const nodes=()=>Array.from(content()?.querySelectorAll(':scope > p')||[]);
 const ui=Object.freeze({
  markup:`<section class="reader-name-dialog-l53 l54-dialog" tabindex="-1">
   <div class="reader-name-head-l53"><div><small>DUDU SYSTEM</small><h3 id="reader-name-title-l53">Tên riêng</h3></div><button type="button" data-name-action="close" aria-label="Đóng">×</button></div>
   <nav class="l54-tabs" aria-label="Công cụ tên riêng"><button type="button" data-name-action="editor">Sửa tên</button><button type="button" data-name-action="dictionary">Từ điển</button><button type="button" data-name-action="scan">Dò tên</button></nav>
   <div id="reader-name-editor-l54">
    <label for="reader-name-from-l53">Tên được chọn<input id="reader-name-from-l53" maxlength="90" autocomplete="off"></label>
    <div class="l54-range"><button type="button" data-name-action="shrink">− 1 từ</button><button type="button" data-name-action="grow">+ 1 từ</button><button type="button" data-name-action="phrase" hidden>Chọn cả cụm</button></div>
    <label for="reader-name-to-l53">Tên hiển thị<input id="reader-name-to-l53" maxlength="90" autocomplete="off"></label>
    <div id="reader-name-proposals-l55" class="l55-proposals" aria-live="polite"></div>
    <button type="button" data-name-action="manual" class="l55-manual">Xóa tên đề xuất · Nhập thủ công</button>
    <label for="reader-name-link-l54">Nhân vật<select id="reader-name-link-l54"><option value="">Tạo hồ sơ riêng</option></select></label>
    <p id="reader-name-evidence-l54" class="l54-evidence"></p>
    <div class="reader-name-actions-l53 l54-confirm"><button type="button" data-name-action="cancel">Hủy</button><button type="button" data-name-action="save" class="l54-primary">Xác nhận</button></div>
   </div>
   <div id="reader-name-manager-l54" hidden>
    <section id="reader-lookup-tools-l55" class="l55-lookup-tools" hidden>
     <label for="reader-lookup-query-l55">Tra Hán–Việt / nghĩa Việt<input id="reader-lookup-query-l55" maxlength="90" placeholder="lộc biết thuyền · 鹿知舟" autocomplete="off"></label>
     <button type="button" data-name-action="lookup">Tra cứu</button>
     <div id="reader-lookup-results-l55" class="l55-proposals" aria-live="polite"></div>
     <details class="l55-sources"><summary>Bộ tra đang dùng</summary><div id="reader-lookup-info-l55"></div></details>
     <details class="l55-sources"><summary>Thêm bộ tra cá nhân</summary>
      <p>File .txt dạng chữ Hán = nội dung, hoặc JSON bộ tra đã xuất. Tối đa 8 MB / 50.000 mục.</p>
      <label for="reader-lookup-kind-l55">Loại dữ liệu<select id="reader-lookup-kind-l55"><option value="names">Tên riêng · Names / Names2</option><option value="readings">Phiên âm · ChinesePhienAmWords</option><option value="meanings">Nghĩa Việt · VietPhrase</option></select></label>
      <div class="l54-manager-actions"><button type="button" data-name-action="import-pack">Nhập bộ tra</button><button type="button" data-name-action="export-pack">Xuất bộ đã chọn</button><button type="button" data-name-action="clear-packs">Gỡ bộ cá nhân</button></div>
      <input id="reader-lookup-file-l55" type="file" accept=".txt,.json,text/plain,application/json" hidden>
     </details>
     <label class="l55-auto-option"><input id="reader-lookup-auto-l55" type="checkbox"> Tự áp dụng gợi ý duy nhất, đủ ngữ cảnh</label>
     <p class="l55-note">Tên suy từ nghĩa Việt là ứng viên. Quy tắc bạn xác nhận luôn được ưu tiên.</p>
     <h4>Quy tắc của truyện</h4>
    </section>
    <input id="reader-name-search-l54" type="search" placeholder="Tìm nhân vật hoặc cách gọi" aria-label="Tìm trong từ điển">
    <div class="l54-manager-actions"><button type="button" data-name-action="add">+ Cách gọi</button><button type="button" data-name-action="undo">Hoàn tác</button><button type="button" data-name-action="export">Xuất quy tắc</button><button type="button" data-name-action="import">Nhập quy tắc</button></div>
    <p id="reader-name-backup-help-l55" class="l55-note">Nhập file JSON quy tắc đã xuất từ cùng truyện để khôi phục hoặc chuyển thiết bị.</p>
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
  doc.activeElement?.blur?.();panel.hidden=true;doc.body.style.overflow=priorOverflow;lookupRequest++;managerRequest++;viewRevision++;
  clearHighlight();selected=null;restoreAnchor(anchor);returnFocus?.focus?.({preventScroll:true});anchor=null;
  if(autoPending){autoPending=false;refresh();}
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
  if(next!==storyId){close();setMode(false);storyId=next;automatic=[];results=[];chapter++;if(initialized&&lookup){el('reader-lookup-query-l55').value='';el('reader-lookup-results-l55').replaceChildren();}}
 }
 function prepareChapter(paragraphs){
  close();setMode(false);chapter++;results=[];automatic=[];
  if(!storyId)return;
  // This examines just the incoming chapter. New or uncertain names never open UI.
  const text=Array.isArray(paragraphs)?paragraphs.join('\n'):String(paragraphs||'');
  automatic=engine.analyze(text,dictionary.read(storyId)).filter(r=>r.auto);
  if(lookup&&autoInferred)root.setTimeout(applyInferred,0);
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
  managerView=manager;viewRevision++;el('reader-name-editor-l54').hidden=manager;el('reader-name-manager-l54').hidden=!manager;el('reader-name-title-l53').textContent=title;
  const scanningView=title==='Dò tên trong chương';
  if(el('reader-lookup-tools-l55'))el('reader-lookup-tools-l55').hidden=!lookup||!manager||scanningView;
  el('reader-name-search-l54').hidden=scanningView;
  el('reader-name-import-l54').previousElementSibling.hidden=scanningView;
  el('reader-name-manager-l54').querySelector(':scope > .l54-manager-actions').hidden=scanningView;
  if(lookup&&manager&&!scanningView)loadMetadata();
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
  targetDirty=false;
  updateLinks(from,profileId||stored?.characterId||'');
  el('reader-name-modal-l53').querySelector('.l54-range').hidden=!selected;
  if(lookup)showSuggestions(from,{fillTarget:to===undefined&&!stored});
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
  scanning=true;const token=chapter,id=storyId;view(true,'Dò tên trong chương');const revision=viewRevision;el('reader-name-list-title-l54').textContent=lookup?'Đang tải bộ tra / dò tên…':'Đang dò…';el('reader-name-count-l53').textContent='';el('reader-name-list-l53').replaceChildren();
  await new Promise(resolve=>root.setTimeout(resolve,0));
  try{
   const text=nodes().map(n=>originals.get(n)||n.textContent).join('\n');
   const analyzed=lookup?await lookup.analyze(text,dictionary.read(id)):engine.analyze(text,dictionary.read(id));
   if(id!==storyId||token!==chapter||viewRevision!==revision||!modalOpen())return;results=analyzed;
   const host=el('reader-name-list-l53');host.replaceChildren();
   for(const [category,label] of [['confirmed','Đã xác nhận'],['high','Gợi ý có độ tin cậy cao'],['suspect','Nghi vấn cần kiểm tra']]){
    const group=results.filter(r=>r.category===category);const heading=doc.createElement('h4');heading.textContent=label+' · '+group.length;host.append(heading);
    for(const result of group){
     const row=doc.createElement('div');row.className='l54-result';row.dataset.suspect=String(category==='suspect');
     const name=doc.createElement('span');name.textContent=(lookup?result.from+' → ':'')+result.to+' · '+result.count+' lần';
     const evidence=doc.createElement('small');evidence.textContent=result.reason+(result.links.length?' · '+result.links.map(p=>p.name).join(', '):'');
     if(result.excerpt){const excerpt=doc.createElement('blockquote');excerpt.className='l55-excerpt';excerpt.textContent=result.excerpt;row.append(excerpt);}
     row.append(name,evidence,button(category==='confirmed'?'Xem':'Kiểm tra',()=>{selected=null;view(false);fill(result.from,result.to);if(!lookup){el('reader-name-evidence-l54').textContent=evidence.textContent;el('reader-name-evidence-l54').dataset.suspect=String(category==='suspect');}status('');}));host.append(row);
    }
   }
   el('reader-name-list-title-l54').textContent='Kết quả chương hiện tại';el('reader-name-count-l53').textContent=results.length+' tên';
   status(results.length?'Chỉ lưu khi bạn xác nhận.':'Chưa có tên đủ căn cứ trong chương.');
  }catch(error){if(id===storyId&&revision===viewRevision)status(error.message+' Có thể sửa tên thủ công.',true);}finally{scanning=false;}
 }
 function proposals(host,items,select){
  host.replaceChildren();
  if(!items.length){const p=doc.createElement('p');p.textContent='Chưa có ứng viên phù hợp. Bạn có thể nhập tên thủ công.';host.append(p);return;}
  for(const item of items){
   const card=doc.createElement('div');card.className='l55-candidate';card.dataset.inferred=String(item.kind==='inferred');
   const choice=button(item.name,()=>select(item));choice.className='l55-choice';
   const reason=doc.createElement('small');reason.textContent=item.reason;
   card.append(choice,reason);
   if(item.parts.length){const trace=doc.createElement('small');trace.className='l55-trace';trace.textContent=item.parts.map(p=>p.from+' → '+p.to+' ['+p.hanzi+']').join(' · ');card.append(trace);}
   host.append(card);
  }
 }
 async function showSuggestions(from,{fillTarget=false}={}){
  const host=el('reader-name-proposals-l55'),request=++lookupRequest,id=storyId,token=chapter;
  host.hidden=!engine.norm(from);host.textContent=from?'Đang tra bộ từ điển…':'';if(!from)return;
  try{
   const items=await lookup.suggest(from,{profiles:dictionary.characters(id)});
   if(request!==lookupRequest||id!==storyId||token!==chapter||!modalOpen()||managerView||engine.norm(from)!==engine.norm(el('reader-name-from-l53').value))return;
   proposals(host,items,item=>{el('reader-name-to-l53').value=item.name;targetDirty=true;if(item.profileId)updateLinks(from,item.profileId);});
   if(fillTarget&&!targetDirty&&items[0]?.kind==='inferred')el('reader-name-to-l53').value=items[0].name;
   // New dictionary evidence can propose the phrase surrounding a tapped word.
   const current=selected;
   if(current&&!current.phrase){
    const text=details.get(current.node)?.text||'',analyzed=await lookup.analyze(text,dictionary.read(id));
    if(selected!==current||request!==lookupRequest||id!==storyId||token!==chapter)return;
    const occurrence=analyzed.flatMap(r=>r.occurrences).filter(o=>o.start<=current.tokens[current.a].start&&o.end>=current.tokens[current.b].end).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
    if(occurrence){const a=current.tokens.findIndex(w=>w.start===occurrence.start),b=current.tokens.findIndex(w=>w.end===occurrence.end);if(a>=0&&b>a){current.phrase={a,b};el('reader-name-modal-l53').querySelector('[data-name-action="phrase"]').hidden=false;}}
   }
  }catch(error){if(request===lookupRequest&&modalOpen()){host.textContent=error.message+' Nhập tên thủ công ở ô phía trên.';}}
 }
 async function loadMetadata(){
  const host=el('reader-lookup-info-l55');if(!host)return;host.textContent='Đang tải bộ tra…';
  try{const meta=await lookup.load();if(!modalOpen())return;renderMetadata(lookup.metadata()||meta);}catch(error){host.textContent=error.message;}
 }
 function renderMetadata(meta){
  const host=el('reader-lookup-info-l55');host.replaceChildren();
  const info=doc.createElement('p');info.textContent=meta.characters.toLocaleString('vi')+' chữ · '+meta.meaningRows.toLocaleString('vi')+' mục nghĩa · chạy trên thiết bị';host.append(info);
  for(const source of meta.sources){const a=doc.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.name+' — '+source.author+' · '+source.license;host.append(a);}
  for(const pack of meta.packs){const p=doc.createElement('p');p.textContent='Cá nhân: '+pack.name+' · '+pack.count.toLocaleString('vi')+' mục';host.append(p);}
  const note=doc.createElement('p');note.textContent='Dữ liệu nguồn có thể sai. Chữ Hán trong ứng viên tra ngược là bằng chứng tra cứu, không phải nguyên văn của EPUB.';host.append(note);
 }
 async function searchLookup(){
  const query=el('reader-lookup-query-l55').value,host=el('reader-lookup-results-l55'),request=++managerRequest,id=storyId,token=chapter;
  host.textContent='Đang tra…';
  try{const items=await lookup.suggest(query,{profiles:dictionary.characters(id),forceMeaning:true});
   if(request!==managerRequest||id!==storyId||token!==chapter||!modalOpen()||!managerView||query!==el('reader-lookup-query-l55').value)return;
   proposals(host,items,item=>{selected=null;view(false);fill(query,item.name,item.profileId||'');});
  }catch(error){if(request===managerRequest)host.textContent=error.message;}
 }
 function downloadJSON(value,name){const blob=new root.Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=root.URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download=name;a.click();root.setTimeout(()=>root.URL.revokeObjectURL(url),1000);}
 async function exportPack(){try{const kind=el('reader-lookup-kind-l55').value,packs=await lookup.exportPacks(),pack=packs.find(p=>p.kind===kind);if(!pack)throw Error('Chưa nhập bộ tra cá nhân thuộc loại đã chọn.');downloadJSON(pack,'DUDU_bo_tra_'+kind+'.json');status('Đã xuất bộ tra cá nhân.');}catch(e){status(e.message,true);}}
 async function clearPacks(){if(!root.confirm('Gỡ các bộ tra cá nhân? Bộ tra có sẵn và quy tắc truyện được giữ nguyên.'))return;try{const meta=await lookup.clearPacks();renderMetadata(meta);status('Đã gỡ bộ tra cá nhân.');}catch(e){status(e.message,true);}}
 async function applyInferred(){
  const id=storyId,token=chapter;if(!lookup||!autoInferred||!id)return;
  try{const text=nodes().map(n=>originals.get(n)||n.textContent).join('\n'),analyzed=await lookup.analyze(text,dictionary.read(id));
   if(id!==storyId||token!==chapter||!autoInferred)return;
   const inferred=analyzed.filter(r=>r.inferredAutomatic).map(r=>({...r,auto:true}));
   automatic=automatic.filter(r=>!r.inferredAutomatic).concat(inferred);if(modalOpen())autoPending=true;else refresh();
  }catch(_){/* reading and confirmed rules remain available while lookup is offline */}
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
  if(action==='manual'){el('reader-name-to-l53').value='';targetDirty=true;el('reader-name-to-l53').focus({preventScroll:true});}
  if(action==='lookup')return searchLookup();
  if(action==='import-pack')el('reader-lookup-file-l55').click();
  if(action==='export-pack')return exportPack();
  if(action==='clear-packs')return clearPacks();
 }
 function init(){
  const panel=el('reader-name-modal-l53');if(initialized||!panel||!content())return;initialized=true;
  panel.innerHTML=ui.markup;panel.classList.add('l54-overlay');
  if(lookup)panel.classList.add('l55-enabled');
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
  },true);
  el('reader-name-search-l54').addEventListener('input',()=>{activeProfile='';listNames();});
  let lookupTimer=null;
  el('reader-name-from-l53').addEventListener('input',event=>{el('reader-name-to-l53').value=engine.title(event.target.value);targetDirty=false;updateLinks(event.target.value,el('reader-name-link-l54').value);if(lookup){lookupRequest++;root.clearTimeout(lookupTimer);const from=event.target.value,id=storyId,token=chapter;lookupTimer=root.setTimeout(()=>{if(id===storyId&&token===chapter&&el('reader-name-from-l53').value===from)showSuggestions(from,{fillTarget:true});},220);}});
  el('reader-name-to-l53').addEventListener('input',()=>{targetDirty=true;});
  el('reader-name-proposals-l55').hidden=!lookup;
  el('reader-name-modal-l53').querySelector('[data-name-action="manual"]').hidden=!lookup;
  if(lookup){
   el('reader-lookup-auto-l55').checked=autoInferred;
   el('reader-lookup-auto-l55').addEventListener('change',event=>{
    try{storage.setItem('dudu-reader-lookup-settings-l55',JSON.stringify({automatic:event.target.checked}));autoInferred=event.target.checked;
     if(autoInferred)applyInferred();else{automatic=automatic.filter(r=>!r.inferredAutomatic);refresh();}status(autoInferred?'Chỉ tự áp dụng ứng viên duy nhất, đủ ngữ cảnh.':'Đã tắt tự áp dụng gợi ý mới.');
    }catch(_){event.target.checked=autoInferred;status('Không lưu được tùy chọn trên thiết bị.',true);}
   });
   el('reader-lookup-query-l55').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchLookup();}});
   el('reader-lookup-file-l55').addEventListener('change',async event=>{
    const file=event.target.files[0],id=storyId,token=chapter;event.target.value='';if(!file)return;
    try{if(file.size>8000000)throw Error('Bộ tra vượt giới hạn 8 MB.');status('Đang kiểm tra bộ tra…');
     const result=await lookup.previewPack(await file.text(),{kind:el('reader-lookup-kind-l55').value,name:file.name.replace(/\.[^.]+$/u,'').slice(0,90)});
     if(id!==storyId||token!==chapter||!modalOpen())return;
     if(!root.confirm('Nhập '+result.pack.entries.length+' mục từ “'+result.pack.name+'”? Thay bộ cá nhân cùng loại.\n'+result.preview.map(p=>p.hanzi+' = '+p.value).join('\n')))return;
     const meta=await lookup.installPack(result.pack);renderMetadata(meta);status('Đã lưu bộ tra trên thiết bị. Quy tắc truyện giữ nguyên.');
    }catch(error){status(error.message,true);}
   });
  }
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
    const list=Array.from(panel.querySelectorAll('button,input,select,textarea,a[href],summary,[tabindex="0"]')).filter(n=>!n.disabled&&n.getClientRects().length);
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
