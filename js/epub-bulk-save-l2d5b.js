/* DUDU L2D.5B — review-gated sequential EPUB corrections with per-chapter
 * immutable revisions. No global transaction over 90 large chapters.
 * The UI must require explicit human confirmation before using apply().
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubBulkSaveL2D5B=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ID=/^[a-zA-Z0-9][a-zA-Z0-9_-]{3,120}$/;
 const revisionId=v=>'rev-'+String(v).padStart(6,'0');
 const notice=(callback,progress)=>{try{callback?.(progress);}catch(_){/* UI notices must not corrupt a saved state */}};
 const errorText=e=>String(e?.message||e?.code||'Không xác định');
 function validate(bookId,patches){
  if(!ID.test(bookId)||!Array.isArray(patches)||!patches.length||patches.length>160)
   throw Error('Bản kế hoạch hoặc mã truyện EPUB không hợp lệ');
  const used=new Set();
  for(const p of patches){
   if(!ID.test(p?.chapterId)||used.has(p.chapterId)||
      typeof p.content!=='string'||typeof p.expectedContent!=='string'||
      p.content===p.expectedContent||!Number.isSafeInteger(p.expectedVersion)||
      p.expectedVersion<0||p.expectedVersion>=999999)
    throw Error('Bản sửa thiếu phiên bản, không đổi chữ hoặc trùng mã chương');
   used.add(p.chapterId);
  }
 }
 async function requireAdmin(auth){
  const user=auth?.currentUser;
  if(!user?.uid||!user.getIdTokenResult)throw Error('Cần đăng nhập tác giả Firebase');
  const token=await user.getIdTokenResult(true);
  if(token?.claims?.admin!==true||auth.currentUser?.uid!==user.uid)
   throw Error('Tài khoản không có quyền biên tập EPUB');
  return user.uid;
 }
 async function requireBookOwner(bookId,db,auth){
  const uid=await requireAdmin(auth);
  if(!ID.test(bookId)||!db?.collection)throw Error('Không xác định được truyện EPUB');
  const snap=await db.collection('epub_stories_v49').doc(bookId).get();
  if(!snap.exists||snap.data()?.ownerUid!==uid||
     !['published','archived'].includes(snap.data()?.status))
   throw Error('Chỉ chủ sở hữu được sửa EPUB đã xuất bản');
  return uid;
 }
 function refs(db,bookId,chapterId,version){
  if(!db?.collection||!ID.test(bookId)||!ID.test(chapterId))
   throw Error('Kết nối Firestore hoặc mã chương không hợp lệ');
  const book=db.collection('epub_stories_v49').doc(bookId);
  const chapter=book.collection('chapters').doc(chapterId);
  const revision=chapter.collection('revisions').doc(revisionId(version+1));
  return {book,chapter,revision};
 }
 // Classifies an uncertain response: a transaction may have committed even
 // when its network ACK never reached the browser. Never retry blindly.
 async function inspect(bookId,patch,{db,auth}={}){
  const uid=await requireAdmin(auth),{book,chapter,revision}=
   refs(db,bookId,patch.chapterId,patch.expectedVersion);
  const [bookSnap,chSnap,revisionSnap]=await Promise.all([
   book.get(),chapter.get(),revision.get()]);
  if(!bookSnap.exists||bookSnap.data()?.ownerUid!==uid||!chSnap.exists)
   throw Error('Không xác nhận được quyền sở hữu hoặc tài liệu chương');
  const current=chSnap.data(),version=current.editVersion??0;
  if(version===patch.expectedVersion+1&&current.content===patch.content&&
     revisionSnap.exists&&revisionSnap.data()?.content===patch.expectedContent&&
     revisionSnap.data()?.ownerUid===uid&&revisionSnap.data()?.chapterId===patch.chapterId)
   return 'applied';
  if(version===patch.expectedVersion&&current.content===patch.expectedContent&&
     !revisionSnap.exists)return 'pending';
  return 'conflict';
 }
 function state(bookId,patches,done,pending,unknown,message){
  const phase=unknown.length?'uncertain':pending.length?'partial':'complete';
  return Object.freeze({bookId,phase,total:patches.length,
   done:Object.freeze([...done]),pending:Object.freeze([...pending]),
   unknown:Object.freeze([...unknown]),message:String(message||'')});
 }
 async function apply(bookId,patches,{db,auth,chapterApi,confirmed=false,onProgress}={}){
  validate(bookId,patches);
  if(!confirmed||!chapterApi?.saveChapter)
   throw Error('Chưa xác nhận lưu hoặc công cụ sao lưu chưa sẵn sàng');
  await requireBookOwner(bookId,db,auth);
  const done=[],unknown=[];
  for(let i=0;i<patches.length;i++){
   const patch=patches[i];
   notice(onProgress,{phase:'saving',current:i+1,total:patches.length,chapterId:patch.chapterId});
   try{
    const saved=await chapterApi.saveChapter(bookId,patch.chapterId,{
     db,auth,content:patch.content,expectedVersion:patch.expectedVersion,
     expectedContent:patch.expectedContent});
    if(!saved?.changed||saved.version!==patch.expectedVersion+1||
       saved.backupId!==revisionId(saved.version))
     throw Error('Chưa xác nhận được bản sao lưu của chương');
    done.push(Object.freeze({patch,version:saved.version,backupId:saved.backupId}));
   }catch(error){
    let result='uncertain';
    try{result=await inspect(bookId,patch,{db,auth});}catch(_){}
    if(result==='applied'){
     done.push(Object.freeze({patch,version:patch.expectedVersion+1,
      backupId:revisionId(patch.expectedVersion+1)}));
     continue;
    }
    if(result==='conflict'||result==='uncertain')unknown.push(patch);
    const pending=result==='pending'?patches.slice(i):patches.slice(i+1);
    notice(onProgress,{phase:'stopped',current:done.length,total:patches.length,
     chapterId:patch.chapterId,error:errorText(error)});
    return state(bookId,patches,done,pending,unknown,errorText(error));
   }
   notice(onProgress,{phase:'saved',current:done.length,total:patches.length,
    chapterId:patch.chapterId});
  }
  return state(bookId,patches,done,[],[],'Đã lưu các chương đã chọn.');
 }
 async function reconcile(prior,{db,auth}={}){
  if(!prior?.unknown?.length)return prior;
  const done=[...prior.done],pending=[...prior.pending],unknown=[];
  for(const patch of prior.unknown){
   let result='uncertain';
   try{result=await inspect(prior.bookId,patch,{db,auth});}catch(_){}
   if(result==='applied')done.push(Object.freeze({patch,version:patch.expectedVersion+1,
    backupId:revisionId(patch.expectedVersion+1)}));
   else if(result==='pending')pending.unshift(patch);
   else unknown.push(patch);
  }
  return state(prior.bookId,[...done.map(d=>d.patch),...pending,...unknown],
   done,pending,unknown,unknown.length?'Còn chương chưa xác nhận được trạng thái.':'Đã kiểm tra lại các chương.');
 }
 async function resume(prior,{db,auth,chapterApi,onProgress}={}){
  if(!prior||prior.phase!=='partial'||prior.unknown.length||!prior.pending.length)
   throw Error('Chưa thể tiếp tục: cần xác minh các chương chưa rõ trạng thái');
  await requireAdmin(auth);
  for(const saved of prior.done){
   if(await inspect(prior.bookId,saved.patch,{db,auth})!=='applied')
    throw Error('Một chương đã thay đổi sau lượt lưu; cần kiểm tra lại trước khi tiếp tục');
  }
  const rest=await apply(prior.bookId,prior.pending,{db,auth,chapterApi,confirmed:true,onProgress});
  return state(prior.bookId,[...prior.done.map(d=>d.patch),...prior.pending],
   [...prior.done,...rest.done],rest.pending,rest.unknown,rest.message);
 }
 async function undo(prior,{db,auth,chapterApi,onProgress}={}){
  if(!prior?.done?.length||prior.unknown?.length||!chapterApi?.restoreChapter)
   throw Error('Chưa có chương đã lưu để khôi phục');
  await requireAdmin(auth);
  // Preflight every successful chapter before touching any of them.
  for(const saved of prior.done){
   if(await inspect(prior.bookId,saved.patch,{db,auth})!=='applied')
    throw Error('Dữ liệu đã thay đổi sau lượt lưu; ngừng khôi phục hàng loạt');
  }
  const reversed=[...prior.done].reverse(),restored=[];
  for(let i=0;i<reversed.length;i++){
   const saved=reversed[i];
   notice(onProgress,{phase:'restoring',current:i+1,total:reversed.length,
    chapterId:saved.patch.chapterId});
   try{
    const result=await chapterApi.restoreChapter(prior.bookId,saved.patch.chapterId,
     saved.backupId,{db,auth,expectedVersion:saved.version});
    if(!result.changed||result.version!==saved.version+1)
     throw Error('Không xác nhận được phiên bản phục hồi');
    restored.push(saved);
   }catch(error){
    return Object.freeze({phase:'partial-restore',restored,
     remaining:reversed.slice(i),message:errorText(error)});
   }
  }
  return Object.freeze({phase:'restored',restored,remaining:[],message:'Đã phục hồi các chương đã sửa.'});
 }
 return Object.freeze({apply,inspect,reconcile,resume,undo});
});
