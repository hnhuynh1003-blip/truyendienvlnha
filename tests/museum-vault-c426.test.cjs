'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const file=source=>readFileSync(path.join(__dirname,'..',source));

class Element{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={};
  this.textContent='';this.className='';this.listeners={};this.hidden=false;
  this.classList={add:c=>{if(!this.className.split(' ').includes(c))this.className+=' '+c;},
   contains:c=>this.className.split(' ').includes(c),
   toggle:(c,force)=>{if(force)this.classList.add(c);
    else this.className=this.className.split(' ').filter(x=>x!==c).join(' ');}};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(k,fn){this.listeners[k]=fn;}
 matches(selector){
  if(selector[0]==='.')return this.className.split(' ').includes(selector.slice(1));
  if(selector[0]==='#')return this.id===selector.slice(1);
  if(selector==='[data-museum-panel]')return !!this.dataset.museumPanel;
  const panel=selector.match(/^\[data-museum-panel="([^"]+)"\]$/);
  return !!panel&&this.dataset.museumPanel===panel[1]||selector===this.tag;
 }
 querySelectorAll(selector){return this.children.flatMap(child=>
  [...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const nodes=host=>[host,...host.children.flatMap(nodes)];

test('C4.26 preview is a functional four-piece exhibit without collectible writes',()=>{
 const host=new Element('div');let passportOpens=0,appOpens=[];
 const root={document:{createElement:tag=>new Element(tag),getElementById:()=>null},
  DuduPersonalArcadeUIV1:{openSeason(){passportOpens++;return true;}},
  openPhoneApp:app=>appOpens.push(app)};
 vm.runInNewContext(file('js/museum-vault-c426.js').toString('utf8'),{window:root});
 const api=root.DuduMuseumVaultC426;
 assert.equal(api.exhibits.length,4);
 assert.equal(api.init({container:host,ownerKey:'sandbox:du',sandbox:true}),true);
 const rail=host.querySelectorAll('.museum-c426-select');
 assert.equal(rail.length,4);
 assert.ok(host.querySelector('.museum-c426-stage').querySelector('.museum-c426-art').src
  .includes('s01-founder-crest.webp'));
 host.querySelector('.museum-c426-action').onclick();
 assert.equal(passportOpens,1);
 rail[1].listeners.click();
 assert.match(host.querySelector('.museum-c426-art').src,/statue-starkeeper\.webp/);
 assert.equal(rail[1].attributes['aria-pressed'],'true');
 host.querySelector('.museum-c426-action').onclick();
 assert.deepEqual(appOpens,['quests']);
 rail[3].listeners.click();
 assert.equal(host.querySelector('.museum-c426-action').hidden,true,
  'The unreleased avatar frame has no inert equip button');
 const ownedTab=nodes(host).find(n=>n.dataset.tab==='owned');ownedTab.listeners.click();
 assert.equal(host.querySelector('[data-museum-panel="gallery"]').hidden,true);
 assert.equal(host.querySelector('[data-museum-panel="owned"]').hidden,false);
 assert.equal(host.querySelector('.museum-c426-ledger').textContent,'Sổ sở hữu chưa xác minh');
});

test('C4.26 verified shelf receives only backend response, guards owner changes',()=>{
 const host=new Element('div');const root={document:{createElement:tag=>new Element(tag)}};
 vm.runInNewContext(file('js/museum-vault-c426.js').toString('utf8'),{window:root});
 const api=root.DuduMuseumVaultC426;
 api.init({container:host,ownerKey:'du',sandbox:false});
 api.updateVerified({ok:false,reason:'sandbox',items:[]});
 assert.match(host.querySelector('.museum-c426-verified').textContent||
  nodes(host.querySelector('.museum-c426-verified')).map(n=>n.textContent).join(' '),
  /Sandbox không kết nối sổ sở hữu/);
 api.updateVerified({ok:true,items:[{name:'Kỷ vật xác minh',rank:'F',summary:'Từ máy chủ',icon:'✦'}]});
 assert.equal(host.querySelector('.museum-c426-ledger').textContent,'1 kỷ vật xác minh');
 assert.equal(host.querySelectorAll('.museum-c426-owned-card').length,1);
 assert.ok(nodes(host).some(n=>n.textContent==='Kỷ vật xác minh'));
 api.updateVerified({ok:true,items:[]});
 assert.equal(host.querySelectorAll('.museum-c426-owned-card').length,0);
 assert.ok(host.querySelector('.museum-c426-empty'));
 api.init({container:host,ownerKey:'other-user',sandbox:false});
 assert.equal(host.querySelectorAll('.museum-c426-owned-card').length,0);
 assert.equal(host.querySelector('.museum-c426-ledger').textContent,'Sổ sở hữu chưa xác minh');
});

test('C4.26 does not change server ownership contract or season preview',()=>{
 const html=file('index.html').toString('utf8');
 const client=file('js/collectibles-client.js').toString('utf8');
 const season=file('js/personal-arcade-season-c423.js').toString('utf8');
 const ui=file('js/museum-vault-c426.js').toString('utf8');
 assert.match(html,/await DuduCollectiblesClient\.mine\(\)/);
 assert.match(html,/identity!==currentUsername/);
 assert.match(html,/DuduMuseumVaultC426/);
 assert.match(client,/if\(sandbox\)return \{ok:false,reason:'sandbox',items:\[\]\}/);
 assert.match(season,/PHASE='preview'/);
 assert.doesNotMatch(ui,/\.grant\s*\(|\.claim\s*\(|\.setItem\s*\(|\.update\s*\(/);
 assert.match(file('js/museum-memories-ui-v43.js').toString(),/newSlot\.append\(album\)/);
});

test('C4.26 artwork is WebP, light enough for a mobile museum',()=>{
 const assets=['hall-night.webp','statue-starkeeper.webp','obelisk-nebula.webp','frame-astral.webp'];
 for(const name of assets){
  const filename='assets/museum-c426/'+name,blob=file(filename);
  assert.equal(blob.toString('ascii',0,4),'RIFF');
  assert.equal(blob.toString('ascii',8,12),'WEBP');
  assert.ok(statSync(path.join(__dirname,'..',filename)).size<160000,name);
 }
 const html=file('index.html').toString('utf8');
 assert.match(html,/museum-vault-c426\.css\?v=c426-1/);
 assert.match(html,/museum-vault-c426\.js\?v=c426-1/);
});
