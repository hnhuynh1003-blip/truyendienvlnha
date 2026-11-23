// Device-only published catalog metadata. Never tokens, content, permissions or publish proof.
(function(root){
 'use strict';
 const TTL=6*60*60*1000,ID=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/,BOOK=/^epub-[a-f0-9]{32}$/,REV=/^r-[a-f0-9]{32}$/;
 const fail=()=>{throw Error('INVALID_DEVICE_CATALOG');};
 const text=(v,max)=>{if(typeof v!=='string'||v.length>max)fail();return v;};
 function project(books,r2){
  if(!Array.isArray(books)||books.length>5000)fail();const seen=new Set();
  return books.map(b=>{
   if(!b||!ID.test(b.id||'')||seen.has(b.id)||b._cloudV49!==true||!!b._r2V1!==r2||!Array.isArray(b.chapters)||!b.chapters.length||b.chapters.length>160)fail();seen.add(b.id);
   if(r2&&(!BOOK.test(b.id)||!REV.test(b._r2Revision||'')))fail();
   const chapterIds=new Set(),chapters=b.chapters.map((c,i)=>{if(!ID.test(c?.id||'')||chapterIds.has(c.id)||!Number.isFinite(c.wordCount)||c.wordCount<0||c.wordCount>220000)fail();chapterIds.add(c.id);return {id:c.id,title:text(c.title,140),wordCount:c.wordCount,order:i};});
   const cover=typeof b.coverImage==='string'&&b.coverImage.length<32000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(b.coverImage)?b.coverImage:'';
   const result={id:b.id,title:text(b.title,140),author:text(b.author,140),desc:text(b.desc||'',3000),genre:text(b.genre||'',220),status:text(b.status||'',80),updatedAt:text(b.updatedAt||'',80),createdAt:text(b.createdAt||'',80),_cloudV49:true,coverImage:r2?'':cover,_ownerUidV49:r2?'':text(b._ownerUidV49||'',128),chapters};
   if(r2){if(b._r2CoverAssetId&&!ID.test(b._r2CoverAssetId))fail();Object.assign(result,{_r2V1:true,_r2Revision:b._r2Revision,_r2CoverAssetId:b._r2CoverAssetId||''});}return result;
  });
 }
 function inflate(books){return books.map(b=>({...b,introData:{title:'VĂN ÁN',code:'ARCHIVE',text:b.desc},characters:[],chapters:b.chapters.map(c=>({...c,content:null,characterIds:[],storyItemIds:[]}))}));}
 function pack(uid,scope,data,at){const record={schema:1,uid,scope,savedAt:at,v49:project(data.v49,false),r2:project(data.r2,true)};if(JSON.stringify(record).length>32*1024*1024)fail();return record;}
 function unpack(record,uid,scope,now){
  if(!record||record.schema!==1||record.uid!==uid||record.scope!==scope||!Number.isFinite(record.savedAt)||record.savedAt>now||now-record.savedAt>=TTL)return null;
  const clean=pack(uid,scope,record,record.savedAt);return {savedAt:clean.savedAt,v49:inflate(clean.v49),r2:inflate(clean.r2)};
 }
 function create({scope,indexedDB:factory=root?.indexedDB,now=Date.now,timeoutMs=1800}={}){
  if(typeof scope!=='string'||scope.length>512)fail();let dbPromise;
  const key=uid=>{if(typeof uid!=='string'||!uid||uid.length>128)fail();return JSON.stringify([scope,uid]);};
  function open(){if(!factory)return Promise.resolve(null);if(!dbPromise)dbPromise=new Promise(resolve=>{
   let settled=false;const finish=db=>{if(settled){db?.close();return;}settled=true;clearTimeout(timer);resolve(db);};
   const timer=setTimeout(()=>finish(null),timeoutMs);let request;try{request=factory.open('dudu-published-catalog-r1',1);}catch{finish(null);return;}
   request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('catalogs'))db.createObjectStore('catalogs');};
   request.onerror=()=>finish(null);request.onblocked=()=>finish(null);request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();dbPromise=null;};finish(db);};
  });return dbPromise;}
  async function operation(mode,fn,valid=()=>true){
   const db=await open();if(!db||!valid())return null;
   return new Promise(resolve=>{let tx,done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>{try{tx?.abort();}catch{}finish(null);},timeoutMs);
    try{tx=db.transaction('catalogs',mode);const req=fn(tx.objectStore('catalogs'));let value;req.onsuccess=()=>{value=req.result;};req.onerror=()=>finish(null);tx.oncomplete=()=>finish(valid()?{value}:null);tx.onerror=tx.onabort=()=>finish(null);}catch{finish(null);}
   });
  }
  async function read(uid,{valid=()=>true}={}){try{const result=await operation('readonly',s=>s.get(key(uid)),valid);if(!result||!valid())return null;const data=unpack(result.value,uid,scope,now());if(!data&&result.value)void remove(uid);return data;}catch{return null;}}
  async function write(uid,data,{valid=()=>true}={}){try{const record=pack(uid,scope,data,now());return !!await operation('readwrite',s=>s.put(record,key(uid)),valid);}catch{return false;}}
  async function remove(uid){try{return !!await operation('readwrite',s=>s.delete(key(uid)));}catch{return false;}}
  return Object.freeze({read,write,remove,maxAgeMs:TTL});
 }
 const api={create,pack,unpack,maxAgeMs:TTL};if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DuduEpubCatalogDeviceCacheR1=api;
})(typeof window!=='undefined'?window:null);
