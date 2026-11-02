'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const src=p=>fs.readFileSync(path.join(root,p),'utf8');
class Node{
 constructor(tag){this.tag=tag;this.className='';this.children=[];
  this.listeners={};this.style={setProperty(key,val){this[key]=val;}};}
 set textContent(value){this.text=String(value);this.children=[];}
 get textContent(){return this.text||this.children.map(x=>x.textContent||'').join('');}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;this.text='';}
 setAttribute(key,value){this[key]=value;}
 addEventListener(key,listener){this.listeners[key]=listener;}
}
const walk=node=>[node,...node.children.flatMap(walk)];
function environment(){
 const nodes={};
 for(const name of ['dudu-fun-content-v43','dudu-fun-header-balance','dudu-fun-launch-v43'])
  nodes[name]=new Node('div');
 const timers=[],userProfile={currency:777};
 const context={
  document:{createElement:tag=>new Node(tag),getElementById:id=>nodes[id]||null},
  currentUsername:'du',userProfile,IS_SANDBOX_MODE:false,
  DuduAuth:{isReady:()=>true,uid:()=> 'du'},
  DuduFunRulesV43:{norm:()=>({rounds:{box:null,ticket:null},history:[]})},
  DuduPersonalFunC25:{utcDay:()=> '2026-11-03'},
  DuduFunLiveBridgeC25:{uid:()=> 'du',ready:()=>true,
   load:async()=>({state:{}})},
  crypto:{getRandomValues(values){values.fill(0);return values;}},
  setTimeout(fn){timers.push(fn);},console
 };
 context.window=context;
 for(const p of ['js/dudu-casino-design-v1.js','js/dudu-casino-slot-ui-v1.js',
  'js/dudu-fun-ui-v43.js'])vm.runInNewContext(src(p),context,{filename:p});
 return{context,nodes,timers,userProfile,
  content:()=>walk(nodes['dudu-fun-content-v43'])};
}

test('CASINO-SLOT2 replaces the third FUN tab and keeps existing Vạn Bảo/Vé Cào',async()=>{
 const h=environment();
 h.context.DuduFunUIV43.render();await new Promise(done=>setImmediate(done));
 const tabs=h.content().filter(n=>n.tag==='button'&&n.className.startsWith('dudu-fun-tab'));
 assert.deepEqual(tabs.map(n=>n.textContent),
  ['🎁 Vạn Bảo','🎟️ Vé Cào','🎰 Máy Quay']);
 assert.equal(h.nodes['dudu-fun-header-balance'].textContent,'777');
 tabs[2].listeners.click();
 assert.equal(h.content().filter(n=>n.className.includes('dudu-slot-tile')).length,9);
 assert.ok(h.content().some(n=>n.textContent.includes('KHÔNG TRỪ / CỘNG XU THẬT')));
 assert.equal(h.userProfile.currency,777);
});

test('CASINO-SLOT2 switching FUN tabs mid-spin never rerolls or touches the wallet',async()=>{
 const h=environment();
 h.context.DuduFunUIV43.render();await new Promise(done=>setImmediate(done));
 const tab=label=>h.content().find(n=>n.tag==='button'&&
  n.className.startsWith('dudu-fun-tab')&&n.textContent.includes(label));
 tab('Máy Quay').listeners.click();
 const spin=h.content().find(n=>n.className==='dudu-slot-spin');
 spin.listeners.click();
 assert.equal(h.timers.length,1);
 tab('Vạn Bảo').listeners.click();
 tab('Máy Quay').listeners.click();
 const spinning=h.content().find(n=>n.className==='dudu-slot-spin');
 assert.equal(spinning.disabled,true);
 assert.match(h.content().map(n=>n.textContent).join(' '),/Đã dừng 0\/3 cuộn/);
 for(let col=0;col<3;col++){
  h.timers.shift()();await Promise.resolve();
 }
 // The final spin settled on the reattached FUN stage, no second wager.
 assert.equal(h.content().filter(n=>n.className==='dudu-slot-line is-winning').length,3);
 assert.match(h.content().map(n=>n.textContent).join(' '),/Đã xem 1 lượt/);
 assert.equal(h.userProfile.currency,777);
});

test('CASINO-SLOT2 only loads UI and odds; leaves Rules and wallet adapters dormant',()=>{
 const html=src('index.html'),css=src('css/dudu-casino-slot-v1.css');
 const fun=src('js/dudu-fun-ui-v43.js');
 assert.match(html,/href="css\/dudu-casino-slot-v1\.css\?v=casino-slot2"/);
 assert.match(html,/src="js\/dudu-casino-design-v1\.js\?v=casino-slot2"/);
 assert.match(html,/src="js\/dudu-casino-slot-ui-v1\.js\?v=casino-slot2"/);
 assert.doesNotMatch(html,/src="js\/dudu-casino-slot-receipt-v1\.js/);
 assert.doesNotMatch(html,/src="js\/dudu-fate-tower-(?:ui-)?v1\.js/);
 assert.doesNotMatch(html,/href="css\/dudu-fate-tower-v1\.css/);
 assert.doesNotMatch(fun,/\['tower','🗼 Vận Mệnh'\]/);
 assert.match(fun,/DuduCasinoSlotUIV1\.mount\(\{host:content,demo:true/);
 assert.doesNotMatch(css,/^body\{margin:0/m);
 assert.doesNotMatch(css,/@media\(prefers-reduced-motion:reduce\)\{\*/);
 assert.match(src('firestore.rules'),/deletingOwnedBook\(storyId\)/);
 assert.match(html,/DUDU_ACCOUNT_APPROVAL_V1_READY\s*=\s*false/);
});
