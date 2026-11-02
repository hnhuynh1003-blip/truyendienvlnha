'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const tower=require('../js/dudu-fate-tower-v1.js');
const root=path.join(__dirname,'..');
const src=file=>fs.readFileSync(path.join(root,file),'utf8');
const ID='00000000-0000-4000-8000-000000000001';
const NEXT='00000000-0000-4000-8000-000000000002';
const layout=tower.FLOORS.map(f=>Array.from({length:f.safe},(_,i)=>i));

test('Tháp: odds, stakes and rewards are transparent and are only practice points',()=>{
 assert.deepEqual(tower.odds().map(f=>[f.safe,f.gates,f.points]),
  [[2,3,2],[2,3,5],[1,2,9],[1,2,14],[1,3,24]]);
 assert.equal(tower.MAX_POINTS,24);
 const html=src('index.html'),ui=src('js/dudu-fate-tower-ui-v1.js');
 assert.match(html,/dudu-fate-tower-v1\.js\?v=fun-tower1/);
 assert.match(html,/dudu-fate-tower-ui-v1\.js\?v=fun-tower1/);
 assert.match(html,/dudu-fate-tower-v1\.css\?v=fun-tower1/);
 assert.match(src('js/dudu-fun-ui-v43.js'),/\['tower','🗼 Vận Mệnh'\]/);
 assert.match(ui,/Điểm Tháp chỉ để trải nghiệm, không phải Xu Vàng\/Tiền Xanh/);
 assert.doesNotMatch(src('js/dudu-fate-tower-v1.js'),/firebase|firestore|runTransaction|\.currency\b/);
 const image=path.join(root,'assets/dudu-fun/tower-v1/fate-tower-stage.webp');
 assert.ok(fs.existsSync(image));
 assert.ok(fs.statSync(image).size<260000,'web image should remain light for mobile');
});

test('Tháp: one start is precommitted and cannot reroll during an active climb',()=>{
 const started=tower.start(null,{id:ID,layout});
 assert.equal(started.ok,true);
 assert.equal(started.state.played,1);
 assert.deepEqual(started.state.run.layout,layout);
 const retry=tower.start(started.state,{id:NEXT,layout});
 assert.equal(retry.ok,false);
 assert.equal(retry.reason,'in-progress');
 assert.equal(tower.norm(JSON.parse(JSON.stringify(started.state))).run.id,ID);
});

test('Tháp: double-tap stale gate cannot advance or bank twice',()=>{
 let s=tower.start(null,{id:ID,layout}).state;
 const passed=tower.choose(s,{id:ID,floor:0,gate:0});
 assert.equal(passed.result,'passed');s=passed.state;
 const duplicate=tower.choose(s,{id:ID,floor:0,gate:0});
 assert.equal(duplicate.reason,'stale-floor');
 assert.equal(s.run.floor,1);
 const saved=tower.bank(s,{id:ID,floor:1});
 assert.equal(saved.points,2);
 assert.equal(saved.state.best,2);
 assert.equal(saved.state.run.banked,2);
 assert.equal(tower.bank(saved.state,{id:ID,floor:1}).reason,'already-settled');
 assert.equal(tower.start(saved.state,{id:ID,layout}).reason,'already-applied');
 const next=tower.start(saved.state,{id:NEXT,layout});
 assert.equal(next.ok,true);
 assert.equal(next.state.best,2,'new attempts never erase the record');
});

test('Tháp: loss discards unbanked points, but the saved best stays',()=>{
 let s=tower.start({version:1,best:9,played:2},{id:ID,layout}).state;
 s=tower.choose(s,{id:ID,floor:0,gate:0}).state;
 const lost=tower.choose(s,{id:ID,floor:1,gate:2});
 assert.equal(lost.result,'lost');
 assert.equal(lost.state.run.banked,0);
 assert.equal(lost.state.best,9);
 assert.equal(tower.choose(lost.state,{id:ID,floor:1,gate:0}).reason,'already-settled');
 assert.equal(tower.bank(lost.state,{id:ID,floor:1}).reason,'already-settled');
});

test('Tháp: fifth-floor success auto-banks exactly once and finishes',()=>{
 let s=tower.start(null,{id:ID,layout}).state;
 for(let floor=0;floor<tower.FLOORS.length;floor++){
  const result=tower.choose(s,{id:ID,floor,gate:0});
  assert.equal(result.ok,true);s=result.state;
 }
 assert.equal(s.run.status,'crowned');
 assert.equal(s.run.banked,24);
 assert.equal(s.best,24);
 assert.equal(tower.choose(s,{id:ID,floor:4,gate:0}).reason,'already-settled');
 assert.equal(tower.bank(s,{id:ID,floor:5}).reason,'already-settled');
});

test('Tháp UI: session restores a precommitted climb and never touches the wallet',()=>{
 class Node{
  constructor(tag){this.tag=tag;this.className='';this.children=[];this.listeners={};}
  set textContent(value){this.text=String(value);this.children=[];}
  get textContent(){return this.text||this.children.map(n=>n.textContent||'').join('');}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;this.text='';}
  setAttribute(){}
  addEventListener(name,handler){this.listeners[name]=handler;}
 }
 const cache=new Map();
 const sessionStorage={getItem:key=>cache.get(key)||null,setItem:(key,val)=>cache.set(key,val)};
 const current={currency:77};
 const context={DuduFateTowerV1:tower,sessionStorage,userProfile:current,
  document:{createElement:tag=>new Node(tag)},
  crypto:{randomUUID:()=>ID,getRandomValues:arr=>{arr.fill(0);return arr;}}};
 context.window=context;
 vm.runInNewContext(src('js/dudu-fate-tower-ui-v1.js'),context);
 const host=new Node('section');
 const all=()=>{const visit=n=>[n,...n.children.flatMap(visit)];return visit(host);};
 const button=token=>all().find(n=>n.tag==='button'&&n.textContent.includes(token));
 context.DuduFateTowerUIV1.render(host,{uid:'du'});
 button('BẮT ĐẦU').listeners.click();
 const stored=JSON.parse(cache.get('dudu-fate-tower-preview-v1:du'));
 assert.equal(stored.played,1);
 assert.equal(stored.run.status,'playing');
 assert.equal(button('Cổng 2').tag,'button');
 const session2={...context};session2.window=session2;
 vm.runInNewContext(src('js/dudu-fate-tower-ui-v1.js'),session2);
 session2.DuduFateTowerUIV1.render(host,{uid:'du'});
 assert.ok(button('Cổng 2'),'same precommitted run resumes after script reload');
 assert.equal(JSON.parse(cache.get('dudu-fate-tower-preview-v1:du')).played,1);
 const safe=JSON.parse(cache.get('dudu-fate-tower-preview-v1:du')).run.layout[0][0];
 button('Cổng '+(safe+1)).listeners.click();
 button('CHỐT 2 ĐIỂM').listeners.click();
 const after=JSON.parse(cache.get('dudu-fate-tower-preview-v1:du'));
 assert.equal(after.best,2);
 assert.equal(after.run.status,'banked');
 assert.equal(current.currency,77,'nothing is written to Xu Vàng');
});

test('Tháp appears as a third tab inside DUDU FUN, preserving both previous games',async()=>{
 class Node{
  constructor(tag){this.tag=tag;this.className='';this.children=[];this.listeners={};this.style={};}
  set textContent(value){this.text=String(value);this.children=[];}
  get textContent(){return this.text||this.children.map(n=>n.textContent||'').join('');}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;this.text='';}
  setAttribute(){}
  addEventListener(name,handler){this.listeners[name]=handler;}
 }
 const nodes={};
 for(const id of ['dudu-fun-content-v43','dudu-fun-header-balance','dudu-fun-launch-v43'])
  nodes[id]=new Node('div');
 let towerRenders=0;
 const context={document:{createElement:tag=>new Node(tag),getElementById:id=>nodes[id]||null},
  currentUsername:'du',userProfile:{currency:88},IS_SANDBOX_MODE:false,
  DuduAuth:{isReady:()=>true,uid:()=> 'du'},
  DuduFunRulesV43:{norm:()=>({rounds:{box:null,ticket:null},history:[]})},
  DuduEconomyCoreV43:{localDay:()=> '2026-11-02'},
  DuduPersonalFunC25:{utcDay:()=> '2026-11-02'},
  DuduFunLiveBridgeC25:{uid:()=> 'du',ready:()=>true,load:async()=>({state:{}})},
  DuduFateTowerUIV1:{render:(host,{uid})=>{
   assert.equal(uid,'du');assert.equal(host.tag,'section');towerRenders++;}}
 };
 context.window=context;
 vm.runInNewContext(src('js/dudu-fun-ui-v43.js'),context);
 context.DuduFunUIV43.render();await new Promise(resolve=>setImmediate(resolve));
 const all=()=>{const visit=n=>[n,...n.children.flatMap(visit)];
  return visit(nodes['dudu-fun-content-v43']);};
 const tabs=all().filter(n=>n.tag==='button'&&n.className.startsWith('dudu-fun-tab'));
 assert.deepEqual(tabs.map(n=>n.textContent),['🎁 Vạn Bảo','🎟️ Vé Cào','🗼 Vận Mệnh']);
 tabs[2].listeners.click();
 assert.equal(towerRenders,1);
});
