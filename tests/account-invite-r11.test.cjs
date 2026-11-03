'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');

const read=p=>readFileSync(join(__dirname,'..',p),'utf8');
const source=read('js/account-invite-r11.js');
const rules=read('security/firestore-r11-invite-approved.rules.review');
const baseline=read('security/firestore-r1-web-public-epub-approved.rules.review');
function harness(){
 const calls=[];
 const root={
  crypto:{getRandomValues:bytes=>{bytes.fill(1);return bytes;}},
  firebase:{firestore:{
   FieldValue:{serverTimestamp:()=>({server:true})},
   Timestamp:{fromDate:date=>({date})}
  }}
 };
 const ctx={window:root,Uint8Array,Array,Date,Error,String,Object};
 vm.runInNewContext(source,ctx);
 const api=root.DuduAccountInviteR11;
 const batch={
  update:(ref,data)=>calls.push({kind:'update',ref,data}),
  set:(ref,data)=>calls.push({kind:'set',ref,data}),
  commit:async()=>{calls.push({kind:'commit'});}
 };
 const db={collection:collection=>({doc:id=>({
  path:collection+'/'+id,
  set:async data=>calls.push({kind:'create',collection,id,data})
 })}),batch:()=>batch};
 const user={uid:'reader-123',getIdTokenResult:async()=>({claims:{admin:true}})};
 const auth={currentUser:user};
 return {api,db,user,auth,calls};
}

test('Codes are cryptographically sourced, 16 symbols and not embedded in JS',()=>{
 const h=harness();
 const code=h.api.generate();
 assert.equal(code,'DUDU-BBBBBBBB-BBBBBBBB');
 assert.equal(h.api.validCode(code),true);
 assert.equal(h.api.validCode('DUDU-ABCDE'),false);
 assert.equal(h.api.normalize('  dudu-bbbbbbbb-bbbbbbbb  '),code);
 assert.doesNotMatch(source,/Math\.random\(/);
});

test('Only custom-claim admin can create a code, no write on rejected attempt',async()=>{
 const h=harness();
 h.user.getIdTokenResult=async()=>({claims:{}});
 await assert.rejects(h.api.create({db:h.db,auth:h.auth}),e=>e.code==='admin-required');
 assert.equal(h.calls.length,0);
});

test('Owner-created code expires in six days and has no prior claimant',async()=>{
 const h=harness();
 const result=await h.api.create({db:h.db,auth:h.auth});
 assert.equal(result.code,'DUDU-BBBBBBBB-BBBBBBBB');
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].collection,'invite_codes_r11');
 assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].data)),{
  createdBy:h.user.uid,createdAt:{server:true},expiresAt:JSON.parse(JSON.stringify(result.expiresAt)),
  status:'open',redeemedBy:'',redeemedAt:null
 });
});

test('Redeeming a code writes only one invite and one account allowlist doc atomically',async()=>{
 const h=harness();
 await h.api.redeem({db:h.db,auth:h.auth,code:'dudu-bbbbbbbb-bbbbbbbb'});
 assert.deepEqual(h.calls.map(c=>c.kind),['update','set','commit']);
 assert.equal(h.calls[0].ref.path,'invite_codes_r11/DUDU-BBBBBBBB-BBBBBBBB');
 assert.equal(h.calls[0].data.redeemedBy,h.user.uid);
 assert.equal(h.calls[1].ref.path,'approved_accounts_v1/'+h.user.uid);
 assert.equal(h.calls[1].data.uid,h.user.uid);
 assert.equal(h.calls[1].data.enabled,true);
 assert.equal(h.calls[1].data.approvedBy,'invite');
 assert.ok(!h.calls.some(c=>c.ref?.path?.startsWith('profiles_v2')));
});

test('Malformed code is rejected before a Firestore write',async()=>{
 const h=harness();
 await assert.rejects(h.api.redeem({db:h.db,auth:h.auth,code:'12345'}),
  e=>e.code==='invalid-code-format');
 assert.equal(h.calls.length,0);
});

test('Invitation mode keeps a new Firebase identity pending without creating a request/profile',async()=>{
 const approval=require('../js/account-approval-v1.js');
 const uid='reader',user={uid,email:'reader@example.test'};
 let trans=0;
 const db={collection:()=>({doc:()=>({get:async()=>({exists:false})})}),
  runTransaction:async()=>{trans++;}};
 const answer=await approval.check({db,auth:{currentUser:user},uid,claims:{},inviteOnly:true});
 assert.equal(answer.approved,false);
 assert.equal(answer.status,'invite-required');
 assert.equal(trans,0);
});

test('R1.1 Rules require a two-sided batch and cannot self-approve using a guessed UID',()=>{
 assert.match(rules,/match \/invite_codes_r11\/\{code\}/);
 assert.match(rules,/allow get: if admin\(\);\s*allow list: if admin\(\)/);
 assert.match(rules,/getAfter\(approvedPath\(request\.auth\.uid\)\)\.data\.inviteCode == code/);
 assert.match(rules,/!exists\(approvedPath\(request\.auth\.uid\)\)/);
 assert.match(rules,/getAfter\(invitePath\(request\.resource\.data\.inviteCode\)\)/);
 assert.match(rules,/resource\.data\.status == 'open'/);
 assert.match(rules,/resource\.data\.expiresAt > request\.time/);
 assert.match(rules,/validApprovedData\(request\.resource\.data, uid\)/);
 assert.match(rules,/validInviteData\(request\.resource\.data\)/);
 assert.match(rules,/request\.resource\.data\.approvedBy == 'invite'/);
 assert.match(rules,/allow delete: if false;/);
});

test('Legacy Web, EPUB editing/archiving/deleting, and both release switches stay unchanged/off',()=>{
 const start='function bookPath(storyId)';
 assert.equal(rules.slice(rules.indexOf(start)),baseline.slice(baseline.indexOf(start)));
 assert.match(rules,/match \/studio_data\/main_library\s*\{\s*allow get, list: if true;/);
 const page=read('index.html');
 assert.match(page,/window\.DUDU_ACCOUNT_APPROVAL_V1_READY\s*=\s*false/);
 assert.match(page,/window\.DUDU_ACCOUNT_INVITES_R11_READY\s*=\s*false/);
 assert.doesNotMatch(read('firebase.json'),/"firestore"\s*:/);
 assert.equal(JSON.parse(read('firebase.r11-invite-review.json')).firestore.rules,
  'security/firestore-r11-invite-approved.rules.review');
});
