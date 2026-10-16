const {test}=require('node:test');
const assert=require('node:assert/strict');
const bond=require('../js/npc-bond-v43.js');
test('V43.4: only a confirmed interaction counts once per UTC day per NPC',()=>{
 let saved=bond.empty();
 assert.equal(bond.record(saved,{type:'script',day:'2026-10-17'}).ok,false);
 assert.equal(bond.record(saved,{type:'chat-input',day:'2026-10-17'}).ok,false);
 const first=bond.record(saved,{type:'checkin',day:'2026-10-17'});
 assert.equal(first.ok,true);
 assert.equal(first.state.current,1);
 assert.equal(first.state.totalDays,1);
 saved=first.state;
 const extra=bond.record(saved,{type:'gift',day:'2026-10-17'});
 assert.equal(extra.ok,false);assert.equal(extra.reason,'already-today');
 assert.deepEqual(saved,first.state,'pure helper never mutates prior save');
 assert.equal(bond.record(saved,{type:'conversation',day:'2026-10-16'}).ok,false);
 assert.equal(bond.record(saved,{type:'conversation',day:'2026-10-18'}).state.current,2);
});
test('V43.4: milestones are purely local records; missing a day does not lock a NPC',()=>{
 let s=bond.empty();
 for(const date of ['2026-10-14','2026-10-15','2026-10-16']){
  const result=bond.record(s,{type:'checkin',day:date});
  if(date==='2026-10-16')assert.deepEqual(result.milestones,[3]);
  s=result.state;
 }
 assert.equal(bond.shownCurrent(s,'2026-10-17'),3);
 assert.equal(bond.shownCurrent(s,'2026-10-18'),0);
 const missed=bond.record(s,{type:'gift',day:'2026-10-19'});
 assert.equal(missed.state.current,1);
 assert.equal(missed.state.best,3);
 assert.equal(missed.state.totalDays,4);
 assert.deepEqual(missed.milestones,[]);
 assert.equal(bond.record(missed.state,{type:'checkin',day:'2026-10-20'}).state.current,2);
});
test('V43.4: favorite selection never mutates a bond or requires multiple NPCs',()=>{
 const unlocked=['a','b'],s={...bond.empty(),current:8,best:8};
 assert.deepEqual(bond.favoriteChoice('a','a',unlocked),{ok:true,selected:''});
 assert.deepEqual(bond.favoriteChoice('a','b',unlocked),{ok:true,selected:'b'});
 assert.deepEqual(bond.favoriteChoice('b','c',unlocked),{ok:false,selected:'b'});
 assert.equal(s.current,8);
});
test('V43.4: invalid data is bounded and legacy saves remain accepted',()=>{
 assert.deepEqual(bond.norm(undefined),bond.empty());
 assert.deepEqual(bond.norm({version:123,current:900}),bond.empty());
 assert.equal(bond.record({}, {type:'checkin',day:'2026-02-30'}).ok,false);
 assert.equal(bond.record({}, {type:'checkin',day:'2026-10-17'}).ok,true);
 assert.equal(bond.utcDay(NaN),'');
 assert.equal(bond.utcDay(Date.UTC(2026,9,17,23,59,59)),'2026-10-17');
 assert.equal(bond.norm({version:1,lastDay:'2026-10-10',current:Infinity,best:-3}).current,0);
});
