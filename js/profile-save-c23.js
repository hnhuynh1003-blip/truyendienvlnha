/* C2.3 — conflict-aware legacy profile saves for authenticated main accounts.
 * A generic UI save may only publish fields changed since the last observed
 * server state. Each write reads the current document in a transaction and
 * merges non-conflicting paths; concurrent economy/NPC receipts take priority.
 * This is a safety bridge, not trusted rewards or a cross-device event ledger.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduProfileSaveC23=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const FIELDS=Object.freeze(['username','name','title','level','exp','currency',
  'inventory','quests','lootedChapters','readRewards','dailyReadLog',
  'collectedCharacters','storyStates','playerAvatar']);
 const plain=value=>value!==null&&typeof value==='object'&&
  !Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
 const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
 function equal(a,b){
  if(Object.is(a,b))return true;
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&
   Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
  if(plain(a)||plain(b)){
   if(!plain(a)||!plain(b))return false;
   const ka=Object.keys(a),kb=Object.keys(b);
   return ka.length===kb.length&&ka.every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]));
  }
  return false;
 }
 function fieldSnapshot(data){
  const result={};
  for(const key of FIELDS)if(Object.hasOwn(data||{},key))result[key]=clone(data[key]);
  return result;
 }
 function changes(base,local,path=[],out=[]){
  if(equal(base,local))return out;
  if((plain(base)&&plain(local))||(base===undefined&&plain(local))){
   const b=plain(base)?base:{};
   for(const key of new Set([...Object.keys(b),...Object.keys(local)]))
    changes(b[key],local[key],[...path,key],out);
  }else out.push({path,base:clone(base),value:clone(local)});
  return out;
 }
 function at(obj,path){
  return path.reduce((value,key)=>plain(value)?value[key]:undefined,obj);
 }
 function put(obj,path,value){
  let cursor=obj;
  for(const key of path.slice(0,-1)){
   if(!plain(cursor[key]))cursor[key]={};
   cursor=cursor[key];
  }
  const last=path[path.length-1];
  if(value===undefined)delete cursor[last];
  else cursor[last]=clone(value);
 }
 const pathId=path=>JSON.stringify(path);
 function merge({baseline,local,remote,blocked=new Set()}){
  const current=fieldSnapshot(remote),next=clone(current),modified=new Set(),
   conflicts=[],stale=[];
  const edits=changes(fieldSnapshot(baseline),fieldSnapshot(local));
  for(const edit of edits){
   if(!edit.path.length||blocked.has(pathId(edit.path))||
     edit.path.some(key=>['__proto__','constructor','prototype'].includes(key))||
     (edit.path.length===1&&edit.value===undefined))continue;
   const existing=at(current,edit.path);
   if(equal(existing,edit.value))continue;
   if(!equal(existing,edit.base)){
    blocked.add(pathId(edit.path));conflicts.push(edit.path);
    continue;
   }
   put(next,edit.path,edit.value);modified.add(edit.path[0]);
  }
  // Even an unrelated UI save must notice values newer than this tab. Do
  // not turn a later local action into a stale overwrite on the next save.
  for(const difference of changes(fieldSnapshot(baseline),current)){
   if(difference.path.length&&!equal(at(local,difference.path),difference.value)&&
     !equal(at(next,difference.path),at(local,difference.path))){
    blocked.add(pathId(difference.path));stale.push(difference.path);
   }
  }
  return {next,patch:Object.fromEntries([...modified].map(key=>[key,next[key]])),
   conflicts,stale,blocked};
 }
 let session=null;
 function reset(){session=null;}
 function begin(uid,remote){
  if(typeof uid!=='string'||!uid){reset();return false;}
  session={uid,baseline:fieldSnapshot(remote),blocked:new Set(),
   queue:Promise.resolve(),warned:false};
  return true;
 }
 function enqueue({uid,db,auth,data,isCurrent,onConflict}={}){
  const state=session;
  if(!state||state.uid!==uid||typeof isCurrent!=='function'||
    !db?.collection||!db?.runTransaction||!auth?.currentUser||
    auth.currentUser.uid!==uid)return Promise.resolve({skipped:true});
  const snapshot=fieldSnapshot(data);
  const active=()=>session===state&&isCurrent(uid)&&auth.currentUser?.uid===uid;
  const action=async()=>{
   if(!active())return {skipped:true};
   const ref=db.collection('profiles_v2').doc(uid);
   const outcome=await db.runTransaction(async tx=>{
    if(!active())return {skipped:true};
    const snap=await tx.get(ref);
    if(!active())return {skipped:true};
    if(!snap.exists){
     tx.set(ref,snapshot,{merge:true});
     return {saved:true,created:true,next:snapshot,conflicts:[],stale:[]};
    }
    const merged=merge({baseline:state.baseline,local:snapshot,
     remote:snap.data(),blocked:state.blocked});
    if(Object.keys(merged.patch).length)tx.update(ref,merged.patch);
    return {saved:Object.keys(merged.patch).length>0,next:merged.next,
     conflicts:merged.conflicts,stale:merged.stale};
   });
   if(!active()||outcome.skipped)return {skipped:true};
   state.baseline=fieldSnapshot(outcome.next);
   if((outcome.conflicts.length||outcome.stale.length)&&!state.warned){
    state.warned=true;
    try{onConflict?.();}
    catch(error){console.warn('DUDU profile conflict notification:',error);}
   }
   return {saved:outcome.saved,created:!!outcome.created,
    conflicts:outcome.conflicts,stale:outcome.stale};
  };
  const scheduled=state.queue.catch(()=>{}).then(action);
  state.queue=scheduled;
  return scheduled;
 }
 return Object.freeze({FIELDS,fieldSnapshot,changes,merge,begin,reset,enqueue});
});
