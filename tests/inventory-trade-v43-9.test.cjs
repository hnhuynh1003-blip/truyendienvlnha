const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalog=require('../js/item-catalog-v2.js');
const model=require('../js/inventory-model-v42.js');
const engine=require('../js/inventory-trade-v43-9.js');
const day='2026-10-17';
const chapter={id:'c1',title:'Chương mở',realmTag:'FANTASY'};
const fantasy={id:'s1',title:'Thế giới phép thuật',realmTag:'FANTASY',chapters:[chapter]};
const sci={id:'s2',title:'Thế giới khoa học',realmTag:'SCIFI',chapters:[{id:'c2',realmTag:'SCIFI'}]};
const stories=[fantasy,sci];
const create=(id,instanceId,origin={kind:'CHAPTER',storyId:'s1',chapterId:'c1'})=>
 ({...catalog.byId(id),instanceId,obtainedFrom:origin});
test('V43.9: inventory stays canonical, useable filter excludes cosmetic tools',()=>{
 const water=create('common-bottled-water','shop-water',{kind:'SHOP',source:'DUDU_MARKET'});
 const flashlight=create('common-flashlight','shop-light',{kind:'SHOP',source:'DUDU_MARKET'});
 const rare=create('fantasy-ruins-seal','item-rare');
 const src=[water,flashlight,rare];
 assert.equal(model.list(src,{category:'ACTIVATABLE'}).total,0);
 assert.equal(model.displayList(src,{category:'ACTIVATABLE'}).total,0);
 assert.equal(model.inspect(flashlight).category,'TOOL');
 assert.equal(engine.actionStatus(flashlight,stories).useable,false);
 assert.match(engine.actionStatus(flashlight,stories).label,/chưa có hiệu ứng/);
 assert.equal(engine.actionStatus(rare,stories).auction,true);
 assert.equal(catalog.items.length,179);
});
test('V43.9: only truly canonical common stock may be sold, low stable buyback',()=>{
 const a=create('common-biscuit','shop-a',{kind:'SHOP',source:'DUDU_MARKET'});
 const b=create('common-flashlight','shop-b',{kind:'SHOP',source:'DUDU_MARKET'});
 const rare=create('fantasy-ruins-seal','item-c');
 assert.ok(engine.saleValue(a)>0);
 assert.ok(engine.saleValue(a)<8);
 assert.ok(engine.saleValue(b)>0);
 assert.equal(engine.saleValue(rare),0);
 assert.equal(engine.saleValue({...a,scope:'DUDU'}),0);
 assert.equal(engine.saleValue({...a,tradeable:false}),0);
 assert.equal(engine.saleValue({...a,name:'faked'}),0);
 const src=[a,b,rare],original=JSON.stringify(src);
 const plan=engine.sell({inventory:src,itemInstanceId:a.instanceId,
  coins:100,tradeState:null,day});
 assert.equal(plan.ok,true);
 assert.equal(plan.coins,100+plan.price);
 assert.equal(plan.inventory.length,2);
 assert.equal(plan.inventory[0],b);
 assert.equal(plan.state.sold,1);
 assert.equal(plan.state.history[0].action,'SELL');
 assert.equal(JSON.stringify(src),original,'no input mutation');
 assert.equal(engine.sell({inventory:plan.inventory,itemInstanceId:a.instanceId,
  coins:plan.coins,tradeState:plan.state,day}).ok,false);
 assert.equal(engine.sell({inventory:[a],itemInstanceId:a.instanceId,
  coins:1e9,tradeState:null,day}).reason,'wallet-limit');
 const capped=engine.state({version:1,day,sold:12,usedIds:[],listings:[],history:[]},day);
 assert.equal(engine.sell({inventory:[b],itemInstanceId:b.instanceId,
  coins:100,tradeState:capped,day}).reason,'daily-limit');
});
test('V43.9: escrow only genuine B+ world chapter items, cancel returns exact instance',()=>{
 const rare=create('fantasy-ruins-seal','item-rare');
 const other=create('common-biscuit','shop-b',{kind:'SHOP',source:'DUDU_MARKET'});
 assert.equal(engine.lore(rare,stories).eligible,true);
 assert.equal(engine.lore({...rare,obtainedFrom:{kind:'GLOBAL'}},stories).eligible,false);
 assert.equal(engine.lore({...rare,obtainedFrom:{kind:'CHAPTER',storyId:'s2',chapterId:'c2'}},stories).eligible,false);
 const plan=engine.list({inventory:[rare,other],itemInstanceId:rare.instanceId,
  stories,ask:175,day});
 assert.equal(plan.ok,true);
 assert.equal(plan.state.listings.length,1);
 assert.equal(plan.state.listings[0].status,'AWAITING_SERVER');
 assert.equal(plan.inventory.length,1);
 assert.equal(plan.inventory[0],other);
 assert.equal(plan.coins,undefined,'no imaginary payouts');
 const noDouble=engine.list({inventory:plan.inventory,
  tradeState:plan.state,itemInstanceId:rare.instanceId,stories,ask:175,day});
 assert.equal(noDouble.reason,'not-owned');
 const withdrew=engine.cancel({inventory:plan.inventory,
  tradeState:plan.state,listingId:plan.listing.id,day});
 assert.equal(withdrew.ok,true);
 assert.equal(withdrew.inventory[0],rare);
 assert.equal(withdrew.state.listings.length,0);
 assert.equal(withdrew.coins,undefined);
 assert.equal(engine.cancel({inventory:withdrew.inventory,
  tradeState:withdrew.state,listingId:plan.listing.id,day}).ok,false);
});
test('V43.9: block unique author items and DUDU verified relics from auction',()=>{
 const authored={id:'author-item-test',itemId:'author-item-test',
  name:'Kỷ vật chương',rank:'S',scope:'CHAPTER',type:'ITEM',
  storyId:'s1',chapterId:'c1',tradeable:false,unique:true,
  instanceId:'rare-author',obtainedFrom:{kind:'CHAPTER',storyId:'s1',chapterId:'c1'}};
 assert.equal(engine.lore(authored,stories).eligible,false);
 assert.equal(engine.list({inventory:[authored],itemInstanceId:authored.instanceId,
  stories,ask:120,day}).ok,false);
 const relic=create('dudu-founders-badge','rare-system');
 assert.equal(engine.saleValue(relic),0);
 assert.equal(engine.list({inventory:[relic],itemInstanceId:relic.instanceId,
  stories,ask:200,day}).ok,false);
 const rare=create('fantasy-ruins-seal','item-rare');
 assert.equal(engine.list({inventory:[rare],itemInstanceId:rare.instanceId,
  stories,ask:9,day}).reason,'ask-invalid');
 assert.equal(engine.list({inventory:[rare],itemInstanceId:rare.instanceId,
  stories,ask:5001,day}).reason,'ask-invalid');
});
test('V43.9: gift notes match real story/realm/chapter only, never cross worlds',()=>{
 const common=create('common-biscuit','shop-snack',{kind:'SHOP',source:'DUDU_MARKET'});
 const realm=create('fantasy-blood-gem','item-precious');
 assert.equal(engine.storyTargets(common,stories).length,2);
 assert.equal(engine.storyTargets(realm,stories).length,1);
 assert.equal(engine.storyTargets(realm,stories)[0].id,'s1');
 const wrong=engine.storyGift({inventory:[realm],itemInstanceId:realm.instanceId,
  stories,storyId:'s2',chapterId:'c2',day,note:'Lời chúc'});
 assert.equal(wrong.reason,'story-mismatch');
 assert.equal(engine.storyGift({inventory:[realm],itemInstanceId:realm.instanceId,
  stories,storyId:'s1',chapterId:'missing',day}).reason,'chapter-mismatch');
 assert.equal(engine.storyGift({inventory:[common],itemInstanceId:common.instanceId,
  stories,storyId:'s1',day,note:'x'.repeat(161)}).reason,'note-invalid');
 const original=[realm,common],a=engine.storyGift({inventory:original,
  itemInstanceId:realm.instanceId,stories,storyId:'s1',chapterId:'c1',
  note:'  Cảm ơn chương này!  ',day});
 assert.equal(a.ok,true);
 assert.deepEqual(a.inventory,[common]);
 assert.equal(a.state.history.at(-1).note,'Cảm ơn chương này!');
 assert.equal(a.state.history.at(-1).storyId,'s1');
 assert.equal(a.state.history.at(-1).chapterId,'c1');
 assert.equal(a.coins,undefined);
 assert.equal(original.length,2);
});
test('V43.9: cancellations cannot overflow inventory or duplicate escrow',()=>{
 const rare=create('fantasy-ruins-seal','item-r');
 const plan=engine.list({inventory:[rare],itemInstanceId:rare.instanceId,
  stories,ask:300,day});
 assert.equal(plan.ok,true);
 assert.equal(engine.cancel({inventory:Array(500).fill({id:'f1'}),
  tradeState:plan.state,listingId:plan.listing.id,day}).reason,'inventory-full');
 assert.equal(engine.cancel({inventory:[rare],
  tradeState:plan.state,listingId:plan.listing.id,day}).reason,'duplicate');
 const next=engine.state(plan.state,'2026-10-18');
 assert.equal(next.listings.length,1,'escrow must survive day reset');
 assert.equal(next.sold,0);
});
test('V43.9: no authenticated transfer, fabricated public comments or remote calls',()=>{
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const html=read('index.html'),view=read('js/inventory-view-v42.js');
 const ui=read('js/inventory-hub-v43-9.js');
 const core=read('js/inventory-trade-v43-9.js');
 assert.match(html,/inventory-trade-v43-9\.js/);
 assert.match(html,/inventory-v43-9\.css/);
 assert.match(html,/function listAuctionV439/);
 assert.match(html,/function giftStoryV439/);
 assert.match(view,/dudu-v439-action-card/);
 assert.match(view,/dudu-v439-slot-hint/);
 assert.match(ui,/AWAITING_SERVER|ký gửi|Chưa có người mua/);
 assert.doesNotMatch(core+ui,/db\.collection|fetch\(|DuduCollectiblesClient|firebase|addDoc\(/);
});


test('V44.6: reject forged, conflicting and duplicated persisted auction lots',()=>{
 const rare=create('fantasy-ruins-seal','safe-instance');
 const plan=engine.list({inventory:[rare],itemInstanceId:rare.instanceId,
  stories,ask:250,day});
 assert.equal(plan.ok,true);
 const base=plan.state;
 const invalids=[
  row=>{row.status='ACCEPTED';},
  row=>{row.item.name='Forged';},
  row=>{row.item.rank='SSS';},
  row=>{row.item.scope='DUDU';},
  row=>{row.storyId='s2';},
  row=>{row.chapterId='unknown';},
  row=>{row.realm='SCIFI';},
  row=>{row.item.obtainedFrom={kind:'GLOBAL'};},
  row=>{row.id='auction-other';}
 ];
 for(const mutate of invalids){
  const altered=JSON.parse(JSON.stringify(base));
  mutate(altered.listings[0]);
  const normalized=engine.state(altered,day);
  assert.equal(normalized.listings.length,0,'reject tampered persisted custody');
  assert.equal(engine.cancel({inventory:[],tradeState:altered,
   listingId:plan.listing.id,day}).reason,'not-listed');
 }
 const copies=JSON.parse(JSON.stringify(base));
 copies.listings.push({...copies.listings[0],id:'auction-other-copy'});
 assert.equal(engine.state(copies,day).listings.length,1,
  'one physical instance may be escrowed only once');
 assert.equal(engine.state(base,'2026-10-18').listings.length,1,
  'legitimate held items survive day rollover');
});
