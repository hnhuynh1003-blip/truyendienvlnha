'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const req=n=>require('../js/'+n+'.js'),clone=x=>structuredClone(x),NOW=Date.UTC(2026,10,26,1),uid='audit-reader';
const reading=req('personal-reading-reward-p2b'),policy=req('personal-reading-policy-p2c').policy,progress=req('personal-progress-c23'),shop=req('personal-spark-items-v1'),economy=req('economy-core-v43'),arcade=req('arcade-unified-xu-r32'),core=req('personal-arcade-core-v1'),bao=req('vanbao-rewards-f44'),bank=req('vanbao-puzzles-f44'),vv=req('personal-vantvat-f31'),save=req('profile-save-c23'),cloud=req('personal-cloud-v56-9');
const id=n=>String(n).padStart(8,'0')+'-1234-1234-1234-123456789abc';
function merge(t,p){for(const[k,v]of Object.entries(p)){if(v&&typeof v==='object'&&!Array.isArray(v)){if(!t[k]||typeof t[k]!=='object')t[k]={};merge(t[k],v);}else t[k]=clone(v);}return t;}
function env(extra={}){let data={username:uid,name:'Audit',currency:1000,exp:0,level:1,inventory:[],quests:[],storyStates:{historical:{keep:true}},...extra},tail=Promise.resolve(),writes=0;const auth={currentUser:{uid}},db={collection:()=>({doc:()=>({get:async()=>({exists:true,data:()=>clone(data)})})}),runTransaction(fn){const t=tail.then(async()=>{const patches=[];const out=await fn({get:async()=>({exists:true,data:()=>clone(data)}),update:(r,p)=>patches.push({p,replace:true}),set:(r,p,o)=>patches.push({p,replace:!o?.merge})});for(const{p,replace}of patches){if(replace)Object.assign(data,clone(p));else merge(data,clone(p));writes++;}return out;});tail=t.catch(()=>{});return t;}};return{db,auth,snapshot:()=>clone(data),get writes(){return writes;}};}
const slots=Array.from({length:6},(_,i)=>NOW-60000+i*10000),args=h=>({db:h.db,auth:h.auth,uid});
async function action(h,n,i=1){if(n==='Reader')return reading.run({...args(h),policy,slots,now:()=>NOW});if(n==='Shop')return shop.run({...args(h),kind:'purchase',requestId:'shop-'+id(i),itemId:economy.SUPPLY_ID,now:()=>new Date(NOW)});if(n==='Loot')return progress.run({...args(h),kind:'global-loot',requestId:'global-'+id(i),now:()=>NOW});if(n==='Arcade'){await arcade.run({...args(h),id:'ax-'+id(900+i),mode:'init',seed:core.fresh(NOW),now:NOW});return arcade.run({...args(h),id:'ax-'+id(i),mode:'action',action:'buy-seeds',now:NOW});}if(n==='VanBao'){const p=bank[0],c={...args(h),puzzleId:p.id,now:()=>NOW};await bao.run({...c,kind:'win',eventId:id(i),xMoves:[p.proof.move],entropy:[1,0,1,4,6,8]});const index=h.snapshot().storyStates[bao.META].wins[p.id].boxes.findIndex(b=>b.group==='CARD');await bao.run({...c,kind:'choose',index});return bao.run({...c,kind:'claim'});}if(n==='VanTuong'){await vv.run({...args(h),kind:'start',id:id(i),roll:0,now:()=>NOW});return vv.run({...args(h),kind:'claim',id:id(i),now:()=>NOW});}}
function apply(ui,n,r){const fields=n==='Reader'?['currency','exp','level','storyStates']:n==='Shop'?['inventory','storyStates','quests','questV437','questsDayV43']:n==='Arcade'?[]:n==='Loot'?['currency','exp','level','inventory','quests','questV437','questsDayV43','lootedChapters','storyStates']:n==='VanBao'?['currency','inventory','storyStates','exp','level']:['currency','inventory','storyStates'];for(const k of fields)if(r[k]!==undefined)ui[k]=clone(r[k]);if(n==='Shop'||n==='Arcade')ui.currency=r.balance;return ui;}
test('A-06 actual Reader bridge plus Shop plus advanced saver baseline cannot refund purchase or remove receipt',async()=>{const h=env(),ui=h.snapshot();save.begin(uid,h.snapshot());let release,committed;const gate=new Promise(r=>release=r),done=new Promise(r=>committed=r),source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8'),start=source.indexOf('window.DuduReadingRewardBridgeP2C='),code=source.slice(start,source.indexOf('    function personalClaimQuestC23',start));const coordinator=req('profile-reconciliation-p4a3a2').create({read:async()=>({exists:true,fromCache:false,hasPendingWrites:false,data:h.snapshot()}),apply:(_,data)=>Object.assign(ui,data),isCurrent:()=>true});const ticket=coordinator.begin(uid,h.auth.currentUser);const ctx={window:{DuduCanonicalProfileP4A3A2:{capture:coordinator.capture,current:t=>t===ticket,afterCommit:coordinator.afterCommit},DuduPersonalReadingPolicyP2C:{enabled:()=>true},DuduPersonalReadingRewardP2B:{}},personalProgressReady:()=>true,currentUsername:uid,pendingLiveProfileWrites:new Set(),personalProgressQueue:Promise.resolve(),firebase:{auth:()=>h.auth},db:h.db,userProfile:ui,localStorage:{setItem(){}},updatePhoneUI(){},renderWallet(){},DuduPersonalReadingPolicyP2C:{policy},DuduPersonalReadingRewardP2B:{run:async o=>{const r=await reading.run({...o,now:()=>NOW});committed();await gate;return r;}}};vm.runInNewContext(code,ctx);const pending=ctx.window.DuduReadingRewardBridgeP2C.submit(uid,slots);await done;apply(ui,'Shop',await action(h,'Shop'));a.equal(h.snapshot().currency,980);await save.enqueue({...args(h),data:ui,isCurrent:()=>true});release();await pending;await coordinator.retry(ticket);a.equal(ui.currency,980);a.equal(ui.exp,2);a.equal(ui.inventory.length,1);a.ok(ui.storyStates[shop.META]);a.equal(h.snapshot().currency,980);await save.enqueue({...args(h),data:ui,isCurrent:()=>true});a.equal(h.snapshot().currency,980);a.equal(h.snapshot().inventory.length,1);a.ok(h.snapshot().storyStates[shop.META]);save.reset();});
test('P4A.2 containment: stale Shop/Loot snapshot cannot erase bitmap; retained slot replay awards zero',async()=>{
 const h=env(),ui=h.snapshot();save.begin(uid,h.snapshot());const oldShop=await action(h,'Shop');
 const store=new Map(),storage={get length(){return store.size;},key:i=>[...store.keys()][i]??null,getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const queue=req('personal-reading-slots-p2c').queue({storage,now:()=>NOW});queue.bind(uid);queue.push(uid,slots);
 const original=await action(h,'Reader');a.equal(original.awardExp,2); // Remote commit; slot ACK intentionally lost.
 apply(ui,'Loot',await action(h,'Loot',2));await save.enqueue({...args(h),data:ui,isCurrent:()=>true});
 apply(ui,'Shop',oldShop);await save.enqueue({...args(h),data:ui,isCurrent:()=>true});
 a.ok(h.snapshot().storyStates[reading.META]);const ticket=queue.begin(uid);a.equal(ticket.slots.length,6);
 const replay=await reading.run({...args(h),policy,slots:ticket.slots,now:()=>NOW});a.equal(replay.awardExp,0);
 queue.settle(ticket,replay);a.equal(queue.status().pending,0);save.reset();
});
test('A-06 thirty ordered engine pairs: remote serial commits preserved, reverse response UI can regress',async()=>{const names=['Reader','Shop','Loot','Arcade','VanBao','VanTuong'],matrix=[];for(const x of names)for(const y of names)if(x!==y){const h=env(),ui=h.snapshot(),r1=await action(h,x,1),r2=await action(h,y,2),remote=h.snapshot();apply(ui,y,r2);apply(ui,x,r1);a.deepEqual(h.snapshot(),remote);a.equal(remote.storyStates.historical.keep,true);const metas={Reader:reading.META,Shop:shop.META,Loot:progress.META,Arcade:arcade.META,VanBao:bao.META,VanTuong:vv.META};a.ok(remote.storyStates[metas[x]],x);a.ok(remote.storyStates[metas[y]],y);a.equal(remote.inventory.length,[x,y].filter(n=>['Shop','Loot','VanBao','VanTuong'].includes(n)).length);await save.begin(uid,remote);await save.enqueue({...args(h),data:ui,intents:{name:'Safe Name'},isCurrent:()=>true});a.deepEqual(h.snapshot(),{...remote,name:'Safe Name'});save.reset();matrix.push({commitOrder:[x,y],responseOrder:[y,x],remotePreserved:true,staleFields:['currency','inventory','storyStates','exp'].filter(k=>JSON.stringify(ui[k])!==JSON.stringify(remote[k]))});}});

// Pure-attempt and session lifecycle regression fixtures.
function saverEnv(initial={name:'Original',currency:100}){
 let remote=clone(initial),mode='normal',beforeCommit,afterCommit;
 const auth={currentUser:{uid}},writes=[];
 const db={collection:()=>({doc:()=>({})}),async runTransaction(fn){
  async function attempt(value){
   const staged=[];
   const result=await fn({get:async()=>({exists:value!==null,data:()=>clone(value)}),
    update:(ref,p)=>staged.push(clone(p)),set:(ref,p)=>staged.push(clone(p))});
   return {result,staged};
  }
  if(mode==='retry')await attempt({...remote,name:'Other Device'});
  const planned=await attempt(remote);
  if(mode==='abort')throw Error('transaction-aborted');
  beforeCommit?.();
  for(const patch of planned.staged){remote={...(remote||{}),...patch};writes.push(patch);}
  afterCommit?.();return planned.result;
 }};
 return {db,auth,writes,snapshot:()=>clone(remote),setMode:v=>mode=v,
  before:f=>beforeCommit=f,after:f=>afterCommit=f,setRemote:v=>remote=clone(v)};
}
const edit=(h,intents,extra={})=>save.enqueue({db:h.db,auth:h.auth,uid,intents,isCurrent:()=>true,...extra});
test('all generic input paths ignore protected roots, nested paths and historical fields without a transaction',async()=>{
 const protectedData={currency:999,exp:999,level:99,inventory:[{id:'grant'}],quests:[],
  title:'Owner',role:'admin',username:'other',collectedCharacters:{evil:{}},
  storyStates:{historical:{keep:false},__reading:{days:{}}},readRewards:{},dailyReadLog:{},
  readingBitmap:{},receipts:[],cooldowns:{},ownership:{},lootedChapters:{},
  'storyStates.book.collectedCharacters.npc':{affinity:999},'playerAvatar.ownedFrames':['legend']};
 const h=saverEnv({...protectedData,...{currency:100,exp:2,level:1},unknown:{archive:true}}),before=h.snapshot();
 save.begin(uid,before);
 const r=await edit(h,protectedData,{data:protectedData});
 a.equal(r.saved,false);a.equal(r.ignored.length,Object.keys(protectedData).length);a.equal(h.writes.length,0);
 a.deepEqual(h.snapshot(),before);
 const result=await edit(h,{name:'New Name',...protectedData});
 a.equal(result.saved,true);a.deepEqual(h.snapshot(),{...before,name:'New Name'});save.reset();
});
test('validated display name and avatar selections work; title, restricted/forged avatars do not',async()=>{
 const h=saverEnv();save.begin(uid,h.snapshot());
 for(const name of ['A','<admin>','x\u0000x','a'.repeat(29)])a.equal((await edit(h,{name})).saved,false);
 await edit(h,{name:'  An   Du  ',playerAvatar:{kind:'anime',frameId:'moon',presetId:'anime-moon-blue'}});
 a.equal(h.snapshot().name,'An Du');a.equal(h.snapshot().playerAvatar.frameId,'moon');
 for(const playerAvatar of [{kind:'initials',frameId:'author'}, {kind:'vector',presetId:'arbitrary'}, {kind:'upload',uploadId:'own-forged'}, {kind:'initials',frameId:'legend'}]){
  try{const r=await edit(h,{playerAvatar});a.equal(r.saved,false);}catch(e){a.match(e.message,/indexeddb-unavailable/);}
 }
 a.equal(h.snapshot().playerAvatar.frameId,'moon');save.reset();
});
test('transaction retry and aborted callback do not publish blocked-path state',async()=>{
 for(const mode of ['retry','abort']){
  const h=saverEnv();save.begin(uid,h.snapshot());h.setMode(mode);
  if(mode==='abort'){h.setRemote({name:'Other Device',currency:100});await a.rejects(edit(h,{name:'Mine'}),/aborted/);h.setRemote({name:'Original',currency:100});}
  else await edit(h,{name:'Mine'});
  h.setMode('normal');await edit(h,{name:'Mine'});
  a.equal(h.snapshot().name,'Mine');save.reset();
 }
 const blocked=new Set();save.merge({baseline:{name:'Base'},local:{name:'Mine'},remote:{name:'Other'},blocked});
 a.equal(blocked.size,0);
});
test('generic session fences logout/relogin, same UID identity and A to B to A before confirmation',async()=>{
 for(const phase of ['queued','during','after']){
  const h=saverEnv(),originalRun=h.db.runTransaction;save.begin(uid,h.snapshot());
  const invalidate=()=>{save.reset();h.auth.currentUser={uid:'B'};save.begin('B',{});h.auth.currentUser={uid};save.begin(uid,h.snapshot());};
  if(phase==='during'){
   const run=h.db.runTransaction;h.db.runTransaction=fn=>run(tx=>fn({...tx,get:async ref=>{const snap=await tx.get(ref);invalidate();return snap;}}));
  }
  if(phase==='after')h.after(invalidate);
  const p=edit(h,{name:'Stale'});if(phase==='queued')invalidate();
  a.deepEqual(await p,{skipped:true});
  a.equal(h.snapshot().name,phase==='after'?'Stale':'Original');
  h.after(null);h.db.runTransaction=originalRun;await edit(h,{name:'Current'});a.equal(h.snapshot().name,'Current');save.reset();
 }
});
test('controlled simultaneous first creation preserves the winner, never recreates via generic data',async()=>{
 const h=env(),first={name:'Created',currency:50,inventory:[],storyStates:{keep:1}};
 // Serialize the creation fixture, including the missing initial document.
 let remote=null,tail=Promise.resolve();
 const db={collection:()=>({doc:()=>({})}),runTransaction(fn){const p=tail.then(async()=>{
  let pending;const r=await fn({get:async()=>({exists:remote!==null,data:()=>clone(remote)}),set:(r,v)=>pending=clone(v)});
  if(pending)remote=pending;return r;
 });tail=p.catch(()=>{});return p;}};
 const options={db,auth:h.auth,uid,isCurrent:()=>true,data:first};
 const results=await Promise.all([save.ensureNewProfile(options),save.ensureNewProfile({...options,data:{currency:999}})]);
 a.deepEqual(results.map(r=>r.created),[true,false]);a.equal(remote.currency,50);
 save.begin(uid,remote);remote=null;
 await a.rejects(save.enqueue({...options,intents:{name:'Existing'},data:first}),/profile-missing/);a.equal(remote,null);save.reset();
});

function readerFixture(sandbox=false){
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const start=html.indexOf('    function unlockChapterCharacter(');
 const source=html.slice(start,html.indexOf('    function prevChapter()',start));
 const progress={collectedCharacters:{}},messages=[],calls=[];
 const context={IS_SANDBOX_MODE:sandbox,novels:[{id:'book',title:'Book',characters:[{id:'npc',name:'NPC'}],chapters:[{}]}],selectedNovelIndex:0,selectedChapterIndex:0,
  getStoryProgress:()=>progress,showSystemAlert:title=>messages.push(title),saveCurrentAccount:()=>calls.push('sandbox-save'),renderReaderChapterNpcs(){},renderChatDropdown(){}};
 vm.runInNewContext(source,context);return {context,progress,messages,calls};
}
test('live new NPC connection is explicitly paused, with no entitlement or transaction',async()=>{
 const h=readerFixture();h.context.unlockChapterCharacter('npc','Book');
 a.deepEqual(h.progress.collectedCharacters,{});a.deepEqual(h.calls,[]);a.equal(h.messages.length,1);
 const social=req('personal-npc-social-v1');
 await a.rejects(social.run({action:'unlock'}),/invalid-session/);
});
test('Sandbox unlock remains local with affinity 20',()=>{
 const h=readerFixture(true);h.context.unlockChapterCharacter('npc','Book');
 a.equal(h.progress.collectedCharacters.npc.affinity,20);a.deepEqual(h.calls,['sandbox-save']);
});

test('avatar selection preserves unknown remote ownership metadata',async()=>{
 const playerAvatar={kind:'initials',frameId:'none',presetId:'',uploadId:'',ownedFrames:['historical'],unknown:{keep:true}};
 const h=saverEnv({name:'Original',playerAvatar});save.begin(uid,h.snapshot());
 await edit(h,{playerAvatar:{kind:'anime',frameId:'moon',presetId:'anime-moon-blue',ownedFrames:['forged']}});
 a.deepEqual(h.snapshot().playerAvatar.ownedFrames,['historical']);a.deepEqual(h.snapshot().playerAvatar.unknown,{keep:true});
 a.equal(h.snapshot().playerAvatar.presetId,'anime-moon-blue');save.reset();
});
test('unchanged remote upload does not require this device to own its bytes for a name edit',async()=>{
 const playerAvatar={kind:'upload',frameId:'none',presetId:'',uploadId:'own-elsewhere'};
 const h=saverEnv({name:'Original',playerAvatar});save.begin(uid,h.snapshot());
 await edit(h,{name:'New Name',playerAvatar});a.equal(h.snapshot().name,'New Name');a.deepEqual(h.snapshot().playerAvatar,playerAvatar);save.reset();
});

test('emulator: generic containment preserves existing NPC history, wallet, receipts and bitmap',
 {skip:!process.env.P4A3_EMULATOR},async()=>{
 const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
 const environment=await initializeTestEnvironment({projectId:'demo-dudu-p4a3-containment',firestore:{host:'127.0.0.1',port:8194,
  rules:fs.readFileSync(require('node:path').join(__dirname,'../firestore.rules'),'utf8')}});
 try{
  const initial={username:uid,name:'Original',role:'reader',currency:1000,exp:0,level:1,inventory:[],quests:[],collectedCharacters:{legacy:{affinity:72,relationshipV2:{trust:33},unknown:{keep:true}}},storyStates:{historical:{keep:true},book:{collectedCharacters:{'npc-one':{id:'npc-one',affinity:72,relationshipV2:{trust:33},unknown:{keep:true}}}}}};
  await environment.withSecurityRulesDisabled(ctx=>ctx.firestore().collection('profiles_v2').doc(uid).set(initial));
  const db=environment.authenticatedContext(uid).firestore(),auth={currentUser:{uid}},common={db,auth,uid};
  await Promise.all([reading.run({...common,policy,slots,now:()=>NOW}),shop.run({...common,kind:'purchase',requestId:'shop-'+id(42),itemId:economy.SUPPLY_ID,now:()=>new Date(NOW)})]);
  const ref=db.collection('profiles_v2').doc(uid),committed=(await ref.get()).data();
  save.begin(uid,initial);
  await save.enqueue({...common,data:{...initial,currency:99999,storyStates:{}},intents:{name:'Safe Name',currency:99999,storyStates:{}},isCurrent:()=>true});
  a.deepEqual((await ref.get()).data(),{...committed,name:'Safe Name'});
  const retry=await reading.run({...common,policy,slots,now:()=>NOW});a.equal(retry.awardExp,0);a.equal(retry.status,'already-credited');
  a.deepEqual(committed.collectedCharacters,initial.collectedCharacters);
  a.deepEqual(committed.storyStates.book,initial.storyStates.book);
  await assertFails(environment.authenticatedContext('other').firestore().collection('profiles_v2').doc(uid).get());
  await environment.withSecurityRulesDisabled(ctx=>ctx.firestore().collection('profiles_v2').doc(uid).delete());
  await a.rejects(save.enqueue({...common,intents:{name:'Missing Profile'},isCurrent:()=>true}),/profile-missing/);
  a.equal((await ref.get()).exists,false);
 }finally{save.reset();await environment.cleanup();}
});

test('confirmed preference conflict is published once and cannot later revert another device edit',async()=>{
 const h=saverEnv(),warnings=[];save.begin(uid,h.snapshot());h.setRemote({name:'Other Device',currency:70});
 const one=await edit(h,{name:'Mine'},{onConflict:()=>warnings.push(1)});
 a.deepEqual(one.conflicts,[['name']]);a.equal(h.snapshot().name,'Other Device');
 await edit(h,{name:'Mine Again'},{onConflict:()=>warnings.push(1)});
 a.equal(h.snapshot().name,'Other Device');a.equal(h.snapshot().currency,70);a.equal(warnings.length,1);save.reset();
});

test('explicit editor intents preserve name/avatar selection and Sandbox full local persistence',async()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const start=html.indexOf('    function saveCurrentAccount() {'),end=html.indexOf('    // C2.6:',start),source=html.slice(start,end);
 for(const sandbox of [false,true]){
  const h=saverEnv({name:'Original',currency:70,inventory:[{id:'paid'}],storyStates:{receipt:{keep:1}}});save.begin(uid,h.snapshot());
  const profile={name:'Edited Name',currency:999,exp:999,inventory:[],storyStates:{},unknown:{keep:1},playerAvatar:{kind:'initials',frameId:'moon',presetId:'',uploadId:''}};
  const stored=[],pending=new Set(),avatar=req('player-avatar-v16'),library=req('npc-portrait-library-v1');
  const context={window:{DuduProfileSaveC23:save,DuduPlayerAvatarV16:avatar},IS_SANDBOX_MODE:sandbox,
   currentUsername:uid,DuduAuth:{isReady:()=>true,uid:()=>uid},userProfile:profile,localStorage:{setItem:(k,v)=>stored.push([k,JSON.parse(v)])},
   scopedLocalKey:()=> 'sandbox-profile',DuduPlayerAvatarV16:avatar,DuduNpcPortraitLibrary:library,
   DEFAULT_SYSTEM_QUESTS:[],db:h.db,firebase:{auth:()=>h.auth},pendingLiveProfileWrites:pending,
   updatePhoneUI(){},showSystemAlert(){},console,lastLiveProfileSaveWarningAt:0};
  vm.runInNewContext(source,context);context.saveCurrentAccount({name:profile.name,playerAvatar:profile.playerAvatar});await Promise.all([...pending]);
  a.deepEqual(stored[0][1],profile);
  if(sandbox)a.deepEqual(h.snapshot(),{name:'Original',currency:70,inventory:[{id:'paid'}],storyStates:{receipt:{keep:1}}});
  else {
   a.equal(h.snapshot().name,'Edited Name');a.equal(h.snapshot().currency,70);a.equal(h.snapshot().playerAvatar.frameId,'moon');a.deepEqual(h.snapshot().storyStates,{receipt:{keep:1}});
   // A late full snapshot followed by any unrelated legacy save cannot become
   // a fresh preference intent, even after the baseline advanced.
   context.userProfile={...profile,name:'Original',playerAvatar:{kind:'initials',frameId:'none',presetId:'',uploadId:''}};
   const count=h.writes.length;context.saveCurrentAccount();await Promise.all([...pending]);
   a.equal(h.snapshot().name,'Edited Name');a.equal(h.snapshot().playerAvatar.frameId,'moon');a.equal(h.writes.length,count);
  }
  save.reset();
 }
});

test('browser creation refuses owner backups instead of recreating a cached historical account',async()=>{
 const source=fs.readFileSync(require.resolve('../js/profile-save-c23.js'),'utf8');
 for(const key of ['profile_'+uid,'dudu-v2:'+encodeURIComponent(uid)+':global:profile','storage-unavailable','fresh']){
  const cache=new Map(key==='fresh'||key==='storage-unavailable'?[]:[[key,JSON.stringify({username:uid,currency:900,storyStates:{historical:{keep:1}}})]]);
  const window={localStorage:{getItem:k=>{if(key==='storage-unavailable')throw Error('storage-blocked');return cache.get(k)??null;}}};
  vm.runInNewContext(source,{window});
  const h=saverEnv(null),options={uid,db:h.db,auth:h.auth,data:{name:'First Name',currency:900},isCurrent:()=>true};
  if(key==='fresh')a.equal((await window.DuduProfileSaveC23.ensureNewProfile(options)).created,true);
  else {await a.rejects(window.DuduProfileSaveC23.ensureNewProfile(options),/profile-recovery-required|storage-blocked/);a.equal(h.snapshot(),null);a.equal(h.writes.length,0);}
 }
 // Existing committed data wins even if a backup exists: no creation occurs.
 const window={localStorage:{getItem:()=> 'cached'}};vm.runInNewContext(source,{window});
 const h=saverEnv({name:'Remote',currency:70});
 const r=await window.DuduProfileSaveC23.ensureNewProfile({uid,db:h.db,auth:h.auth,data:{currency:900},isCurrent:()=>true});
 a.equal(r.created,false);a.equal(r.data.currency,70);a.equal(h.writes.length,0);
});

test('actual name editor emits only a validated explicit intent in live and Sandbox',()=>{
 for(const sandbox of [false,true]){
  const nodes=new Map(),calls=[];
  const document={readyState:'complete',getElementById(id){if(!nodes.has(id))nodes.set(id,{value:'',hidden:true,textContent:'',addEventListener(type,fn){this[type]=fn;},focus(){}});return nodes.get(id);}};
  const window={document,DuduAuth:{isReady:()=>true,uid:()=>uid},saveCurrentAccount:intent=>calls.push(clone(intent))};
  const ctx={window,currentUsername:uid,IS_SANDBOX_MODE:sandbox,userProfile:{name:'Original'}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/dudu-character-name-v71.js'),'utf8'),ctx);
  document.getElementById('dudu-v71-rename-input').value='  New   Name  ';
  document.getElementById('dudu-v71-rename-form').submit({preventDefault(){}});
  a.deepEqual(calls,[{name:'New Name'}]);
  document.getElementById('dudu-v71-rename-input').value='<invalid>';
  document.getElementById('dudu-v71-rename-form').submit({preventDefault(){}});a.equal(calls.length,1);
 }
});
test('actual avatar editor emits only its validated selection intent',()=>{
 const source=fs.readFileSync(require.resolve('../js/player-avatar-ui-v16.js'),'utf8');
 const start=source.indexOf('function savePlayerAvatarV16(){'),end=source.indexOf('async function deletePlayerAvatarLocalV23()',start);
 for(const sandbox of [false,true]){
  const calls=[],avatar=req('player-avatar-v16');
  const ctx={IS_SANDBOX_MODE:sandbox,playerAvatarAllowedV497:()=>true,playerAvatarDraftV16:{kind:'initials',frameId:'moon'},
   playerAvatarEditOwnerV16:'owner',playerAvatarOwnerV16:()=> 'owner',playerAvatarFramePreviewOnlyV16:null,
   DuduPlayerAvatarV16:avatar,playerAvatarOptionsV16:()=>({}),userProfile:{currency:999},
   saveCurrentAccount:intent=>calls.push(intent===undefined?null:clone(intent)),renderPlayerAvatarPlacesV16(){},closePlayerAvatarEditorV16(){},document:{getElementById:()=>null}};
  vm.runInNewContext(source.slice(start,end),ctx);ctx.savePlayerAvatarV16();
  a.deepEqual(calls,[sandbox?null:{playerAvatar:{kind:'initials',frameId:'moon',presetId:'',uploadId:''}}]);
 }
 a.match(source.slice(source.indexOf('async function deletePlayerAvatarLocalV23()')),/saveCurrentAccount\(\{playerAvatar:userProfile\.playerAvatar\}\)/);
});

test('confirmed preference read rebases only clean editor fields, preserves metadata and dirty edits',async()=>{
 const h=saverEnv({name:'Original',playerAvatar:{kind:'initials',frameId:'none',presetId:'',uploadId:'',historic:{keep:true}}});
 save.begin(uid,h.snapshot());
 const fence=save.capturePreferenceFence(uid);
 const remote={...h.snapshot(),name:'Other Device',playerAvatar:{...h.snapshot().playerAvatar,frameId:'moon'}};
 const patch=save.reconcileConfirmedPreferences(uid,remote,{...h.snapshot(),name:'Unsaved Draft'},fence);
 a.equal(Object.hasOwn(patch,'name'),false);
 a.deepEqual(patch.playerAvatar,remote.playerAvatar);
 h.setRemote(remote);
 const conflict=await edit(h,{name:'Unsaved Draft'});
 a.deepEqual(conflict.conflicts,[['name']]);a.equal(h.snapshot().name,'Other Device');
 save.reset();
});
test('old confirmed read cannot rebase after a queued editor edit or session replacement',async()=>{
 const h=saverEnv({name:'Original',currency:100});save.begin(uid,h.snapshot());
 const before=save.capturePreferenceFence(uid);
 const queued=edit(h,{name:'New Name'});
 a.equal(save.capturePreferenceFence(uid),null);
 await queued;
 a.deepEqual(save.reconcileConfirmedPreferences(uid,{name:'Original'},{name:'New Name'},before),{});
 const fresh=save.capturePreferenceFence(uid);
 a.deepEqual(save.reconcileConfirmedPreferences(uid,{name:'Other Device'},{name:'New Name'},fresh),{name:'Other Device'});
 h.setRemote({name:'Other Device',currency:100});
 a.equal((await edit(h,{name:'Next Name'})).saved,true);
 save.begin(uid,h.snapshot());
 a.deepEqual(save.reconcileConfirmedPreferences(uid,{name:'Stale'},{name:'Next Name'},fresh),{});
 save.reset();
});
