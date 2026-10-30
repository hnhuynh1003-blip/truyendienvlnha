'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const honor=require('../js/personal-honor-c46.js');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const C48_IDS=['neon-250','neon-revenue-500','neon-pro-setup','neon-crown',
 'mine-deep-ready','mine-burst-25','mine-scanner-3','mine-guardian',
 'garden-harvest-10','garden-harvest-30','garden-five-species','garden-sanctuary',
 'jade-cut-20','jade-album-12','jade-exhibit-10','jade-ruins-access','jade-masterwork'];

function completed(){
 const s=arcade.fresh(Date.parse('2026-10-30T12:00:00Z'));
 Object.assign(s.neon,{guestsServed:500,serviceRevenue:6000,cpu:5,router:3,cooling:3,
  roomTier:3,stations:7,contracts:[0,1,2],milestones:[0,1,2,3]});
 Object.assign(s.mine,{dug:600,lantern:3,bursts:25,scanner:3});
 for(const ore of Object.keys(s.mine.found))s.mine.found[ore]=1;
 Object.assign(s.garden,{harvests:30,pondTier:3,fish:10});
 for(const id of Object.keys(arcade.FISH_SPECIES).slice(0,5))s.garden.fishAlbum[id]=1;
 Object.assign(s.jade,{cut:25,sold:45,permit:true,carver:3,
  exhibits:Array.from({length:10},()=>({grade:2,color:1,size:5,craft:'bangle',site:0}))});
 for(let i=0;i<12;i++)s.jade.album[(1+Math.floor(i/8))+'-'+i%8]=1;
 return s;
}

test('C4.8 four Arcade journeys have stable collectible IDs, real progress and titles',()=>{
 const sourceSet=['Trạm Neon','Địa Tầng 07','Vườn Sương','Ngọc Phường'];
 assert.equal(honor.JOURNEYS.length,4);
 assert.equal(honor.CATALOG.length,44);
 assert.equal(honor.TITLES.length,20);
 assert.equal(new Set(honor.CATALOG.map(x=>x.id)).size,honor.CATALOG.length);
 assert.equal(new Set(honor.TITLES.map(x=>x.id)).size,honor.TITLES.length);
 const unique=new Set();
 for(const j of honor.JOURNEYS){
  assert.ok(sourceSet.includes(j.source));
  assert.equal(honor.TITLES.find(t=>t.id===j.titleId)?.source,j.source);
  for(const id of j.steps){
   assert.ok(!unique.has(id),'Journey steps cannot be duplicated: '+id);unique.add(id);
   const achievement=honor.CATALOG.find(a=>a.id===id);
   assert.equal(achievement?.source,j.source,id);
   assert.ok(achievement?.target>0,id);
  }
 }
 assert.deepEqual([...unique].sort(),[...C48_IDS].sort());
 for(const title of honor.TITLES.filter(x=>x.id!=='entity'))
  assert.ok(honor.CATALOG.some(a=>a.titleId===title.id),title.id);
});

test('C4.8 incomplete journeys do not invent completed achievements or rewards',()=>{
 const v=honor.view({},arcade.fresh());
 assert.ok(C48_IDS.every(id=>!v.earned.includes(id)));
 assert.ok(v.journeys.every(j=>j.done===0&&j.next?.current<j.next?.target));
 const profile={honorV1:{version:1,earned:['neon-25'],equipped:'neon-owner',pinned:['neon-25']},
  currency:91,exp:19};
 const old=honor.view(profile,arcade.fresh());
 assert.equal(old.equipped,'neon-owner');
 assert.deepEqual(old.pinned,['neon-25']);
 assert.equal(old.earned.includes('neon-25'),true);
 assert.equal(profile.currency,91);
});

test('C4.8 all journey milestones are reachable and remain unlocked after Arcade normalization',()=>{
 const s=completed();
 const v=honor.view({},arcade.norm(s,s.lastAt));
 for(const id of C48_IDS)assert.equal(v.achievements.find(x=>x.id===id).unlocked,true,id);
 assert.ok(v.journeys.every(j=>j.done===j.total&&j.next===null));
 for(const titleId of ['neon-emperor','mine-lord','garden-keeper','jade-artisan'])
  assert.equal(v.titles.find(t=>t.id===titleId).unlocked,true,titleId);
 for(const journey of v.journeys)assert.equal(journey.title.unlocked,true);
 assert.equal(jade.unlocked(s.jade,4),true);
});

test('C4.8 composite milestones require every condition and show partial progress',()=>{
 const cases=[
  ['neon-crown',a=>{a.neon.milestones=[0,1,2];},3,4],
  ['mine-guardian',a=>{a.mine.scanner=2;},3,4],
  ['garden-sanctuary',a=>{a.garden.pondTier=2;},2,3],
  ['jade-masterwork',a=>{a.jade.carver=2;},2,3],
  ['jade-ruins-access',a=>{a.jade.permit=false;},1,2]
 ];
 for(const [id,mutate,current,target] of cases){
  const s=completed();mutate(s);
  const achievement=honor.view({},s).achievements.find(x=>x.id===id);
  assert.equal(achievement.unlocked,false,id);
  assert.equal(achievement.current,current,id);
  assert.equal(achievement.target,target,id);
 }
});

test('C4.8 phone journeys filter by game and paginate the growing Hall',()=>{
 class Node{
  constructor(tag){this.tag=tag;this.dataset={};this.style={};this.children=[];
   this.className='';this.textContent='';this.listeners={};}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(k,v){this[k]=v;}
  addEventListener(k,cb){this.listeners[k]=cb;}
 }
 const nodes=new Map(['dudu-honor-content-c46','dudu-honor-home-title',
  'dudu-honor-home-title-label','dudu-honor-home-rarity'].map(id=>[id,new Node('div')]));
 const doc={getElementById:id=>nodes.get(id),createElement:tag=>new Node(tag)};
 const root={document:doc,DuduPersonalHonorC46:honor,DuduPersonalArcadeCoreV1:arcade,
  localStorage:{getItem:()=>null},DuduAuth:{uid:()=>null,isReady:()=>false}};
 const ctx={window:root,document:doc,IS_SANDBOX_MODE:true,currentUsername:'tester',
  userProfile:{honorV1:{earned:[],equipped:'entity',pinned:[]}}};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-honor-ui-c46.js'),'utf8'),ctx);
 const flatten=node=>[node,...node.children.flatMap(flatten)];
 const host=nodes.get('dudu-honor-content-c46');
 const click=button=>{assert.ok(button);assert.equal(typeof button.listeners.click,'function');button.listeners.click();};
 assert.equal(root.DuduHonorUIV46.render(),true);
 assert.equal(flatten(host).filter(n=>n.className.includes('dudu-honor-title-card')).length,8);
 click(flatten(host).find(n=>n.tag==='button'&&n.textContent.startsWith('Xem thêm')));
 assert.equal(flatten(host).filter(n=>n.className.includes('dudu-honor-title-card')).length,16);
 click(flatten(host).find(n=>n.tag==='button'&&n.textContent==='Thử thách'));
 assert.equal(flatten(host).filter(n=>n.className.split(' ').includes('dudu-honor-journey')).length,4);
 const journeyButton=flatten(host).find(n=>n.className==='dudu-honor-journey-open');
 click(journeyButton);
 assert.equal(flatten(host).filter(n=>n.className.includes('dudu-honor-achievement')).length,8);
 assert.ok(flatten(host).some(n=>n.tag==='button'&&n.textContent==='Trạm Neon'&&n['aria-pressed']==='true'));
 assert.equal(root.DuduHonorUIV46.openGame('Ngọc Phường'),true);
 assert.equal(flatten(host).filter(n=>n.className.split(' ').includes('dudu-honor-journey')).length,1);
 click(flatten(host).find(n=>n.tag==='button'&&n.textContent==='← Xem cả 4 hành trình'));
 assert.equal(flatten(host).filter(n=>n.className.split(' ').includes('dudu-honor-journey')).length,4);
 assert.equal(root.DuduHonorUIV46.openGame('Không tồn tại'),false);
 const html=readFileSync(join(__dirname,'../index.html'),'utf8');
 assert.match(html,/personal-honor-c46\.js\?v=c48-1/);
 assert.match(html,/personal-honor-ui-c46\.js\?v=c48-1/);
 assert.match(html,/personal-honor-c46\.css\?v=c48-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=c410-1/);
});
