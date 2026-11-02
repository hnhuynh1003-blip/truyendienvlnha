const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const catalog=require('../js/item-catalog-v2.js');
const blind=require('../js/personal-blind-box-c29.js');

test('FUN-VIS3 has two distinct transparent fantasy chest frames, optimized for mobile',()=>{
 for(const state of ['closed','open']){
  const file=path.join(base,'assets/van-bao/v2/van-bao-chest-'+state+'.webp');
  const data=fs.readFileSync(file);
  assert.equal(data.toString('ascii',0,4),'RIFF');
  assert.equal(data.toString('ascii',8,12),'WEBP');
  assert.ok(data.length>12000&&data.length<220000,'optimized '+state+' chest');
 }
 const html=read('index.html'),css=read('css/van-bao-stage-v2.css');
 assert.match(html,/css\/van-bao-stage-v2\.css\?v=fun-vis4/);
 assert.match(html,/js\/dudu-fun-ui-v43\.js\?v=fun-vis4/);
 assert.match(css,/\.vanbao-chest-art/);
 assert.match(css,/\.vanbao-celebrating\.rank-sss/);
 assert.match(css,/\.blind-album-tile\.locked \.blind-album-art img/);
 assert.match(css,/\.blind-treasure-showcase\.is-compact/);
 assert.match(css,/\.blind-result-art\.dudu-item-v13-frame/);
 assert.match(css,/\.blind-result:not\(\.vanbao-celebrating\) \.vanbao-open-burst/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.equal(blind.PRICE,20);
 assert.equal(blind.DUPLICATE_RETURN,4);
 assert.equal(blind.TOTAL,1000000);
});

test('FUN-VIS3 only celebrates applied receipts, keeps historical boxes and hides locked names',()=>{
 const js=read('js/dudu-fun-ui-v43.js');
 assert.match(js,/kind==='claim'&&response\.status==='applied'&&response\.reward/);
 assert.match(js,/if\(legacy&&\['playing','ready'\]\.includes\(legacy\.status\)\)/);
 assert.match(js,/owned\?item\.name:'Bảo vật chưa tìm thấy'/);
 assert.match(js,/vanbao-album-book/);
 assert.match(js,/vanbao-pull-history/);
 assert.match(js,/function viewTreasure\(item,preview=false\)/);
 assert.match(js,/function sandboxTreasurePreview\(rootNode\)/);
});

test('Sandbox shows all 19 artwork previews without invoking the purchase or reward bridge',()=>{
 class FakeNode{
  constructor(tag,doc){
   this.tag=tag;this.ownerDocument=doc;this.children=[];this.attrs={};
   this.style={setProperty(){}};this.dataset={};this.classList={add(){},remove(){}};
  }
  set textContent(value){this.text=String(value);this.children=[];}
  get textContent(){return this.text||this.children.map(node=>node.textContent||'').join('');}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(){}
 }
 const nodes={};
 const doc={createElement(tag){return new FakeNode(tag,doc);},getElementById(id){return nodes[id]||null;}};
 for(const id of ['dudu-fun-content-v43','dudu-fun-header-balance','dudu-fun-launch-v43'])
  nodes[id]=doc.createElement('div');
 let bridgeCalls=0;
 const root={document:doc,DuduFunRulesV43:{norm:()=>({rounds:{box:null,ticket:null},history:[]})},
  DuduEconomyCoreV43:{localDay:()=> '2026-11-02'},DuduItemCatalog:catalog,
  DuduItemArtV13:{mount(node){node.append(doc.createElement('img'));return true;}},
  DuduBlindBoxLiveBridgeC29:{run(){bridgeCalls++;}},
  currentUsername:'preview',userProfile:{currency:50,duduFunV43:null},IS_SANDBOX_MODE:true};
 root.window=root;
 vm.runInNewContext(read('js/dudu-fun-ui-v43.js'),root,{filename:'dudu-fun-ui-v43.js'});
 assert.equal(root.DuduFunUIV43.render(),true);
 const walk=node=>[node,...node.children.flatMap(walk)];
 const elements=walk(nodes['dudu-fun-content-v43']);
 assert.equal(elements.filter(node=>node.className?.includes('vanbao-sandbox-item')).length,19);
 assert.equal(elements.filter(node=>node.className?.includes('blind-treasure-feature rank-')).length,3);
 assert.ok(elements.some(node=>node.textContent.includes('Chỉ ngắm, không mua hoặc nhận đồ')));
 assert.equal(bridgeCalls,0);
});
