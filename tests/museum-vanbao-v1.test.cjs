'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const rootPath=join(__dirname,'..');
const source=path=>readFileSync(join(rootPath,path),'utf8');
const catalog=require('../js/item-catalog-v2.js');

class Node{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={};
  this.textContent='';this.className='';this.hidden=false;
  this.classList={add:cls=>{if(!this.className.split(' ').includes(cls))this.className+=' '+cls;},
   toggle:(cls,enabled)=>{this.className=this.className.split(' ').filter(x=>x!==cls).join(' ');
    if(enabled)this.className+=' '+cls;},
   contains:cls=>this.className.split(' ').includes(cls)};
 }
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(type,callback){this.events??={};this.events[type]=callback;}
 matches(selector){
  if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));
  if(selector==='[data-museum-panel]')return !!this.dataset.museumPanel;
  const m=selector.match(/^\[data-museum-panel="([^"]+)"\]$/);
  return !!m&&this.dataset.museumPanel===m[1]||selector===this.tag;
 }
 querySelectorAll(selector){return this.children.flatMap(x=>[...(x.matches(selector)?[x]:[]),
  ...x.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const nodes=host=>[host,...host.children.flatMap(nodes)];

test('Museum has a separate read-only S–SSS shelf backed by the signed Firestore album',async()=>{
 const host=new Node('div');let uid='alice',loads=0;
 const ownedId='fun-eternal-crown';
 const bridge={ready:()=>true,uid:()=>uid,async load(){loads++;
  return {state:{album:[ownedId]},currency:123};}};
 const root={document:{createElement:tag=>new Node(tag)},DuduItemCatalog:catalog,
  DuduItemArtV13:{mount(container){container.append(new Node('img'));return true;}},
  DuduBlindBoxLiveBridgeC29:bridge};
 vm.runInNewContext(source('js/museum-vault-c426.js'),{window:root});
 const vault=root.DuduMuseumVaultC426;
 vault.init({container:host,ownerKey:'alice',sandbox:false});
 assert.equal(loads,0,'Do not read the wallet when the museum is on another tab');
 assert.equal(vault.showVanBao(),true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(loads,1);
 assert.equal(host.querySelectorAll('.museum-vanbao-pedestal').length,3);
 const pedestals=host.querySelectorAll('.museum-vanbao-pedestal');
 assert.equal(pedestals.filter(p=>p.className.includes('is-owned')).length,1);
 assert.equal(pedestals.find(p=>p.dataset.itemId===ownedId).attributes['aria-label'],
  'Ngắm Vương Miện Vĩnh Nguyệt');
 assert.equal(host.querySelector('.museum-c426-ledger').textContent,'Sổ sở hữu chưa xác minh',
  'Worker ledger remains completely separate from FUN ownership');
 assert.match(nodes(host).map(x=>x.textContent).join(' '),/1\/3 BẢO VẬT HIẾM/);
 uid='bob';vault.init({container:host,ownerKey:'bob',sandbox:false});
 assert.equal(host.querySelectorAll('.museum-vanbao-pedestal').length,0,
  'Changing account clears the old shelf before requesting the new one');
});

test('Sandbox cannot present the SSS artefact as an owned museum reward',async()=>{
 const host=new Node('div');let calls=0;
 const root={document:{createElement:tag=>new Node(tag)},DuduItemCatalog:catalog,
  DuduItemArtV13:{mount(container){container.append(new Node('img'));return true;}},
  DuduBlindBoxLiveBridgeC29:{ready:()=>true,uid:()=> 'alice',load(){calls++;}}};
 vm.runInNewContext(source('js/museum-vault-c426.js'),{window:root});
 root.DuduMuseumVaultC426.init({container:host,ownerKey:'sandbox:alice',sandbox:true});
 root.DuduMuseumVaultC426.showVanBao();
 assert.equal(calls,0);
 assert.equal(host.querySelectorAll('.museum-vanbao-pedestal').length,3);
 assert.equal(host.querySelectorAll('.museum-vanbao-pedestal').filter(p=>
  p.className.includes('is-owned')).length,0);
 assert.match(nodes(host).map(x=>x.textContent).join(' '),/Sandbox không xác nhận sở hữu/);
});

test('Museum and FUN stay view-only, with transparent relic art and no data writes',()=>{
 const html=source('index.html'),css=source('css/museum-vanbao-v1.css');
 const museum=source('js/museum-vault-c426.js');
 assert.match(html,/museum-vanbao-v1\.css\?v=f38-1/);
 assert.match(html,/fun=f38-1/);
 assert.match(css,/\.museum-vanbao-hero\.dudu-item-v13-frame/);
 assert.match(css,/\.museum-vanbao-pedestal\.is-locked/);
 assert.match(museum,/const result=await bridge\.load\(\)/);
 assert.doesNotMatch(museum,/bridge\.run\(|\.grant\(|\.claim\(|\.setItem\(/);
});
