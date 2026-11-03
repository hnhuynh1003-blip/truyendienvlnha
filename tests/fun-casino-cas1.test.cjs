'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const base=join(__dirname,'..');
const read=path=>readFileSync(join(base,path),'utf8');
const scratch=require('../js/personal-scratch-c28.js');

function harness(amount){
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.className='';this.listeners={};this.style={};}
  set textContent(value){this.text=String(value);this.children=[];}
  get textContent(){return this.text||this.children.map(child=>child.textContent||'').join('');}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;this.text='';}
  setAttribute(){}
  addEventListener(event,callback){this.listeners[event]=callback;}
 }
 const nodes={};
 for(const id of ['dudu-fun-content-v43','dudu-fun-header-balance','dudu-fun-launch-v43'])nodes[id]=new Node('div');
 const claimed={id:'00000000-0000-4000-8000-000000000001',theme:'dragon',amount,
  seed:42,day:'2026-11-02',status:'claimed',cells:Array.from({length:10},(_,i)=>i),layout:'numbers'};
 const ready={...claimed,status:'ready'};
 let active=ready,claimCalls=0;
 const doc={createElement:tag=>new Node(tag),getElementById:id=>nodes[id]||null};
 const root={document:doc,currentUsername:'du',userProfile:{currency:100},
  DuduAuth:{isReady:()=>true,uid:()=> 'du'},IS_SANDBOX_MODE:false,
  DuduEconomyCoreV43:{localDay:()=> '2026-11-02'},
  DuduFunRulesV43:{norm:()=>({rounds:{box:null,ticket:null},history:[]})},
  DuduPersonalFunC25:{utcDay:()=> '2026-11-02'},
  DuduFunLiveBridgeC25:{uid:()=> 'du',load:async()=>({state:{}})},
  DuduPersonalScratchC28:scratch,
  DuduScratchLiveBridgeC28:{uid:()=> 'du',ready:()=>true,
   load:async()=>({state:{active,history:[]},currency:100}),
   run:async()=>{claimCalls++;active=claimed;
    return {status:'applied',state:{active,history:[]},currency:100+amount,
     reward:{amount,tier:'Trúng giải'}};}}};
 root.window=root;
 vm.runInNewContext(read('js/dudu-fun-ui-v43.js'),root);
 const all=()=>{
  const walk=node=>[node,...node.children.flatMap(walk)];
  return walk(nodes['dudu-fun-content-v43']);
 };
 return {root,nodes,all,claimed,claimCalls:()=>claimCalls};
}

for(const amount of [15,0])test('FUN-CAS1 '+(amount?'win':'loss')+
 ' animates once after the applied claim, not on repeated render',async()=>{
 const h=harness(amount);
 h.root.DuduFunUIV43.render();
 await new Promise(resolve=>setImmediate(resolve));
 const ticketTab=h.all().find(n=>n.tag==='button'&&n.className.startsWith('dudu-fun-tab')&&n.textContent.includes('Vé Cào'));
 assert.ok(ticketTab);ticketTab.listeners.click();
 await new Promise(resolve=>setImmediate(resolve));
 const claim=h.all().find(n=>n.className.includes('lucky-claim'));
 assert.ok(claim);await claim.listeners.click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.claimCalls(),1);
 const outcome=amount?'win':'loss';
 assert.equal(h.all().filter(n=>n.className.includes('lucky-outcome-'+outcome)).length,1);
 h.root.DuduFunUIV43.render();
 assert.equal(h.all().filter(n=>n.className.includes('lucky-outcome-')).length,0);
 const stat=h.all().filter(n=>n.className==='lucky-odds-stat');
 assert.deepEqual(stat.map(n=>n.textContent),['Lãi ròng22,0611%','Hòa vốn20%','Lỗ ròng57,9389%']);
 assert.ok(h.all().some(n=>n.className==='lucky-odds-math'&&n.textContent.includes('−1,57 Xu/vé')));
});

test('FUN-CAS1 is visual-only and preserves wallet, odds and rule gates',()=>{
 const html=read('index.html'),ui=read('js/dudu-fun-ui-v43.js'),css=read('css/dudu-fun-casino-v1.css');
 assert.match(html,/dudu-fun-casino-v1\.css\?v=fun-cas1/);
 assert.match(html,/dudu-fun-ui-v43\.js\?v=f35-1/);
 assert.match(ui,/kind==='claim'&&response\.status==='applied'/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/localStorage|\.currency|firebase|walletXu/);
 assert.doesNotMatch(html,/DUDU_SPARK_EXCHANGE_V1_READY\s*=\s*true/);
 assert.equal(scratch.PRICE,10);
 assert.equal(scratch.PRIZES.reduce((sum,p)=>sum+p.weight,0),1e6);
});
