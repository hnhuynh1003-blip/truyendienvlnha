/* DUDU L2D.5B — gated owner EPUB chapter correction and revision recovery.
 * Writes are completely OFF on production until ONE final Rules deployment.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduLibraryEpubEditL2D5=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const MAX_VISIBLE=80;
 function create({enabled=false,engine,chapterEditor,bulkSaver,db,auth,uid,canEdit,
   loadChapter,onChapterSaved=()=>{}}={}){
  let book=null,session=0,mode='single',plan=null,selected=new Set(),
   chapters=new Map(),page=0,busy=false,writing=false;
  let loadedSingleId=null,reviewedSingle=null,reviewedBulk=null,lastBatch=null;
  const el=id=>root?.document?.getElementById(id);
  const text=(id,value)=>{const target=el(id);if(target)target.textContent=value;};
  const toggle=(id,show)=>{if(el(id))el(id).hidden=!show;};
  const status=(message,error=false)=>{
   text('epub-edit-status',message);
   if(el('epub-edit-status'))el('epub-edit-status').dataset.error=String(error);
  };
  const available=()=>enabled&&typeof canEdit==='function'&&canEdit()&&
   auth?.()?.currentUser?.uid&&uid?.()===auth().currentUser.uid;
  const owns=candidate=>!!(available()&&candidate?._cloudV49&&
   candidate._ownerUidV49===uid());
  const current=token=>token===session&&owns(book);
  const ensureAdmin=async()=>{
   if(!available())throw Error('Phiên tác giả không còn hợp lệ');
   const user=auth().currentUser,token=await user.getIdTokenResult(true);
   if(token?.claims?.admin!==true||auth().currentUser?.uid!==user.uid)
    throw Error('Tài khoản không có quyền quản lý EPUB');
  };
  const fetchChapter=loadChapter||(async(bookId,chapterId)=>{
   const snap=await db().collection('epub_stories_v49').doc(bookId)
    .collection('chapters').doc(chapterId).get();
   if(!snap.exists)throw Error('Không tìm thấy chương '+chapterId);
   const data=snap.data();
   return {id:chapterId,title:data.title,content:data.content,
    editVersion:data.editVersion??0};
  });
  async function chapter(chapterId){
   if(chapters.has(chapterId))return chapters.get(chapterId);
   const item=await fetchChapter(book.id,chapterId);
   if(item?.id!==chapterId||typeof item.content!=='string')
    throw Error('Nội dung chương không hợp lệ');
   chapters.set(chapterId,item);
   return item;
  }
  async function reloadChapter(chapterId){
   const item=await fetchChapter(book.id,chapterId);
   if(item?.id!==chapterId||typeof item.content!=='string')
    throw Error('Không tải lại được nội dung chương');
   chapters.set(chapterId,item);
   return item;
  }
  const notifySaved=(chapterId,data)=>{
   try{onChapterSaved(book?.id,chapterId,data);}catch(_){/* no false server success */}
  };
  function resetWriteActions(){
   for(const id of ['epub-edit-single-save','epub-edit-bulk-save',
     'epub-edit-bulk-resume','epub-edit-bulk-undo','epub-edit-bulk-reconcile'])
    toggle(id,false);
  }
  function updateRecovery(){
   toggle('epub-edit-bulk-resume',!!(lastBatch?.phase==='partial'&&lastBatch.pending.length));
   toggle('epub-edit-bulk-undo',!!(lastBatch?.done?.length&&!lastBatch.unknown.length));
   toggle('epub-edit-bulk-reconcile',!!lastBatch?.unknown?.length);
  }
  const buildOption=(id,label)=>{
   const option=root.document.createElement('option');option.value=id;option.textContent=label;
   return option;
  };
  function invalidatePlan(){
   plan=null;reviewedBulk=null;selected.clear();page=0;
   toggle('epub-edit-bulk-save',false);
   el('epub-edit-match-list').replaceChildren();
   text('epub-edit-count','Quy tắc đã thay đổi · cần quét lại');
   text('epub-edit-preview','');
  }
  function switchMode(next){
   if(!book||busy||!['single','bulk'].includes(next))return false;
   mode=next;
   el('epub-edit-panel-single').hidden=next!=='single';
   el('epub-edit-panel-bulk').hidden=next!=='bulk';
   for(const name of ['single','bulk'])
    el('epub-edit-tab-'+name).setAttribute('aria-selected',String(name===next));
   status(next==='single'?'Chọn chương để xem và chỉnh sửa bản nháp.':
    'Nhập tên cần chuẩn hóa, sau đó quét để xem từng vị trí.');
   return true;
  }
  function open(candidate){
   if(!owns(candidate)||busy||lastBatch?.phase==='partial'||
      lastBatch?.phase==='uncertain')return false;
   session++;book=candidate;plan=null;selected=new Set();chapters.clear();page=0;
   loadedSingleId=null;reviewedSingle=null;reviewedBulk=null;lastBatch=null;
   resetWriteActions();
   text('epub-edit-heading','Biên tập EPUB · '+candidate.title);
   const selector=el('epub-edit-chapter');selector.replaceChildren();
   for(const ch of candidate.chapters||[])selector.append(buildOption(ch.id,ch.title));
   el('epub-edit-chapter-content').value='';
   el('epub-edit-preview').textContent='';
   el('epub-edit-match-list').replaceChildren();
   el('epub-edit-chapter-filter').replaceChildren();
   el('epub-edit-chapter-filter').append(buildOption('all','Tất cả chương'));
   el('epub-edit-rule-list').replaceChildren();addRule();
   el('epub-edit-history').replaceChildren();
   el('epub-edit-modal').style.display='flex';
   switchMode('single');
   return true;
  }
  function close(){
   if(writing){status('Đang lưu hoặc phục hồi chương. Vui lòng đợi kết quả.',true);return false;}
   if(lastBatch?.phase==='partial'||lastBatch?.phase==='uncertain'){
    status('Lượt lưu chưa hoàn tất. Hãy tiếp tục, kiểm tra hoặc hoàn tác trước khi đóng.',true);
    return false;
   }
   // Read-only scans may be closed; late responses are discarded.
   session++;book=null;plan=null;selected.clear();chapters.clear();
   el('epub-edit-modal').style.display='none';return true;
  }
  async function loadSingle(){
   if(!owns(book)||busy)return false;
   const token=session,chapterId=el('epub-edit-chapter').value;
   if(!chapterId)return false;
   loadedSingleId=null;reviewedSingle=null;toggle('epub-edit-single-save',false);
   el('epub-edit-history').replaceChildren();
   el('epub-edit-chapter-content').value='';
   busy=true;status('Đang tải chương…');
   try{
    await ensureAdmin();
    const data=await reloadChapter(chapterId);
    if(!current(token)||el('epub-edit-chapter').value!==chapterId)return false;
    el('epub-edit-chapter-content').value=data.content;
    loadedSingleId=chapterId;
    text('epub-edit-preview','Đã tải '+(data.title||chapterId)+'. Chưa có thay đổi nào được lưu.');
    status('Có thể xem trước thay đổi nội dung.');return true;
   }catch(error){status(String(error?.message||'Không tải được chương'),true);return false;}
   finally{busy=false;}
  }
  function previewSingle(){
   if(!owns(book)||busy)return false;
   try{
    const chapterId=el('epub-edit-chapter').value,data=chapters.get(chapterId);
    if(!data||loadedSingleId!==chapterId)
     throw Error('Hãy tải chương trước khi xem thay đổi');
    const result=chapterEditor.previewContent(data.content,el('epub-edit-chapter-content').value);
    reviewedSingle=result.changed?{chapterId,content:el('epub-edit-chapter-content').value,
     expectedVersion:data.editVersion,expectedContent:data.content}:null;
    toggle('epub-edit-single-save',!!reviewedSingle);
    text('epub-edit-preview',result.changed?
     'Bản xem trước: '+result.changedLineCount+' dòng thay đổi · '+
     result.beforeWords+' → '+result.afterWords+' từ. Nội dung chưa được lưu.':
     'Chưa có thay đổi trong chương này.');
    status('Xem trước thành công.');return result;
   }catch(error){status(String(error?.message||'Không tạo được bản xem trước'),true);return false;}
  }
  function addRule(){
   if(!book||!available()||busy||el('epub-edit-rule-list').children.length>=30)return false;
   const row=root.document.createElement('div');row.className='epub-edit-rule';
   const from=root.document.createElement('input');from.type='text';from.maxLength=120;
   from.placeholder='Tên đang sai, ví dụ: kỳ an';from.setAttribute('aria-label','Từ cần tìm');
   const to=root.document.createElement('input');to.type='text';to.maxLength=160;
   to.placeholder='Tên chuẩn, ví dụ: Kỳ An';to.setAttribute('aria-label','Thay bằng');
   from.addEventListener('input',invalidatePlan);
   to.addEventListener('input',invalidatePlan);
   const caseLabel=root.document.createElement('label');
   const check=root.document.createElement('input');check.type='checkbox';check.className='epub-edit-case';
   check.addEventListener('change',invalidatePlan);
   caseLabel.append(check,root.document.createTextNode(' Phân biệt hoa/thường'));
   const remove=root.document.createElement('button');remove.type='button';remove.className='btn';
   remove.textContent='Bỏ';remove.addEventListener('click',()=>{
    row.remove();invalidatePlan();
   });
   row.append(from,to,caseLabel,remove);el('epub-edit-rule-list').append(row);
   return true;
  }
  function getRules(){
   return [...el('epub-edit-rule-list').children].map(row=>({
    from:row.children[0].value,to:row.children[1].value,
    caseSensitive:row.children[2].children[0].checked,wholeWord:true
   }));
  }
  async function scan(){
   if(!owns(book)||busy)return false;
   if(lastBatch?.phase==='uncertain'||lastBatch?.phase==='partial'){
    status('Còn lượt lưu chưa hoàn tất; hãy xác minh, tiếp tục hoặc khôi phục trước.',true);
    return false;
   }
   const token=session;busy=true;plan=null;reviewedBulk=null;selected.clear();page=0;
   toggle('epub-edit-bulk-save',false);
   el('epub-edit-match-list').replaceChildren();
   try{
    const rules=engine.normalizeRules(getRules());
    await ensureAdmin();
    const entries=book.chapters||[],loaded=[];
    for(let offset=0;offset<entries.length;offset+=4){
     const batch=await Promise.all(entries.slice(offset,offset+4).map(ch=>chapter(ch.id)));
     if(!current(token))return false;
     loaded.push(...batch);
     status('Đang đọc '+loaded.length+'/'+entries.length+' chương…');
    }
    plan=engine.prepare(loaded,rules);
    const filter=el('epub-edit-chapter-filter');filter.replaceChildren();
    filter.append(buildOption('all','Tất cả chương'));
    for(const part of plan.chapters)if(part.hits.length)
     filter.append(buildOption(part.id,part.title+' ('+part.hits.length+')'));
    renderMatches();
    status('Tìm thấy '+plan.total+' vị trí qua '+entries.length+' chương. '+
     (plan.conflictCount?'Có '+plan.conflictCount+' vùng trùng cần xem kỹ.':'')+
     ' Chưa thay đổi nội dung truyện.');
    return plan;
   }catch(error){status(String(error?.message||'Không quét được EPUB'),true);return false;}
   finally{busy=false;}
  }
  const shownHits=()=>plan?.hits.filter(h=>el('epub-edit-chapter-filter').value==='all'||
   h.chapterId===el('epub-edit-chapter-filter').value)||[];
  function renderMatches(){
   const host=el('epub-edit-match-list');host.replaceChildren();
   if(!plan){text('epub-edit-count','Chưa có kết quả');return;}
   const hits=shownHits(),visible=hits.slice(0,(page+1)*MAX_VISIBLE);
   for(const hit of visible){
    const label=root.document.createElement('label');label.className='epub-edit-hit';
    const check=root.document.createElement('input');check.type='checkbox';
    check.checked=selected.has(hit.id);
    check.addEventListener('change',()=>{
     if(check.checked)selected.add(hit.id);else selected.delete(hit.id);
     reviewedBulk=null;toggle('epub-edit-bulk-save',false);
     updateSelection();
    });
    const copy=root.document.createElement('span');
    const heading=root.document.createElement('small');heading.textContent=hit.chapterTitle;
    const context=root.document.createElement('span');context.className='epub-edit-context';
    const before=root.document.createTextNode(hit.before);
    const match=root.document.createElement('mark');match.textContent=hit.matched;
    const after=root.document.createTextNode(hit.after);
    context.append(before,match,after);
    const replacement=root.document.createElement('small');
    replacement.textContent='→ '+hit.replacement;
    copy.append(heading,context,replacement);label.append(check,copy);host.append(label);
   }
   const hasMore=(page+1)*MAX_VISIBLE<hits.length;
   el('epub-edit-more').hidden=!hasMore;
   updateSelection();
  }
  function updateSelection(){
   const shown=shownHits();
   text('epub-edit-count',selected.size+' / '+(plan?.total||0)+' vị trí đã chọn · '+
    'đang xem '+Math.min((page+1)*MAX_VISIBLE,shown.length)+' / '+shown.length);
  }
  function filterChapter(){page=0;renderMatches();}
  function more(){if(!plan)return;page++;renderMatches();}
  function chooseAll(checked){
   if(!plan||!owns(book)||busy)return false;
   reviewedBulk=null;toggle('epub-edit-bulk-save',false);
   for(const hit of plan.hits){if(checked)selected.add(hit.id);else selected.delete(hit.id);}
   renderMatches();return true;
  }
  function previewBulk(){
   if(!plan||!owns(book)||busy)return false;
   try{
    const result=engine.selectedPatches(plan,[...selected]);
    reviewedBulk=result.occurrencesChanged?{
     plan:result,selection:[...selected].sort().join('\n')}:null;
    toggle('epub-edit-bulk-save',!!reviewedBulk);
    text('epub-edit-preview',result.chaptersChanged+' chương · '+
     result.occurrencesChanged+' vị trí sẽ được thay. Chưa lưu lên Firebase.');
    status(result.occurrencesChanged?'Đã tạo bản kế hoạch theo lựa chọn.':
     'Hãy chọn ít nhất một vị trí cần sửa.');
    return result;
   }catch(error){status(String(error?.message||'Không tạo được kế hoạch'),true);return false;}
  }
  async function saveSingle(){
   if(!owns(book)||busy||!reviewedSingle)return false;
   const review=reviewedSingle;
   if(el('epub-edit-chapter').value!==review.chapterId||
      el('epub-edit-chapter-content').value!==review.content){
    reviewedSingle=null;toggle('epub-edit-single-save',false);
    status('Nội dung đã đổi sau khi xem trước. Hãy xem trước lại trước khi lưu.',true);
    return false;
   }
   if(typeof root.confirm!=='function'||!root.confirm(
     'Lưu nội dung chương này lên Firebase? Bản cũ sẽ được giữ trong lịch sử phục hồi.'))
    return false;
   busy=true;writing=true;toggle('epub-edit-single-save',false);
   status('Đang lưu chương và bản sao phục hồi…');
   try{
    await ensureAdmin();
    const saved=await chapterEditor.saveChapter(book.id,review.chapterId,{
     db:db(),auth:auth(),content:review.content,
     expectedVersion:review.expectedVersion,expectedContent:review.expectedContent});
    if(!saved?.changed)throw Error('Chương chưa được thay đổi. Vui lòng tải lại.');
    const updated={...chapters.get(review.chapterId),content:review.content,
     editVersion:saved.version};
    chapters.set(review.chapterId,updated);notifySaved(review.chapterId,updated);
    reviewedSingle=null;
    text('epub-edit-preview','Đã lưu chương và giữ bản cũ '+saved.backupId+'.');
    status('Lưu thành công. Có thể mở Lịch sử để phục hồi.');
    return saved;
   }catch(error){
    reviewedSingle=null;
    status('Chưa xác nhận được việc lưu: '+String(error?.message||error)+
     '. Hãy tải lại chương và lịch sử trước khi thử lại.',true);
    return false;
   }finally{writing=false;busy=false;}
  }
  async function showHistory(){
   if(!owns(book)||busy)return false;
   const chapterId=el('epub-edit-chapter').value,token=session;
   if(!chapterId)return false;
   busy=true;status('Đang tải lịch sử chương…');
   try{
    await ensureAdmin();
    const records=await chapterEditor.listRevisions(book.id,chapterId,
     {db:db(),auth:auth()});
    if(!current(token)||el('epub-edit-chapter').value!==chapterId)return false;
    const host=el('epub-edit-history');host.replaceChildren();
    for(const revision of records){
     const row=root.document.createElement('div');row.className='epub-edit-revision';
     const note=root.document.createElement('span');
     note.textContent='Bản '+revision.id+' · '+
      (revision.reason==='restore'?'trước lần khôi phục':'trước lần sửa')+' · '+
      String(revision.createdAt||'');
     const restore=root.document.createElement('button');restore.type='button';
     restore.className='btn';restore.textContent='Khôi phục bản này';
     restore.addEventListener('click',()=>restoreRevision(revision.id));
     row.append(note,restore);host.append(row);
    }
    if(!records.length){
     const empty=root.document.createElement('p');
     empty.textContent='Chưa có bản lưu nào của chương này.';host.append(empty);
    }
    status('Đã tải '+records.length+' bản lưu của chương.');return records;
   }catch(error){status(String(error?.message||'Không tải được lịch sử'),true);return false;}
   finally{busy=false;}
  }
  async function restoreRevision(revisionId){
   if(!owns(book)||busy)return false;
   const chapterId=el('epub-edit-chapter').value;
   if(!chapterId||typeof root.confirm!=='function'||!root.confirm(
     'Khôi phục chương về '+revisionId+'? Hệ thống sẽ sao lưu nội dung đang có trước khi thay.'))
    return false;
   busy=true;writing=true;status('Đang khôi phục bản lưu…');
   try{
    await ensureAdmin();
    const latest=await reloadChapter(chapterId);
    const result=await chapterEditor.restoreChapter(book.id,chapterId,revisionId,{
     db:db(),auth:auth(),expectedVersion:latest.editVersion});
    if(!result.changed){status('Chương đã có đúng nội dung của bản này.');return result;}
    const restored=await reloadChapter(chapterId);
    if(el('epub-edit-chapter').value===chapterId){
     loadedSingleId=chapterId;el('epub-edit-chapter-content').value=restored.content;
    }
    reviewedSingle=null;toggle('epub-edit-single-save',false);
    notifySaved(chapterId,restored);
    status('Đã phục hồi chương. Nội dung trước lúc phục hồi vẫn còn trong lịch sử.');
    return result;
   }catch(error){
    status('Không xác nhận được khôi phục: '+String(error?.message||error)+
     '. Hãy tải lại chương trước khi thao tác tiếp.',true);return false;
   }finally{writing=false;busy=false;}
  }
  function applySavedToCache(records,restoring=false){
   for(const saved of records){
    const patch=saved.patch,prior=chapters.get(patch.chapterId)||{id:patch.chapterId};
    const updated={...prior,content:restoring?patch.expectedContent:patch.content,
     editVersion:saved.version+(restoring?1:0)};
    chapters.set(patch.chapterId,updated);notifySaved(patch.chapterId,updated);
   }
  }
  async function saveBulk(){
   if(!owns(book)||busy||!reviewedBulk||!bulkSaver?.apply)return false;
   if([...selected].sort().join('\n')!==reviewedBulk.selection){
    reviewedBulk=null;toggle('epub-edit-bulk-save',false);
    status('Lựa chọn đã đổi. Hãy xem kế hoạch mới trước khi lưu.',true);return false;
   }
   const patches=reviewedBulk.plan.patches;
   if(typeof root.confirm!=='function'||!root.confirm(
     'Xác nhận thay '+reviewedBulk.plan.occurrencesChanged+' vị trí trong '+
     patches.length+' chương? Mỗi chương sẽ có bản sao riêng để hoàn tác.'))return false;
   busy=true;writing=true;reviewedBulk=null;toggle('epub-edit-bulk-save',false);
   status('Bắt đầu lưu những chương đã chọn…');
   try{
    await ensureAdmin();
    const result=await bulkSaver.apply(book.id,patches,{db:db(),auth:auth(),
     chapterApi:chapterEditor,confirmed:true,onProgress:progress=>{
      status('Đang xử lý '+progress.current+'/'+progress.total+' chương…');
     }});
    lastBatch=result;applySavedToCache(result.done);updateRecovery();
    invalidatePlan();
    if(result.phase==='complete')status('Đã lưu thành công '+result.done.length+' chương. Có thể hoàn tác lượt sửa.');
    else if(result.phase==='partial')status('Đã lưu '+result.done.length+'/'+result.total+
     ' chương. Chưa lưu các chương còn lại; hãy Tiếp tục hoặc Hoàn tác.',true);
    else status('Có chương chưa rõ đã lưu hay chưa. Phải Kiểm tra lại trước khi tiếp tục.',true);
    return result;
   }catch(error){status('Chưa thực hiện hoặc chưa xác nhận lưu: '+String(error?.message||error),true);return false;}
   finally{writing=false;busy=false;}
  }
  async function recoverBulk(action){
   if(!owns(book)||busy||!lastBatch||!bulkSaver)return false;
   if(!['resume','reconcile','undo'].includes(action))return false;
   if(action!=='reconcile'&&(
       typeof root.confirm!=='function'||!root.confirm(action==='resume'?
        'Tiếp tục lưu những chương còn lại trong lượt chỉnh sửa?':
        'Hoàn tác các chương đã lưu trong lượt chỉnh sửa? Mỗi lần phục hồi sẽ có bản lưu mới.')))
    return false;
   busy=true;writing=action!=='reconcile';status('Đang xử lý lượt sửa trước…');
   try{
    await ensureAdmin();
    const options={db:db(),auth:auth(),chapterApi:chapterEditor,
     onProgress:progress=>status('Đang xử lý '+progress.current+'/'+progress.total+' chương…')};
    if(action==='reconcile')lastBatch=await bulkSaver.reconcile(lastBatch,options);
    else if(action==='resume'){
     const prior=lastBatch;
     lastBatch=await bulkSaver.resume(prior,options);
     applySavedToCache(lastBatch.done.filter(r=>!prior.done.includes(r)));
    }else{
     const restored=await bulkSaver.undo(lastBatch,options);
     applySavedToCache(restored.restored,true);
     if(restored.phase==='restored'){
      lastBatch=null;status('Đã khôi phục các chương. Bản sao vẫn được giữ trong lịch sử.');
      updateRecovery();return restored;
     }
     lastBatch=null;updateRecovery();
     status('Khôi phục dở dang. Hãy dùng Lịch sử từng chương để xử lý phần còn lại.',true);
     return restored;
    }
    updateRecovery();
    status(lastBatch.phase==='complete'?'Đã xử lý xong tất cả chương.':
     lastBatch.phase==='partial'?'Còn chương chưa lưu; có thể tiếp tục hoặc hoàn tác.':
     'Còn trạng thái chưa xác định; chưa được ghi tiếp.',lastBatch.phase==='uncertain');
    return lastBatch;
   }catch(error){status('Đã dừng: '+String(error?.message||error),true);return false;}
   finally{writing=false;busy=false;}
  }
  return Object.freeze({enabled,owns,open,close,switchMode,loadSingle,previewSingle,
   saveSingle,showHistory,restoreRevision,addRule,scan,filterChapter,more,
   chooseAll,previewBulk,saveBulk,recoverBulk});
 }
 return Object.freeze({create});
});
