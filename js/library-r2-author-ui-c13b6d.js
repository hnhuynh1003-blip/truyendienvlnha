// Candidate replaces library-r2-author-ui-c13b6d.js; no automatic activation.
(function(){
 if(window.DuduC12AuthorPreview)return;
 if(IS_SANDBOX_MODE){const button=document.getElementById('c12-open');const sync=()=>{button.hidden=!canEditStories();};sync();window.addEventListener('dudu-auth-state-changed',sync);return;}
 const modal=document.getElementById('epub-import-modal'),host=document.getElementById('epub-import-content');
 const view=window.DuduEpubImportV48.createImportView(document),el=view.el;
 const bind=(node,name)=>{node.id='c12-'+name;return node;};
 const form=bind(el('form'),'form');form.className='r2-unified-form';
 const help=el('p','Chọn EPUB → xem bìa, văn án và chương → sửa thông tin → đăng vào thư viện.');help.className='r2-import-help';
 const pickers=el('div');pickers.className='dudu-epub-actions r2-import-pickers';
 bind(view.input,'file');view.input.hidden=true;
 const files=bind(el('input'),'files');files.type='file';files.multiple=true;files.accept=view.input.accept;files.hidden=true;
 const folder=bind(el('input'),'folder');folder.type='file';folder.multiple=true;folder.setAttribute('webkitdirectory','');folder.setAttribute('directory','');folder.hidden=true;
 for(const [name,text]of [['file','Chọn một EPUB'],['files','Chọn nhiều EPUB'],['folder','Chọn thư mục cha']]){
  const button=bind(el('button',text),'pick-'+name);button.type='button';button.className='btn';button.addEventListener('click',()=>document.getElementById('c12-'+name).click());pickers.append(button);
 }
 const folderNote=bind(el('small'),'folder-note');
 const queuePanel=bind(el('details'),'queue-panel');queuePanel.className='r2-import-queue';queuePanel.append(bind(el('summary'),'queue-summary'));
 const tools=el('div');tools.className='dudu-epub-actions r2-queue-tools';
 for(const [name,text]of [['select-all','Chọn tất cả'],['select-none','Bỏ chọn'],['clear','Xóa danh sách chờ']]){const b=bind(el('button',text),name);b.type='button';b.className='btn';tools.append(b);}
 queuePanel.append(tools,bind(el('div'),'queue'));
 const previewHeader=el('div');previewHeader.className='r2-import-preview-header';
 bind(view.coverPreview,'cover');const intro=el('div');intro.append(bind(el('p'),'editing'),bind(view.info,'info'));previewHeader.append(view.coverPreview,intro);
 const chapterPanel=el('details');chapterPanel.className='r2-import-chapters';chapterPanel.append(bind(el('summary'),'chapter-summary'),bind(view.list,'chapters'));
 for(const [node,name]of [[view.title,'title'],[view.authorInput,'author'],[view.descInput,'description'],[view.genreInput,'genre'],[view.completionInput,'publication'],[view.status,'status']])bind(node,name);
 for(const [name,text]of [['start','Đăng các sách đã chọn'],['pause','Dừng sau cuốn hiện tại'],['status-check','Kiểm tra trạng thái'],['close','Đóng']])bind(view.button(text,()=>{}),name);
 const read=view.button('Mở sách vừa đăng',()=>{});read.id='c13b3-read';
 view.buttons.classList.add('r2-import-footer');
 form.append(help,pickers,view.input,files,folder,folderNote,queuePanel,previewHeader,view.fields,chapterPanel,view.status,view.buttons);host.replaceChildren(form);
 document.getElementById('c12-start').classList.add('btn-primary');
 const previewByFile=new WeakMap();

 const id=x=>document.getElementById('c12-'+x),config=window.DUDU_LIBRARY_R2_PREVIEW_CONFIG;
 const enabled=config?.enabled===true&&config?.authorImportEnabled===true;
 const allowed=()=>enabled&&!IS_SANDBOX_MODE&&window.DuduAuth?.isAdmin?.()===true&&firebase.auth().currentUser?.uid===config.pilotOwnerUid;
 const fields=['title','author','description','genre','publication'];
 const labels={idle:'Chọn EPUB để tự điền thông tin.',parsing:'Đang đọc EPUB…',ticket:'Đang chuẩn bị phiên nhập…',packaging:'Đang chuẩn bị nội dung và ảnh…',draft:'Đang tạo bản nháp…',staging:'Đang tải EPUB…',quarantined:'Đã tải đủ. Bấm xác nhận xuất bản.',promoting:'Đang kiểm tra nội dung đã tải…',publishing:'Đang xuất bản…',published:'Đã xuất bản. Có thể mở đọc.',blocked:'Đã dừng. Kiểm tra trạng thái trước khi nhập tiếp.'};
 let controller=null,abort=null,sessionUid=null,version=0,preparing=false,preparedFile=null,busy=false,activeEntry=null,lastPublishedBook=null;
 const intake=window.DuduR2PersonalIntake.create({parse:(file,options)=>window.DuduEpubImportV48.parse(file,options),options:{zipLib:window.JSZip,Parser:DOMParser}});
 const queueLabels={PREPARING:'Đang kiểm tra trên máy',READY:'Hợp lệ trên máy; chờ đăng',METADATA:'Cần sửa metadata',BLOCKED:'BLOCKED',RETRY:'Chưa gửi request; có thể thử lại',RUNNING:'Đang đăng',PUBLISHED:'Đã xuất bản',UNKNOWN:'Dừng để đối soát'};
 async function prepareForQueue(file){
  const value=await intake.prepare(file);
  // Fixed local validation labels only, never tickets or allocated catalog identities.
  // Discard this package. The controller must rebuild it with server-issued IDs.
  const pack=await window.DuduEpubR2SidecarL6C11.buildPackage({file,parsed:value.parsed,bookId:'epub-'+'0'.repeat(32),revisionId:'r-'+'0'.repeat(32),zipLib:window.JSZip,Parser:DOMParser,textV57:window.DuduEpubTextV57,cryptoApi:crypto});
  await window.DuduEpubStageL6P2C4.buildPlan({manifest:pack.manifest,layouts:pack.layouts,parts:pack.parts,cryptoApi:crypto});
  previewByFile.set(file,{coverImage:value.parsed.coverImage||'',chapters:value.parsed.chapters.map(ch=>({title:ch.title,kind:ch.kind})),totalChars:value.parsed.totalChars});
  return value;
 }
 let queue=window.DuduR2PersonalQueue.create({prepare:prepareForQueue,validateMetadata:m=>window.DuduLibraryR2AuthorImportL6C12.validateMetadata(m),onChange:()=>renderQueue()});
 const locked=()=>busy||preparing||queue.status().running||queue.status().adding||queue.status().halted;
 const metadata=()=>({title:id('title').value,author:id('author').value,description:id('description').value,genre:id('genre').value,publicationState:id('publication').value});
 function showEntry(entry){
  activeEntry=entry;preparedFile=entry.file;
  for(const f of fields)id(f).value=entry.metadata[f==='publication'?'publicationState':f]||'';
  id('editing').textContent=entry.metadata.title||entry.file.name;
  const preview=previewByFile.get(entry.file),cover=preview?.coverImage||'';
  id('cover').style.display='none';id('cover').removeAttribute('src');
  if(cover.length<=524288&&/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(cover)){id('cover').src=cover;id('cover').style.display='block';}
  id('info').textContent=entry.path+' · '+entry.chapters+' chương'+(Number.isFinite(preview?.totalChars)?' · '+preview.totalChars.toLocaleString('vi-VN')+' ký tự':'');
  id('chapter-summary').textContent='Danh sách chương ('+entry.chapters+')';id('chapters').replaceChildren();
  for(const [i,ch]of(preview?.chapters||[]).entries()){const row=el('div',(i+1)+'. '+ch.title);row.className='dudu-epub-item';id('chapters').append(row);}
  render();
 }
 function renderQueue(){
  const list=id('queue');list.replaceChildren();const state=queue.status();
  for(const entry of queue.entries()){
   const row=document.createElement('div'),check=document.createElement('input'),text=document.createElement('span'),edit=document.createElement('button');
   check.type='checkbox';check.checked=entry.selected;check.disabled=!allowed()||locked()||!['READY','METADATA','RETRY'].includes(entry.state);
   check.setAttribute('aria-label','Chọn '+entry.path);check.addEventListener('change',()=>queue.select(entry.id,check.checked));
   text.textContent=' '+(entry.metadata.title||entry.file.name)+' — '+entry.path+' — '+entry.chapters+' chương'+(entry.hasCover?' · Có bìa':'')+' — '+queueLabels[entry.state]+(entry.message?' · '+entry.message:'');
   edit.type='button';edit.textContent='Sửa thông tin';edit.disabled=!allowed()||locked()||!['READY','METADATA','RETRY'].includes(entry.state);edit.addEventListener('click',()=>showEntry(entry));
   row.className='dudu-epub-item r2-import-queue-row';edit.className='btn';row.append(check,text,edit);list.append(row);
  }
  const all=queue.entries();id('queue-panel').hidden=all.length===0;id('queue-summary').textContent=all.length+' sách · '+all.filter(e=>e.selected).length+' đã chọn · '+all.filter(e=>e.state==='PUBLISHED').length+' đã đăng';
  for(const x of ['file','files','folder','pick-file','pick-files','pick-folder','clear','select-all','select-none'])id(x).disabled=!allowed()||locked();
  id('pause').disabled=!state.running;id('pause').hidden=!state.running;render();
 }
 const key=uid=>'dudu-r2-personal:'+uid;
 function pending(){const raw=localStorage.getItem(key(sessionUid));if(!raw)return null;const p=JSON.parse(raw);if(p.schema!==1||!Object.hasOwn(labels,p.phase)||p.bookId!==null&&!/^epub-[a-f0-9]{32}$/.test(p.bookId)||p.revisionId!==null&&!/^r-[a-f0-9]{32}$/.test(p.revisionId))throw Error('Phiên nhập lưu trên máy cần đối soát.');return p;}
 function record(uid,state){localStorage.setItem(key(uid),JSON.stringify({schema:1,phase:state.status,bookId:state.bookId||null,revisionId:state.revisionId||null}));}
 function render(message){
  const state=controller?.status();let p=null,storageError=false;try{p=sessionUid?pending():null;}catch{storageError=true;}
  id('status').textContent=message||(storageError?'Không đọc được trạng thái lưu trên máy. Dừng nhập.':p&&!controller?'Có phiên nhập cần kiểm tra trạng thái.':labels[state?.status]||labels.idle);
  id('status').dataset.state=state?.status||p?.phase||'idle';
  id('start').disabled=!allowed()||locked()||storageError||!!p||!queue.entries().some(e=>e.selected&&['READY','RETRY'].includes(e.state));
  document.getElementById('c13b3-read').disabled=!allowed()||busy||queue.status().running||!lastPublishedBook;
  for(const x of ['file','files','folder','pick-file','pick-files','pick-folder','clear','select-all','select-none'])id(x).disabled=!allowed()||locked()||!!p||storageError;
  id('status-check').disabled=!allowed()||busy;id('status-check').hidden=!p&&!queue.status().halted;document.getElementById('c13b3-read').hidden=!lastPublishedBook;
  for(const f of fields)id(f).disabled=!allowed()||locked()||!!p||!activeEntry||!['READY','METADATA','RETRY'].includes(activeEntry.state);
 }
 function syncAccess(){const uid=allowed()?firebase.auth().currentUser.uid:null;if(sessionUid!==uid){version++;preparedFile=null;preparing=false;activeEntry=null;lastPublishedBook=null;queue.pause();queue=window.DuduR2PersonalQueue.create({prepare:prepareForQueue,validateMetadata:m=>window.DuduLibraryR2AuthorImportL6C12.validateMetadata(m),onChange:()=>renderQueue()});if(sessionUid){abort?.abort();closeView();controller=null;}}sessionUid=uid;id('open').hidden=!uid;renderQueue();}
 const legacy=window.duduSyncEpubAccessR11;window.duduSyncEpubAccessR11=approved=>{syncAccess();return legacy?.(approved);};
 window.addEventListener('dudu-auth-state-changed',syncAccess);syncAccess();
id('form').addEventListener('submit',e=>e.preventDefault());
 for(const f of fields)id(f).addEventListener('input',()=>{if(activeEntry&&!locked())queue.edit(activeEntry.id,metadata());});
 async function addFiles(input){
  if(!allowed()||locked())return;let p;try{p=pending();}catch{return render('Không đọc được trạng thái phiên nhập.');}
  if(p)return render('Kiểm tra phiên nhập trước; không thêm sách mới.');
  const owner=sessionUid,mine=version,current=queue,files=Array.from(input.files||[]);input.value='';
  if(controller?.status().published){controller=null;abort=null;}
  const result=await current.add(files,{guard:()=>current===queue&&owner===sessionUid&&mine===version&&allowed()});
  if(current!==queue||owner!==sessionUid)return;
  const next=current.entries().find(e=>['READY','METADATA','RETRY'].includes(e.state));if(next)showEntry(next);
  id('queue-panel').open=current.entries().length>1||current.entries().some(e=>e.state==='BLOCKED');renderQueue();render('Đã thêm '+result.added+' EPUB; bỏ qua '+result.duplicates+' tệp trùng nội dung, '+result.ignored+' tệp khác. '+(result.limited?'Tối đa 500 sách trong danh sách. ':'')+'Chọn sách và sửa thông tin nếu cần; chưa có upload.');
 }
 for(const name of ['file','files','folder'])id(name).addEventListener('change',()=>addFiles(id(name)));
 const folderSupported='webkitdirectory' in document.createElement('input');
 id('pick-folder').hidden=!folderSupported;id('folder-note').textContent=folderSupported?'Chọn thư mục cha để lấy EPUB trong các thư mục con.':'Trình duyệt không hỗ trợ chọn thư mục; hãy chọn một hoặc nhiều tệp EPUB.';
 id('select-all').addEventListener('click',()=>{if(allowed())queue.selectAll(true);});id('select-none').addEventListener('click',()=>{if(allowed())queue.selectAll(false);});
 id('pause').addEventListener('click',()=>queue.pause());
 id('clear').addEventListener('click',()=>{if(!allowed()||locked())return;try{if(pending())return;}catch{return;}if(queue.clear()){controller=null;abort=null;activeEntry=null;preparedFile=null;for(const f of fields)id(f).value='';renderQueue();}});
 id('start').addEventListener('click',async()=>{
  if(!allowed()||locked())return;
  try{if(pending())return render('Có phiên cần đối soát.');}catch{return render('Không đọc được phiên nhập.');}
  const current=queue,owner=sessionUid;
  await current.run(async entry=>{
   if(!allowed()||owner!==sessionUid||current!==queue)return {kind:'unknown'};
   showEntry(entry);controller=null;abort=null;
   return publishEntry(entry);
  },{guard:()=>allowed()&&owner===sessionUid&&current===queue});
  renderQueue();
 });
 async function publishEntry(entry){
  if(!allowed()||busy)return {kind:'unknown'};
  const file=entry.file,metadata=entry.metadata;
  if(!window.DuduLibraryR2AuthorImportL6C12.validateMetadata(metadata))return {kind:'pre-dispatch'};
  const owner=sessionUid;let active=null;
  try{
   if(pending())return {kind:'unknown'};
   abort=abort||new AbortController();controller=controller||window.DuduLibraryR2AuthorImportL6C12.createController({enabled:true,getCurrentUser:()=>firebase.auth().currentUser,
    send:window.DuduLibraryR2AuthorImportL6C12.createTransport({workerBaseUrl:config.workerBaseUrl}),parseV48:async file=>(await intake.prepare(file)).parsed,
    sidecar:window.DuduEpubR2SidecarL6C11,uploader:window.DuduEpubStageL6P2C4,zipLib:window.JSZip,Parser:DOMParser,textV57:window.DuduEpubTextV57,cryptoApi:crypto,onState:state=>record(owner,state)});
   active=controller;busy=true;render();await active.start({file,metadata,signal:abort.signal,onProgress:p=>render('Đã tải '+p.completed+'/'+p.total+' phần')});record(owner,active.status());
   if(controller!==active||sessionUid!==owner||!allowed()||!active.status().readyForOwnerConfirmation)throw Error('Phiên đã đổi hoặc chưa tải đủ; dừng xuất bản.');
   // The explicit "Đăng EPUB R2" click authorizes this single publish only after verified receipts.
   render('Đã tải đủ. Đang kiểm tra và đăng truyện…');await active.publish({approve:true,expectedBookId:active.status().bookId,signal:abort.signal});localStorage.removeItem(key(owner));lastPublishedBook=active.status().bookId;render(labels.published);return {kind:'published'};
  }catch(error){
   let noPending=false;try{noPending=pending()===null;}catch{}
   const s=active?.status();
   // Only a proven pre-dispatch failure in this exact session may release the UI.
   if(active&&controller===active&&sessionUid===owner&&s.requestsDispatched===0&&s.bookId===null&&noPending){controller=null;abort=null;render('Chưa gửi yêu cầu nhập. Bạn có thể thử lại sau khi sửa lỗi đăng nhập hoặc dữ liệu.');return {kind:'pre-dispatch'};}
   else {render(error.message);return {kind:'unknown'};}
  }finally{busy=false;render(id('status').textContent);}
 }
 id('status-check').addEventListener('click',async()=>{
  if(!allowed()||busy||queue.status().running||queue.status().adding)return;const owner=sessionUid,user=firebase.auth().currentUser;busy=true;
  try{const p=pending();if(!p)return render(controller?.status().published?labels.published:'Không có phiên nhập dở trên thiết bị này.');if(!p.bookId)return render('Phiên nhập chưa rõ mã sách. Dừng và đối soát; không tự nhập lại.');
   const base=new URL(config.workerBaseUrl);if(base.href!=='https://dudu-library-l6-development.dudu-studio-ai.workers.dev/')throw Error('Worker URL không hợp lệ.');
   const jwt=await user.getIdToken(false);if(firebase.auth().currentUser!==user||!allowed())throw Error('Phiên đã đổi.');
   const response=await fetch(new URL('/v1/library/r2/catalog/'+p.bookId+'/status',base),{method:'GET',headers:{Authorization:'Bearer '+jwt},credentials:'omit',cache:'no-store',redirect:'error'});
   if(response.status!==200){await response.body?.cancel();throw Error('Không lấy được trạng thái. Giữ nguyên phiên nhập.');}
   const reader=response.body.getReader(),chunks=[];let size=0;try{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>2048){reader.cancel().catch(()=>{});throw Error('Phản hồi trạng thái không hợp lệ.');}chunks.push(x.value);}}finally{reader.releaseLock();}
   const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}const data=JSON.parse(new TextDecoder().decode(bytes));
   if(firebase.auth().currentUser!==user||sessionUid!==owner||!allowed())return;
   if(data.code==='import-status'&&data.found===true&&data.bookId===p.bookId&&data.revision===p.revisionId&&data.status==='published'){localStorage.removeItem(key(owner));lastPublishedBook=p.bookId;controller=null;abort=null;preparedFile=null;queue.reconcilePublished();renderQueue();render('Đã xác nhận xuất bản. Có thể chọn sách tiếp theo.');}
   else render('Chưa xác nhận xuất bản đúng revision. Giữ nguyên dữ liệu và dừng nhập tiếp.');
  }catch(error){if(sessionUid===owner)render(error.message);}finally{busy=false;render(id('status').textContent);}
 });
 document.getElementById('c13b3-read').addEventListener('click',async()=>{
  if(!allowed()||busy||queue.status().running||!lastPublishedBook)return;const bookId=lastPublishedBook;document.getElementById('c13b3-read').disabled=true;
  try{await refreshEpubCloudBooksV49();if(!allowed())throw Error('Phiên tác giả đã thay đổi.');const i=novels.findIndex(n=>n.id===bookId&&n._r2V1);if(i<0)throw Error('Chưa tải được truyện mới; tải lại thư viện.');closeView();document.getElementById('story-modal').style.display='none';openCover(i);readChapter(0);}catch(error){render(error.message);}
 });
 function closeView(){modal.style.display='none';queue.pause();if(busy)abort?.abort();}
 function openView(){if(!allowed())return false;closeModals();modal.style.display='flex';render();id('pick-file').focus();return true;}
 id('close').addEventListener('click',closeView);modal.addEventListener('keydown',event=>{if(event.key==='Escape')closeView();});
 window.DuduC12AuthorPreview=Object.freeze({status:()=>controller?.status()||null,open:openView,close:closeView});
})();
