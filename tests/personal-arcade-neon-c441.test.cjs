'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const arcade=require('../js/personal-arcade-core-v1.js');
const events=require('../js/personal-arcade-neon-c441.js');
const TIME=1793510000000;
const act=(state,action,time=TIME)=>arcade.act(state,action,time);
const snapshot=state=>JSON.parse(JSON.stringify(state));

function equipped(){
 const state=arcade.fresh(TIME);
 state.coins=80000;
 Object.assign(state.neon,{roomTier:3,stations:6,seating:4,ambiance:4,
  skin:1,router:3,cooling:4,cpu:10});
 return state;
}
function serve(state,time){
 const choices=arcade.neonOrderPattern(state.neon);
 const first=act(state,'neon-order-'+choices[0],time);
 assert.equal(first.ok,true);
 const finished=act(first.state,'neon-order-'+choices[1],time);
 assert.equal(finished.ok,true);
 return finished.state;
}
function serveMany(state,amount,firstAt){
 for(let i=0;i<amount;i++)state=serve(state,firstAt+i*arcade.NEON_ORDER_COOLDOWN);
 return state;
}

test('C4.41A starts with three guest stories, no earned title, and migrates an older local save',()=>{
 assert.equal(arcade.NEON_EVENTS,events);
 assert.equal(events.CONTRACTS.length,3);
 const first=arcade.fresh(TIME);
 assert.deepEqual(first.neon.program,events.fresh());
 const old=snapshot(first);
 delete old.neon.program;
 old.coins=12120;old.earned=27000;
 old.neon.contracts=[0,2];old.neon.milestones=[0,1,3];
 const normalized=arcade.norm(old,TIME);
 assert.deepEqual(normalized.neon.program,events.fresh());
 assert.equal(normalized.coins,12120);
 assert.equal(normalized.earned,27000);
 assert.deepEqual(normalized.neon.contracts,[0,2]);
 assert.deepEqual(normalized.neon.milestones,[0,1,3]);
 assert.deepEqual(arcade.norm(snapshot(normalized),TIME),normalized);
});

test('C4.41A choices require facilities, previous contract, and one Arcade Xu investment',()=>{
 let state=arcade.fresh(TIME);state.coins=80000;
 assert.equal(act(state,'neon-event-pick-0').ok,false,'A guest must be selected');
 state=act(state,'neon-event-open-0').state;
 const locked=act(state,'neon-event-pick-0');
 assert.equal(locked.ok,false,'Starter venue needs two stations and seating');
 assert.equal(locked.state.coins,80000);
 const future=act(state,'neon-event-open-2');
 assert.equal(future.ok,true,'A locked event can be previewed');
 assert.equal(act(future.state,'neon-event-pick-0').ok,false,
  'Later guests need prior guest mementos');

 state=equipped();
 state=act(state,'neon-event-open-0').state;
 const started=act(state,'neon-event-pick-1');
 assert.equal(started.ok,true);
 assert.equal(started.state.coins,79600,'400 tenths of Arcade Xu spent once');
 assert.equal(started.state.neon.program.active.choice,'speed');
 assert.equal(started.state.neon.program.active.streak,0);
 assert.equal(act(started.state,'neon-event-pick-1').ok,false,
  'Cannot pay twice or overlap events');
 assert.equal(act(started.state,'neon-event-open-1').ok,false);
 assert.equal(act(started.state,'neon-event-back').ok,false);
 assert.equal(act(started.state,'neon-event-claim').ok,false);
});

test('C4.41A guest combo counts only orders after investing, and mistakes break it',()=>{
 let state=equipped();
 state=serveMany(state,5,TIME);
 assert.equal(state.neon.orderStreak,5,'Pre-existing combo is high');
 const investedAt=TIME+5*arcade.NEON_ORDER_COOLDOWN;
 state=act(state,'neon-event-open-0',investedAt).state;
 state=act(state,'neon-event-pick-1',investedAt).state;
 assert.equal(events.progress(state.neon).streak,0,
  'Pre-investment combo must not satisfy a new guest challenge');
 state=serveMany(state,2,investedAt);
 let status=events.progress(state.neon);
 assert.equal(status.orders,2);assert.equal(status.streak,2);
 const mistakeAt=investedAt+2*arcade.NEON_ORDER_COOLDOWN;
 const expected=arcade.neonOrderPattern(state.neon)[0];
 const miss=act(state,'neon-order-'+((expected+1)%3),mistakeAt);
 assert.equal(miss.ok,true);
 state=miss.state;
 status=events.progress(state.neon);
 assert.equal(status.orders,2);assert.equal(status.streak,0);
 assert.equal(act(state,'neon-event-claim',mistakeAt).ok,false);
 state=serveMany(state,3,mistakeAt+30000);
 status=events.progress(state.neon);
 assert.equal(status.orders,5);assert.equal(status.streak,3);
 assert.equal(status.ready,true);
 const before=state.coins,oldSeason=snapshot(state.season);
 const completed=act(state,'neon-event-claim',state.lastAt);
 assert.equal(completed.ok,true);
 assert.equal(completed.state.coins,before,'Memento claim mints no Xu');
 assert.deepEqual(completed.state.season,oldSeason,'Does not grant a season souvenir');
 assert.deepEqual(completed.state.neon.program.done.map(record=>record.id),['vip']);
 assert.equal(completed.state.neon.program.active,null);
 assert.equal(act(completed.state,'neon-event-claim',state.lastAt).ok,false);
 assert.equal(act(completed.state,'neon-event-open-0',state.lastAt).ok,false);
});

test('C4.41A all three guest events are sequential and withstand save/reload mid-event',()=>{
 let state=equipped(),time=TIME;
 const sequence=[{index:0,choice:0,orders:5},
  {index:1,choice:0,orders:8},{index:2,choice:0,orders:12}];
 for(const guest of sequence){
  state=act(state,'neon-event-open-'+guest.index,time).state;
  const invest=act(state,'neon-event-pick-'+guest.choice,time);
  assert.equal(invest.ok,true,events.CONTRACTS[guest.index].name);
  state=invest.state;
  state=serveMany(state,Math.floor(guest.orders/2),time);
  time+=Math.floor(guest.orders/2)*arcade.NEON_ORDER_COOLDOWN;
  state=arcade.norm(snapshot(state),time);
  assert.equal(state.neon.program.active.id,events.CONTRACTS[guest.index].id);
  state=serveMany(state,guest.orders-Math.floor(guest.orders/2),time);
  time+=(guest.orders-Math.floor(guest.orders/2))*arcade.NEON_ORDER_COOLDOWN;
  assert.equal(events.progress(state.neon).ready,true);
  const claimed=act(state,'neon-event-claim',time);
  assert.equal(claimed.ok,true);
  state=arcade.norm(snapshot(claimed.state),time);
  assert.equal(state.neon.program.done.length,guest.index+1);
 }
 assert.deepEqual(state.neon.program.done.map(x=>x.id),['vip','esport','archive']);
 assert.deepEqual(state.neon.contracts,[],
  'Original Neon contracts are not replaced by guest activities');
 assert.deepEqual(state.neon.milestones,[],
  'Original achievements are unchanged by mementos');
 assert.equal(state.neon.program.active,null);
});

test('C4.41A phone UI assets are wired, remain local-only, and show a guest drawer',()=>{
 const root=join(__dirname,'..');
 const index=readFileSync(join(root,'index.html'),'utf8');
 const ui=readFileSync(join(root,'js/personal-arcade-ui-v1.js'),'utf8');
 const css=readFileSync(join(root,'css/arcade-neon-c441.css'),'utf8');
 const game=readFileSync(join(root,'js/personal-arcade-neon-c441.js'),'utf8');
 assert.match(index,/css\/arcade-neon-c441\.css\?v=c441a-1/);
 const moduleIndex=index.indexOf('js/personal-arcade-neon-c441.js');
 assert.ok(moduleIndex>=0&&moduleIndex<index.indexOf('js/personal-arcade-core-v1.js'),
  'New game logic must load before Arcade core');
 assert.match(index,/personal-arcade-ui-v1\.js\?[^"\n]*neon=c441a-1/);
 assert.match(ui,/data-arcade-panel="neon-events"/);
 assert.match(ui,/drawerButton\('Khách VIP'/);
 assert.match(ui,/Đây chưa phải thưởng mùa hoặc danh hiệu xác minh máy chủ/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.arcade-world-neon \.neon-events-panel\{display:none\}/);
 assert.doesNotMatch(game,/firebase\.|firestore\(|localStorage|transfer\(/i);
});
