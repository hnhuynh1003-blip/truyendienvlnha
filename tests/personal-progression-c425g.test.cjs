'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const honor=require('../js/personal-honor-c46.js');
const arcade=require('../js/personal-arcade-core-v1.js');
const quests=require('../js/quest-engine-v43-7.js');
const path=source=>readFileSync(join(__dirname,'..',source),'utf8');

class Node{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};
  this.className='';this.textContent='';this.listeners={};this.disabled=false;}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 setAttribute(key,value){this[key]=value;}
 addEventListener(key,fn){this.listeners[key]=fn;}
}
const flatten=node=>[node,...node.children.flatMap(flatten)];

test('C4.25G task journal preserves claim by ID and only expands directions on demand',()=>{
 const host=new Node('div');host.classList={add:()=>{}};
 const elements=new Map();const events=[];
 const root={DuduQuestEngineV437:quests,document:{getElementById:id=>elements.get(id)||null,
  createElement:tag=>new Node(tag)}};
 vm.runInNewContext(path('js/quest-ui-v43-7.js'),{window:root,document:root.document});
 const fixture=quests.DEFINITIONS.find(q=>q.type==='DAILY');
 const task={...fixture,current:fixture.target,target:fixture.target,claimed:false};
 assert.equal(root.DuduQuestUIV437.render({host,quests:[task],questState:{},signed:true,
  onClaim:id=>events.push(id)}),true);
 const content=flatten(host);
 assert.ok(content.some(n=>n.className.includes('dudu-v437-quest-summary')));
 assert.ok(content.some(n=>n.tag==='details'&&n.className==='dudu-v437-details'));
 const action=content.find(n=>n.className==='dudu-v437-claim');
 assert.ok(action,'reward action stays available without expanding directions');
 action.listeners.click();assert.deepEqual(events,[task.id]);
 const active=content.filter(n=>n.className.includes('dudu-v437-tab is-active'));
 assert.equal(active.length,1);
 assert.equal(active[0].textContent,'Ngày','daily tasks open first, not a giant all-tasks feed');
});

test('C4.25G honor bridge opens the Season 01 passport without awarding collectibles',()=>{
 const host=new Node('div'),nodes=new Map([['dudu-honor-content-c46',host]]);
 const localState=new Map();let openings=0;
 const root={document:{getElementById:id=>nodes.get(id),createElement:tag=>new Node(tag)},
  DuduPersonalHonorC46:honor,DuduPersonalArcadeCoreV1:arcade,
  DuduPersonalArcadeUIV1:{openSeason:()=>{openings++;return true;}},
  localStorage:{getItem:key=>localState.get(key)||null,setItem:(key,value)=>localState.set(key,value)},
  DuduAuth:{uid:()=>null,isReady:()=>false}};
 const context={window:root,currentUsername:'du',IS_SANDBOX_MODE:true,
  userProfile:{honorV1:{version:1,earned:[],equipped:'entity',pinned:[]}}};
 vm.runInNewContext(path('js/personal-honor-ui-c46.js'),context);
 root.DuduHonorUIV46.render();
 const nodesAll=flatten(host);
 const bridge=nodesAll.find(n=>n.className==='dudu-honor-season-bridge');
 const action=nodesAll.find(n=>n.className==='dudu-honor-season-open');
 assert.ok(bridge);assert.ok(action);
 assert.equal(nodesAll.some(n=>n.textContent.includes('MÙA 01 · CHƯA MỞ')),true);
 action.listeners.click();assert.equal(openings,1);
 assert.equal(localState.size,0,'preview badge is never recorded or rewarded');
 assert.equal(arcade.seasonGame.PHASE,'preview');
 assert.equal(honor.TITLES.some(t=>t.name==='Người Khai Mùa'),false);
 assert.equal(honor.CATALOG.some(t=>t.name.includes('Ấn Khai Nguyên')),false);
});

test('C4.25G compact mobile stylesheet and cache paths load after previous styling',()=>{
 const html=path('index.html'),css=path('css/arcade-c425g-progression.css');
 assert.match(html,/css\/arcade-c425g-progression\.css\?v=c425g-1/);
 assert.ok(html.indexOf('arcade-c425g-progression.css')>html.indexOf('dudu-system-app-v69.css'));
 for(const source of ['personal-honor-ui-c46.js','quest-ui-v43-7.js',
  'personal-arcade-ui-v1.js'])assert.match(html,
   new RegExp(source.replaceAll('.','\\.')+'[^"\\n]*progression=c425g-1'));
 for(const className of ['dudu-v437-quest-summary','dudu-honor-season-crest',
  'dudu-honor-ach-detail','dudu-honor-tabs'])assert.ok(css.includes(className));
 assert.match(css,/s01-founder-crest\.webp/);
 assert.match(path('js/personal-arcade-ui-v1.js'),/function openSeason\(\)/);
});
