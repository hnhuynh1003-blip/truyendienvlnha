'use strict';
// Pure libraries attach to this isolated Worker global. No reading DOM or Auth.
self.window=self;
importScripts('reader-name-dictionary-l53.js?v=l5-3b','reader-name-lookup-l55.js?v=l55-1','reader-names-l54.js?v=l55-1');
let lookup=null;
const DATA_BASE=new URL('../assets/reader-name-lookup-l55/',self.location.href);
const DB='dudu-reader-name-lookup-l55';
async function stored(action,kind,value){
 return new Promise((resolve,reject)=>{
  if(!self.indexedDB){if(action==='read')resolve([]);else reject(Error('Thiết bị không cho lưu bộ tra cá nhân.'));return;}
  const open=indexedDB.open(DB,1);open.onupgradeneeded=()=>open.result.createObjectStore('packs',{keyPath:'kind'});
  open.onerror=()=>reject(Error('Không mở được bộ tra cá nhân.'));
  open.onsuccess=()=>{const db=open.result;let tx,data=[];
   try{
    tx=db.transaction('packs',action==='read'?'readonly':'readwrite');const store=tx.objectStore('packs');
    tx.oncomplete=()=>{db.close();resolve(data);};tx.onerror=tx.onabort=()=>{db.close();reject(Error('Không lưu được bộ tra cá nhân; dữ liệu trước đó giữ nguyên.'));};
    if(action==='read'){const request=store.getAll();request.onsuccess=()=>{data=request.result;};}
    else if(action==='write')store.put(value);else if(action==='clear')store.clear();
   }catch(_){try{tx?.abort();}catch(_){}db.close();reject(Error('Không lưu được bộ tra cá nhân; dữ liệu trước đó giữ nguyên.'));}
  };
 });
}
async function data(file){
 const url=new URL(file+'?v=l55-1',DATA_BASE).href;let cache=null;
 try{cache=await caches.open('dudu-reader-name-lookup-l55-v1');const cached=await cache.match(url);if(cached)return await cached.json();}catch(_){}
 const response=await fetch(url);if(!response.ok)throw Error('Không tải được '+file+' (HTTP '+response.status+').');
 const copy=response.clone(),value=await response.json();try{await cache?.put(url,copy);}catch(_){}return value;
}
async function initialize(){
 const [characters,meanings,packs]=await Promise.all([data('characters.json'),data('meanings.json'),stored('read').catch(()=>[])]);
 lookup=DuduReaderNameLookupL55.create(characters,meanings,packs);return lookup.metadata();
}
let queue=Promise.resolve();
self.onmessage=event=>{
 const message=event.data;
 queue=queue.then(async()=>{
  try{
   let result;if(message.method==='init')result=lookup?lookup.metadata():await initialize();
   else{
    if(!lookup)throw Error('Bộ tra chưa sẵn sàng.');
    if(message.method==='suggest')result=lookup.suggest(message.text,message.options);
    else if(message.method==='analyze'){
     if(typeof message.text!=='string'||message.text.length>2000000)throw Error('Chương vượt giới hạn 2 triệu ký tự; hãy chọn từng tên để tra.');
     result=DuduReaderNameIntelligenceL54.analyze(message.text,message.entries||[],lookup).slice(0,200).map(r=>({...r,occurrences:r.occurrences.slice(0,10)}));
    }else if(message.method==='preview'){
     const pack=lookup.parsePack(message.text,message.options);result={pack,preview:pack.entries.slice(0,5)};
    }else if(message.method==='install'){
     const pack=lookup.validatePack(message.pack);await stored('write',pack.kind,pack);result=lookup.installPack(pack);
    }else if(message.method==='clear'){await stored('clear');result=lookup.clearPacks();}
    else if(message.method==='export')result=lookup.exportPacks();
    else throw Error('Thao tác tra cứu không hợp lệ.');
   }
   self.postMessage({id:message.id,result});
  }catch(error){self.postMessage({id:message.id,error:String(error.message||error)});}
 });
};
