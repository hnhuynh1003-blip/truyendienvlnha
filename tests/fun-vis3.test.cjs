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
 assert.match(html,/css\/van-bao-stage-v2\.css\?v=fun-vis6/);
 assert.match(html,/js\/dudu-fun-ui-v43\.js\?v=f37-1/);
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
 assert.match(js,/if\(!active\)\{\s*const display=el\('div','vanbao-chest-kiosk'\)/,
  'A claimed box must show its reward without a second chest above it');
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

test('DUDU FUN reads the current shared wallet, not an older Vạn Bảo snapshot',async()=>{
 class FakeNode{
  constructor(tag){this.tag=tag;this.children=[];this.style={};this.listeners={};}
  set textContent(value){this.text=String(value);this.children=[];}
  get textContent(){return this.text||this.children.map(n=>n.textContent||'').join('');}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=[...children];}
  setAttribute(){}
  addEventListener(name,fn){this.listeners[name]=fn;}
 }
 const nodes={};
 const doc={createElement:tag=>new FakeNode(tag),getElementById:id=>nodes[id]||null};
 for(const id of ['dudu-fun-content-v43','dudu-fun-header-balance','dudu-fun-launch-v43'])
  nodes[id]=doc.createElement('div');
 const root={document:doc,currentUsername:'du',userProfile:{currency:311},
  DuduAuth:{isReady:()=>true,uid:()=> 'du'},IS_SANDBOX_MODE:false,
  DuduFunRulesV43:{norm:()=>({rounds:{box:null,ticket:null},history:[]})},
  DuduPersonalFunC25:{utcDay:()=> '2026-11-02'},
  DuduFunLiveBridgeC25:{uid:()=> 'du',load:async()=>({state:{}})},
  DuduPersonalBlindBoxC29:{PRICE:20,TOTAL:1000000,DUPLICATE_RETURN:4,POOL:[]},
  DuduBlindBoxLiveBridgeC29:{uid:()=> 'du',load:async()=>({currency:311,
   state:{active:null,lastFreeDay:'2026-11-02',album:[],total:0,duplicate:0,history:[]}})},
  DuduItemCatalog:{byId:()=>null,funCollectibles:[]}};
 root.window=root;
 vm.runInNewContext(read('js/dudu-fun-ui-v43.js'),root,{filename:'dudu-fun-ui-v43.js'});
 root.DuduFunUIV43.render();
 await new Promise(resolve=>setImmediate(resolve));
 root.userProfile.currency=315; // A newer scratch-ticket receipt updated the shared wallet.
 root.DuduFunUIV43.render();
 assert.equal(nodes['dudu-fun-header-balance'].textContent,'315');
 const walk=node=>[node,...node.children.flatMap(walk)];
 const buy=walk(nodes['dudu-fun-content-v43']).find(n=>n.className?.includes('blind-paid'));
 assert.ok(buy);
 assert.equal(buy.disabled,false);
});

test('Mythic identity and full-screen relic leave text unobstructed on mobile',()=>{
 const frame=read('css/phone-identity-art-v1.css');
 const relic=read('css/van-bao-stage-v2.css');
 const ui=read('js/dudu-fun-ui-v43.js');
 assert.match(frame,/\.dudu-honor-home-chip::before\{\s*content:none!important/);
 assert.match(frame,/\.dudu-honor-home-chip::after\{\s*content:none!important/);
 assert.match(relic,/\.vanbao-artifact-large\{[^}]*flex:0 0 auto/s);
 assert.match(relic,/\.vanbao-artifact-large img\{[^}]*object-fit:contain!important/s);
 assert.doesNotMatch(ui,/✦ TỦ BÁU VẬT · DUDU FUN|19 bảo vật · E → SSS · chỉ dùng Xu Vàng ảo/);
 assert.doesNotMatch(ui,/DUDU FUN dùng Xu Vàng ảo, không quy đổi hoặc rút thành tiền thật/);
 assert.doesNotMatch(ui,/✦ LỘC ĐẾN NHÀ · 刮刮乐|VÉ CÀO VẠN PHÚC/,
  'The current number scratch card does not need a second title above its ticket');
});

test('FUN-VIS6 ships a lightweight new AI vault backdrop across the reveal journey',()=>{
 const file=path.join(base,'assets/van-bao/v3/celestial-vault-stage.webp');
 const data=fs.readFileSync(file);
 assert.equal(data.toString('ascii',0,4),'RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.ok(data.length>25000&&data.length<180000,'mobile background stays lightweight');
 const css=read('css/van-bao-stage-v2.css');
 const uses=css.match(/v3\/celestial-vault-stage\.webp/g)||[];
 assert.ok(uses.length>=4,'sealed, unsealed, opened and inspected art share the new scene');
});
