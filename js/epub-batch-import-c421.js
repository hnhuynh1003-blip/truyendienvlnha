/* C4.21: sequential, owner-only EPUB intake from a folder tree or multi-select.
 * Source File objects remain on the device. Each book is parsed independently;
 * drafts are resumable and never published without a separate batch consent.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubBatchC421=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const MAX_FILES=500;
 const normalize=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('vi')
  .replace(/\s+/g,' ').trim();
 const isEpub=file=>!!file&&/\.epub$/i.test(String(file.name||''));
 const pathOf=file=>String(file.webkitRelativePath||file.name||'');
 const fileKey=file=>normalize(pathOf(file))+'|'+file.size+'|'+(file.lastModified||0);
 const labelOf=status=>({waiting:'Chờ nhập',parsing:'Đang đọc',saving:'Đang lưu',
  publishing:'Xuất bản',draft:'Đã lưu nháp',published:'Đã xuất bản',
  duplicate:'Trùng nội dung',review:'Cần kiểm tra',error:'Lỗi',invalid:'Không hợp lệ'}[status]||status);
 const displaySize=bytes=>bytes>=1048576?(bytes/1048576).toFixed(1)+' MB':
  Math.ceil(bytes/1024)+' KB';
 const findMatch=(books,parsed,fingerprint)=>{
  const exact=books.filter(b=>b.importFingerprint===fingerprint);
  // A published/archived copy wins over an importing draft of the same work.
  const existing=exact.find(b=>['published','archived'].includes(b.status))||exact[0];
  if(existing)return {type:'exact',book:existing};
  const sameName=books.find(b=>!b.importFingerprint&&
   normalize(b.title)===normalize(parsed.title)&&
   normalize(b.author)===normalize(parsed.author));
  return sameName?{type:'review',book:sameName}:null;
 };
 function select(existing,files,validFile){
  const rows=existing.slice(),seen=new Set(rows.map(r=>fileKey(r.file)));
  let ignored=0,repeat=0,overflow=0;
  for(const file of Array.from(files||[])){
   if(!isEpub(file)){ignored++;continue}
   const key=fileKey(file);
   if(seen.has(key)){repeat++;continue}
   if(rows.length>=MAX_FILES){overflow++;continue}
   seen.add(key);
   rows.push({file,path:pathOf(file),status:validFile(file)?'waiting':'invalid',
    message:validFile(file)?'':'Tệp rỗng hoặc lớn hơn 30 MB',
    percent:0,resumeId:'',fingerprint:'',bookId:''});
  }
  return {rows,ignored,repeat,overflow};
 }
 function createEngine({importer,production,auth,firestore,storage,onPublished=()=>{},
  persist,restore,clear}={}){
  let rows=[],running=false,stopRequested=false,autoPublish=false;
  const listeners=new Set();
  const emit=()=>{for(const fn of listeners)fn(rows,running,stopRequested)};
  const getRows=()=>rows;
  const isRunning=()=>running;
  const add=files=>{
   if(running)return null;
   const result=select(rows,files,importer.validFile);
   rows=result.rows;emit();return result;
  };
  const remove=row=>{
   if(running)return;
   rows=rows.filter(r=>r!==row);emit();
  };
  const reset=()=>{
   if(running)return;
   rows=[];emit();
  };
  const retry=row=>{
   if(running||!['error','review'].includes(row.status))return;
   row.status='waiting';row.message='';row.percent=0;
   emit();
  };
  const pause=()=>{if(running){stopRequested=true;emit()}};
  const notify=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
  const update=(row,status,message='',percent=0)=>{
   row.status=status;row.message=message;row.percent=percent;emit();
  };
  const run=async({publish=false,confirm=()=>true}={})=>{
   if(running)return false;
   const pending=rows.filter(r=>r.status==='waiting'||
    (publish&&r.status==='draft'&&r.bookId));
   if(!pending.length)return false;
   const db=firestore?.(),userAuth=auth?.();
   if(!db||!userAuth||!production||!importer)
    throw Error('Công cụ EPUB/Firebase chưa sẵn sàng');
   // No writes if owner verification, list permission, or duplicate audit fails.
   const known=await production.ownedBooks(db,userAuth);
   if(!confirm(pending.length,publish))return false;
   const uid=userAuth.currentUser.uid;
   running=true;stopRequested=false;autoPublish=publish;emit();
   const seen=new Set();
   let anyPublished=false;
   try{
    for(const row of rows){
     if(stopRequested)break;
     if(row.status!=='waiting'&&!(publish&&row.status==='draft'&&row.bookId))continue;
     if(userAuth.currentUser?.uid!==uid){
      update(row,'error','Tài khoản đã thay đổi; dừng hàng đợi');
      break;
     }
     try{
      // A draft from this same queue can be published later without selecting
      // the folder again or parsing/writing its chapters a second time.
      if(row.status==='draft'){
       const owned=known.find(b=>b.id===row.bookId);
       if(!owned||owned.status!=='draft')throw Error('Bản thảo đã đổi trạng thái trên Firebase; hãy kiểm tra lại');
       update(row,'publishing','Đang xuất bản bản thảo đã lưu…',100);
       await production.publishDraft(row.bookId,{db,auth:userAuth,confirmRights:true});
       owned.status='published';anyPublished=true;
       update(row,'published','Đã xuất bản bản thảo',100);
       continue;
      }
      update(row,'parsing','Đang tách nội dung trên thiết bị…');
      const parsed=await importer.parse(row.file);
      const clean={...parsed,chapters:parsed.chapters.filter(ch=>ch.kind!=='notice')};
      if(!clean.chapters.length)throw Error('EPUB không có chương để nhập');
      const fingerprint=production.fingerprint(production.manifest(clean));
      row.fingerprint=fingerprint;
      if(seen.has(fingerprint)){
       update(row,'duplicate','Một EPUB khác trong hàng đợi đã có nội dung này');
       continue;
      }
      seen.add(fingerprint);
      const match=findMatch(known,clean,fingerprint);
      if(match?.type==='review'&&!row.reviewOverride){
       update(row,'review','Trùng tên và tác giả với truyện cũ chưa có mã đối chiếu. Kiểm tra trước khi nhập.');
       continue;
      }
      if(match?.type==='exact'&&['published','archived'].includes(match.book.status)){
       update(row,'duplicate',match.book.status==='published'?
        'Tác phẩm này đã xuất bản trên Firebase':'Tác phẩm này đã được lưu và gỡ khỏi Thư viện');
       continue;
      }
      const checkpoint=row.resumeId||restore?.(uid,fingerprint)||'';
      const checkpointValid=known.some(b=>b.id===checkpoint&&b.importFingerprint===fingerprint&&
       ['importing','draft'].includes(b.status));
      const resumeId=match?.type==='exact'?match.book.id:(checkpointValid?checkpoint:'');
      if(checkpoint&&!resumeId){
       row.resumeId='';clear?.(uid,fingerprint);
      }
      // A stale local checkpoint is still checked against the exact original
      // book and fingerprint by importDraft before any chapters are written.
      update(row,'saving',resumeId?'Đang tiếp tục bản thảo cũ…':'Đang lưu chương lên Firebase…');
      const draft=await production.importDraft(clean,{
       db,auth:userAuth,...(resumeId?{resumeBookId:resumeId}:{}),
       onCreated:id=>{
        row.resumeId=id;persist?.(uid,fingerprint,id);
       },
       onProgress:p=>update(row,'saving','Đang lưu chương: '+p+'%',p)
      });
      row.bookId=draft.id;
      if(match?.type==='exact')match.book.status='draft';
      else known.push({id:draft.id,title:clean.title,author:clean.author,
       importFingerprint:fingerprint,status:'draft'});
      clear?.(uid,fingerprint);
      if(!autoPublish){
       update(row,'draft','Đã lưu '+draft.chapterCount+' chương, chưa công khai',100);
       continue;
      }
      update(row,'publishing','Đang xác minh và xuất bản…',100);
      await production.publishDraft(draft.id,{db,auth:userAuth,confirmRights:true});
      const saved=known.find(b=>b.id===draft.id);
      if(saved)saved.status='published';
      anyPublished=true;
      update(row,'published','Đã xuất bản '+draft.chapterCount+' chương',100);
     }catch(err){
      update(row,'error',err?.message||'Không thể xử lý tệp');
      if(userAuth.currentUser?.uid!==uid)break;
     }
    }
   }finally{
    running=false;stopRequested=false;autoPublish=false;emit();
    if(anyPublished)onPublished();
   }
   return true;
  };
  return {getRows,isRunning,add,remove,reset,retry,pause,notify,run};
 }
 function open(options={}){
  if(!options.canEdit?.())return false;
  const doc=root?.document,modal=doc?.getElementById('epub-batch-modal');
  if(!modal)return false;
  const importer=options.importer||root.DuduEpubImportV48;
  const production=options.production||root.DuduEpubProductionV49;
  const host=doc.getElementById('epub-batch-content');
  if(!host||!importer||!production)return false;
  const el=(tag,text)=>{const node=doc.createElement(tag);if(text!=null)node.textContent=text;return node};
  const resumeKey=uid=>'dudu-epub-batch-c421:'+encodeURIComponent(uid);
  const readResume=uid=>{
   try{return JSON.parse(root.localStorage?.getItem(resumeKey(uid))||'{}')}
   catch(_){return {}}
  };
  const saveResume=(uid,fingerprint,id)=>{
   const entries=readResume(uid);entries[fingerprint]=id;
   try{root.localStorage?.setItem(resumeKey(uid),JSON.stringify(entries))}catch(_){}
  };
  const dropResume=(uid,fingerprint)=>{
   const entries=readResume(uid);delete entries[fingerprint];
   try{root.localStorage?.setItem(resumeKey(uid),JSON.stringify(entries))}catch(_){}
  };
  const engine=createEngine({importer,production,
   auth:options.auth,firestore:options.firestore,
   onPublished:options.onPublished,persist:saveResume,
   restore:(uid,fingerprint)=>readResume(uid)[fingerprint]||'',clear:dropResume});
  host.replaceChildren();
  const intro=el('p','Chọn các EPUB hoặc một thư mục cha chứa nhiều thư mục truyện. Tệp được đọc trên máy, mỗi cuốn lưu riêng và có thể thử lại khi lỗi.');
  intro.className='epub-batch-intro';
  const pickers=el('div');pickers.className='epub-batch-pickers';
  const fileInput=el('input');fileInput.type='file';fileInput.multiple=true;
  fileInput.accept='.epub,application/epub+zip';fileInput.hidden=true;
  const folderInput=el('input');folderInput.type='file';folderInput.multiple=true;
  folderInput.setAttribute('webkitdirectory','');folderInput.setAttribute('directory','');
  folderInput.hidden=true;
  const button=(caption,handler,cls='')=>{
   const b=el('button',caption);b.type='button';b.className='btn '+cls;
   b.addEventListener('click',handler);return b;
  };
  const pickFiles=button('Chọn nhiều EPUB',()=>fileInput.click());
  const pickFolder=button('Chọn thư mục cha',()=>folderInput.click(),'btn-primary');
  pickers.append(pickFiles,pickFolder,fileInput,folderInput);
  const note=el('p','Trên máy tính Chrome/Edge, chọn thư mục cha một lần để quét cả thư mục con. Tối đa 500 EPUB/lượt, 30 MB/tệp.');
  note.className='epub-batch-hint';
  const publishLabel=el('label');publishLabel.className='epub-batch-publish';
  const publishCheck=el('input');publishCheck.type='checkbox';
  publishLabel.append(publishCheck,doc.createTextNode(' Xuất bản ngay sau khi lưu thành công (cần xác nhận quyền phát hành)'));
  const count=el('p','Chưa chọn EPUB');count.className='epub-batch-count';
  count.setAttribute('role','status');
  const list=el('div');list.className='epub-batch-list';
  list.setAttribute('aria-label','Hàng đợi EPUB');
  const feedback=el('p','');feedback.className='epub-batch-feedback';
  feedback.setAttribute('role','status');
  const actions=el('div');actions.className='epub-batch-actions';
  const start=button('Bắt đầu nhập',async()=>{
   if(options.sandbox){feedback.textContent='Nhập hàng loạt chỉ dùng với thư viện Firebase thật. Sandbox vẫn hỗ trợ nhập EPUB lẻ.';return}
   feedback.textContent='Đang kiểm tra quyền và truyện đã có trên Firebase…';
   start.disabled=true;
   try{
    const didRun=await engine.run({publish:publishCheck.checked,confirm:(n,publish)=>
     root.confirm('Bạn xác nhận có quyền lưu'+(publish?' và công khai':'')+
       ' nội dung của '+n+' EPUB đang chờ xử lý? '+
       'Truyện trùng sẽ bị bỏ qua; truyện lỗi không công khai. Tiếp tục?')});
    feedback.textContent=didRun?'Hàng đợi đã dừng hoặc hoàn tất. Có thể thử lại tệp lỗi.':'Chưa bắt đầu nhập.';
   }catch(err){feedback.textContent='Không thể kiểm tra chống trùng/quyền Firebase: '+(err?.message||'Lỗi kết nối')}
   finally{refresh()}
  },'btn-primary');
  const pause=button('Dừng sau cuốn hiện tại',()=>{
   engine.pause();feedback.textContent='Đang chờ cuốn hiện tại hoàn tất rồi tạm dừng…';
  });
  const clear=button('Xóa danh sách chờ',()=>{engine.reset();feedback.textContent=''});
  const close=button('Đóng',()=>{
   if(engine.isRunning()){
    engine.pause();feedback.textContent='Sẽ tạm dừng sau cuốn hiện tại. Hãy chờ trước khi đóng.';
    return;
   }
   modal.style.display='none';
  });
  actions.append(start,pause,clear,close);
  host.append(intro,pickers,note,publishLabel,count,feedback,list,actions);
  const view=new Map();
  function rebuild(){
   list.replaceChildren();view.clear();
   for(const row of engine.getRows()){
    const item=el('div');item.className='epub-batch-row';
    const details=el('div');details.className='epub-batch-row-detail';
    const filename=el('strong',row.file.name);filename.title=row.path;
    const path=el('small',row.path+' · '+displaySize(row.file.size));
    details.append(filename,path);
    const state=el('div');state.className='epub-batch-row-state';
    const status=el('span');status.className='epub-batch-tag';
    const message=el('small');message.className='epub-batch-message';
    state.append(status,message);
    const retry=button('Thử lại',()=>{
     if(row.status==='review')row.reviewOverride=true;
     engine.retry(row);
    });
    retry.className='btn epub-batch-retry';
    const remove=button('×',()=>{engine.remove(row);rebuild()});
    remove.className='btn epub-batch-remove';remove.setAttribute('aria-label','Bỏ '+row.file.name);
    item.append(details,state,retry,remove);list.append(item);
    view.set(row,{status,message,retry,remove});
   }
   refresh();
  }
  function refresh(){
   const rows=engine.getRows(),running=engine.isRunning();
   const counts={};for(const r of rows)counts[r.status]=(counts[r.status]||0)+1;
   count.textContent=rows.length+' EPUB · '+(counts.waiting||0)+' chờ · '+
    (counts.published||0)+' đã xuất bản · '+(counts.draft||0)+' bản thảo · '+
    (counts.duplicate||0)+' trùng · '+(counts.review||0)+' cần duyệt · '+
    ((counts.error||0)+(counts.invalid||0))+' lỗi/không hợp lệ';
   for(const row of rows){
    const v=view.get(row);if(!v)continue;
    v.status.textContent=labelOf(row.status)+(row.percent&&row.percent<100?' '+row.percent+'%':'');
    v.status.dataset.state=row.status;
    v.message.textContent=row.message||'';
    v.retry.hidden=running||!['error','review'].includes(row.status);
    if(row.status==='review')v.retry.textContent='Vẫn nhập';
    else v.retry.textContent='Thử lại';
    v.remove.hidden=running;
   }
   const hasWaiting=!!counts.waiting,hasDraft=!!counts.draft;
   start.disabled=running||!(hasWaiting||(publishCheck.checked&&hasDraft));
   start.textContent=running?'Đang nhập…':
    (!hasWaiting&&publishCheck.checked&&hasDraft?'Xuất bản bản thảo':'Bắt đầu nhập');
   pause.hidden=!running;
   clear.disabled=running||!rows.length;
   pickFiles.disabled=running;pickFolder.disabled=running;
   fileInput.disabled=running;folderInput.disabled=running;
   publishCheck.disabled=running;
  }
  const onSelect=input=>{
   const result=engine.add(input.files);
   input.value='';
   if(!result)return;
   rebuild();
   const notes=[];
   if(result.ignored)notes.push(result.ignored+' tệp không phải EPUB được bỏ qua');
   if(result.repeat)notes.push(result.repeat+' tệp đã chọn trước đó');
   if(result.overflow)notes.push(result.overflow+' tệp vượt giới hạn 500/lượt');
   feedback.textContent=notes.length?notes.join(' · '):'Danh sách đã sẵn sàng để nhập.';
  };
  fileInput.addEventListener('change',()=>onSelect(fileInput));
  folderInput.addEventListener('change',()=>onSelect(folderInput));
  publishCheck.addEventListener('change',refresh);
  engine.notify((_,running)=>{
   if(!running&&view.size!==engine.getRows().length)rebuild();
   else refresh();
  });
  rebuild();modal.style.display='flex';
  return true;
 }
 return Object.freeze({MAX_FILES,isEpub,pathOf,fileKey,normalize,findMatch,select,createEngine,open});
});
