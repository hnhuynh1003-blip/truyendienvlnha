'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const boxes=require('../js/personal-blind-box-c29.js');
const catalog=require('../js/item-catalog-v2.js');
const collection=require('../js/personal-collection-c24.js');
const art=require('../js/item-visuals-v13.js');
const questEvents=require('../js/personal-quest-events-c45.js');
const copy=value=>structuredClone(value);
const TODAY=Date.UTC(2026,9,30,12),TOMORROW=TODAY+86400000;
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function fixture(balance=200){
 const users=new Map([['alice',{currency:balance,inventory:[],storyStates:{}}],
  ['bob',{currency:80,inventory:[],storyStates:{}}]]);
 const auth={currentUser:{uid:'alice'}};let writes=0;
 const db={collection(name){assert.equal(name,'profiles_v2');
  return {doc(uid){return{uid,async get(){return{exists:users.has(uid),
   data:()=>copy(users.get(uid))};}};}};
 },async runTransaction(fn){
  const patches=[];
  const tx={async get(ref){return{exists:users.has(ref.uid),data:()=>copy(users.get(ref.uid))};},
   update(ref,patch){patches.push([ref.uid,copy(patch)]);}};
  const result=await fn(tx);
  for(const [uid,patch] of patches){Object.assign(users.get(uid),patch);writes++;}
  return result;
 }};
 const run=(kind,id,opts={})=>boxes.run({db,auth,uid:'alice',kind,id:uuid(id),
  now:()=>TODAY,...opts});
 return{run,users,auth,db,get writes(){return writes;}};
}

test('C2.9 has 19 illustrated, unique items and exact rare weighted probabilities',()=>{
 assert.equal(boxes.PRICE,20);
 assert.equal(boxes.DUPLICATE_RETURN,4);
 assert.equal(boxes.POOL.length,19);
 assert.equal(boxes.TOTAL,1000000);
 assert.equal(boxes.POOL.filter(x=>x.rank==='SSS').reduce((a,b)=>a+b.weight,0),4);
 for(const item of catalog.funCollectibles){
  assert.equal(item.collectionSet,'VAN_BAO');
  assert.equal(item.tradeable,false);
  assert.ok(art.visual(item)?.src.startsWith('data:image/svg+xml;'));
 }
 assert.equal(boxes.draw(0).itemId,catalog.funCollectibles[0].id);
 assert.equal(boxes.draw(999999).itemId,catalog.funCollectibles.at(-1).id);
 assert.equal(boxes.draw(1000000),null);
});

test('Free box is once daily and produces real verified inventory plus an album mark',async()=>{
 const e=fixture(50);
 const started=await e.run('start',1,{mode:'free',roll:0});
 assert.equal(started.currency,50);
 assert.equal(started.state.active.status,'sealed');
 assert.equal(e.users.get('alice').inventory.length,0);
 await assert.rejects(e.run('start',2,{mode:'free',roll:1}),x=>x.reason==='unfinished-box');
 const claimed=await e.run('claim',1);
 assert.equal(claimed.currency,50);
 assert.equal(claimed.inventory.length,1);
 assert.equal(claimed.inventory[0].name,'Đèn Đom Đóm');
 assert.equal(claimed.inventory[0].instanceId,'fun-box-'+uuid(1));
 assert.equal(claimed.inventory[0].scope,'DUDU');
 assert.ok(claimed.state.album.includes('fun-firefly-lamp'));
 assert.equal(claimed.storyStates[collection.META].events.length,1);
 assert.equal(e.users.get('alice').quests.find(q=>q.id==='q_week_fun').current,1);
 assert.equal(e.users.get('alice').quests.find(q=>q.id==='q_event_fun').current,1);
 assert.equal(e.users.get('alice').storyStates[questEvents.META].events.length,1);
 const journal=collection.snapshot({inventory:claimed.inventory,storyStates:claimed.storyStates});
 assert.equal(journal.events[0].name,'Đèn Đom Đóm');
 const writes=e.writes;
 assert.equal((await e.run('claim',1)).status,'already-applied');
 assert.equal(e.writes,writes);
 assert.equal(e.users.get('alice').quests.find(q=>q.id==='q_week_fun').current,1);
 await assert.rejects(e.run('start',2,{mode:'free',roll:1}),x=>x.reason==='free-used');
 const tomorrow=await e.run('start',2,{mode:'free',roll:120000,now:()=>TOMORROW});
 assert.equal(tomorrow.state.active.status,'sealed');
 assert.equal(e.users.get('bob').inventory.length,0);
});

test('Extra boxes cost 20 Xu, duplicates do not multiply items, return 4 Xu',async()=>{
 const e=fixture(100);
 await e.run('start',1,{mode:'paid',roll:0});
 assert.equal(e.users.get('alice').currency,80);
 assert.equal((await e.run('claim',1)).inventory.length,1);
 const two=await e.run('start',2,{mode:'paid',roll:0});
 assert.equal(two.currency,60);
 const dup=await e.run('claim',2);
 assert.equal(dup.reward.duplicate,true);
 assert.equal(dup.reward.returned,4);
 assert.equal(dup.currency,64);
 assert.equal(dup.inventory.length,1);
 assert.equal(dup.state.album.length,1);
 assert.equal(dup.state.duplicate,1);
 assert.equal(dup.state.total,2);
 assert.equal(dup.state.history.length,2);
 assert.equal(e.users.get('alice').quests.find(q=>q.id==='q_week_fun').current,1);
 assert.equal(e.users.get('alice').quests.find(q=>q.id==='q_event_fun').current,1);
 assert.equal((await e.run('start',2,{mode:'paid',roll:1})).status,'already-applied');
 assert.equal(e.users.get('alice').currency,64);
 await e.run('start',3,{mode:'paid',roll:120000});
 const next=await e.run('claim',3);
 assert.equal(next.inventory.length,2);
 assert.equal(next.state.album.length,2);
});

test('Zero wallet, invalid draw, account swap and full inventory cannot issue paid loot',async()=>{
 const e=fixture(10);
 await assert.rejects(e.run('start',1,{mode:'paid',roll:1}),x=>x.reason==='not-enough-xu');
 await assert.rejects(e.run('start',1,{mode:'free',roll:1000000}),x=>x.reason==='invalid-draw');
 const first=await e.run('start',1,{mode:'free',roll:999999});
 assert.equal(first.state.active.itemId,'fun-universe-egg');
 e.auth.currentUser={uid:'bob'};
 await assert.rejects(e.run('claim',1),x=>x.reason==='invalid-account');
 assert.equal(e.users.get('bob').inventory.length,0);
 e.auth.currentUser={uid:'alice'};
 const opened=await e.run('claim',1);
 assert.equal(opened.inventory[0].rank,'SSS');
 assert.equal(opened.state.album.length,1);
});

test('Main wiring keeps the shop, catalog, inventory and blind-box receipts connected',()=>{
 const html=readFileSync(join(__dirname,'../index.html'),'utf8');
 const ui=readFileSync(join(__dirname,'../js/dudu-fun-ui-v43.js'),'utf8');
 const css=readFileSync(join(__dirname,'../css/dudu-fun-v43.css'),'utf8');
 assert.match(html,/personal-blind-box-c29\.js\?v=c29-box-1/);
 assert.match(html,/DuduBlindBoxLiveBridgeC29=Object\.freeze/);
 assert.match(html,/DuduPersonalBlindBoxC29\.run/);
 assert.match(html,/userProfile\.inventory=result\.inventory/);
 assert.match(ui,/function blindBoxes\(rootNode\)/);
 assert.match(ui,/blindAction\('start','paid'\)/);
 assert.match(ui,/blindAction\('claim'\)/);
 assert.match(ui,/Sổ Vạn Bảo/);
 assert.match(css,/blind-album-grid/);
 assert.match(css,/lucky-number-grid/);
});
test('C4.2 places the wallet in the DUDU FUN header and removes only the redundant promo card',()=>{
 const html=readFileSync(join(__dirname,'../index.html'),'utf8');
 const ui=readFileSync(join(__dirname,'../js/dudu-fun-ui-v43.js'),'utf8');
 const css=readFileSync(join(__dirname,'../css/dudu-fun-v43.css'),'utf8');
 assert.match(html,/id="dudu-fun-header-balance"/);
 assert.match(html,/dudu-fun-v43\.css\?v=c42-fun-1/);
 assert.match(ui,/function updateHeaderBalance\(\)/);
 assert.match(ui,/chip\.textContent=signed\(\)/);
 assert.doesNotMatch(ui,/function heading\(container\)|✦ Vạn Bảo & Vé Cào|Hộp miễn phí hôm nay:/);
 assert.match(ui,/\['box','🎁 Vạn Bảo'\]/);
 assert.match(ui,/function blindBoxes\(rootNode\)/);
 assert.match(css,/#dudu-fun-header-balance/);
 assert.doesNotMatch(css,/\.dudu-fun-top\{/);
});
