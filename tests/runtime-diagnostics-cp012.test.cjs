'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {collect,MAX_KEYS}=require('../js/runtime-diagnostics-cp012.js');
const uid='owner-A',other='owner-AB';
function storage(keys){
 return {length:keys.length,key:i=>keys[i],getItem(){throw Error('must not read values');},
 setItem(){throw Error('must not write');},removeItem(){throw Error('must not delete');}};
}
const input={uid,authUid:uid,profileUid:uid,ready:true,session:'synced',policyId:'personal-reading-v1',
 reading:{uid,pending:2,runnable:1,held:1,durable:true,expired:0,overflow:0,corrupt:0,issues:['secret']},
 appCheckActivation:'activation-returned',profileWrites:0,sessionStorage:storage([])};
test('CP012 counts only known current-owner keys without reading their values',()=>{
 const local=storage(['dudu-personal-shop:pending:'+uid,'dudu-personal-shop:pending:'+other,
 'dudu-personal-items:pending:'+uid+':use:private-instance',
 'dudu-personal-items:pending:'+other+':use:private-instance',
 'dudu:reading:pending:v1:personal-reading-v1:'+uid+':123',
 'dudu:reading:pending:v1:personal-reading-v1:'+other+':456',
 'dudu-canonical-profile:p4a3a2:'+uid,'unrelated-secret']);
 const report=collect({...input,local,sessionStorage:storage(['dudu-v52-purchase-pending:'+uid])});
 a.deepEqual(report.local,{status:'observed',journals:2,persistedReadingKeys:1,canonicalCacheKeyPresent:true});
 a.deepEqual(report.sessionStorage,{status:'observed',journals:1});
 a.equal(report.reading.pending,2);a.equal(report.appCheckHealth,'not-verified');
 const json=JSON.stringify(report);
 for(const secret of [uid,other,'private-instance','unrelated-secret','issues','123'])a.ok(!json.includes(secret),secret);
});
test('CP012 fails closed for sandbox, missing readiness and identity mismatch',()=>{
 const denied={get length(){throw Error('must not inspect');}};
 for(const extra of [{sandbox:true},{ready:false},{profileUid:other},{authUid:null},{uid:null}]){
  const report=collect({...input,...extra,local:denied,sessionStorage:denied});
  a.ok(!Object.hasOwn(report,'local'));a.ok(!Object.hasOwn(report,'reading'));
 }
});
test('CP012 unavailable, excessive or unstable storage is not a zero count',()=>{
 for(const local of [null,{length:MAX_KEYS+1},{length:1,key:()=>null},{get length(){throw Error('blocked');}}]){
  a.deepEqual(collect({...input,local}).local,{status:'not-verified'});
 }
});
test('CP012 rejects another owner queue and arbitrary status strings',()=>{
 const report=collect({...input,reading:{uid:other,pending:2},session:'secret',appCheckActivation:'secret',local:storage([])});
 a.deepEqual(report.reading,{status:'not-verified'});a.equal(report.reconciliation,'unknown');
 a.equal(report.appCheckActivation,'unknown');a.equal(report.appCheckHealth,'not-verified');
 a.equal(report.local.canonicalCacheKeyPresent,false);
});
test('CP012 runtime adapter uses only local observation and textContent',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const start=html.indexOf('    function clearRuntimeDiagnosticsCP012()'),end=html.indexOf('    function openAuthModal()',start);
 a.ok(start>=0&&end>start);
 const source=html.slice(start,end);
 a.match(source,/pendingStatus\(\)/);a.match(source,/diagnosticStatus\(\)/);
 a.match(source,/output\.textContent=JSON\.stringify/);
 a.match(source,/dudu-auth-state-changed/);
 a.doesNotMatch(source,/getIdToken|getToken\(|fetch\(|\.get\(|\.setItem\(|\.removeItem\(|\.retry\(|\.afterCommit\(|\.flush\(|\.innerHTML/);
});

test('CP012 executes account modal adapter on demand, clears on auth transition, and never requests tokens or writes',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const start=html.indexOf('    function clearRuntimeDiagnosticsCP012()'),end=html.indexOf('    function openAuthModal()',start);
 a.ok(start>=0&&end>start);
 let account=uid,ready=true,reads=0,forbiddenCalls=0,click,authChanged;
 const forbid=()=>{forbiddenCalls++;throw Error('unexpected side effect');};
 const output={textContent:''},panel={hidden:true,open:false},button={addEventListener:(event,fn)=>{a.equal(event,'click');click=fn;}};
 const nodes={'cp012-output':output,'cp012-diagnostics':panel,'cp012-inspect':button};
 const keys=['dudu-personal-shop:pending:'+uid,'dudu-personal-shop:pending:'+other];
 const local={length:keys.length,key(i){reads++;return keys[i];},getItem:forbid,setItem:forbid,removeItem:forbid};
 const win={DuduRuntimeDiagnosticsCP012:require('../js/runtime-diagnostics-cp012.js'),
  DuduAuth:{uid:()=>account,isReady:()=>ready,retry:forbid},
  DuduCanonicalProfileP4A3A2:{diagnosticStatus:()=> 'synced',retry:forbid,afterCommit:forbid},
  DuduPersonalReadingRuntimeP2A:{pendingStatus:()=>({uid:account,pending:0,durable:true}),stop:forbid},
  DuduPersonalReadingPolicyP2C:{policy:{id:'personal-reading-v1'}},
  localStorage:local,sessionStorage:storage([]),addEventListener:(event,fn)=>{a.equal(event,'dudu-auth-state-changed');authChanged=fn;}};
 const ctx={window:win,document:{getElementById:id=>nodes[id]},
  firebase:{auth:()=>({currentUser:account?{uid:account,getIdToken:forbid,getIdTokenResult:forbid}:null}),appCheck:forbid,firestore:forbid},
  IS_SANDBOX_MODE:false,currentUsername:uid,userProfile:{username:uid},cp012AppCheckActivation:'activation-returned',
  pendingLiveProfileWrites:new Set(),fetch:forbid};
 vm.runInNewContext(html.slice(start,end),ctx);
 a.equal(reads,0,'mount must not inspect storage');
 authChanged();a.equal(panel.hidden,false);a.equal(reads,0);
 click();let report=JSON.parse(output.textContent);
 a.equal(report.identity,'match');a.equal(report.local.journals,1);a.equal(report.appCheckHealth,'not-verified');a.equal(reads,2);
 a.ok(!output.textContent.includes(uid));
 account=other;authChanged();a.equal(output.textContent,'');a.equal(panel.open,false);
 click();report=JSON.parse(output.textContent);a.equal(report.identity,'mismatch');a.equal(Object.hasOwn(report,'local'),false);a.equal(reads,2);
 ready=false;account=null;authChanged();a.equal(panel.hidden,true);click();a.equal(output.textContent,'');
 ctx.IS_SANDBOX_MODE=true;ready=true;account=uid;authChanged();a.equal(panel.hidden,true);click();a.equal(output.textContent,'');
 a.equal(forbiddenCalls,0);
});
