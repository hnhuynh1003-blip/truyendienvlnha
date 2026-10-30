'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const art=require('../js/item-visuals-v13.js');
const catalog=require('../js/item-catalog-v2.js');
const core=require('../js/economy-core-v43.js');

const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const market=read('js/market-ui-v43.js');

function fakeDom(){
 const doc={};
 doc.createElement=tag=>({
  tag,ownerDocument:doc,children:[],dataset:{},attributes:{},hidden:false,
  className:'',value:'',textContent:'',
  style:{values:{},setProperty(k,v){this.values[k]=v;}},
  classList:{values:new Set(),add(value){this.values.add(value);}},
  append(...nodes){this.children.push(...nodes);},
  replaceChildren(...nodes){this.children=[...nodes];},
  setAttribute(k,v){this.attributes[k]=v;},
  addEventListener(k,callback){(this.events??={})[k]=callback;}
 });
 return doc;
}

test('every product currently sold has its own coherent illustrated sprite in the shop and warehouse',()=>{
 const shelf=[...core.shopCatalog(),...core.FUNCTIONAL_TOOLS];
 assert.equal(shelf.length,16);
 const shapes=shelf.map(item=>art.visual(item).shape);
 assert.equal(new Set(shapes).size,16,'no two products reuse the generic parcel artwork');
 assert.ok(shapes.every(shape=>shape!=='parcel'));
 const document=fakeDom();
 const window={DuduEconomyCoreV43:core,DuduItemCatalog:catalog,DuduItemArtV13:art};
 vm.runInNewContext(market,{window,document});
 const host=document.createElement('section');
 const config={host,coins:500,state:null,onBuy:()=>true,personalMode:true};
 assert.equal(window.DuduMarketUIV43.render(config),true);
 let shelfCards=host.children[1].children;
 assert.equal(shelfCards.length,12);
 for(const card of shelfCards){
  const itemId=card.dataset.itemId;
  const icon=card.children[0];
  const img=icon.children[0];
  assert.equal(img?.tag,'img',itemId+' has actual image element');
  assert.equal(img.src,art.visual(catalog.byId(itemId)).src);
  assert.equal(icon.classList.values.has('dudu-item-v13-frame'),true);
  assert.ok(card.style.values['--rarity-glow']);
 }
 host.children[0].children[0].children[4].events.click();
 shelfCards=host.children[1].children;
 assert.equal(shelfCards.length,4);
 for(const card of shelfCards){
  const icon=card.children[0];
  assert.equal(icon.children[0].src,art.visual(core.FUNCTIONAL_TOOLS
   .find(item=>item.id===card.dataset.itemId)).src);
 }
});

test('older world props display an identifiable object, leaving box art only for actual boxes',()=>{
 const generic=catalog.items.filter(item=>art.visual(item).shape==='parcel');
 assert.equal(generic.length,2);
 assert.ok(generic.every(item=>item.icon==='📦'));
 for(const [id,shape] of [
  ['common-cloth','cloth'],['common-rope','rope'],['common-torn-map','map'],
  ['urban-v441-13','key'],['apoc-battery-core','battery'],
  ['horror-v441-13','mirror'],['horror-unlit-candle','candle']
 ]){
  assert.equal(art.visual(catalog.byId(id)).shape,shape,id);
 }
});

test('old archived product remains available to its owner but cannot appear on new shelves',()=>{
 const archived=catalog.byId('e1');
 assert.equal(archived.archived,true);
 assert.equal(core.preview({tab:'COMMON'}).some(x=>x.id===archived.id),false);
 const before=JSON.stringify(archived);
 const document=fakeDom();
 const window={DuduEconomyCoreV43:{...core,preview:()=>[archived,...core.shopCatalog()]},
  DuduItemCatalog:catalog,DuduItemArtV13:art};
 vm.runInNewContext(market,{window,document});
 const host=document.createElement('section');
 window.DuduMarketUIV43.render({host,coins:500,onBuy:()=>true,personalMode:true});
 assert.equal(host.children[1].children.length,12);
 assert.equal(host.children[1].children.some(x=>x.dataset.itemId==='e1'),false);
 assert.equal(JSON.stringify(archived),before,'retirement is a view rule, not destructive migration');
});

test('warehouse and auction art use the same dedicated sprite mount, without changing inventory data',()=>{
 const item={...catalog.byId('common-compass'),instanceId:'owned-instance'};
 const before=JSON.stringify(item);
 const document=fakeDom();
 const container=document.createElement('span');
 assert.equal(art.mount(container,item),true);
 assert.equal(container.children[0].src,art.visual(item).src);
 assert.equal(JSON.stringify(item),before);
 const view=read('js/inventory-view-v42.js');
 const hub=read('js/inventory-hub-v43-9.js');
 assert.match(view,/art\.mount\(container,approved\)/);
 assert.match(hub,/DuduItemArtV13\?\.mount\(artwork,/);
 const css=read('css/market-v43.css');
 assert.match(css,/\.dudu-v43-market-icon \.dudu-item-v13-art/);
 const html=read('index.html');
 for(const name of ['market-ui-v43.js','item-visuals-v13.js','inventory-view-v42.js',
  'inventory-hub-v43-9.js','market-v43.css','inventory-v43-9.css']){
  assert.ok(html.includes(name+'?v='+
   (['inventory-view-v42.js','inventory-hub-v43-9.js','inventory-v43-9.css'].includes(name)
    ?'c24b-1':'c24a-1')),name+' new cache version');
 }
});
