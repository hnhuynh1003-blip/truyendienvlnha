/* DUDU L2D.5C — local crash-recovery manifest for owner EPUB bulk edits.
 * The manifest stores only offsets and short replacements, never full chapters.
 * No Firestore writes are performed here. Gate OFF until Rules/Emulator QA.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubRecoveryJournalL2D5C=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const KEY='dudu_epub_recovery_l2d5c_v1:',ID=/^[a-zA-Z0-9][a-zA-Z0-9_-]{3,120}$/;
 const MAX_BYTES=1500000,MAX_ITEMS=160,MAX_EDITS=20000;
 const revisionId=v=>'rev-'+String(v).padStart(6,'0');
 const digest=text=>{
  let hash=2166136261;
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
  return (hash>>>0).toString(16).padStart(8,'0');
 };
 const signature=text=>({length:text.length,digest:digest(text)});
 const matches=(value,text)=>!!value&&value.length===text.length&&value.digest===digest(text);
 const validUid=uid=>typeof uid==='string'&&uid.length>0&&uid.length<=128&&
  !/[\u0000-\u001f]/.test(uid);
 const key=(uid,bookId)=>{
  if(!validUid(uid)||!ID.test(bookId))throw Error('Tài khoản hoặc mã truyện EPUB không hợp lệ');
  return KEY+encodeURIComponent(uid)+':'+bookId;
 };
 function storageOf(storage){
  let area;
  try{area=typeof storage==='function'?storage():storage;}catch(_){}
  if(!area||!['getItem','setItem','removeItem'].every(name=>
       typeof area[name]==='function'))
   throw Error('Trình duyệt không có bộ nhớ phục hồi; không được bắt đầu lưu nhiều chương');
  return area;
 }
 function validateEdits(edits){
  if(!Array.isArray(edits)||!edits.length||edits.length>MAX_EDITS)
   throw Error('Bản ghi vị trí thay thế không hợp lệ');
  let previous=0;
  return edits.map(edit=>{
   const {start,end,matched,replacement}=edit||{};
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<previous||
      end<=start||end-start>120||typeof matched!=='string'||
      typeof replacement!=='string'||matched.length!==end-start||
      !matched||!replacement||replacement.length>160)
    throw Error('Vị trí sửa trùng nhau hoặc dữ liệu ghi nhớ không hợp lệ');
   previous=end;
   return {start,end,matched,replacement};
  });
 }
 function transform(before,edits){
  let after=before;
  for(let i=edits.length-1;i>=0;i--){
   const edit=edits[i];
   if(before.slice(edit.start,edit.end)!==edit.matched)
    throw Error('Nội dung chương không khớp vị trí sửa đã duyệt');
   after=after.slice(0,edit.start)+edit.replacement+after.slice(edit.end);
  }
  return after;
 }
 function manifest(bookId,ownerUid,patches){
  key(ownerUid,bookId);
  if(!Array.isArray(patches)||!patches.length||patches.length>MAX_ITEMS)
   throw Error('Cần chọn tối đa 160 chương để lưu');
  const seen=new Set();let hitCount=0;
  const entries=patches.map(patch=>{
   if(!ID.test(patch?.chapterId)||seen.has(patch.chapterId)||
      !Number.isSafeInteger(patch.expectedVersion)||patch.expectedVersion<0||
      patch.expectedVersion>=999999||typeof patch.expectedContent!=='string'||
      typeof patch.content!=='string')
    throw Error('Mã, bản gốc hoặc phiên bản chương không hợp lệ');
   seen.add(patch.chapterId);
   const edits=validateEdits(patch.edits);
   hitCount+=edits.length;
   if(hitCount>MAX_EDITS||transform(patch.expectedContent,edits)!==patch.content)
    throw Error('Vị trí sửa không khớp kế hoạch đã duyệt');
   return {chapterId:patch.chapterId,expectedVersion:patch.expectedVersion,
    before:signature(patch.expectedContent),after:signature(patch.content),edits};
  });
  return {schema:1,bookId,ownerUid,createdAt:new Date().toISOString(),intent:'edit',entries};
 }
 function validateManifest(value,uid,bookId){
  if(!value||value.schema!==1||value.bookId!==bookId||value.ownerUid!==uid||
     !['edit','undo'].includes(value.intent)||
     !Array.isArray(value.entries)||!value.entries.length||value.entries.length>MAX_ITEMS)
   throw Error('Nhật ký phục hồi không đúng phiên bản, sách hoặc chủ sở hữu');
  let count=0;const seen=new Set();
  for(const item of value.entries){
   if(!ID.test(item?.chapterId)||seen.has(item.chapterId)||
      !Number.isSafeInteger(item.expectedVersion)||item.expectedVersion<0||
      !/^[0-9a-f]{8}$/.test(item.before?.digest)||
      !/^[0-9a-f]{8}$/.test(item.after?.digest)||
      ![item.before?.length,item.after?.length].every(n=>
       Number.isSafeInteger(n)&&n>0&&n<=220000))
    throw Error('Nhật ký EPUB bị lỗi, không được tự động tiếp tục');
   seen.add(item.chapterId);
   validateEdits(item.edits);count+=item.edits.length;
   if(count>MAX_EDITS)throw Error('Nhật ký chứa quá nhiều thay đổi');
  }
  return value;
 }
 function create({storage}={}){
  function read(uid,bookId){
   const slot=key(uid,bookId),area=storageOf(storage);
   let raw;
   try{raw=area.getItem(slot);}catch(_){throw Error('Không đọc được nhật ký phục hồi trình duyệt');}
   if(raw==null)return null;
   if(raw.length>MAX_BYTES)throw Error('Nhật ký phục hồi quá lớn; cần xử lý thủ công');
   let value;
   try{value=JSON.parse(raw);}catch(_){throw Error('Nhật ký phục hồi bị hỏng; không được ghi tiếp');}
   return validateManifest(value,uid,bookId);
  }
  function begin(bookId,uid,patches){
   const area=storageOf(storage),slot=key(uid,bookId);
   if(read(uid,bookId))throw Error('Đã có lượt sửa chưa xử lý; hãy phục hồi trước khi lưu lượt mới');
   const job=manifest(bookId,uid,patches),payload=JSON.stringify(job);
   if(new TextEncoder().encode(payload).length>MAX_BYTES)
    throw Error('Lượt sửa quá lớn để lưu an toàn trên thiết bị; hãy chia thành nhiều lượt');
   try{area.setItem(slot,payload);}catch(_){
    throw Error('Không lưu được nhật ký phục hồi; chưa ghi chương nào lên Firebase');
   }
   if(!read(uid,bookId))throw Error('Không xác nhận được nhật ký phục hồi');
   return job;
  }
  function clear(uid,bookId){
   const area=storageOf(storage),slot=key(uid,bookId);
   read(uid,bookId);
   try{area.removeItem(slot);}catch(_){throw Error('Không xóa được nhật ký phục hồi');}
   if(read(uid,bookId))throw Error('Không xác nhận được việc dọn nhật ký');
   return true;
  }
  function markUndo(uid,bookId){
   const current=read(uid,bookId);
   if(!current)throw Error('Không có nhật ký để khôi phục');
   const area=storageOf(storage),slot=key(uid,bookId);
   try{area.setItem(slot,JSON.stringify({...current,intent:'undo'}));}catch(_){
    throw Error('Không ghi được quyết định hoàn tác; chưa thay đổi chương nào');
   }
   if(read(uid,bookId).intent!=='undo')
    throw Error('Chưa xác nhận được quyết định hoàn tác');
   return true;
  }
  async function hydrate(uid,bookId,{db,auth}={}){
   const job=read(uid,bookId);
   if(!job)return null;
   const user=auth?.currentUser;
   if(user?.uid!==uid||!user.getIdTokenResult||
      (await user.getIdTokenResult(true))?.claims?.admin!==true||
      auth.currentUser?.uid!==uid)throw Error('Không có quyền đọc lịch sử phục hồi EPUB');
   const book=db?.collection?.('epub_stories_v49').doc(bookId);
   const bookSnap=await book?.get();
   if(!bookSnap?.exists||bookSnap.data()?.ownerUid!==uid||
      !['published','archived'].includes(bookSnap.data()?.status))
    throw Error('Truyện chưa được xuất bản hoặc không thuộc tài khoản này');
   const ids=new Set((bookSnap.data().chapterIndex||[]).map(x=>x.id));
   const done=[],pending=[],unknown=[],restored=[];
   for(let offset=0;offset<job.entries.length;offset+=4){
    const group=await Promise.all(job.entries.slice(offset,offset+4).map(async item=>{
     if(!ids.has(item.chapterId))return {kind:'unknown',patch:item};
     try{
      const chapter=book.collection('chapters').doc(item.chapterId);
      const revision=chapter.collection('revisions')
       .doc(revisionId(item.expectedVersion+1));
      const [chapterSnap,revSnap]=await Promise.all([chapter.get(),revision.get()]);
      if(!chapterSnap.exists)return {kind:'unknown',patch:item};
      const current=chapterSnap.data(),version=current.editVersion??0;
      const oldText=version===item.expectedVersion?current.content:
       revSnap.exists?revSnap.data()?.content:null;
      if(typeof oldText!=='string'||!matches(item.before,oldText))
       return {kind:'unknown',patch:item};
      const after=transform(oldText,item.edits);
      if(!matches(item.after,after))return {kind:'unknown',patch:item};
      const patch={chapterId:item.chapterId,expectedVersion:item.expectedVersion,
       expectedContent:oldText,content:after,edits:item.edits};
      if(version===item.expectedVersion&&!revSnap.exists)
       return {kind:'pending',patch};
      if(version===item.expectedVersion+1&&revSnap.exists&&
         revSnap.data()?.ownerUid===uid&&revSnap.data()?.chapterId===item.chapterId&&
         current.content===after)
       return {kind:'done',patch,version,backupId:revision.id};
      if(job.intent==='undo'&&version===item.expectedVersion+2&&
         current.content===oldText&&revSnap.exists&&
         revSnap.data()?.ownerUid===uid&&revSnap.data()?.chapterId===item.chapterId){
       const restoreBackup=await chapter.collection('revisions')
        .doc(revisionId(item.expectedVersion+2)).get();
       if(restoreBackup.exists&&restoreBackup.data()?.ownerUid===uid&&
          restoreBackup.data()?.chapterId===item.chapterId&&
          restoreBackup.data()?.reason==='restore'&&
          restoreBackup.data()?.content===after)
        return {kind:'restored',patch};
      }
     }catch(_){/* Never infer success when a network read fails. */}
     return {kind:'unknown',patch:item};
    }));
    for(const entry of group){
     if(entry.kind==='done')done.push({patch:entry.patch,version:entry.version,
      backupId:entry.backupId});
     else if(entry.kind==='pending')pending.push(entry.patch);
     else if(entry.kind==='restored')restored.push(entry.patch);
     else unknown.push(entry.patch);
    }
   }
   const phase=unknown.length?'uncertain':job.intent==='undo'?
    done.length?'restoring':'restored':pending.length?'partial':'complete';
   return {bookId,phase,total:job.entries.length,done,pending,unknown,restored,
    message:'Đã đối chiếu nhật ký thiết bị với các chương trên Firebase.'};
  }
  return Object.freeze({read,begin,clear,markUndo,hydrate});
 }
 return Object.freeze({create});
});
