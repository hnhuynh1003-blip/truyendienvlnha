/* P4A.3 generic preference containment for authenticated main accounts.
 * Only validated name/avatar selection intents may update an existing profile.
 * Economy, entitlements, receipts, reading history and unknown fields belong
 * to their domain transactions. Full UI snapshots are never update authority.
 * Retry callbacks produce attempt-local plans; session state is published only
 * after confirmation. Controlled first-time creation is a separate entry point.
 */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduProfileSaveC23=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 // Creation-only compatibility schema; never used as an update allowlist.
 const FIELDS=Object.freeze(['username','name','title','level','exp','currency',
  'inventory','quests','lootedChapters','readRewards','dailyReadLog',
  'collectedCharacters','storyStates','playerAvatar']);
 const UPDATE_FIELDS=Object.freeze(['name','playerAvatar']);
 const avatar=()=>root?.DuduPlayerAvatarV16||(typeof require==='function'?require('./player-avatar-v16.js'):null);
 const catalog=()=>root?.DuduNpcPortraitLibrary||(typeof require==='function'?require('./npc-portrait-library-v1.js'):null);
 function preferenceSnapshot(data){
  const out={};
  for(const key of UPDATE_FIELDS)if(Object.hasOwn(data||{},key)){
   out[key]=key==='playerAvatar'&&plain(data[key])?Object.fromEntries(
    ['kind','frameId','presetId','uploadId'].filter(k=>Object.hasOwn(data[key],k)).map(k=>[k,clone(data[key][k])])):clone(data[key]);
  }
  return out;
 }
 async function validatedIntents(intents,uid){
  const out={},ignored=[];
  for(const [key,value] of Object.entries(intents||{})){
   if(key==='name'&&typeof value==='string'){
    const name=value.normalize('NFC').trim().replace(/\s+/g,' ');
    if(name.length>=2&&name.length<=28&&!/[\p{C}<>{}]/u.test(name)){out.name=name;continue;}
   }
   if(key==='playerAvatar'){
    if(value&&typeof value==='object')for(const field of Object.keys(value))
     if(!['kind','frameId','presetId','uploadId'].includes(field))ignored.push('playerAvatar.'+field);
    const model=avatar(),library=catalog();
    const valid=model?.validate(value,{vectorIds:library?.CATALOG.map(p=>p.id)||[]});
    if(valid){
     if(valid.kind!=='upload'){out.playerAvatar=valid;continue;}
     const owner=model.uploadIdentity('live-'+uid);
     if(owner&&await library.readUpload(owner,model.SCOPE,valid.uploadId)){out.playerAvatar=valid;continue;}
    }
   }
   ignored.push(key);
  }
  return {snapshot:out,ignored};
 }
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
  blocked=new Set(blocked);
  const current=preferenceSnapshot(remote),next=clone(current),modified=new Set(),
   conflicts=[],stale=[];
  const edits=UPDATE_FIELDS.filter(key=>!equal(baseline?.[key],local?.[key])).map(key=>({path:[key],base:clone(baseline?.[key]),value:clone(local?.[key])}));
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
  for(const difference of UPDATE_FIELDS.filter(key=>!equal(baseline?.[key],current[key])).map(key=>({path:[key],value:current[key]}))){
   if(difference.path.length&&!equal(at(local,difference.path),difference.value)&&
     !equal(at(next,difference.path),at(local,difference.path))){
    blocked.add(pathId(difference.path));stale.push(difference.path);
   }
  }
  // Preserve historical avatar ownership/metadata; selection grants no ownership.
  if(modified.has('playerAvatar'))next.playerAvatar={...(plain(remote?.playerAvatar)?remote.playerAvatar:{}),...next.playerAvatar};
  return {next,patch:Object.fromEntries([...modified].map(key=>[key,next[key]])),
   conflicts,stale,blocked};
 }
 let session=null;
 function reset(){session=null;}
 function begin(uid,remote){
  if(typeof uid!=='string'||!uid){reset();return false;}
  session={uid,baseline:preferenceSnapshot(remote),blocked:new Set(),
   queue:Promise.resolve(),warned:false,pending:0,fence:Object.freeze({})};
  return true;
 }
 // The caller captures this token BEFORE starting a confirmed server read.
 // Any subsequently queued editor intent invalidates it, even if the intent
 // completes before that older read returns. Never rebase a dirty local edit.
 function capturePreferenceFence(uid){
  return session?.uid===uid&&session.pending===0?session.fence:null;
 }
 function reconcileConfirmedPreferences(uid,remote,local,fence){
  const state=session,patch={};
  if(!fence||state?.uid!==uid||state.pending!==0||state.fence!==fence)return patch;
  const incoming=preferenceSnapshot(remote),shown=preferenceSnapshot(local);
  for(const key of UPDATE_FIELDS){
   if(!Object.hasOwn(incoming,key)||state.blocked.has(pathId([key])))continue;
   if(!equal(shown[key],state.baseline[key])&&!equal(shown[key],incoming[key]))continue;
   state.baseline[key]=clone(incoming[key]);
   // Keep complete confirmed avatar metadata, not just selection fields.
   patch[key]=clone(remote[key]);
  }
  return patch;
 }
 // A first-time reader must have an owner-scoped server document before
 // Shop/FUN/Kho can use tx.update(). Never overwrite a profile created by
 // another tab or device while this initialization is in flight.
 async function ensureNewProfile({uid,db,auth,data,isCurrent}={}){
  if(typeof uid!=='string'||!uid||!db?.collection||!db?.runTransaction||
   typeof isCurrent!=='function'||auth?.currentUser?.uid!==uid)
   throw Error('Không thể khởi tạo hồ sơ Firebase');
  const user=auth.currentUser,initial=fieldSnapshot({...data,username:uid});
  const active=()=>auth.currentUser===user&&isCurrent(uid);
  const ref=db.collection('profiles_v2').doc(uid);
  const outcome=await db.runTransaction(async tx=>{
   if(!active())throw Error('Tài khoản đã thay đổi khi khởi tạo hồ sơ');
   const snap=await tx.get(ref);
   if(!active())throw Error('Tài khoản đã thay đổi khi khởi tạo hồ sơ');
   if(snap.exists)return {created:false,data:snap.data()};
   // Auth's legacy bootstrap can supply a cached full profile. A missing
   // document plus an owner backup is recovery uncertainty, not first use.
   // Fail closed instead of recreating a historical wallet/entitlement set.
   if(root){
    const storage=root.localStorage;
    if(!storage?.getItem)throw Error('profile-creation-storage-unavailable');
    const keys=['profile_'+uid,'dudu-v2:'+encodeURIComponent(uid)+':global:profile','dudu-canonical-profile:p4a3a2:'+encodeURIComponent(uid)];
    if(keys.some(key=>storage.getItem(key)!==null))throw Error('profile-recovery-required');
   }
   tx.set(ref,initial);
   return {created:true,data:initial};
  });
  if(!active())throw Error('account-changed');
  return outcome;
 }
 function enqueue({uid,db,auth,data,intents,isCurrent,onConflict}={}){
  const state=session;
  if(!state||state.uid!==uid||typeof isCurrent!=='function'||
    !db?.collection||!db?.runTransaction||!auth?.currentUser||
    auth.currentUser.uid!==uid)return Promise.resolve({skipped:true});
  // Full snapshots are never update authority. Copy explicit intents before queueing.
  const requested=clone(intents||{}),user=auth.currentUser;
  const active=()=>session===state&&isCurrent(uid)&&auth.currentUser===user&&auth.currentUser?.uid===uid;
  const action=async()=>{
   if(!active())return {skipped:true};
   const pending={...requested};
   // Unchanged remote upload references need no device-local ownership lookup.
   if(equal(preferenceSnapshot(pending).playerAvatar,state.baseline.playerAvatar))delete pending.playerAvatar;
   const {snapshot,ignored}=await validatedIntents(pending,uid);
   if(!active())return {skipped:true};
   const local={...state.baseline,...snapshot};
   if(!changes(state.baseline,local).length)return {saved:false,ignored,protectedSnapshotIgnored:!!data};
   const ref=db.collection('profiles_v2').doc(uid);
   const outcome=await db.runTransaction(async tx=>{
    if(!active())return {skipped:true};
    const snap=await tx.get(ref);
    if(!active())return {skipped:true};
    if(!snap.exists)throw Error('profile-missing');
    const merged=merge({baseline:state.baseline,local,
     remote:snap.data(),blocked:state.blocked});
    if(Object.keys(merged.patch).length)tx.update(ref,merged.patch);
    return {saved:Object.keys(merged.patch).length>0,next:merged.next,
     conflicts:merged.conflicts,stale:merged.stale,blocked:merged.blocked};
   });
   if(!active()||outcome.skipped)return {skipped:true};
   state.baseline=preferenceSnapshot(outcome.next);
   state.blocked=outcome.blocked;
   if((outcome.conflicts.length||outcome.stale.length)&&!state.warned){
    state.warned=true;
    try{onConflict?.();}
    catch(error){console.warn('DUDU profile conflict notification:',error);}
   }
   return {saved:outcome.saved,created:false,ignored,protectedSnapshotIgnored:!!data,
    conflicts:outcome.conflicts,stale:outcome.stale};
  };
  const hasPreference=UPDATE_FIELDS.some(key=>Object.hasOwn(requested,key));
  if(hasPreference){state.pending++;state.fence=Object.freeze({});}
  const scheduled=state.queue.catch(()=>{}).then(action).finally(()=>{
   if(hasPreference){state.pending--;state.fence=Object.freeze({});}
  });
  state.queue=scheduled;
  return scheduled;
 }
 return Object.freeze({FIELDS,UPDATE_FIELDS,fieldSnapshot,changes,merge,begin,reset,enqueue,
  ensureNewProfile,capturePreferenceFence,reconcileConfirmedPreferences});
});
