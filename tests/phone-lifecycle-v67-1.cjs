// V67.1: Cyber Phone navigation / account isolation contract with fake DOM.
// Run: node tests/phone-lifecycle-v67-1.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'js/phone-lifecycle-v67-1.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ids=['cyber-phone','phone-home-screen','phone-app-chat','phone-app-shop',
 'chat-user-input','dudu-v43-message-input','chat-messages-container',
 'dudu-v43-messages','dudu-v56-role-editor'];
const nodes=new Map(ids.map(id=>[id,makeNode(id)]));
function makeNode(id){
 const classes=new Set();
 return {id,style:{display:'none'},hidden:false,value:'private draft',
   children:['old content'],replaceChildren(){this.children=[];},
   classList:{contains:x=>classes.has(x),add(...x){x.forEach(i=>classes.add(i));},
     remove(...x){x.forEach(i=>classes.delete(i));}}};
}
const events=[],microtasks=[];
const doc={
 readyState:'complete',
 getElementById(id){return nodes.get(id)||null;},
 dispatchEvent(event){events.push(event);}
};
const a=nodes.get('cyber-phone'),home=nodes.get('phone-home-screen');
home.style.display='flex';
const chat=nodes.get('phone-app-chat'),shop=nodes.get('phone-app-shop');
let owner='user-A',currentUid='uid-A',onAuth=null,hideCalls=0;
const window={
 document:doc,CustomEvent:class{constructor(name,{detail}){this.type=name;this.detail=detail;}},
 DuduPhoneAppsV67:{specs:[{id:'chat',elementId:'phone-app-chat'},{id:'shop',elementId:'phone-app-shop'}]},
 DuduCompanionV43:{hide(){hideCalls++;chat.classList.remove('dudu-v43-companion-open');}},
 DuduAuth:{uid(){return currentUid;}},
 firebase:{auth(){return {currentUser:currentUid?{uid:currentUid}:null,
    onAuthStateChanged(cb){onAuth=cb;return()=>{};}}}},
 phoneHome(){chat.style.display='none';shop.style.display='none';home.style.display='flex';},
 togglePhone(){a.style.display=a.style.display==='flex'?'none':'flex';},
 openPhoneApp(name){home.style.display='none';chat.style.display='none';shop.style.display='none';
   if(name==='chat')chat.style.display='flex';if(name==='shop')shop.style.display='flex';}
};
const context={window,document:doc,IS_SANDBOX_MODE:true,currentUsername:owner,
 queueMicrotask:fn=>microtasks.push(fn),console};
const flush=()=>{while(microtasks.length)microtasks.shift()();};
vm.runInNewContext(code,context,{filename:'phone-lifecycle-v67-1.js',timeout:1500});
const api=window.DuduPhoneLifecycleV671;
assert.ok(api);
assert.equal(api.version,1);
assert.equal(api.state.open,false);
window.togglePhone();flush();
assert.equal(api.state.open,true);
assert.equal(api.state.home,true);
window.openPhoneApp('chat');flush();
assert.equal(api.state.appId,'chat');
chat.classList.add('dudu-v43-companion-open');
api.refresh('dudu-view');
assert.equal(api.state.conversation,'dudu');
window.openPhoneApp('shop');flush();
assert.equal(api.state.appId,'shop');
assert.equal(chat.classList.contains('dudu-v43-companion-open'),false);
assert.ok(hideCalls>0);
window.openPhoneApp('chat');flush();
assert.equal(api.state.conversation,'inbox');
// Simulate a sandbox login changing accounts while Phone and old messages are visible.
chat.classList.add('dudu-v43-companion-open');
context.currentUsername='user-B';
assert.equal(api.onAccountChanged(),true);
flush();
assert.equal(api.state.open,false,'Switching accounts hides the old phone view');
assert.equal(api.state.appId,null);
assert.equal(nodes.get('chat-user-input').value,'');
assert.equal(nodes.get('dudu-v43-message-input').value,'');
assert.equal(nodes.get('chat-messages-container').children.length,0);
assert.equal(nodes.get('dudu-v43-messages').children.length,0);
assert.equal(nodes.get('dudu-v56-role-editor').hidden,true);
assert.equal(api.onAccountChanged(),false,'Same account must be idempotent');
assert.ok(events.some(e=>e.type==='dudu:phone:lifecycle'&&e.detail.accountChanged));
assert.equal(code.includes('localStorage.'),false);
assert.equal(code.includes('fetch('),false);
assert.ok(html.includes('src="js/phone-lifecycle-v67-1.js?'));
assert.ok(html.indexOf('src="js/phone-lifecycle-v67-1.js?')>
 html.indexOf('src="js/phone-app-contract-v67.js?'),'Lifecycle must load after manifest');
assert.ok(html.includes('window.DuduPhoneLifecycleV671?.onAccountChanged()'));
// Production authentication change subscription, no auth mutation.
const pNodes=new Map(ids.map(id=>[id,makeNode(id)]));
const pa=pNodes.get('cyber-phone');
pa.style.display='flex';
let authUid='uid-1',subscriber=null;
const prod={document:{readyState:'complete',getElementById:id=>pNodes.get(id)||null,
 dispatchEvent(){}},CustomEvent:window.CustomEvent,
 DuduPhoneAppsV67:window.DuduPhoneAppsV67,
 DuduAuth:{uid:()=>authUid},
 firebase:{auth:()=>({currentUser:authUid?{uid:authUid}:null,
 onAuthStateChanged(cb){subscriber=cb;}})},
 DuduCompanionV43:{hide(){}},
 togglePhone(){pa.style.display='none';},
 phoneHome(){pNodes.get('phone-home-screen').style.display='flex';}
};
vm.runInNewContext(code,{window:prod,IS_SANDBOX_MODE:false,currentUsername:'',
 queueMicrotask:fn=>fn(),console},{timeout:1500});
assert.equal(typeof subscriber,'function','Observe Firebase account transitions');
authUid='uid-2';subscriber();prod.DuduPhoneLifecycleV671.refresh();
assert.equal(pa.style.display,'none','Close sensitive views when Firebase UID changes');
console.log('DUDU V67.1 lifecycle: nav, inbox, account switch, composer privacy OK');
