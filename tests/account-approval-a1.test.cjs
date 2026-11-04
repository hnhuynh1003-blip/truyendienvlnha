// AUTH-A1 preparation tests; the Firebase Rules candidate is NOT published.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/account-approval-v1.js'),'utf8');

function dbHarness(){
 const docs=new Map(),writes=[];
 const snapshot=(key)=>({exists:docs.has(key),data:()=>docs.get(key)});
 const db={
  collection(name){return {
   doc(uid){const ref={path:name+'/'+uid,id:uid};ref.get=async()=>snapshot(ref.path);return ref;},
   where(field,op,value){assert.equal(op,'==');return {limit(n){return {get:async()=>({
    docs:[...docs].filter(([key,data])=>key.startsWith(name+'/')&&data[field]===value)
     .slice(0,n).map(([key,data])=>({id:key.slice(name.length+1),data:()=>data}))
   })};}};}
  };},
  async runTransaction(callback){
   const queue=[];
   const tx={get:async ref=>snapshot(ref.path),
    set:(ref,data)=>queue.push(['set',ref.path,data]),
    update:(ref,data)=>queue.push(['update',ref.path,data])};
   const answer=await callback(tx);
   for(const [kind,key,data] of queue){
    const old=docs.get(key);
    if(kind==='update'&&!old)throw Error('missing document');
    docs.set(key,kind==='set'?data:{...old,...data});writes.push([kind,key]);
   }
   return answer;
  }
 };
 return {db,docs,writes};
}

function makeAuth(uid,admin=false){
 const currentUser={uid,email:uid+'@example.test',displayName:'Player '+uid,
  getIdTokenResult:async()=>({claims:{admin}})};
 return {currentUser};
}

function app(){
 const context={firebase:{firestore:{FieldValue:{serverTimestamp:()=> 'SERVER_TIMESTAMP'}}}};
 context.window=context;
 vm.runInNewContext(source,context);
 return context.DuduAccountApprovalV1;
}

test('first signup creates exactly one immutable pending request, no profile or wallet',async()=>{
 const api=app(),h=dbHarness(),auth=makeAuth('fresh-user');
 const first=await api.check({db:h.db,auth,uid:'fresh-user',claims:{}});
 const second=await api.check({db:h.db,auth,uid:'fresh-user',claims:{}});
 assert.deepEqual([first.approved,first.status,second.status],[false,'pending','pending']);
 assert.equal(h.writes.length,1);
 assert.equal(h.docs.get('account_requests_v1/fresh-user').email,'fresh-user@example.test');
 assert.equal(h.docs.get('account_requests_v1/fresh-user').createdAt,'SERVER_TIMESTAMP');
 assert.equal([...h.docs.keys()].every(key=>key.startsWith('account_requests_v1/')),true);
});

test('nonadmin cannot review requests',async()=>{
 const api=app(),h=dbHarness(),auth=makeAuth('reader');
 await api.check({db:h.db,auth,uid:'reader',claims:{}});
 await assert.rejects(api.pending({db:h.db,auth}),/admin-required/);
 await assert.rejects(api.decide({db:h.db,auth,uid:'reader',approve:true}),/admin-required/);
 assert.equal(h.docs.has('approved_accounts_v1/reader'),false);
});

test('admin approval atomically enables account and repeated decisions cannot mint anything',async()=>{
 const api=app(),h=dbHarness(),reader=makeAuth('reader'),admin=makeAuth('owner',true);
 await api.check({db:h.db,auth:reader,uid:'reader',claims:{}});
 const pending=await api.pending({db:h.db,auth:admin});
 assert.equal(pending.length,1);
 assert.equal(pending[0].uid,'reader');
 await api.decide({db:h.db,auth:admin,uid:'reader',approve:true});
 assert.equal(h.docs.get('account_requests_v1/reader').status,'approved');
 assert.equal(h.docs.get('approved_accounts_v1/reader').approvedBy,'owner');
 assert.deepEqual((await api.check({db:h.db,auth:reader,uid:'reader',claims:{}})).approved,true);
 await assert.rejects(api.decide({db:h.db,auth:admin,uid:'reader',approve:true}),/request-not-pending/);
 assert.equal([...h.docs.keys()].length,2);
 assert.equal([...h.docs.keys()].some(key=>/profiles_v2|economy_accounts/.test(key)),false);
});

test('rejection and revocation both refuse gameplay',async()=>{
 const api=app(),h=dbHarness(),owner=makeAuth('owner',true);
 const refused=makeAuth('refused');
 await api.check({db:h.db,auth:refused,uid:'refused',claims:{}});
 await api.decide({db:h.db,auth:owner,uid:'refused',approve:false});
 assert.equal((await api.check({db:h.db,auth:refused,uid:'refused',claims:{}})).status,'rejected');
 const revoked=makeAuth('revoked');
 h.docs.set('approved_accounts_v1/revoked',{uid:'revoked',enabled:false});
 assert.equal((await api.check({db:h.db,auth:revoked,uid:'revoked',claims:{}})).status,'revoked');
});

test('R1.2 grandfathering accepts an existing self-owned profile in either invitation mode',async()=>{
 for(const inviteOnly of [false,true]){
  const api=app(),h=dbHarness(),uid='existing-reader',auth=makeAuth(uid);
  const previous={username:uid,level:5,exp:120,currency:77};
  h.docs.set('profiles_v2/'+uid,previous);
  const decision=await api.check({db:h.db,auth,uid,claims:{},inviteOnly});
  assert.equal(decision.approved,true);
  assert.equal(decision.status,'approved');
  assert.equal(decision.source,'legacy-profile');
  assert.equal(h.docs.get('profiles_v2/'+uid),previous);
  assert.deepEqual(h.writes,[]);
  assert.equal(h.docs.has('approved_accounts_v1/'+uid),false);
 }
});

test('R1.2 an explicit revoked allowlist overrides a pre-existing profile',async()=>{
 const api=app(),h=dbHarness(),uid='revoked-old-reader',auth=makeAuth(uid);
 h.docs.set('profiles_v2/'+uid,{username:uid,currency:1000});
 h.docs.set('approved_accounts_v1/'+uid,{uid,enabled:false});
 const decision=await api.check({db:h.db,auth,uid,claims:{},inviteOnly:true});
 assert.equal(decision.approved,false);
 assert.equal(decision.status,'revoked');
 assert.equal(h.writes.length,0);
});

test('R1.2 new identities cannot inherit access or create a profile without approval',async()=>{
 const api=app(),h=dbHarness(),uid='brand-new',auth=makeAuth(uid);
 const invite=await api.check({db:h.db,auth,uid,claims:{},inviteOnly:true});
 assert.equal(invite.status,'invite-required');
 assert.equal(invite.approved,false);
 assert.equal(h.writes.length,0);
 const review=await api.check({db:h.db,auth,uid,claims:{},inviteOnly:false});
 assert.equal(review.status,'pending');
 assert.deepEqual(h.writes,[['set','account_requests_v1/'+uid]]);
 assert.equal(h.docs.has('profiles_v2/'+uid),false);
});

test('R1.2 profile permission-denied never becomes approval',async()=>{
 const api=app(),h=dbHarness(),uid='new-with-denied-profile',auth=makeAuth(uid);
 const original=h.db.collection.bind(h.db);
 h.db.collection=name=>{
  const collection=original(name);
  if(name==='profiles_v2')collection.doc=()=>({get:async()=>{
   throw Object.assign(Error('missing or forbidden profile'),{code:'permission-denied'});
  }});
  return collection;
 };
 const decision=await api.check({db:h.db,auth,uid,claims:{},inviteOnly:true});
 assert.equal(decision.status,'invite-required');
 assert.equal(decision.approved,false);
 assert.equal(h.writes.length,0);
});

test('R1.2 no profile inheritance after Firebase user changes mid-request',async()=>{
 const api=app(),h=dbHarness(),uid='reader-switch',auth=makeAuth(uid);
 const original=h.db.collection.bind(h.db);
 h.db.collection=name=>{
  const collection=original(name);
  if(name==='profiles_v2')collection.doc=()=>({get:async()=>{
   auth.currentUser=makeAuth('other-user').currentUser;
   return {exists:true,data:()=>({username:uid})};
  }});
  return collection;
 };
 await assert.rejects(api.check({db:h.db,auth,uid,claims:{},inviteOnly:true}),/account-changed/);
 assert.equal(h.writes.length,0);
});

test('changed Firebase identity cannot file a request for another session',async()=>{
 const api=app(),h=dbHarness(),auth=makeAuth('original');
 const originalCollection=h.db.collection.bind(h.db);
 h.db.collection=name=>{
  const collection=originalCollection(name);
  if(name==='approved_accounts_v1'){
   const oldDoc=collection.doc;
   collection.doc=uid=>{const ref=oldDoc(uid);ref.get=async()=>{
    auth.currentUser=makeAuth('attacker').currentUser;
    return {exists:false};
   };return ref;};
  }
  return collection;
 };
 await assert.rejects(api.check({db:h.db,auth,uid:'original',claims:{}}),/account-changed/);
 assert.equal(h.writes.length,0);
});

test('inert flag and review-only Rules preserve legacy EPUB protection',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const active=fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8');
 const candidate=fs.readFileSync(path.join(__dirname,'../security/firestore-auth-approval-a1.rules.review'),'utf8');
 assert.match(html,/DUDU_ACCOUNT_APPROVAL_V1_READY\s*=\s*false/);
 assert.match(html,/js\/account-approval-v1\.js\?v=auth-a1/);
 assert.doesNotMatch(active,/match \/approved_accounts_v1\//);
 assert.match(candidate,/match \/approved_accounts_v1\/\{uid\}/);
 assert.match(candidate,/match \/account_requests_v1\/\{uid\}/);
 assert.match(candidate,/approvedPlayer\(uid\)/);
 assert.match(candidate,/match \/profiles_v2\/\{uid\} \{\s*allow get: if self\(uid\) && approvedPlayer\(uid\)/);
 assert.match(candidate,/match \/economy_accounts_v52\/\{uid\} \{\s*allow get: if self\(uid\) && approvedPlayer\(uid\)/);
 for(const safeguard of ['deletingOwnedBook(storyId)','status == \'deleting\'','match /chapters/{chapterId}']){
  assert.ok(active.includes(safeguard),safeguard+' active');
  assert.ok(candidate.includes(safeguard),safeguard+' candidate');
 }
});
