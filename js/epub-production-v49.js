/* DUDU V49: Firestore-native EPUB import, isolated from legacy main_library.
 * Requires DEPLOYED Firebase Rules; cannot grant itself permission.
 * Importing is resumable by design only through a new book ID; interrupted
 * drafts never become public. Each chapter occupies its own document.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubProductionV49=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const COLLECTION='epub_stories_v49';
 const MAX_BOOKS=60,MAX_CHAPTERS=160,MAX_CHAPTER_BYTES=420000;
 const identifier=s=>typeof s==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{3,120}$/.test(s);
 const utf8len=s=>new TextEncoder().encode(s).length;
 const forbidden=/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
 const now=()=>new Date().toISOString();
 const requireAdmin=async(auth)=>{
  const current=auth?.currentUser;
  if(!current?.uid)throw Error('Cần đăng nhập Firebase với tài khoản tác giả');
  const token=await current.getIdTokenResult(true);
  if(token?.claims?.admin!==true)throw Error('Tài khoản chưa có quyền tác giả Firebase (admin claim)');
  if(auth.currentUser?.uid!==current.uid)throw Error('Phiên tài khoản đã thay đổi');
  return current.uid;
 };
 const safeChapter=(chapter,i)=>{
  const title=String(chapter?.title||('Chương '+(i+1))).trim().slice(0,140);
  const content=String(chapter?.content||'').trim();
  if(!title||content.length<1||content.length>220000||utf8len(content)>MAX_CHAPTER_BYTES||
     forbidden.test(content))throw Error('Chương '+(i+1)+' vượt giới hạn hoặc không hợp lệ');
  return {title,content,wordCount:content.split(/\s+/).filter(Boolean).length};
 };
 const manifest=parsed=>{
  if(!parsed||!Array.isArray(parsed.chapters)||parsed.chapters.length<1||
     parsed.chapters.length>MAX_CHAPTERS)throw Error('EPUB chỉ được có 1–160 mục nội dung');
  return parsed.chapters.map(safeChapter);
 };
 function newId(){
  const token=root?.crypto?.randomUUID?.();
  if(!token||!/^[0-9a-f-]{36}$/i.test(token))throw Error('Không thể tạo ID an toàn');
  return 'epub-'+token;
 }
 async function importDraft(parsed,{db,auth,onProgress=()=>{},bookId}={}){
  if(!db?.collection)throw Error('Firestore chưa sẵn sàng');
  const uid=await requireAdmin(auth);
  const chapters=manifest(parsed),title=String(parsed.title||'').trim().slice(0,140);
  if(!title)throw Error('Thiếu tên truyện');
  const id=bookId||newId();
  if(!identifier(id))throw Error('ID truyện không hợp lệ');
  const ref=db.collection(COLLECTION).doc(id);
  // Fail closed: never update or overwrite an already-existing book.
  const existing=await ref.get();
  if(existing.exists)throw Error('Mã truyện đã tồn tại; không được ghi đè');
  const stamp=now();
  const chapterIndex=chapters.map((ch,i)=>({
   id:'chapter-'+String(i+1).padStart(4,'0'),title:ch.title,
   wordCount:ch.wordCount,order:i
  }));
  const cover={id,title,author:String(parsed.author||'').slice(0,140)||'Tác giả',
   genre:'Nhập EPUB',status:'importing',ownerUid:uid,chapterCount:chapters.length,
   chapterIndex,createdAt:stamp,updatedAt:stamp,sourceName:String(parsed.sourceName||'').slice(0,180),
   importSchema:49};
  // Readers never see importing/draft. A crash leaves an unlisted draft,
  // not a half-published book.
  await ref.set(cover);
  try{
   for(let i=0;i<chapters.length;i+=4){
    if(auth.currentUser?.uid!==uid)throw Error('Phiên Firebase thay đổi khi đang nhập');
    const batch=db.batch();
    for(let j=i;j<Math.min(i+4,chapters.length);j++){
     batch.set(ref.collection('chapters').doc(chapterIndex[j].id),
      {id:chapterIndex[j].id,order:j,title:chapters[j].title,
       content:chapters[j].content,wordCount:chapters[j].wordCount});
    }
    await batch.commit();
    onProgress(Math.round(100*Math.min(i+4,chapters.length)/chapters.length));
   }
   if(auth.currentUser?.uid!==uid)throw Error('Phiên Firebase thay đổi khi hoàn tất');
   await ref.update({status:'draft',updatedAt:now()});
   return {id,title,chapterCount:chapters.length,status:'draft'};
  }catch(err){
   // Keep the record private. Do not delete chapters on a transient failure,
   // as that would make the failure irreversible without a second upload.
   throw Error('Đã ngừng nhập an toàn; bản thảo chưa công khai ('+id+'). '+(err.message||'Lỗi không xác định'));
  }
 }
 async function publishDraft(bookId,{db,auth,confirmRights=false}={}){
  if(!identifier(bookId)||!db?.collection||!confirmRights)
   throw Error('Chưa xác nhận quyền nội dung hoặc ID truyện không hợp lệ');
  const uid=await requireAdmin(auth);
  const ref=db.collection(COLLECTION).doc(bookId);
  const snap=await ref.get();
  if(!snap.exists)throw Error('Không tìm thấy bản thảo trên Firebase');
  const book=snap.data();
  if(book.ownerUid!==uid||book.status!=='draft'||!Array.isArray(book.chapterIndex)||
     book.chapterIndex.length!==book.chapterCount)throw Error('Bản thảo chưa đủ điều kiện phát hành');
  // Confirm each actual chapter exists, not just a client supplied count.
  const actual=await ref.collection('chapters').get();
  const entries=actual.docs.map(d=>d.id);
  if(entries.length!==book.chapterCount||
     book.chapterIndex.some(ch=>!entries.includes(ch.id)))
   throw Error('Thiếu chương; không thể phát hành');
  if(auth.currentUser?.uid!==uid)throw Error('Tài khoản đã thay đổi');
  await ref.update({status:'published',publishedAt:now(),updatedAt:now()});
  return {id:bookId,status:'published',chapterCount:book.chapterCount};
 }
 async function publicBooks(db){
  if(!db?.collection)throw Error('Firestore chưa sẵn sàng');
  const result=await db.collection(COLLECTION).where('status','==','published')
   .limit(MAX_BOOKS).get();
  return result.docs.map(s=>{
   const d=s.data();
   const chapterIndex=Array.isArray(d.chapterIndex)?d.chapterIndex:[];
   if(!identifier(s.id)||chapterIndex.length>MAX_CHAPTERS||!chapterIndex.length)return null;
   return {id:s.id,title:String(d.title||'Truyện EPUB').slice(0,140),
    author:String(d.author||'Tác giả').slice(0,140),status:'Đang ra',
    genre:'EPUB',desc:'Nhập từ sách điện tử',coverImage:'',
    updatedAt:(d.updatedAt||'').slice(0,10),createdAt:(d.createdAt||'').slice(0,10),
    introData:{title:'SÁCH ĐIỆN TỬ',code:'EPUB',text:''},
    _cloudV49:true,characters:[],chapters:chapterIndex.map((ch,i)=>({
     id:ch.id,title:String(ch.title||'Chương '+(i+1)).slice(0,140),
     content:null,wordCount:Math.max(1,Number(ch.wordCount)||1),
     order:i,characterIds:[],storyItemIds:[]
    }))};
  }).filter(Boolean);
 }
 async function readChapter(db,bookId,chapterId){
  if(!identifier(bookId)||!identifier(chapterId)||!db?.collection)
   throw Error('Mã chương không hợp lệ');
  const book=await db.collection(COLLECTION).doc(bookId).get();
  if(!book.exists||book.data()?.status!=='published')
   throw Error('Chương chưa được xuất bản');
  const doc=await db.collection(COLLECTION).doc(bookId).collection('chapters').doc(chapterId).get();
  if(!doc.exists||!doc.data()?.content)throw Error('Không tìm thấy nội dung chương');
  return {content:String(doc.data().content),title:String(doc.data().title)};
 }
 return Object.freeze({COLLECTION,MAX_CHAPTER_BYTES,manifest,requireAdmin,
  importDraft,publishDraft,publicBooks,readChapter});
});
