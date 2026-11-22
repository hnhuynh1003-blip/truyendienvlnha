// Candidate replaces library-r2-author-ui-c13b6d.js; no automatic activation.
(function(){
 if(window.DuduC12AuthorPreview)return;
 if(IS_SANDBOX_MODE){const button=document.getElementById('c12-open');const sync=()=>{button.hidden=!canEditStories();};sync();window.addEventListener('dudu-auth-state-changed',sync);return;}
 const modal=document.getElementById('epub-import-modal'),host=document.getElementById('epub-import-content');
 const view=window.DuduEpubImportV48.createImportView(document),el=view.el;
 const bind=(node,name)=>{node.id='c12-'+name;return node;};
 const form=bind(el('form'),'form');form.className='r2-unified-form';
 const help=el('p','Chọn EPUB → xem bìa, văn án và chương → đăng vào thư viện. Chỉ đóng tab khi có thông báo “Đã xuất bản”; tải tệp xong chưa phải đã xuất bản.');help.className='r2-import-help';
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
 for(const [name,text]of [['select-all','Chọn tất cả'],['select-none','Bỏ chọn'],['compare-catalog','Đối chiếu đã đăng'],['clear','Xóa danh sách chờ']]){const b=bind(el('button',text),name);b.type='button';b.className='btn';tools.append(b);}
 const duplicateHint=bind(el('p'),'duplicate-hint');
 duplicateHint.setAttribute('role','status');
 queuePanel.append(tools,duplicateHint,bind(el('div'),'queue'));
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
 const labels={idle:'Chọn EPUB để tự điền thông tin.',parsing:'Đang đọc EPUB…',ticket:'Đang chuẩn bị phiên nhập…',packaging:'Đang chuẩn bị nội dung và ảnh…',draft:'Đang tạo bản nháp…',staging:'Đang tải EPUB… Chưa hoàn tất, đừng đóng tab.',quarantined:'Đã tải các phần dữ liệu, nhưng chưa xác nhận xuất bản. Đừng đóng tab.',promoting:'Đang xác minh EPUB đã tải… Đừng đóng tab.',publishing:'Đang xuất bản… Đừng đóng tab.',published:'Đã xác nhận xuất bản. Có thể đóng tab.',blocked:'Đã dừng. Kiểm tra trạng thái trước khi nhập tiếp.'};
 let controller=null,abort=null,sessionUid=null,version=0,preparing=false,preparedFile=null,busy=false,activeEntry=null,lastPublishedBook=null,checkingCatalog=false;
 const intake=window.DuduR2PersonalIntake.create({parse:(file,options)=>window.DuduEpubImportV48.parse(file,options),options:{zipLib:window.JSZip,Parser:DOMParser,splitOversizedChapters:true}});
 const queueLabels={PREPARING:'Đang kiểm tra trên máy',READY:'Hợp lệ trên máy; chờ đăng',METADATA:'Cần sửa metadata',BLOCKED:'BLOCKED',RETRY:'Chưa gửi request; có thể thử lại',RUNNING:'Đang đăng',PUBLISHED:'Đã xuất bản',UNKNOWN:'Dừng để đối soát',POSSIBLE_DUPLICATE:'Nghi đã đăng · đã bỏ chọn'};
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
 const locked=()=>busy||preparing||checkingCatalog||queue.status().running||queue.status().adding||queue.status().halted;
 const catalogSnapshot=()=>{
  const data=window.DuduR2AuthorCatalogReviewR1?.snapshot?.();
  return data?.status==='ready'&&data.uid===sessionUid&&Array.isArray(data.books)?data:null;
 };
 function reviewLoadedCatalog(){
  if(!allowed()||locked())return {ok:false};
  const catalog=catalogSnapshot();
  if(!catalog)return {ok:false};
  return queue.reviewCatalog(catalog.books);
 }
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
   row.className='dudu-epub-item r2-import-queue-row';edit.className='btn';row.append(check,text,edit);
   if(entry.state==='POSSIBLE_DUPLICATE'){
    const override=document.createElement('button');
    override.type='button';override.className='btn';override.textContent='Đây là bản khác';
    override.disabled=!allowed()||locked();
    override.setAttribute('aria-label','Xác nhận EPUB khác nội dung: '+entry.path);
    override.addEventListener('click',()=>{
     if(!allowed()||locked())return;
     if(window.confirm('Tên và tác giả trùng sách R2 đã đăng, nhưng chưa so được SHA-256. Bạn đã kiểm tra đây thực sự là phiên bản khác và vẫn muốn đăng?'))
      queue.confirmDifferentBook(entry.id);
    });
    row.append(override);
   }
   list.append(row);
  }
  const all=queue.entries(),possible=all.filter(e=>e.state==='POSSIBLE_DUPLICATE').length;
  id('queue-panel').hidden=all.length===0;
  id('queue-summary').textContent=all.length+' sách · '+all.filter(e=>e.selected).length+
   ' đã chọn · '+possible+' nghi trùng · '+all.filter(e=>e.state==='PUBLISHED').length+' đã đăng lượt này';
  const published=catalogSnapshot();
  id('duplicate-hint').textContent=published
   ?'Đã đối chiếu với '+published.books.length+' sách R2 trong danh mục. '+possible+
     ' sách nghi trùng theo tên/tác giả đã được bỏ chọn; chưa so SHA-256 của EPUB gốc.'
   :'Chưa tải và xác minh xong danh mục R2. Đăng hàng loạt bị khóa để tránh trùng. Hãy bấm Đối chiếu đã đăng.';
  id('compare-catalog').disabled=!allowed()||locked();
  for(const x of ['file','files','folder','pick-file','pick-files','pick-folder','clear','select-all','select-none'])id(x).disabled=!allowed()||locked();
  id('pause').disabled=!state.running;id('pause').hidden=!state.running;render();
 }
 const key=uid=>'dudu-r2-personal:'+uid;
 function pending(){const raw=localStorage.getItem(key(sessionUid));if(!raw)return null;const p=JSON.parse(raw);if(p.schema!==1||!Object.hasOwn(labels,p.phase)||p.bookId!==null&&!/^epub-[a-f0-9]{32}$/.test(p.bookId)||p.revisionId!==null&&!/^r-[a-f0-9]{32}$/.test(p.revisionId))throw Error('Phiên nhập lưu trên máy cần đối soát.');return p;}
 function record(uid,state){localStorage.setItem(key(uid),JSON.stringify({schema:1,phase:state.status,bookId:state.bookId||null,revisionId:state.revisionId||null}));}
 // Interpret only the signed-in owner's read-only server result; every uncertain state remains locked.
 function classifyRecovery(p,data){
  if(!data||data.code!=='import-status'||typeof data.found!=='boolean')
   return {kind:'unknown',message:'Server trả trạng thái không xác định. Giữ phiên nhập; cần đối soát Firestore/R2.'};
  if(data.found!==true)
   return {kind:'missing',message:'Firestore chưa tìm thấy bản thảo cho mã phiên này. Chưa đủ bằng chứng để hủy phiên hoặc đăng lại.'};
  if(data.bookId!==p.bookId||data.revision!==p.revisionId)
   return {kind:'mismatch',message:'Mã sách hoặc revision trên server không khớp phiên lưu trên máy. Giữ nguyên và đối soát thủ công.'};
  switch(data.status){
   case 'published':return {kind:'published',message:'Đã xác nhận xuất bản đúng mã sách và revision. Có thể chọn EPUB tiếp theo.'};
   case 'importing':return {kind:'importing',message:'Bản thảo còn ở trạng thái importing; dữ liệu tải lên có thể chưa hoàn tất. Giữ phiên, cần kiểm tra Firestore/R2 trước khi tiếp tục.'};
   case 'draft':return {kind:'draft',message:'Bản thảo chưa published. Cần kiểm tra dữ liệu đã tải trước khi cho phép xuất bản hoặc hủy phiên.'};
   case 'archived':return {kind:'archived',message:'Sách đang archived; không được tự đăng lại hoặc xóa phiên. Cần kiểm tra trên Firestore.'};
   case 'deleting':return {kind:'deleting',message:'Sách đang deleting. Dừng để đối soát dữ liệu; không đăng lại.'};
   default:return {kind:'unknown',message:'Trạng thái sách không được hỗ trợ. Giữ phiên và đối soát thủ công.'};
  }
 }
 function render(message){
  const state=controller?.status();let p=null,storageError=false;try{p=sessionUid?pending():null;}catch{storageError=true;}
  id('status').textContent=message||(storageError?'Không đọc được trạng thái lưu trên máy. Dừng nhập.':p&&!controller?'Có phiên nhập cần kiểm tra trạng thái.':labels[state?.status]||labels.idle);
  id('status').dataset.state=state?.status||p?.phase||'idle';
  id('start').disabled=!allowed()||locked()||storageError||!!p||!catalogSnapshot()||
   !queue.entries().some(e=>e.selected&&['READY','RETRY'].includes(e.state));
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
  reviewLoadedCatalog();
  const next=current.entries().find(e=>['READY','METADATA','RETRY'].includes(e.state));if(next)showEntry(next);
  id('queue-panel').open=current.entries().length>1||current.entries().some(e=>e.state==='BLOCKED');renderQueue();render('Đã thêm '+result.added+' EPUB; bỏ qua '+result.duplicates+' tệp trùng nội dung, '+result.ignored+' tệp khác. '+(result.limited?'Tối đa 500 sách trong danh sách. ':'')+'Chọn sách và sửa thông tin nếu cần; chưa có upload.');
 }
 for(const name of ['file','files','folder'])id(name).addEventListener('change',()=>addFiles(id(name)));
 const folderSupported='webkitdirectory' in document.createElement('input');
 id('pick-folder').hidden=!folderSupported;id('folder-note').textContent=folderSupported?'Chọn thư mục cha để lấy EPUB trong các thư mục con.':'Trình duyệt không hỗ trợ chọn thư mục; hãy chọn một hoặc nhiều tệp EPUB.';
 id('select-all').addEventListener('click',()=>{if(allowed())queue.selectAll(true);});id('select-none').addEventListener('click',()=>{if(allowed())queue.selectAll(false);});
 id('compare-catalog').addEventListener('click',async()=>{
  if(!allowed()||locked())return;
  const owner=sessionUid,current=queue;checkingCatalog=true;renderQueue();
  try{
   await refreshEpubCloudBooksV49();
   if(current!==queue||owner!==sessionUid||!allowed())return;
  }catch{/* Catalog state is checked after the refresh. */}
  finally{checkingCatalog=false;}
  const result=reviewLoadedCatalog();renderQueue();
  render(result.ok?'Đã đối chiếu danh mục R2; các sách nghi trùng đã bỏ chọn.':
   'Không đối chiếu được danh mục R2; chưa cho phép đăng hàng loạt.');
 });
 window.addEventListener('dudu-r2-author-catalog-ready',()=>{
  if(!allowed()||locked())return;
  reviewLoadedCatalog();
  renderQueue();
 });
 id('pause').addEventListener('click',()=>queue.pause());
 id('clear').addEventListener('click',()=>{if(!allowed()||locked())return;try{if(pending())return;}catch{return;}if(queue.clear()){controller=null;abort=null;activeEntry=null;preparedFile=null;for(const f of fields)id(f).value='';renderQueue();}});
 id('start').addEventListener('click',async()=>{
  if(!allowed()||locked())return;
  try{if(pending())return render('Có phiên cần đối soát.');}catch{return render('Không đọc được phiên nhập.');}
  const current=queue,owner=sessionUid;
  // Fresh preflight before ANY ticket, draft or R2 object upload.
  checkingCatalog=true;renderQueue();
  try{await refreshEpubCloudBooksV49();}
  catch{/* A failed catalog refresh is caught by the fail-closed snapshot. */}
  finally{checkingCatalog=false;}
  if(current!==queue||owner!==sessionUid||!allowed())return;
  const review=reviewLoadedCatalog();renderQueue();
  if(!review.ok)return render('Không đối chiếu đủ thư viện R2. Dừng để tránh đăng trùng.');
  if(!current.entries().some(e=>e.selected&&['READY','RETRY'].includes(e.state)))
   return render('Không còn sách đã chọn sau đối chiếu. Kiểm tra danh sách nghi trùng.');
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
   render('Đã tải phần dữ liệu. Đang xác minh và xuất bản; chưa được đóng tab…');await active.publish({approve:true,expectedBookId:active.status().bookId,signal:abort.signal});localStorage.removeItem(key(owner));lastPublishedBook=active.status().bookId;render(labels.published);return {kind:'published'};
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
  try{const p=pending();if(!p)return render(controller?.status().published?labels.published:'Không có phiên nhập dở trên thiết bị này.');if(!p.bookId)return render('Phiên nhập chưa có mã sách để kiểm tra trên Worker. Giữ nguyên phiên; cần đối soát backend trước khi nhập lại.');
   const base=new URL(config.workerBaseUrl);if(base.href!=='https://dudu-library-l6-development.dudu-studio-ai.workers.dev/')throw Error('Worker URL không hợp lệ.');
   const jwt=await user.getIdToken(false);if(firebase.auth().currentUser!==user||!allowed())throw Error('Phiên đã đổi.');
   const response=await fetch(new URL('/v1/library/r2/catalog/'+p.bookId+'/status',base),{method:'GET',headers:{Authorization:'Bearer '+jwt},credentials:'omit',cache:'no-store',redirect:'error'});
   if(response.status!==200){await response.body?.cancel();throw Error(response.status===401?'Phiên Firebase hết hiệu lực. Đăng nhập lại rồi kiểm tra; giữ nguyên phiên.':response.status===403?'Worker từ chối quyền kiểm tra trạng thái. Giữ nguyên phiên.':response.status===503?'Worker chưa đọc được trạng thái từ Firestore. Giữ phiên; không thử đăng lại.':'Không lấy được trạng thái. Giữ nguyên phiên nhập.');}
   const reader=response.body.getReader(),chunks=[];let size=0;try{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>2048){reader.cancel().catch(()=>{});throw Error('Phản hồi trạng thái không hợp lệ.');}chunks.push(x.value);}}finally{reader.releaseLock();}
   const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}const data=JSON.parse(new TextDecoder().decode(bytes));
   if(firebase.auth().currentUser!==user||sessionUid!==owner||!allowed())return;
   const outcome=classifyRecovery(p,data);
   if(outcome.kind==='published'){localStorage.removeItem(key(owner));lastPublishedBook=p.bookId;controller=null;abort=null;preparedFile=null;queue.reconcilePublished();renderQueue();}
   render(outcome.message);
  }catch(error){if(sessionUid===owner)render(error.message);}finally{busy=false;render(id('status').textContent);}
 });
 document.getElementById('c13b3-read').addEventListener('click',async()=>{
  if(!allowed()||busy||queue.status().running||!lastPublishedBook)return;const bookId=lastPublishedBook;document.getElementById('c13b3-read').disabled=true;
  try{await refreshEpubCloudBooksV49();if(!allowed())throw Error('Phiên tác giả đã thay đổi.');const i=novels.findIndex(n=>n.id===bookId&&n._r2V1);if(i<0)throw Error('Chưa tải được truyện mới; tải lại thư viện.');closeView();document.getElementById('story-modal').style.display='none';openCover(i);readChapter(0);}catch(error){render(error.message);}
 });
 function closeView(){modal.style.display='none';queue.pause();if(busy)abort?.abort();}
 function openView(){if(!allowed())return false;closeModals();modal.style.display='flex';render();id('pick-file').focus();return true;}
 // Warn only while an upload/publish operation is active. Historical pending does not trap navigation.
 window.addEventListener('beforeunload',event=>{if(!busy&&!queue.status().running&&!queue.status().adding)return;event.preventDefault();event.returnValue='';});
 id('close').addEventListener('click',closeView);modal.addEventListener('keydown',event=>{if(event.key==='Escape')closeView();});
 window.DuduC12AuthorPreview=Object.freeze({status:()=>controller?.status()||null,open:openView,close:closeView});
})();
