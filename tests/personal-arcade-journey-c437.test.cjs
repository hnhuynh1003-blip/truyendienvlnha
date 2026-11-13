'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const tracker=require('../js/personal-arcade-journey-c437.js');
const honor=require('../js/personal-honor-c46.js');
const arcade=require('../js/personal-arcade-core-v1.js');

const storage=()=>{
 const map=new Map();return {map,getItem:key=>map.get(key)||null,
  setItem:(key,value)=>map.set(key,value)};
};
test('C4.37 accepts exactly three distinct journeys and permits replacing one',()=>{
 const owner='uid:du',initial=tracker.fresh(owner);
 assert.deepEqual(initial.tracked,[]);
 let state=initial;
 for(const id of ['neon','mine','garden']){
  const result=tracker.toggle(state,id);assert.equal(result.ok,true);state=result.state;
 }
 assert.deepEqual(state.tracked,['neon','mine','garden']);
 const fourth=tracker.toggle(state,'jade');
 assert.equal(fourth.ok,false);assert.equal(fourth.reason,'full');
 assert.deepEqual(fourth.state.tracked,state.tracked);
 state=tracker.toggle(state,'mine').state;
 state=tracker.toggle(state,'jade').state;
 assert.deepEqual(state.tracked,['neon','garden','jade']);
 assert.equal(tracker.toggle(state,'nonexistent').ok,false);
});

test('C4.37 isolates Sandbox and Firebase owners and handles corrupt or old saves',()=>{
 const store=storage();
 const ownerA='sandbox:An Du',ownerB='uid:An Du';
 const a=tracker.toggle(tracker.fresh(ownerA),'garden').state;
 assert.equal(tracker.save(store,ownerA,a),true);
 assert.deepEqual(tracker.read(store,ownerA).tracked,['garden']);
 assert.deepEqual(tracker.read(store,ownerB).tracked,[]);
 assert.equal(tracker.save(store,ownerB,a),false);
 store.setItem(tracker.keyFor(ownerA),'not-json');
 assert.deepEqual(tracker.read(store,ownerA).tracked,[]);
 store.setItem(tracker.keyFor(ownerB),JSON.stringify({version:1,owner:ownerA,tracked:['jade']}));
 assert.deepEqual(tracker.read(store,ownerB).tracked,[]);
 store.setItem(tracker.keyFor(ownerB),JSON.stringify({version:1,owner:ownerB,
  tracked:['jade','jade','mine','garden','neon','made-up']}));
 assert.deepEqual(tracker.read(store,ownerB).tracked,['jade','mine','garden']);
 assert.equal(tracker.keyFor(''),null);
 assert.equal(tracker.save({setItem(){throw Error('quota')}},ownerA,a),false);
});

test('C4.37 phone board tracks real journey progress without editing achievements or rewards',()=>{
 class Node{
  constructor(tag){this.tag=tag;this.className='';this.dataset={};this.style={};
   this.children=[];this.textContent='';this.listeners={};this.disabled=false;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(k,v){this[k]=v;}
  addEventListener(k,cb){this.listeners[k]=cb;}
 }
 const nodes=new Map(['dudu-honor-content-c46','dudu-honor-home-title'].map(id=>[id,new Node('div')]));
 const doc={getElementById:id=>nodes.get(id),createElement:tag=>new Node(tag)};
 const store=storage(),opened=[];
 const root={document:doc,DuduPersonalHonorC46:honor,DuduPersonalArcadeCoreV1:arcade,
  DuduArcadeJourneyC437:tracker,localStorage:store,
  DuduPersonalArcadeUIV1:{openGame:id=>{opened.push(id);return true;}},
  DuduAuth:{uid:()=>null,isReady:()=>false}};
 const profile={honorV1:{earned:[],equipped:'entity',pinned:[]},currency:100};
 const ctx={window:root,document:doc,IS_SANDBOX_MODE:true,currentUsername:'first',userProfile:profile};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-honor-ui-c46.js'),'utf8'),ctx);
 const all=node=>[node,...node.children.flatMap(all)];
 const host=nodes.get('dudu-honor-content-c46');
 const nodeWith=(cls,text)=>all(host).find(n=>n.className.split(' ').includes(cls)&&
  (text===undefined||n.textContent===text));
 const click=n=>{assert.ok(n);assert.equal(typeof n.listeners.click,'function');n.listeners.click();};
 root.DuduHonorUIV46.render();
 click(all(host).find(n=>n.tag==='button'&&n.textContent==='Thử thách'));
 assert.ok(nodeWith('dudu-c437-board'));
 assert.equal(all(host).filter(n=>n.className.split(' ').includes('dudu-c437-focus')).length,0);
 for(let i=0;i<3;i++)click(nodeWith('dudu-c437-follow','☆ Theo dõi'));
 assert.equal(all(host).filter(n=>n.className.split(' ').includes('dudu-c437-focus')).length,3);
 assert.deepEqual(tracker.read(store,'sandbox:first').tracked,['neon','mine','garden']);
 click(nodeWith('dudu-c437-follow','☆ Theo dõi'));
 assert.deepEqual(tracker.read(store,'sandbox:first').tracked,['neon','mine','garden']);
 assert.ok(nodeWith('dudu-c437-message'));
 click(nodeWith('dudu-c437-focus-remove','Bỏ ghim'));
 click(nodeWith('dudu-c437-follow','☆ Theo dõi'));
 assert.deepEqual(tracker.read(store,'sandbox:first').tracked,['mine','garden','neon']);
 click(nodeWith('dudu-c437-focus-play','Vào game ›'));
 assert.deepEqual(opened,['mine']);
 assert.equal(profile.currency,100);
 assert.deepEqual(profile.honorV1.earned,[]);
 ctx.currentUsername='second';root.DuduHonorUIV46.render();
 assert.equal(all(host).filter(n=>n.className.split(' ').includes('dudu-c437-focus')).length,0);
 assert.deepEqual(tracker.read(store,'sandbox:first').tracked,['mine','garden','neon']);
});

test('C4.37 is wired into main without a new Firestore profile field',()=>{
 const html=readFileSync(join(__dirname,'../index.html'),'utf8');
 const honorUI=readFileSync(join(__dirname,'../js/personal-honor-ui-c46.js'),'utf8');
 const arcadeUI=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 assert.match(html,/js\/personal-arcade-journey-c437\.js\?v=c437-1/);
 assert.match(html,/css\/arcade-journey-c437\.css\?v=c437-1/);
 assert.ok(html.indexOf('js/personal-arcade-journey-c437.js')<
  html.indexOf('js/personal-honor-ui-c46.js'));
 assert.match(honorUI,/journeyTracker\.save\(root\.localStorage/);
 assert.match(arcadeUI,/function openGame\(gameId\)/);
 assert.doesNotMatch(honorUI,/journeyTracker\.(?:grant|claim|transact)/);
});
