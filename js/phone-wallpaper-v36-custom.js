/* DUDU V36 — private custom art for the V35 phone wallpaper library.
 * Uses IndexedDB (device only), canvas downscaling, and existing wallpaper prefs.
 * No network upload, Firestore writes, or shared-account image storage.
 */
(function(){
 'use strict';
 const ID='v36-custom',DB='dudu-personal-wallpaper-v36',STORE='images';
 let activeUrl='',activeOwner='',loadTicket=0;
 const $=id=>document.getElementById(id);
 const owner=()=>typeof phoneWallpaperOwnerV27==='function'?phoneWallpaperOwnerV27():null;
 function feedback(msg){const e=$('dudu-v36-status');if(e)e.textContent=msg||'';}
 function openDb(){
  return new Promise((resolve,reject)=>{
   if(!window.indexedDB){reject(new Error('Thiết bị không hỗ trợ lưu ảnh'));return;}
   const request=indexedDB.open(DB,1);
   request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||new Error('Không mở được kho ảnh'));
  });
 }
 async function transact(kind,key,value){
  const db=await openDb();
  try{return await new Promise((resolve,reject)=>{
   const transaction=db.transaction(STORE,kind==='put'?'readwrite':'readonly');
   const store=transaction.objectStore(STORE);
   const request=kind==='put'?store.put(value,key):store.get(key);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||new Error('Lỗi đọc/ghi ảnh'));
   transaction.onabort=()=>reject(transaction.error||new Error('Không lưu được ảnh'));
  });}finally{db.close();}
 }
 function closeUrl(){if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl='';}activeOwner='';}
 function useUrl(url){
  const phone=$('cyber-phone');if(!phone)return;
  if(url)phone.style.setProperty('--dudu-v30-art','url("'+url+'")');
  else phone.style.removeProperty('--dudu-v30-art');
 }
 async function sync(){
  const selected=document.body.dataset.duduPhoneWallpaper===ID;
  const uid=owner();
  const ticket=++loadTicket;
  if(!uid||!selected){useUrl('');return;}
  if(uid===activeOwner&&activeUrl){useUrl(activeUrl);return;}
  try{
   const saved=await transact('get',uid);
   if(ticket!==loadTicket)return;
   closeUrl();
   if(saved instanceof Blob&&saved.size){
    activeUrl=URL.createObjectURL(saved);activeOwner=uid;useUrl(activeUrl);
   }else{
    useUrl('');feedback('Chưa có ảnh cá nhân. Hãy chọn ảnh từ thiết bị.');
   }
  }catch(e){if(ticket===loadTicket){useUrl('');feedback('Không đọc được ảnh đã lưu trên thiết bị.');}}
 }
 async function processFile(file){
  if(!file||!/^image\/(png|jpeg|webp)$/i.test(file.type)){throw new Error('Chỉ hỗ trợ PNG, JPEG hoặc WebP.');}
  if(file.size>12*1024*1024)throw new Error('Ảnh quá lớn. Giới hạn 12 MB.');
  let bitmap;
  try{bitmap=await createImageBitmap(file);}catch(_){
   const image=document.createElement('img'),url=URL.createObjectURL(file);
   try{
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
    bitmap=image;
   }finally{URL.revokeObjectURL(url);}
  }
  const width=bitmap.width||bitmap.naturalWidth, height=bitmap.height||bitmap.naturalHeight;
  if(!width||!height||width*height>80*1024*1024)throw new Error('Độ phân giải ảnh không phù hợp.');
  const ratio=Math.min(1,1200/width,2000/height);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(width*ratio));
  canvas.height=Math.max(1,Math.round(height*ratio));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Không thể xử lý ảnh trên thiết bị.');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  if(typeof bitmap.close==='function')bitmap.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.87));
  if(!blob||blob.size>8*1024*1024)throw new Error('Không thể nén ảnh phù hợp.');
  return blob;
 }
 async function upload(file){
  const uid=owner(),button=$('dudu-v36-pick');
  if(!uid){feedback('Hãy đăng nhập tài khoản thử nghiệm trước.');return;}
  if(button)button.disabled=true;
  feedback('Đang tối ưu ảnh trên thiết bị…');
  try{
   const blob=await processFile(file);
   if(uid!==owner())throw new Error('Đã đổi tài khoản trong lúc chọn ảnh.');
   await transact('put',uid,blob);
   closeUrl();
   if(typeof window.setPhoneWallpaperV27==='function')window.setPhoneWallpaperV27(ID);
   await sync();
   feedback('Đã dùng ảnh mới. Ảnh chỉ được lưu trên thiết bị này.');
   window.DuduWallpaperGalleryV34?.sync?.();
  }catch(err){feedback(err?.message||'Không thể lưu ảnh.');}
  finally{if(button)button.disabled=false;}
 }
 function init(){
  if(!document.body.classList.contains('dudu-phone-v11'))return;
  const tabs=document.querySelector('.dudu-v35-gallery-tabs');
  const panels=document.querySelector('.dudu-v35-gallery-panels');
  if(!tabs||!panels||$('dudu-v36-custom-panel'))return;
  const tab=document.createElement('button');tab.type='button';tab.textContent='Ảnh của tôi';
  tab.dataset.duduV35TabButton='personal';
  // V35 tab controls use closure state. Share the same visible/pressed attributes.
  tab.addEventListener('click',()=>{
   tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===tab)));
   panels.querySelectorAll('[data-dudu-v35-tab]').forEach(p=>{p.hidden=p.dataset.duduV35Tab!=='personal';});
   const scroll=document.querySelector('.dudu-v34-scroll');if(scroll)scroll.scrollTop=0;
  });
  // Existing V35 handlers already hide other tabs when activated.
  tabs.append(tab);
  const panel=document.createElement('section');panel.id='dudu-v36-custom-panel';
  panel.className='dudu-v35-gallery-panel dudu-v36-personal-panel';
  panel.dataset.duduV35Tab='personal';panel.hidden=true;
  const h=document.createElement('h3');h.textContent='Hình nền của bạn';
  const p=document.createElement('p');p.textContent='Chọn ảnh anime dọc từ máy. Ảnh được giữ riêng trên thiết bị, không đăng lên DUDU Studio.';
  const label=document.createElement('label');label.className='dudu-v36-import';label.setAttribute('for','dudu-v36-file');
  label.textContent='＋  Chọn ảnh từ thiết bị';label.id='dudu-v36-pick';
  const input=document.createElement('input');input.type='file';input.id='dudu-v36-file';input.accept='image/png,image/jpeg,image/webp';input.hidden=true;
  const status=document.createElement('p');status.id='dudu-v36-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  panel.append(h,p,label,input,status);panels.append(panel);
  input.addEventListener('change',()=>{const file=input.files?.[0];input.value='';if(file)upload(file);});
  const original=window.renderPhoneWallpaperV27;
  if(typeof original==='function')window.renderPhoneWallpaperV27=function(){
   const result=original.apply(this,arguments);Promise.resolve().then(sync);return result;
  };
  new MutationObserver(()=>{sync();}).observe(document.body,{attributes:true,attributeFilter:['data-dudu-phone-wallpaper']});
  sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();