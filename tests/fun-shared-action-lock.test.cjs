'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const scratch=require('../js/personal-scratch-c28.js');
const blind=require('../js/personal-blind-box-c29.js');

class Node{
 constructor(tag){this.tag=tag;this.className='';this.children=[];this.listeners={};this.style={};
  this.classList={add(){},remove(){}};}
 set textContent(value){this.text=String(value);this.children=[];}
 get textContent(){return this.text||this.children.map(n=>n.textContent||'').join('');}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;this.text='';}
 setAttribute(){}
 addEventListener(name,handler){this.listeners[name]=handler;}
}

test('FUN switches tabs safely while a payout is awaiting confirmation',async()=>{
 const nodes={};for(const id of ['dudu-fun-content-v43','dudu-fun-header-balance',
  'dudu-fun-launch-v43'])nodes[id]=new Node('div');
 const doc={createElement:tag=>new Node(tag),getElementById:id=>nodes[id]||null,
  querySelector:()=>null};
 const active={id:'00000000-0000-4000-8000-000000000001',theme:'dragon',amount:15,
  seed:42,day:'2026-11-02',status:'ready',cells:[0,1,2,3,4,5,6,7,8,9],layout:'numbers'};
 let releaseScratch,scratchCalls=0,blindCalls=0;
 const scratchReceipt=new Promise(resolve=>{releaseScratch=resolve;});
 const root={document:doc,currentUsername:'du',userProfile:{currency:100},
  DuduAuth:{isReady:()=>true,uid:()=> 'du'},IS_SANDBOX_MODE:false,
  DuduEconomyCoreV43:{localDay:()=> '2026-11-02'},
  DuduFunRulesV43:{norm:()=>({rounds:{box:null,ticket:null},history:[]})},
  DuduPersonalFunC25:{utcDay:()=> '2026-11-02'},
  DuduFunLiveBridgeC25:{uid:()=> 'du',ready:()=>true,load:async()=>({state:{}})},
  DuduPersonalScratchC28:scratch,
  DuduScratchLiveBridgeC28:{uid:()=> 'du',ready:()=>true,
   load:async()=>({state:{active,history:[]},currency:100}),
   run:async()=>{scratchCalls++;return scratchReceipt;}},
  DuduPersonalBlindBoxC29:blind,
  DuduBlindBoxLiveBridgeC29:{uid:()=> 'du',ready:()=>true,
   load:async()=>({state:blind.norm(null),currency:100}),
   run:async()=>{blindCalls++;return {status:'applied',state:blind.norm(null),currency:80};}},
  crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000002',
   getRandomValues:array=>{array.fill(12345);return array;}}
 };
 root.window=root;
 vm.runInNewContext(readFileSync(join(__dirname,'../js/dudu-fun-ui-v43.js'),'utf8'),root);
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 const all=()=>{const visit=node=>[node,...node.children.flatMap(visit)];
  return visit(nodes['dudu-fun-content-v43']);};
 const button=(text)=>all().find(node=>node.tag==='button'&&node.textContent.includes(text));
 root.DuduFunUIV43.render();await settle();await settle();
 assert.ok(button('Vạn Bảo'));
 button('Vé Cào').listeners.click();await settle();
 const claim=all().find(node=>node.className.includes('lucky-claim'));
 assert.ok(claim,'ready scratch ticket is still available');
 claim.listeners.click();await settle();
 assert.equal(scratchCalls,1);
 button('Vạn Bảo').listeners.click();await settle();
 const pendingPaid=all().find(node=>node.className.includes('blind-paid'));
 assert.ok(pendingPaid);
 assert.equal(pendingPaid.disabled,true,'other game purchase is visibly locked');
 pendingPaid.listeners.click();await settle();
 assert.equal(blindCalls,0,'even a synthetic repeated click cannot pass the shared guard');
 releaseScratch({status:'applied',state:{active:{...active,status:'claimed'},history:[]},
  currency:115,reward:{amount:15,tier:'Hỷ lộc'}});
 await settle();await settle();
 const paid=all().find(node=>node.className.includes('blind-paid'));
 assert.equal(paid.disabled,false,'shared lock is released after the first receipt settles');
 paid.listeners.click();await settle();
 assert.equal(blindCalls,1,'next deliberate action works normally');
});
