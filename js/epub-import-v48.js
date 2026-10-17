/* DUDU V48 EPUB author intake. Local parsing; no implicit publishing or Firestore writes.
 * Sandbox may import chapters locally. Verified live admin may upload the original
 * file to private Firebase Storage, subject to server-side Storage rules.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubImportV48=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const LIMIT_FILE=15*1024*1024,LIMIT_CHAPTERS=160,LIMIT_CHAPTER_CHARS=220000;
 const LIMIT_TOTAL_CHARS=1500000,MAX_ZIP_ENTRIES=1800,MAX_TOTAL_UNPACKED=40*1024*1024;
 const safeName=s=>String(s||'').trim().slice(0,140);
 const safePath=(href,base='')=>{
  if(typeof href!=='string'||!href||/^[a-z][a-z0-9+.-]*:/i.test(href)||
     href.startsWith('/')||href.includes('\\')||/[\u0000-\u001f]/.test(href))return null;
  const segments=(base?base.split('/').slice(0,-1):[]);
  for(const piece of href.split(/[?#]/,1)[0].split('/')){
   let word;
   try{word=decodeURIComponent(piece)}catch(_){return null}
   if(!word||word==='.')continue;
   if(word==='..'){if(!segments.length)return null;segments.pop();continue}
   if(/[\/\\:]/.test(word))return null;
   segments.push(word);
  }
  return segments.join('/')||null;
 };
 const validFile=file=>!!file&&typeof file.name==='string'&&/\.epub$/i.test(file.name)&&
  Number.isFinite(file.size)&&file.size>0&&file.size<=LIMIT_FILE;
 const xml=(raw,Parser)=>{
  if(typeof raw!=='string'||/<!DOCTYPE|<!ENTITY/i.test(raw))throw Error('EPUB chứa khai báo XML không được hỗ trợ');
  const doc=new Parser().parseFromString(raw,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw Error('XML trong EPUB không hợp lệ');
  return doc;
 };
 const firstTag=(el,tag)=>el.getElementsByTagName(tag)[0]||
  [...el.getElementsByTagName('*')].find(x=>x.localName===tag)||null;
 const allTags=(el,tag)=>[...el.getElementsByTagName('*')].filter(x=>x.localName===tag);
 function extractText(raw,Parser){
  if(typeof raw!=='string'||raw.length>LIMIT_CHAPTER_CHARS*5)throw Error('Chương EPUB vượt giới hạn');
  const doc=new Parser().parseFromString(raw,'text/html');
  for(const node of doc.querySelectorAll('script,style,iframe,object,embed,svg,math,nav,form,head,noscript'))node.remove();
  const body=doc.body||doc.documentElement;
  const blocks=[...body.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,pre')];
  const lines=blocks.filter(n=>!n.parentElement?.closest('h1,h2,h3,h4,p,li,blockquote,pre'))
   .map(n=>(n.textContent||'').replace(/\s+/g,' ').trim()).filter(Boolean);
  const text=(lines.length?lines.join('\n\n'):(body.textContent||'').replace(/\s+/g,' ').trim()).trim();
  if(text.length>LIMIT_CHAPTER_CHARS)throw Error('Một chương EPUB quá dài');
  return text;
 }
 async function parse(file,{zipLib,Parser}={}){
  if(!validFile(file))throw Error('Chỉ hỗ trợ tệp EPUB từ 1 byte đến 15 MB');
  const Zip=zipLib||(root&&root.JSZip);
  const XmlParser=Parser||(root&&root.DOMParser);
  if(!Zip||!XmlParser)throw Error('Bộ đọc EPUB chưa được tải; hãy kiểm tra kết nối mạng');
  const zip=await Zip.loadAsync(file,{checkCRC32:true});
  const paths=Object.keys(zip.files);
  if(paths.length>MAX_ZIP_ENTRIES)throw Error('EPUB có quá nhiều thành phần');
  let totalBytes=0;
  for(const name of paths){
   if(!safePath(name))throw Error('EPUB có đường dẫn không an toàn');
   const ent=zip.files[name];
   totalBytes+=Number(ent?._data?.uncompressedSize)||0;
   if(totalBytes>MAX_TOTAL_UNPACKED)throw Error('EPUB giải nén quá lớn');
  }
  const container=zip.file('META-INF/container.xml');
  if(!container)throw Error('EPUB thiếu META-INF/container.xml');
  const config=xml(await container.async('string'),XmlParser);
  const opfPath=safePath(firstTag(config,'rootfile')?.getAttribute('full-path'));
  if(!opfPath||!zip.file(opfPath))throw Error('Không tìm thấy OPF trong EPUB');
  const opf=xml(await zip.file(opfPath).async('string'),XmlParser);
  const metadata=firstTag(opf,'metadata');
  const metadataTitle=metadata?firstTag(metadata,'title')?.textContent?.trim():null;
  const metadataAuthor=metadata?firstTag(metadata,'creator')?.textContent?.trim():null;
  const items=new Map();
  for(const it of allTags(opf,'item')){
   const id=it.getAttribute('id'),href=it.getAttribute('href');
   const filename=safePath(href,opfPath);
   if(id&&filename)items.set(id,{filename,media:it.getAttribute('media-type')||''});
  }
  const spine=firstTag(opf,'spine');
  if(!spine)throw Error('EPUB thiếu danh sách chương');
  const refs=allTags(spine,'itemref').filter(x=>x.getAttribute('linear')!=='no');
  if(!refs.length||refs.length>LIMIT_CHAPTERS)throw Error('EPUB cần 1–160 mục nội dung');
  let totalChars=0;
  const chapters=[];
  for(const itemref of refs){
   const record=items.get(itemref.getAttribute('idref'));
   if(!record||!zip.file(record.filename))throw Error('Chương EPUB bị thiếu: '+itemref.getAttribute('idref'));
   if(!/xhtml|html|xml/i.test(record.media)&&!/\.x?html?$/i.test(record.filename))
    throw Error('Định dạng chương EPUB không được hỗ trợ');
   const body=await zip.file(record.filename).async('string');
   const text=extractText(body,XmlParser);
   if(!text)continue;
   totalChars+=text.length;
   if(totalChars>LIMIT_TOTAL_CHARS)throw Error('Nội dung EPUB quá lớn để nhập một lượt');
   const doc=new XmlParser().parseFromString(body,'text/html');
   for(const node of doc.querySelectorAll('script,style,nav'))node.remove();
   const heading=doc.body?.querySelector('h1,h2,h3')?.textContent?.replace(/\s+/g,' ').trim();
   chapters.push({title:safeName(heading)||'Chương '+(chapters.length+1),content:text});
  }
  if(!chapters.length)throw Error('Không tìm thấy chương có nội dung');
  return {title:safeName(metadataTitle)||safeName(file.name.replace(/\.epub$/i,''))||'Truyện EPUB',
   author:safeName(metadataAuthor)||'Chưa rõ',chapters,totalChars,sourceName:file.name};
 }
 function prepareSandboxImport(parsed,{novels,targetId='',author='Tác giả',id}){
  if(!parsed||!Array.isArray(parsed.chapters)||!parsed.chapters.length)throw Error('Chưa có nội dung EPUB');
  const date=new Date().toISOString().slice(0,10);
  const makeId=()=>id||(root?.crypto?.randomUUID?.()||String(Date.now()));
  const prefix=makeId();
  const chapters=parsed.chapters.map((c,i)=>({
   id:'ch-epub-'+prefix+'-'+i,title:c.title,content:c.content,
   wordCount:c.content.trim().split(/\s+/).length,
   createdAt:date,updatedAt:date,characterIds:[],storyItemIds:[]
  }));
  const updated=novels.slice();
  if(targetId){
   const target=updated.find(x=>x.id===targetId);
   if(!target)throw Error('Không tìm thấy truyện được chọn');
   const index=updated.indexOf(target);
   updated[index]={...target,chapters:[...(target.chapters||[]),...chapters],updatedAt:date};
  }else{
   updated.unshift({id:'novel-epub-'+prefix,title:parsed.title,author:parsed.author||author,
    genre:'Nhập EPUB',status:'Đang ra',desc:'',coverImage:'',
    createdAt:date,updatedAt:date,introData:{title:'VĂN ÁN',code:'EPUB',text:''},
    characters:[],chapters});
  }
  // localStorage is usually limited to ~5MB per origin; keep plenty of headroom.
  if(new TextEncoder().encode(JSON.stringify(updated)).length>3000000)
   throw Error('Thư viện thử nghiệm vượt 3 MB; hãy chia tệp EPUB thành các phần nhỏ');
  return updated;
 }
 async function uploadOriginal(file,{uid,auth,storage,onProgress=()=>{}}={}){
  if(!validFile(file))throw Error('Tệp EPUB không hợp lệ hoặc vượt 15 MB');
  if(!auth||!storage||!uid)throw Error('Firebase Storage hoặc tài khoản tác giả chưa sẵn sàng');
  const user=auth.currentUser;
  if(!user||user.uid!==uid)throw Error('Tài khoản đăng nhập đã thay đổi');
  const token=await user.getIdTokenResult(true);
  if(token.claims?.admin!==true)throw Error('Tài khoản Firebase không có quyền quản trị đã xác minh');
  const id=(root?.crypto?.randomUUID?.()||'');
  if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('Không thể tạo mã tệp an toàn');
  const key='author_epub_drafts/'+uid+'/'+id+'.epub';
  const ref=storage.ref(key);
  const upload=ref.put(file,{contentType:'application/epub+zip',
   customMetadata:{originalName:safeName(file.name),uploadedFrom:'dudu-v48'}});
  await new Promise((resolve,reject)=>upload.on('state_changed',snap=>{
    if(auth.currentUser?.uid!==uid){upload.cancel();return}
    onProgress(Math.round(100*snap.bytesTransferred/Math.max(1,snap.totalBytes)));
   },reject,resolve));
  if(auth.currentUser?.uid!==uid)throw Error('Tài khoản đăng nhập đã thay đổi trong lúc tải');
  return {path:key};
 }
 let state={file:null,parsed:null,busy:false,cloudDraft:null};
 function open(options={}){
  if(!options.canEdit?.())return false;
  const modal=root?.document?.getElementById('epub-import-modal');
  const host=root?.document?.getElementById('epub-import-content');
  if(!modal||!host)return false;
  state={file:null,parsed:null,busy:false,cloudDraft:null};
  const doc=root.document;
  const el=(tag,copy)=>{const x=doc.createElement(tag);if(copy!=null)x.textContent=copy;return x};
  host.replaceChildren();
  const help=el('p',options.sandbox?
    'Chọn EPUB → tách chương → xem trước → nhập vào Sandbox. Không thay đổi Firebase.':
    'Chọn EPUB → tách chương → xem trước → lưu bản thảo có các chương lên Firebase → xác nhận xuất bản. Không ghi đè truyện cũ.');
  const input=el('input');input.type='file';input.accept='.epub,application/epub+zip';
  input.setAttribute('aria-label','Chọn tệp EPUB');
  const status=el('p','');status.setAttribute('role','status');status.className='dudu-epub-status';
  const title=el('input');title.type='text';title.maxLength=140;title.placeholder='Tên tác phẩm';
  const target=el('select');target.setAttribute('aria-label','Đích nhập EPUB');
  target.append(new Option('Tạo truyện mới (Sandbox)',''));
  for(const book of options.novels||[])target.append(new Option(book.title||book.id,book.id));
  const list=el('div');list.className='dudu-epub-preview';
  const buttons=el('div');buttons.className='dudu-epub-actions';
  const button=(caption,handler)=>{const b=el('button',caption);b.type='button';b.className='btn';b.onclick=handler;buttons.append(b);return b};
  const run=async task=>{
   if(state.busy)return;
   state.busy=true;[...buttons.children].forEach(x=>x.disabled=true);
   try{await task()}catch(e){status.textContent='⚠️ '+(e?.message||'Không thể xử lý EPUB')}
   finally{
    state.busy=false;
    [...buttons.children].forEach(x=>{
     x.disabled=x.dataset.requiresDraft==='true'?
      !(state.cloudDraft&&state.cloudDraft.status==='draft'):
      x.dataset.onceOnly==='true'?!!state.cloudDraft:
      x.dataset.requiresParsed==='true'?!state.parsed:false;
    });
   }
  };
  const makeParsed=()=>state.parsed?{...state.parsed,title:safeName(title.value)||state.parsed.title}:null;
  input.onchange=()=>run(async()=>{
   const file=input.files?.[0];state.file=file;state.parsed=null;state.cloudDraft=null;
   list.replaceChildren();status.textContent='Đang phân tích EPUB trên thiết bị…';
   if(!validFile(file))throw Error('Tệp phải có đuôi .epub và dung lượng tối đa 15 MB');
   const parsed=await parse(file);state.parsed=parsed;title.value=parsed.title;
   status.textContent='Đã nhận '+parsed.chapters.length+' mục nội dung ('+parsed.totalChars.toLocaleString('vi-VN')+' ký tự).';
   for(const [i,ch] of parsed.chapters.entries()){
    const item=el('div',(i+1)+'. '+ch.title+' — '+ch.content.length+' ký tự');
    item.className='dudu-epub-item';list.append(item);
   }
  });
  const sandboxBtn=button('Nhập chương vào Sandbox',()=>run(async()=>{
   if(!options.sandbox||!options.canEdit?.())throw Error('Chỉ nhập trực tiếp vào Sandbox ở bước này');
   const parsed=makeParsed();if(!parsed)throw Error('Hãy chọn và kiểm tra EPUB trước');
   const updated=prepareSandboxImport(parsed,{
    novels:options.novels,targetId:target.value,author:options.author
   });
   // Keep the live array identity; rollback in-memory if a local save fails.
   const before=options.novels.slice();
   try{
    options.novels.splice(0,options.novels.length,...updated);
    options.saveDB();
   }catch(e){options.novels.splice(0,options.novels.length,...before);throw e}
   status.textContent='✅ Đã nhập '+parsed.chapters.length+' chương vào thư viện Sandbox. Đóng cửa sổ để xem truyện.';
   options.onSaved?.();
  }));
  sandboxBtn.hidden=!options.sandbox;sandboxBtn.dataset.requiresParsed='true';
  const cloudBtn=button('Lưu tệp EPUB gốc lên Firebase Storage',()=>run(async()=>{
   if(options.sandbox||!options.canEdit?.())throw Error('Chỉ tài khoản tác giả Firebase thật được lưu tệp');
   if(!state.parsed||!state.file)throw Error('Hãy chọn và kiểm tra EPUB trước');
   if(!root.confirm('Tệp EPUB gốc sẽ lên Firebase Storage. Bạn đã kiểm tra Rules hiện hành chỉ cho phép tác giả được quyền truy cập, tài khoản có quyền admin đã xác minh và dự án đã bật Cloud Storage/Blaze? Nếu chưa, hãy chọn Hủy để không tải lên.'))return;
   status.textContent='Đang tải EPUB lên Firebase Storage…';
   const stored=await uploadOriginal(state.file,{
    uid:options.uid(),auth:options.auth(),storage:options.storage(),
    onProgress:p=>{status.textContent='Đang tải EPUB lên Firebase Storage: '+p+'%'}
   });
   status.textContent='✅ Đã tải EPUB lên Firebase Storage (quyền truy cập phụ thuộc Rules đã triển khai): '+stored.path+
     '. Chưa xuất bản thành chương cho độc giả; đây là kho bản thảo an toàn.';
  }));

  cloudBtn.hidden=!!options.sandbox;cloudBtn.dataset.requiresParsed='true';
  cloudBtn.textContent='(Tuỳ chọn) Sao lưu file EPUB gốc vào Storage';
  const production=options.cloudApi;
  let publishBtn;
  const saveCloud=button('Lưu truyện và các chương lên Firebase (bản thảo)',()=>run(async()=>{
   if(options.sandbox||!options.canEdit?.())throw Error('Chỉ dành cho tài khoản tác giả thật');
   if(!production||!options.firestore?.()||!options.auth?.())throw Error('Chưa có Firebase Firestore hoặc bộ lưu EPUB');
   if(!state.parsed)throw Error('Hãy chọn EPUB và chờ tách chương thành công');
   if(state.cloudDraft)throw Error('Bản thảo đã lưu, không nhập trùng; hãy xuất bản hoặc đóng');
   const parsed=makeParsed();
   if(!parsed)throw Error('Không đọc được nội dung EPUB');
   if(!root.confirm('Lưu '+parsed.chapters.length+' chương EPUB thành bản thảo riêng trên Firestore? Dữ liệu hiện có không bị thay thế.'))return;
   status.textContent='Đang lưu bản thảo Firebase; chưa công khai cho độc giả…';
   const stored=await production.importDraft(parsed,{
    db:options.firestore(),auth:options.auth(),
    onProgress:percent=>{status.textContent='Đang lưu chương trên Firebase: '+percent+'%'}
   });
   state.cloudDraft=stored;publishBtn.disabled=false;
   status.textContent='✅ Đã lưu '+stored.chapterCount+' chương dưới dạng bản thảo Firebase. Chưa công khai. Bạn có thể xác nhận xuất bản.';
  }));
  saveCloud.hidden=!!options.sandbox;saveCloud.dataset.onceOnly='true';
  saveCloud.dataset.requiresParsed='true';
  publishBtn=button('Xác nhận xuất bản cho độc giả',()=>run(async()=>{
   if(options.sandbox||!options.canEdit?.())throw Error('Chỉ tác giả thật được xuất bản');
   if(!state.cloudDraft)throw Error('Hãy lưu bản thảo đầy đủ lên Firebase trước');
   if(!root.confirm('Bạn xác nhận có quyền phát hành nội dung EPUB này, đồng thời muốn công khai tác phẩm '+state.cloudDraft.title+' cho độc giả?'))return;
   status.textContent='Đang xác minh đủ chương và xuất bản…';
   const published=await production.publishDraft(state.cloudDraft.id,{
    db:options.firestore(),auth:options.auth(),confirmRights:true
   });
   status.textContent='✅ Đã xuất bản '+published.chapterCount+' chương lên Firebase. Tải lại Tủ Truyện để thấy tác phẩm.';
   state.cloudDraft.status='published';
   publishBtn.disabled=true;
   options.onPublished?.();
  }));
  publishBtn.disabled=true;publishBtn.hidden=!!options.sandbox;publishBtn.dataset.requiresDraft='true';
  if(!options.sandbox){
   buttons.insertBefore(saveCloud,cloudBtn);
   buttons.insertBefore(publishBtn,cloudBtn);
  }
  // Prevent uploading an EPUB before parsing succeeds (the old message
  // "Hãy chọn và kiểm tra EPUB trước" gave no useful explanation).
  for(const control of buttons.children){
   if(control.dataset.requiresParsed==='true')control.disabled=true;
  }
  button('Đóng',()=>{modal.style.display='none'});
  host.append(help,input,title);
  if(options.sandbox)host.append(el('p','Nhập vào truyện:'),target);
  host.append(status,list,buttons);
  modal.style.display='flex';
  return true;
 }
 return Object.freeze({LIMIT_FILE,validFile,safePath,extractText,parse,
  prepareSandboxImport,uploadOriginal,open});
});
