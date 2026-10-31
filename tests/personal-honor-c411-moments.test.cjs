'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const honor=require('../js/personal-honor-c46.js');
const arcade=require('../js/personal-arcade-core-v1.js');

test('C4.11 canonical unlock moments cannot invent a milestone or duplicate one',()=>{
 const old=['jade-first','neon-25'];
 assert.equal(honor.unlockMoment(old,old),null);
 assert.equal(honor.unlockMoment([],['invalid-title','not-a-quest']),null);
 assert.equal(honor.unlockMoment(['jade-first'],['jade-first','read-one'],['Ngọc Phường']),null);
 const jade=honor.unlockMoment([],['jade-first']);
 assert.equal(jade.id,'jade-first');
 assert.equal(jade.title,'Tập Sự Thẩm Ngọc');
 assert.equal(jade.rarity,'rare','A common task can unlock a rare title');
 assert.equal(jade.icon,'玉');
 const mythic=honor.unlockMoment(['jade-first'],['jade-first','garden-dragon','garden-one']);
 assert.equal(mythic.id,'garden-dragon');
 assert.equal(mythic.rarity,'mythic');
 assert.equal(mythic.name,'Huyền Thoại Hồ Sương');
 assert.equal(mythic.count,2);
 assert.deepEqual(mythic.ids,['garden-one','garden-dragon']);
 assert.equal(honor.unlockMoment(mythic.ids,mythic.ids),null);
});

class Node{
 constructor(tag){this.tag=tag;this.children=[];this.style={display:'flex'};
  this.dataset={};this.className='';this.textContent='';this.attributes={};this.parentNode=null;}
 append(...children){for(const child of children){this.children.push(child);child.parentNode=this;}}
 replaceChildren(...children){this.children=children;}
 setAttribute(key,value){this.attributes[key]=value;}
 remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;}}
}
function harness(){
 const phone=new Node('div'),store=new Map(),timers=[],alerts=[];
 const document={getElementById:id=>id==='cyber-phone'?phone:null,
  createElement:tag=>new Node(tag)};
 const window={document,DuduPersonalHonorC46:honor,DuduPersonalArcadeCoreV1:arcade,
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  setTimeout:(fn,ms)=>{const timer={fn,ms};timers.push(timer);return timer;},
  clearTimeout:timer=>{timer.cancelled=true;},
  showSystemAlert:(...args)=>alerts.push(args)};
 const ctx={window,document,IS_SANDBOX_MODE:true,currentUsername:'test-one',
  userProfile:{currency:21,exp:15,title:'Thực Thể Ký Tự',honorV1:{earned:[],equipped:'entity',pinned:[]}}};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-honor-ui-c46.js'),'utf8'),ctx);
 return {window,ctx,phone,timers,alerts,store};
}
const flatten=node=>[node,...node.children.flatMap(flatten)];
const textOf=node=>flatten(node).map(x=>x.textContent).join(' ');
const toast=phone=>phone.children.find(x=>x.className==='dudu-c411-unlock-toast');

test('C4.11 all four Arcade games reveal newly earned titles with one non-blocking plaque',()=>{
 const x=harness(),api=x.window.DuduHonorUIV46;
 const cases=[
  {mutate:s=>{s.neon.guestsServed=25;},name:'Chủ Tiệm Neon',rarity:'rare'},
  {mutate:s=>{s.mine.dug=40;},name:'Thợ Đào Mạch',rarity:'rare'},
  {mutate:s=>{s.garden.fishAlbum.dragon=1;},name:'Huyền Thoại Hồ Sương',rarity:'mythic'},
  {mutate:s=>{s.jade.sold=1;},name:'Tập Sự Thẩm Ngọc',rarity:'rare'}
 ];
 let state=arcade.fresh(1000);
 api.observeArcade(state);
 assert.equal(toast(x.phone),undefined,'Loading previous progress must stay quiet');
 for(const {mutate,name,rarity} of cases){
  const previous=state;state=structuredClone(state);mutate(state);
  api.observeArcade(state,previous);
  const live=toast(x.phone);
  assert.ok(live,'A new achievement should reveal a plaque');
  assert.equal(live.dataset.rarity,rarity,name);
  assert.match(textOf(live),new RegExp(name));
  assert.equal(live.attributes.role,'status');
  assert.equal(live.attributes['aria-live'],'polite');
  assert.equal(x.phone.children.length,1,'The effects must never stack over game controls');
  assert.equal(x.ctx.userProfile.currency,21,'Honor effects never award Xu');
  assert.equal(x.ctx.userProfile.exp,15,'Honor effects never award EXP');
 }
 assert.equal(x.store.size,0,'Unlock animation does not write player data');
 assert.equal(x.alerts.length,0,'The visual does not trigger a second modal alert');
 const last=toast(x.phone);
 const prior=state;state=structuredClone(state);state.jade.sold=2;
 api.observeArcade(state,prior);
 assert.equal(toast(x.phone),last,'Ordinary gameplay must not replay an earned title');
 // Timeout clears only the currently displayed plaque.
 x.timers.at(-1).fn();assert.equal(toast(x.phone),undefined);
});

test('C4.11 changing the account clears the previous reveal and never leaks it',()=>{
 const x=harness(),api=x.window.DuduHonorUIV46;
 const start=arcade.fresh(1000),newState=structuredClone(start);
 newState.jade.sold=1;api.observeArcade(newState,start);
 assert.ok(toast(x.phone));
 x.ctx.currentUsername='second-reader';api.observeArcade(start);
 assert.equal(toast(x.phone),undefined);
 assert.equal(x.timers.at(-1).cancelled,true);
 assert.equal(x.ctx.userProfile.honorV1.equipped,'entity');
 api.observeArcade(newState,start);
 assert.equal(toast(x.phone)?.dataset.rarity,'rare','A new owner keeps separate local presentation state');
 x.phone.style.display='none';
 const more=structuredClone(newState);more.garden.fishAlbum.dragon=1;
 api.observeArcade(more,newState);
 assert.equal(toast(x.phone)?.dataset.rarity,undefined,'A closed phone never displays the new unlock');
});

test('C4.11 season replay does not celebrate an achievement already owned in the Honor ledger',()=>{
 const x=harness(),base=arcade.fresh(1000),next=structuredClone(base);
 x.ctx.userProfile.honorV1.earned=['jade-first'];
 next.jade.sold=1;
 x.window.DuduHonorUIV46.observeArcade(next,base);
 assert.equal(toast(x.phone),undefined,
  'New Arcade progress must not re-award an already collected cosmetic title');
});

test('C4.11 mobile reveal style is tiered, click-through and motion-safe',()=>{
 const css=readFileSync(join(__dirname,'../css/personal-honor-c46.css'),'utf8');
 const html=readFileSync(join(__dirname,'../index.html'),'utf8');
 const ui=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 assert.match(css,/\.dudu-c411-unlock-toast\{/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/dudu-c411-celebrating \.arcade-status-toast/);
 for(const rarity of ['rare','epic','mythic'])
  assert.match(css,new RegExp('dudu-c411-unlock-toast\\[data-rarity="'+rarity+'"\\]'));
 assert.match(css,/duduC411Reveal/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(css,/animation:none!important/);
 assert.match(ui,/customerServed\|\|time-lastSave>=5000/);
 assert.match(ui,/activeKey===keyFor\(identity\(\)\)/);
 assert.match(html,/personal-honor-c46\.css\?v=c412-1/);
 assert.match(html,/personal-honor-c46\.js\?v=c412-1/);
 assert.match(html,/personal-honor-ui-c46\.js\?v=c412-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=c417-1/);
});
