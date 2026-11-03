'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const catalog=require('../js/item-catalog-v2.js');
const read=file=>readFileSync(join(__dirname,'..',file),'utf8');

class Node{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={};
  this.textContent='';this.className='';this.hidden=false;
  this.classList={
   add:cls=>{if(!this.className.split(' ').includes(cls))this.className+=' '+cls;},
   toggle:(cls,on)=>{this.className=this.className.split(' ').filter(c=>c!==cls).join(' ');
    if(on)this.className+=' '+cls;},
   contains:cls=>this.className.split(' ').includes(cls)};
 }
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(type,fn){this.listeners??={};this.listeners[type]=fn;}
 matches(selector){
  if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));
  if(selector==='[data-museum-panel]')return !!this.dataset.museumPanel;
  const panel=selector.match(/^\[data-museum-panel="([^"]+)"\]$/);
  return !!panel&&this.dataset.museumPanel===panel[1]||selector===this.tag;
 }
 querySelectorAll(selector){return this.children.flatMap(n=>[
  ...(n.matches(selector)?[n]:[]),...n.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const nodes=host=>[host,...host.children.flatMap(nodes)];
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('F3.8 main Museum has a Vạn Tượng tab backed by the verified account album',async()=>{
 const host=new Node('div');let loads=0,funOpens=0,mounts=0;
 const ids=['f34-origin-dawn-goddess','f32-anime-guardian'];
 const root={document:{createElement:tag=>new Node(tag)},DuduItemCatalog:catalog,
  DuduItemArtV13:{mount(node){mounts++;node.append(new Node('img'));return true;}},
  DuduVantVatLiveBridgeF31:{ready:()=>true,uid:()=> 'du',async load(){loads++;
   return {state:{album:ids},currency:200};}},
  DuduFunUIV43:{showVantVat(){funOpens++;return true;}}};
 vm.runInNewContext(read('js/museum-vault-c426.js'),{window:root});
 const api=root.DuduMuseumVaultC426;
 api.init({container:host,ownerKey:'du',sandbox:false});
 assert.equal(loads,0,'Never fetch Vạn Tượng while a different museum tab is active');
 assert.equal(nodes(host).filter(n=>n.dataset.tab).length,6);
 assert.equal(nodes(host).find(n=>n.dataset.tab==='vantvat').textContent,'Vạn Tượng');
 assert.equal(api.showVanVat(),true);
 await tick();
 assert.equal(loads,1);
 assert.equal(host.querySelector('[data-museum-panel="vantvat"]').hidden,false);
 assert.equal(host.querySelector('.museum-c426-ledger').textContent,'Sổ sở hữu chưa xác minh',
  'The Worker collectible ledger must not be overwritten by DUDU FUN');
 const cards=host.querySelectorAll('.museum-vantvat-card');
 assert.equal(cards.length,catalog.funVantVat.length);
 assert.equal(cards.filter(card=>card.className.includes('is-owned')).length,2);
 assert.equal(cards.find(card=>card.dataset.itemId===ids[0]).attributes['aria-label'],
  'Ngắm Tượng Nữ Thần Bình Minh');
 assert.ok(host.querySelector('.museum-vantvat-feature').className.includes('rank-sss'),
  'Legendary owned item should be the featured object');
 assert.ok(mounts>=2,'Only collected artifacts need full color artwork');
 assert.ok(nodes(host).some(n=>n.textContent==='2/66 ĐÃ SƯU TẦM'));
 assert.equal(host.querySelector('.museum-vantvat-unfound').tag,'details');
 host.querySelector('.museum-vantvat-go').onclick();
 assert.equal(funOpens,1,'Museum has a path back to the spinning machine');
});

test('F3.8 account switch and Sandbox never leak the previous account collection',async()=>{
 const host=new Node('div');let uid='alice',resolveLoad,loads=0;
 const root={document:{createElement:tag=>new Node(tag)},DuduItemCatalog:catalog,
  DuduVantVatLiveBridgeF31:{ready:()=>true,uid:()=>uid,load(){loads++;
   return new Promise(resolve=>{resolveLoad=resolve;});}}};
 vm.runInNewContext(read('js/museum-vault-c426.js'),{window:root});
 const museum=root.DuduMuseumVaultC426;
 museum.init({container:host,ownerKey:'alice',sandbox:false});
 museum.showVanVat();
 uid='bob';museum.init({container:host,ownerKey:'bob',sandbox:false});
 resolveLoad({state:{album:['f34-origin-dawn-goddess']}});
 await tick();
 assert.equal(host.querySelectorAll('.museum-vantvat-card').length,0);
 museum.showVanVat();
 assert.equal(loads,2);
 resolveLoad({state:{album:[]}});await tick();
 assert.ok(nodes(host).some(n=>/Chưa có bảo vật Vạn Tượng/.test(n.textContent)));
 assert.equal(host.querySelectorAll('.museum-vantvat-card')
  .filter(card=>card.className.includes('is-owned')).length,0);
 museum.init({container:host,ownerKey:'sandbox:alice',sandbox:true});
 museum.showVanVat();
 assert.equal(loads,2,'Sandbox must not fetch production ownership');
 assert.ok(nodes(host).some(n=>/Sandbox chỉ xem thử/.test(n.textContent)));
});

test('F3.8 links Vạn Tượng both ways with no granting or currency writes',()=>{
 const fun=read('js/dudu-fun-ui-v43.js');
 const museum=read('js/museum-vault-c426.js');
 const html=read('index.html');
 const css=read('css/museum-vanbao-v1.css');
 assert.match(fun,/f38-vantvat-museum-link/);
 assert.match(fun,/root\.DuduMuseumVaultC426\?\.showVanVat\?\.\(\)/);
 assert.match(fun,/showVantVat\}\);/);
 assert.match(museum,/const result=await bridge\.load\(\)/);
 assert.match(museum,/showVanVat,exhibits/);
 assert.doesNotMatch(museum,/bridge\.run\(|\.grant\(|\.claim\(|\.setItem\(/);
 assert.match(html,/museum-vanbao-v1\.css\?v=f38-1/);
 assert.match(html,/fun=f38-1/);
 assert.match(css,/\.museum-vantvat-card\.is-locked/);
 assert.match(css,/@keyframes museum-vantvat-sss/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
