const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/dudu-system-app-v69.js'),'utf8');
const traversals=require('../js/dudu-transmigration-v69.js');

class FakeElement{
 constructor(tag='div',id=''){
  this.tagName=tag.toUpperCase();this.id=id;this.className='';
  this.textContent='';this.children=[];this.events={};
  this.style={display:'none'};this.scrollTop=0;this.isConnected=true;
  this.type='';this.checked=false;this.disabled=false;
 }
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(name,value){this[name]=value;}
 addEventListener(event,fn){(this.events[event]??=[]).push(fn);}
 remove(){this.isConnected=false;}
 focus(){}
}
function locate(parent,predicate){
 if(predicate(parent))return parent;
 for(const node of parent.children||[]){
  const found=locate(node,predicate);
  if(found)return found;
 }
 return null;
}
function cl(name){return x=>x.className?.split(' ').includes(name);}
function makeFixture(){
 const ids=['dudu-v69-system-view','dudu-v69-core-view',
  'dudu-v69-passport-quest','dudu-v69-core-launch',
  'phone-app-system','phone-app-core-console'];
 const mounts=new Map(ids.map(id=>[id,new FakeElement('div',id)]));
 const document={
  readyState:'loading',
  createElement:tag=>new FakeElement(tag),
  getElementById:id=>mounts.get(id)||null,
  addEventListener(){},removeEventListener(){}
 };
 let account='author-id',admin=true,cardCalls=0;
 let resolveRequest=null;
 let stage={stage:'locked',authoritative:true,passport:null};
 const window={
  document,navigator:{clipboard:{writeText:async()=>{throw Error('clipboard not available in test');}}},
  DuduTraversalV69:traversals,
  DuduAuth:{uid:()=>account,isReady:()=>!!account,isAdmin:()=>admin},
  DuduSystemClientV71:{
   me:async()=>({ok:true,data:stage}),
   redeem:async()=>({ok:false}),registerName:async()=>({ok:false}),
   acceptPact:async()=>({ok:false}),
   issueOwnerTestPass:async()=>{
    cardCalls++;
    return new Promise(resolve=>{resolveRequest=resolve;});
   }
  }
 };
 const context={window,document,canEditStories:()=>admin};
 vm.runInNewContext(source,context,{filename:'dudu-system-app-v69.js'});
 return {
  api:window.DuduSystemAppsV69,mounts,
  setAdmin(value){admin=value;},
  setAccount(value){account=value;},
  get cardCalls(){return cardCalls;},
  completeIssue(res){assert.equal(typeof resolveRequest,'function');resolveRequest(res);}
 };
}

test('V71 main AU pilot: no reader issuance, explicit confirm, one-time response and logout clearance',async()=>{
 const env=makeFixture(),host=env.mounts.get('dudu-v69-system-view');
 const code='DT-AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD';
 await env.api.renderSystem();
 assert.equal(env.api.isAuthor(),true);
 assert.equal(host.scrollTop,0);

 env.setAdmin(false);
 await env.api.renderSystem();
 assert.equal(locate(host,cl('dudu-v71-au-pilot')),null,
  'a reader must not see privileged passport issuance controls');

 env.setAdmin(true);
 host.scrollTop=270;
 await env.api.renderSystem();
 assert.equal(host.scrollTop,0,'reopening System must reset the previous scroll position');
 const pilot=locate(host,cl('dudu-v71-au-pilot'));
 assert.ok(pilot,'signed AU sees guarded passport area');
 const checkbox=locate(pilot,x=>x.tagName==='INPUT'&&x.type==='checkbox');
 const issue=locate(pilot,x=>x.tagName==='BUTTON'&&x.textContent==='TẠO THẺ THỬ AU');
 const output=locate(pilot,cl('dudu-v71-au-output'));
 assert.ok(checkbox&&issue&&output);
 await issue.events.click[0]();
 assert.equal(env.cardCalls,0,'no network call until the AU explicitly confirms');
 assert.match(output.textContent,/Cần xác nhận/);

 checkbox.checked=true;
 const pending=issue.events.click[0]();
 assert.equal(env.cardCalls,1);
 assert.equal(issue.disabled,true);
 await issue.events.click[0]();
 assert.equal(env.cardCalls,1,'double-click must never request another passport');
 env.completeIssue({ok:true,data:{code}});
 await pending;
 const displayed=locate(output,cl('dudu-v71-au-code'));
 assert.equal(displayed.textContent,code);
 assert.equal(issue.disabled,true,'do not issue another pass after a successful response');
 assert.doesNotMatch(source,/localStorage|sessionStorage/,'the System UI must not persist a passport');

 env.setAccount(null);env.api.syncAccess();
 assert.equal(locate(host,cl('dudu-v71-au-code')),null,
  'the previous AU passport must disappear from DOM on logout');
 assert.equal(env.api.isAuthor(),false);
});
