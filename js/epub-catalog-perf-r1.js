(function(root){
 'use strict';
 const clock=()=>typeof performance!=='undefined'?performance.now():Date.now();
 function error(code){return Object.assign(new Error(code),{code});}
 function create({session,ready,loadV49,loadR2,onBooks,onState=()=>{},beforeRefresh=()=>{},timeoutMs=15000,deviceCache=null,now=Date.now}){
  let generation=0,current=null,account=null,flight=null,data={v49:[],r2:[]},states={},timings={},started=0,first=null,runs={},lastBooks=[],knownR2=new Set();
  let savedAt=0,usingDeviceCache=false;
  // Tab-local logical calls only, never a Firestore billing/usage counter.
  const requests={automaticCalls:0,freshCalls:0,inFlightJoins:0,v49LoaderStarts:0,r2LoaderStarts:0};
  function active(g,u){return g===generation&&account===u&&session()===u&&ready();}
  function snapshot(){return {deviceCatalog:{active:usingDeviceCache,savedAt},requests:{...requests},states:{...states},timings:{...timings},first_epub_visible_ms:first,complete_catalog_visible_ms:Object.keys(states).length===2&&Object.values(states).every(s=>s==='success'||s==='disabled')?clock()-started:null};}
  function emit(g,u){if(!active(g,u))return;const ids=new Map();for(const b of data.v49)if(!knownR2.has(b.id))ids.set(b.id,b);for(const b of data.r2)ids.set(b.id,b);const next=[...ids.values()];if(next.length!==lastBooks.length||next.some((b,i)=>b!==lastBooks[i])){lastBooks=next;onBooks(next);}if(first===null&&ids.size)first=clock()-started;onState(snapshot());}
  function invalidate(){if(deviceCache&&account?.uid&&(!ready()||session()?.uid!==account.uid)){const uid=account.uid;void Promise.resolve().then(()=>deviceCache.remove(uid)).catch(()=>{});}generation++;flight=null;current?.abort();current=null;account=null;savedAt=0;usingDeviceCache=false;data={v49:[],r2:[]};states={};timings={};first=null;runs={};lastBooks=[];knownR2.clear();onBooks([]);onState(snapshot());}
  async function source(name,g,u){const run=(runs[name]||0)+1;runs[name]=run;const valid=()=>active(g,u)&&runs[name]===run;const parent=current;const own=new AbortController();const cancel=()=>own.abort();parent.signal.addEventListener('abort',cancel,{once:true});const load=name==='v49'?loadV49:loadR2;if(!load){parent.signal.removeEventListener('abort',cancel);states[name]='disabled';emit(g,u);return;}states[name]='loading';data[name]=[];emit(g,u);let timer;const begin=clock();try{
   const cancelled=new Promise((_,reject)=>own.signal.addEventListener('abort',()=>reject(error('SESSION_CHANGED')),{once:true}));
   const result=await Promise.race([cancelled,Promise.resolve().then(()=>{requests[name+'LoaderStarts']++;return load({signal:own.signal,onPage:books=>{if(valid()&&states[name]==='loading'){data[name]=books;if(name==='r2')for(const b of books)knownR2.add(b.id);emit(g,u);}}});}),new Promise((_,reject)=>{timer=setTimeout(()=>{reject(error('TIMEOUT'));own.abort();},name==='r2'?timeoutMs*3:timeoutMs);})]);
   if(!valid())return;data[name]=result;if(name==='r2')for(const b of result)knownR2.add(b.id);states[name]='success';timings[name]=clock()-begin;emit(g,u);
  }catch(e){if(!valid())return;data[name]=[];const raw=String(e?.code||'NETWORK');const code=raw==='permission-denied'?'HTTP_403':raw==='unauthenticated'?'HTTP_401':raw==='unavailable'?'NETWORK':raw;states[name]=['TIMEOUT','TOKEN_TIMEOUT','TOKEN_FAILED','HTTP_401','HTTP_403','HTTP_5XX','NETWORK','SESSION_CHANGED','INVALID_RESPONSE'].includes(code)?code:'BACKEND_ERROR';timings[name]=clock()-begin;emit(g,u);}finally{clearTimeout(timer);parent.signal.removeEventListener('abort',cancel);own.abort();}}
  function refresh({fresh=false}={}){
   requests[fresh?'freshCalls':'automaticCalls']++;const u=session();
   // Share only unfinished work in this exact identity/access generation.
   // A publish preflight must start after its own explicit fresh boundary.
   if(!fresh&&flight&&active(flight.g,u)){requests.inFlightJoins++;return flight.promise;}
   if(!fresh&&deviceCache&&active(generation,u)&&savedAt<=now()&&now()-savedAt<deviceCache.maxAgeMs&&Object.keys(states).length===2&&Object.values(states).every(s=>['success','cached','disabled'].includes(s)))return Promise.resolve();
   const known=account===u?new Set(knownR2):new Set();invalidate();knownR2=known;
   if(!u||!ready())return Promise.resolve();
   account=u;current=new AbortController();started=clock();const g=generation;
   const next={g,promise:null};
   next.promise=Promise.resolve().then(async()=>{
    if(!active(g,u))return;const valid=()=>active(g,u);
    if(deviceCache&&!fresh){let stored;try{stored=await deviceCache.read(u.uid,{valid});}catch{}if(!valid())return;
     if(stored){data={v49:loadV49?stored.v49:[],r2:loadR2?stored.r2:[]};states={v49:loadV49?'cached':'disabled',r2:loadR2?'cached':'disabled'};savedAt=stored.savedAt;usingDeviceCache=true;knownR2=new Set(data.r2.map(b=>b.id));emit(g,u);return;}}
    beforeRefresh();await Promise.allSettled([source('v49',g,u),source('r2',g,u)]);
    if(deviceCache&&valid()&&Object.values(states).every(s=>s==='success'||s==='disabled')){savedAt=now();try{await deviceCache.write(u.uid,data,{valid});}catch{}}
   })
    .finally(()=>{if(flight===next)flight=null;});
   flight=next;return next.promise;
  }
  function retry(name){if(session()!==account){invalidate();return Promise.resolve();}if(!['v49','r2'].includes(name)||!current||!ready()||states[name]==='loading')return Promise.resolve();return source(name,generation,session());}
  return Object.freeze({refresh,retry,invalidate,snapshot});
 }
 const api={create};if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DuduEpubCatalogPerfR1=api;
})(typeof window!=='undefined'?window:globalThis);
