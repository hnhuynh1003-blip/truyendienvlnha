/* DUDU Library R1 — read-only capacity guide, not a Firestore billing meter.
 * Web stories share studio_data/main_library; cloud EPUB chapters are separate.
 * No background chapter reads, new collections, writes, or deletion actions.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduLibraryCapacityR1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MIB=1024*1024,GI_B=1024*MIB;
 const encoder=typeof TextEncoder!=='undefined'?new TextEncoder():null;
 const bytesOf=value=>{
  const str=String(value??'');
  if(encoder)return encoder.encode(str).byteLength;
  if(typeof Buffer!=='undefined')return Buffer.byteLength(str,'utf8');
  return unescape(encodeURIComponent(str)).length;
 };
 const jsonBytes=value=>bytesOf(JSON.stringify(value)??'');
 const formatBytes=bytes=>{
  const n=Math.max(0,Number(bytes)||0);
  if(n>=GI_B)return (n/GI_B).toLocaleString('vi-VN',{maximumFractionDigits:2})+' GiB';
  if(n>=MIB)return (n/MIB).toLocaleString('vi-VN',{maximumFractionDigits:2})+' MiB';
  return (n/1024).toLocaleString('vi-VN',{maximumFractionDigits:1})+' KiB';
 };
 const words=book=>(Array.isArray(book?.chapters)?book.chapters:[])
  .reduce((sum,ch)=>sum+Math.max(0,Number(ch?.wordCount)||0),0);
 function summarize(books){
  const collection=Array.isArray(books)?books:[];
  const web=collection.filter(book=>book&&!book._cloudV49);
  const epub=collection.filter(book=>book&&book._cloudV49);
  const webBytes=jsonBytes({novels:web,updatedAt:null});
  return {
   webBytes,webCount:web.length,webPercent:Math.min(100,webBytes/MIB*100),
   webBooks:web.map(book=>({id:book.id,title:String(book.title||'Không tên'),
    bytes:jsonBytes(book),chapters:book.chapters?.length||0}))
     .sort((a,b)=>b.bytes-a.bytes),
   epubCount:epub.length,epubChapters:epub.reduce((sum,book)=>sum+(book.chapters?.length||0),0),
   epubBooks:epub.map(book=>({id:book.id,title:String(book.title||'Không tên'),
    chapters:Array.isArray(book.chapters)?book.chapters:[],
    wordCount:words(book),updatedAt:book.updatedAt||''}))
     .sort((a,b)=>b.wordCount-a.wordCount)
  };
 }
 async function measureEpub(book,{db,isAllowed=()=>false,cancelled=()=>false,onProgress=()=>{}}={}){
  if(!isAllowed()||!db?.collection||!book?.id||!Array.isArray(book.chapters))
   throw Error('Không có quyền đo dữ liệu EPUB');
  if(book.chapters.length<1||book.chapters.length>160)
   throw Error('Số chương EPUB ngoài giới hạn hỗ trợ');
  const collection=db.collection('epub_stories_v49').doc(book.id).collection('chapters');
  let payloadBytes=0,readCount=0;
  for(let at=0;at<book.chapters.length;at+=3){
   if(cancelled()||!isAllowed())throw Error('Đã dừng phép đo');
   const batch=book.chapters.slice(at,at+3);
   const snaps=await Promise.all(batch.map(ch=>{
    if(!/^[A-Za-z0-9_-]{4,128}$/.test(ch.id||''))throw Error('ID chương không hợp lệ');
    return collection.doc(ch.id).get();
   }));
   if(cancelled()||!isAllowed())throw Error('Đã dừng phép đo');
   for(const snap of snaps){
    if(!snap?.exists||!snap.data())throw Error('Có chương không đọc được');
    payloadBytes+=jsonBytes(snap.data());
    readCount++;
   }
   onProgress(readCount,book.chapters.length);
  }
  return {bytes:payloadBytes,readCount};
 }
 function create({document,novels,canEdit,db,isSandbox=false,confirm=()=>false}={}){
  const measured=new Map();
  let busy=null,message='';
  const el=(tag,klass,value)=>{
   const node=document.createElement(tag);
   if(klass)node.className=klass;
   if(value!==undefined)node.textContent=value;
   return node;
  };
  const title=book=>String(book?.title||'Không tên').slice(0,140);
  function render(){
   const panel=document?.getElementById('library-capacity-r1');
   if(!panel)return false;
   const permitted=!!canEdit?.();
   panel.hidden=!permitted;
   if(!permitted||!panel.open)return permitted;
   const host=document.getElementById('library-capacity-body-r1');
   if(!host)return permitted;
   const data=summarize(novels?.());
   host.replaceChildren();
   const summary=el('div','library-capacity-metrics-r1');
   const webStat=el('section','library-capacity-card-r1');
   webStat.append(el('strong','',`Truyện Web · ${data.webCount}`),
    el('span','library-capacity-value-r1',`${formatBytes(data.webBytes)} / 1 MiB`));
   const bar=el('progress','library-capacity-progress-r1');
   bar.max=100;bar.value=data.webPercent;
   bar.setAttribute('aria-label','Tỷ lệ dung lượng ước tính của document truyện Web');
   webStat.append(bar,el('small','',data.webPercent>=85?
    '⚠️ Document dùng chung gần giới hạn 1 MiB; nên kiểm tra trước khi thêm truyện Web.':
    'Ước tính JSON của document Web dùng chung, không phải số đo Firestore chính xác.'));
   const epubStat=el('section','library-capacity-card-r1');
   epubStat.append(el('strong','',`Truyện EPUB · ${data.epubCount}`),
    el('span','library-capacity-value-r1',`${data.epubChapters.toLocaleString('vi-VN')} chương`),
    el('small','','Chương EPUB lưu riêng; chỉ đọc nội dung khi bạn chủ động bấm “Đo”.'));
   summary.append(webStat,epubStat);host.append(summary);
   const guide=el('p','library-capacity-guide-r1');
   guide.textContent='Firestore miễn phí: 1 GiB dữ liệu tổng. Số liệu dưới đây chỉ ước tính phần truyện; chưa gồm index, lịch sử chỉnh sửa, hồ sơ và dữ liệu khác.';
   const link=el('a','library-capacity-console-r1','Xem dung lượng thực tế trong Firebase Console ↗');
   link.href='https://console.firebase.google.com/project/truyendienvl/firestore';
   link.target='_blank';link.rel='noopener noreferrer';
   guide.append(document.createTextNode(' '),link);host.append(guide);
   if(data.webBooks.length){
    const section=el('section','library-capacity-list-r1');
    section.append(el('h4','','Truyện Web nặng nhất'));
    for(const book of data.webBooks.slice(0,8)){
     const row=el('div','library-capacity-row-r1');
     row.append(el('span','library-capacity-book-r1',title(book)),
      el('small','',formatBytes(book.bytes)));
     section.append(row);
    }
    host.append(section);
   }
   if(data.epubBooks.length){
    const section=el('section','library-capacity-list-r1');
    section.append(el('h4','','EPUB · sắp theo số từ'));
    for(const book of data.epubBooks){
     const row=el('div','library-capacity-row-r1');
     const name=el('div','library-capacity-book-r1');
     name.append(el('span','',title(book)),el('small','',
      `${book.wordCount.toLocaleString('vi-VN')} từ · ${book.chapters.length} chương`));
     const found=measured.get(book.id);
     const result=found&&found.updatedAt===book.updatedAt?found:null;
     if(result)row.append(name,el('small','',`≈ ${formatBytes(result.bytes)} đã đo`));
     else row.append(name);
     {
      const button=el('button','library-capacity-measure-r1',busy?.id===book.id?
       `Đang đo ${busy.read||0}/${book.chapters.length}`:result?'Đo lại':'Đo');
      button.type='button';button.disabled=!!busy||isSandbox;
      button.dataset.bookId=book.id;
      button.addEventListener('click',()=>{void scanOne(book);});
      row.append(button);
     }
     section.append(row);
    }
    host.append(section);
   }
   if(busy){
    const cancel=el('button','library-capacity-cancel-r1','Dừng phép đo');
    cancel.type='button';cancel.addEventListener('click',()=>{if(busy)busy.cancelled=true;});
    host.prepend(cancel);
   }
   if(message)host.prepend(el('p','library-capacity-message-r1',message));
  }
  async function scanOne(book){
   if(busy||isSandbox||!canEdit?.())return;
   if(!confirm(`Đo ${book.chapters.length} chương “${title(book)}”? Phép đo chỉ đọc dữ liệu và có thể tính phí lượt đọc Firestore; không xóa hay sửa truyện.`))return;
   const job={id:book.id,read:0,cancelled:false};busy=job;message='';render();
   try{
    const result=await measureEpub(book,{db:db?.(),isAllowed:()=>canEdit?.(),
     cancelled:()=>job.cancelled,onProgress:count=>{
      job.read=count;
      const buttons=document.querySelectorAll('.library-capacity-measure-r1');
      for(const button of buttons){
       if(button.dataset.bookId===book.id){
        button.textContent=`Đang đo ${count}/${book.chapters.length}`;break;
       }
      }
     }});
    measured.set(book.id,{...result,updatedAt:book.updatedAt});
    message=`Đã đo ${result.readCount} chương của “${title(book)}”. Đây là dữ liệu chương, chưa gồm dung lượng index.`;
   }catch(error){message='Không hoàn tất phép đo: '+String(error?.message||'Lỗi kết nối');}
   finally{busy=null;render();}
  }
  return Object.freeze({render,cancel:()=>{if(busy)busy.cancelled=true;}});
 }
 return Object.freeze({MIB,GI_B,bytesOf,jsonBytes,formatBytes,summarize,measureEpub,create});
});
