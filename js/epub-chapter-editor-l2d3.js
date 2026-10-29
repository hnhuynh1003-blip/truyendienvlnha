/* DUDU L2D.3 — guarded EPUB chapter revisions.
 * Not connected to the public UI or production Rules. Review the security
 * contract and test it in the Firestore Emulator before enabling writes.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubChapterEditorL2D3=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_CHARS=220000,MAX_BYTES=420000,MAX_VERSION=999999;
 const ID=/^[a-zA-Z0-9][a-zA-Z0-9_-]{3,120}$/;
 const forbidden=/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
 const now=()=>new Date().toISOString();
 const words=s=>String(s).trim().split(/\s+/).filter(Boolean).length;
 const bytes=s=>new TextEncoder().encode(s).length;
 const revisionId=version=>'rev-'+String(version).padStart(6,'0');

 function validateContent(value){
  if(typeof value!=='string'||!value.trim()||value.length>MAX_CHARS||
     bytes(value)>MAX_BYTES||forbidden.test(value))
   throw Error('Nội dung chương trống, quá dài hoặc chứa ký tự không hợp lệ');
  return value;
 }
 function previewContent(before,after){
  validateContent(before);validateContent(after);
  const oldLines=before.split('\n'),newLines=after.split('\n');
  const changedLines=[];
  for(let i=0;i<Math.max(oldLines.length,newLines.length);i++){
   if(oldLines[i]!==newLines[i])changedLines.push(i+1);
  }
  return Object.freeze({changed:before!==after,beforeWords:words(before),
   afterWords:words(after),changedLineCount:changedLines.length,
   changedLines:changedLines.slice(0,30)});
 }
 async function requireOwner(auth){
  const user=auth?.currentUser;
  if(!user?.uid||!user.getIdTokenResult)throw Error('Cần đăng nhập tài khoản tác giả Firebase');
  const token=await user.getIdTokenResult(true);
  if(token?.claims?.admin!==true||auth.currentUser?.uid!==user.uid)
   throw Error('Tài khoản chưa có quyền biên tập EPUB');
  return user.uid;
 }
 function checkBook(data,uid,chapterId){
  if(data?.ownerUid!==uid||!['published','archived'].includes(data.status)||
     !Array.isArray(data.chapterIndex)||
     !data.chapterIndex.some(item=>item?.id===chapterId))
   throw Error('Không có quyền sửa chương hoặc chương không thuộc tác phẩm');
 }
 function checkVersion(chapter,expectedVersion,expectedContent){
  const version=chapter?.editVersion??0;
  if(!Number.isSafeInteger(version)||version<0||version>=MAX_VERSION)
   throw Error('Lịch sử chỉnh sửa EPUB không hợp lệ hoặc đã đạt giới hạn');
  if(version!==expectedVersion||
     (expectedContent!==undefined&&chapter.content!==expectedContent))
   throw Error('Chương đã thay đổi ở phiên khác; tải lại trước khi lưu');
  return version;
 }
 function references(db,bookId,chapterId){
  if(!ID.test(bookId)||!ID.test(chapterId)||!db?.collection||!db?.runTransaction)
   throw Error('Mã truyện/chương hoặc kết nối Firebase không hợp lệ');
  const book=db.collection('epub_stories_v49').doc(bookId);
  const chapter=book.collection('chapters').doc(chapterId);
  return {book,chapter};
 }
 function backup(chapterId,uid,chapter,version,reason){
  return {id:revisionId(version+1),chapterId,ownerUid:uid,
   beforeVersion:version,version:version+1,createdAt:now(),reason,
   title:chapter.title,content:chapter.content,wordCount:chapter.wordCount};
 }

 // All reads precede both writes. The old text is retained in a separate,
 // immutable revision in the SAME transaction as the chapter update.
 async function saveChapter(bookId,chapterId,{db,auth,content,expectedVersion,
    expectedContent}={}){
  const {book,chapter}=references(db,bookId,chapterId);
  const next=validateContent(content);
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||
     typeof expectedContent!=='string')throw Error('Thiếu phiên bản chương cần đối chiếu');
  const uid=await requireOwner(auth);
  return db.runTransaction(async tx=>{
   const [bookSnap,chapterSnap]=await Promise.all([tx.get(book),tx.get(chapter)]);
   if(!bookSnap.exists||!chapterSnap.exists)throw Error('Không tìm thấy tác phẩm hoặc chương');
   checkBook(bookSnap.data(),uid,chapterId);
   const previous=chapterSnap.data();
   const version=checkVersion(previous,expectedVersion,expectedContent);
   validateContent(previous.content);
   if(previous.content===next)return {changed:false,version};
   const nextVersion=version+1,rev=chapter.collection('revisions').doc(revisionId(nextVersion));
   const existing=await tx.get(rev);
   if(existing.exists)throw Error('Phiên bản sao lưu đã tồn tại; ngừng để tránh ghi đè');
   if(auth.currentUser?.uid!==uid)throw Error('Phiên tác giả đã thay đổi');
   tx.set(rev,backup(chapterId,uid,previous,version,'edit'));
   tx.update(chapter,{content:next,wordCount:words(next),editVersion:nextVersion,editedAt:now()});
   return {changed:true,version:nextVersion,backupId:rev.id};
  });
 }

 // Restoring creates a fresh backup of the CURRENT content first. It never
 // deletes revision documents or resets the increasing editVersion.
 async function restoreChapter(bookId,chapterId,restoreId,{db,auth,expectedVersion}={}){
  const {book,chapter}=references(db,bookId,chapterId);
  if(!/^rev-[0-9]{6}$/.test(restoreId)||!Number.isSafeInteger(expectedVersion)||
     expectedVersion<1)throw Error('Phiên bản khôi phục không hợp lệ');
  const uid=await requireOwner(auth);
  return db.runTransaction(async tx=>{
   const previousRef=chapter.collection('revisions').doc(restoreId);
   const [bookSnap,chapterSnap,restoreSnap]=await Promise.all([
    tx.get(book),tx.get(chapter),tx.get(previousRef)]);
   if(!bookSnap.exists||!chapterSnap.exists||!restoreSnap.exists)
    throw Error('Không tìm thấy tác phẩm, chương hoặc bản lưu');
   checkBook(bookSnap.data(),uid,chapterId);
   const current=chapterSnap.data();
   const version=checkVersion(current,expectedVersion);
   const previous=restoreSnap.data();
   if(previous.ownerUid!==uid||previous.chapterId!==chapterId||
      previous.version>version)throw Error('Bản lưu không thuộc chương hoặc chưa hợp lệ');
   const content=validateContent(previous.content);
   validateContent(current.content);
   if(content===current.content)return {changed:false,version};
   const nextVersion=version+1,backupRef=chapter.collection('revisions').doc(revisionId(nextVersion));
   if((await tx.get(backupRef)).exists)throw Error('Bản sao lưu mới đã tồn tại');
   if(auth.currentUser?.uid!==uid)throw Error('Phiên tác giả đã thay đổi');
   tx.set(backupRef,backup(chapterId,uid,current,version,'restore'));
   tx.update(chapter,{content,wordCount:words(content),editVersion:nextVersion,editedAt:now()});
   return {changed:true,version:nextVersion,backupId:backupRef.id};
  });
 }
 return Object.freeze({MAX_CHARS,MAX_BYTES,validateContent,previewContent,
  saveChapter,restoreChapter});
});
