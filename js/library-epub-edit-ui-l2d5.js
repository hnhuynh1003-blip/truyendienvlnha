/* DUDU L2D.5A — gated author EPUB chapter and bulk-correction previews.
 * No production mutation path: actual saving and revision recovery are a
 * separate L2D.5B review gate, followed by ONE final Rules deployment.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduLibraryEpubEditL2D5=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const MAX_VISIBLE=80;
 function create({enabled=false,engine,chapterEditor,db,auth,uid,canEdit,
   loadChapter}={}){
  let book=null,session=0,mode='single',plan=null,selected=new Set(),
   chapters=new Map(),page=0,busy=false;
  let loadedSingleId=null;
  const el=id=>root?.document?.getElementById(id);
  const text=(id,value)=>{const target=el(id);if(target)target.textContent=value;};
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
  const buildOption=(id,label)=>{
   const option=root.document.createElement('option');option.value=id;option.textContent=label;
   return option;
  };
  function invalidatePlan(){
   plan=null;selected.clear();page=0;
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
   if(!owns(candidate)||busy)return false;
   session++;book=candidate;plan=null;selected=new Set();chapters.clear();page=0;
   loadedSingleId=null;
   text('epub-edit-heading','Biên tập EPUB · '+candidate.title);
   const selector=el('epub-edit-chapter');selector.replaceChildren();
   for(const ch of candidate.chapters||[])selector.append(buildOption(ch.id,ch.title));
   el('epub-edit-chapter-content').value='';
   el('epub-edit-preview').textContent='';
   el('epub-edit-match-list').replaceChildren();
   el('epub-edit-chapter-filter').replaceChildren();
   el('epub-edit-chapter-filter').append(buildOption('all','Tất cả chương'));
   el('epub-edit-rule-list').replaceChildren();addRule();
   el('epub-edit-modal').style.display='flex';
   switchMode('single');
   return true;
  }
  function close(){
   // Scans are read-only; closing invalidates the current session and safely
   // discards their eventual results even if the network request is in flight.
   session++;book=null;plan=null;selected.clear();chapters.clear();
   el('epub-edit-modal').style.display='none';return true;
  }
  async function loadSingle(){
   if(!owns(book)||busy)return false;
   const token=session,chapterId=el('epub-edit-chapter').value;
   if(!chapterId)return false;
   loadedSingleId=null;
   el('epub-edit-chapter-content').value='';
   busy=true;status('Đang tải chương…');
   try{
    await ensureAdmin();
    const data=await chapter(chapterId);
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
   const token=session;busy=true;plan=null;selected.clear();page=0;
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
   for(const hit of plan.hits){if(checked)selected.add(hit.id);else selected.delete(hit.id);}
   renderMatches();return true;
  }
  function previewBulk(){
   if(!plan||!owns(book)||busy)return false;
   try{
    const result=engine.selectedPatches(plan,[...selected]);
    text('epub-edit-preview',result.chaptersChanged+' chương · '+
     result.occurrencesChanged+' vị trí sẽ được thay. Chưa lưu lên Firebase.');
    status(result.occurrencesChanged?'Đã tạo bản kế hoạch theo lựa chọn.':
     'Hãy chọn ít nhất một vị trí cần sửa.');
    return result;
   }catch(error){status(String(error?.message||'Không tạo được kế hoạch'),true);return false;}
  }
  return Object.freeze({enabled,owns,open,close,switchMode,loadSingle,previewSingle,
   addRule,scan,filterChapter,more,chooseAll,previewBulk});
 }
 return Object.freeze({create});
});
