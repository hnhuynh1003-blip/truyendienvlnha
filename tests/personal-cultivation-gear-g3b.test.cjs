const {test}=require('node:test'),assert=require('node:assert/strict');
const g=require('../js/personal-cultivation-gear-g3b.js'),model=require('../js/inventory-model-v42.js');
const base=()=>({currency:200,level:3,exp:12,inventory:[],storyStates:{other:{safe:true}}});
const id='g3-gear-sword',apply=(d,r)=>({...d,...r.patch});
test('G3B purchase debits same wallet once, adds protected unique item, preserves other state and EXP',()=>{
 const d=base(),first=g.plan(d,{kind:'purchase',itemId:id,now:1}),after=apply(d,first);
 assert.equal(after.currency,180);assert.equal(after.inventory.length,1);assert.equal(after.exp,12);
 assert.equal(after.storyStates.other.safe,true);assert.ok(g.productFor(after.inventory[0]));
 assert.equal(model.inspect(after.inventory[0]).category,'EQUIPMENT');assert.equal(model.inspect(after.inventory[0]).protected,true);
 assert.equal(g.plan(after,{kind:'purchase',itemId:id}).patch,null);
 assert.equal(g.snapshot(after).slots[0].item,null);
});
test('G3B equip/remove only writes storyStates; locks and ownership enforced',()=>{
 const d=base();assert.throws(()=>g.plan(d,{kind:'equip',itemId:id}),/Chưa sở hữu/);
 assert.throws(()=>g.plan(d,{kind:'purchase',itemId:'g3-gear-necklace'}),/chưa mở/);
 const a=apply(d,g.plan(d,{kind:'purchase',itemId:id,now:1}));
 const equip=g.plan(a,{kind:'equip',itemId:id});assert.deepEqual(Object.keys(equip.patch),['storyStates']);
 const b=apply(a,equip);assert.equal(g.snapshot(b).slots[0].item.id,id);assert.equal(g.snapshot(b).power,null);
 const c=apply(b,g.plan(b,{kind:'remove',itemId:id}));assert.equal(g.snapshot(c).slots[0].item,null);assert.equal(c.inventory,a.inventory);assert.equal(c.currency,180);
});
test('G3B insufficient coins, full inventory, invalid/duplicate ownership fail closed',()=>{
 assert.throws(()=>g.plan({...base(),currency:19},{kind:'purchase',itemId:id}),/Không đủ/);
 assert.throws(()=>g.plan({...base(),inventory:Array(500).fill({id:'other'})},{kind:'purchase',itemId:id}),/Kho đã đầy/);
 const d=apply(base(),g.plan(base(),{kind:'purchase',itemId:id,now:1}));
 assert.throws(()=>g.plan({...d,inventory:[]},{kind:'purchase',itemId:id}),/không đồng nhất/);
 assert.throws(()=>g.plan({...d,inventory:[...d.inventory,...d.inventory]},{kind:'equip',itemId:id}),/không đồng nhất/);
});
test('G3B transaction uses existing profile, session fence and duplicate purchase no extra debit',async()=>{
 let data=base(),writes=0,active=true;const auth={currentUser:{uid:'reader'}};
 const db={collection(name){assert.equal(name,'profiles_v2');return {doc(uid){assert.equal(uid,'reader');return {};}};},
 async runTransaction(fn){return fn({get:async()=>({exists:true,data:()=>data}),update(ref,patch){writes++;data={...data,...patch};}});}};
 const args={db,auth,uid:'reader',isCurrent:()=>active,kind:'purchase',itemId:id,now:1};
 await g.run(args);await g.run(args);assert.equal(writes,1);assert.equal(data.currency,180);
 active=false;await assert.rejects(g.run(args),/Phiên/);assert.equal(writes,1);
});
test('G3B purchase and equip cannot sell/use through existing personal shop engine',()=>{
 const engine=require('../js/personal-spark-items-v1.js'),d=apply(base(),g.plan(base(),{kind:'purchase',itemId:id,now:1}));
 assert.equal(engine.sellPrice(d.inventory[0]),0);assert.equal(engine.canUse(d.inventory[0]),false);
});
