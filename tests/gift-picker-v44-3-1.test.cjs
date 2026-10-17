const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const picker=require('../js/gift-picker-model-v44-3-1.js');
const catalog=require('../js/item-catalog-v2.js');
const inventory=require('../js/inventory-model-v42.js');
const trade=require('../js/inventory-trade-v43-9.js');
const book={id:'novel-one',title:'Tác phẩm',chapters:[{id:'c-one',realmTag:'FANTASY'}]};
const mk=(item,instanceId)=>({...item,instanceId,obtainedFrom:{kind:'SHOP',source:'DUDU_MARKET'}});
test('V44.3.1: duplicates collapse into 1 card while retaining exact instance IDs',()=>{
 const x=catalog.byId('common-biscuit');
 const a=mk(x,'biscuit-new'),b=mk(x,'biscuit-old');
 const c=mk(catalog.byId('common-bottled-water'),'water-unique');
 const gifts=[a,b,c].filter(i=>trade.storyTargets(i,[book]).length);
 assert.equal(gifts.length,3);
 const list=gifts.map((it,i)=>({instanceId:it.instanceId,itemId:it.id,
  name:it.name,scope:it.scope,icon:it.icon,rank:it.rank,
  category:inventory.inspect(it).category,recent:i===0}));
 const original=JSON.stringify(list);
 const groups=picker.groups(list);
 assert.equal(groups.length,2);
 assert.equal(groups[0].count,2);
 assert.deepEqual(groups[0].instances,['biscuit-new','biscuit-old']);
 assert.equal(groups[0].instanceId,'biscuit-new');
 assert.equal(picker.selection(groups,'biscuit-old').id,x.id);
 assert.equal(picker.selection(groups,'unknown'),null);
 assert.equal(JSON.stringify(list),original,'picker is strictly a read-only view');
 const tx=trade.storyGift({inventory:[a,b,c],
  itemInstanceId:groups[0].instanceId,stories:[book],storyId:book.id,
  day:'2026-10-17'});
 assert.equal(tx.ok,true);
 assert.equal(tx.inventory.length,2);
 assert.equal(tx.inventory.includes(b),true,'only the selected physical instance is spent');
 assert.equal(tx.inventory.includes(a),false);
});
test('V44.3.1: accent-insensitive Vietnamese search, scopes and quick filters',()=>{
 const rows=picker.groups([
  {itemId:'a',instanceId:'a1',name:'Cà Phê Sữa',scope:'COMMON',
   rank:'E',category:'FOOD',recent:true},
  {itemId:'b',instanceId:'b1',name:'Bột Linh Thạch',scope:'REALM',
   rank:'D',category:'MATERIAL',recent:false},
  {itemId:'c',instanceId:'c1',name:'Đèn Pin',scope:'COMMON',
   rank:'F',category:'TOOL',recent:false}
 ]);
 assert.deepEqual(picker.filter(rows,{query:'ca phe'}).map(x=>x.id),['a']);
 assert.deepEqual(picker.filter(rows,{query:'bot linh'}).map(x=>x.id),['b']);
 assert.deepEqual(picker.filter(rows,{query:'den pin'}).map(x=>x.id),['c']);
 assert.deepEqual(picker.filter(rows,{mode:'COMMON'}).map(x=>x.id),['a','c']);
 assert.deepEqual(picker.filter(rows,{mode:'WORLD'}).map(x=>x.id),['b']);
 assert.deepEqual(picker.filter(rows,{mode:'MATERIAL'}).map(x=>x.id),['b']);
 assert.deepEqual(picker.filter(rows,{mode:'TOOL'}).map(x=>x.id),['c']);
 assert.deepEqual(picker.filter(rows,{mode:'RECENT'}).map(x=>x.id),['a']);
 assert.deepEqual(picker.filter(rows,{mode:'TOOL',query:'cafe'}),[]);
});
test('V44.3.1: malformed or duplicated instance IDs do not inflate counts',()=>{
 const groups=picker.groups([
  {itemId:'a',instanceId:'one',name:'Bánh'},
  {itemId:'a',instanceId:'one',name:'Bánh'},
  {itemId:'b',instanceId:'',name:'N/A'},
  {itemId:'a',instanceId:'two',name:'Bánh'},
  {itemId:'c',instanceId:'three',name:''},
  null
 ]);
 assert.equal(groups.length,1);
 assert.equal(groups[0].count,2);
 assert.equal(Object.isFrozen(groups[0].instances),true);
});
test('V44.3.1: modal replaces huge native select and stays compact in Sandbox',()=>{
 const get=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const ui=get('js/story-comments-ui-v44-2.js');
 const modal=get('js/gift-picker-v44-3-1.js');
 const css=get('css/gift-picker-v44-3-1.css');
 const html=get('index.html');
 assert.match(ui,/DuduGiftPickerV4431\.open/);
 assert.match(ui,/selectedGiftId/);
 assert.match(ui,/dudu-v4431-attached-chip/);
 assert.doesNotMatch(ui,/el\('select','dudu-v443-gift-select'/);
 assert.match(modal,/setAttribute\('aria-modal','true'\)/);
 assert.match(modal,/keydown/);
 assert.match(modal,/e\.key==='Escape'/);
 assert.match(modal,/visible\+=8/);
 assert.match(modal,/document\.body\.append\(mask\)/);
 assert.match(modal,/onChoose\?\.\(itemId,selected\)/);
 assert.match(css,/max-height:min\(640px,calc\(100dvh - 24px\)\)/);
 assert.match(css,/@media\(max-width:380px\)/);
 assert.match(html,/gift-picker-model-v44-3-1\.js\?v=/);
 assert.match(html,/gift-picker-v44-3-1\.js\?v=/);
 assert.match(html,/gift-picker-v44-3-1\.css\?v=/);
 assert.doesNotMatch(modal,/fetch\(|localStorage|firebase|giftLedger/);
});
