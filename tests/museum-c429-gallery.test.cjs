'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const repo=filename=>readFileSync(path.join(__dirname,'..',filename));
const core=require('../js/personal-arcade-core-v1.js');

class Element{
 constructor(tag){
  this.tag=tag;this.children=[];this.className='';this.textContent='';this.attributes={};
  this.dataset={};this.style={};this.listeners={};this.disabled=false;
  this.classList={add:c=>{if(!this.className.split(' ').includes(c))this.className+=' '+c;},
   toggle:(c,on)=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ');
    if(on)this.classList.add(c);}};
 }
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 addEventListener(event,fn){this.listeners[event]=fn;}
 setAttribute(key,value){this.attributes[key]=String(value);}
 matches(selector){return selector.startsWith('.')?
  this.className.split(' ').includes(selector.slice(1)):this.tag===selector;}
 querySelectorAll(selector){return this.children.flatMap(el=>[
  ...(el.matches(selector)?[el]:[]),...el.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function context(){
 const saved=new Map();let writes=0,opened=0;
 const root={document:{createElement:tag=>new Element(tag)},
  DuduPersonalArcadeCoreV1:core,
  localStorage:{getItem:key=>saved.get(key)||null,setItem:()=>{writes++;}},
  DuduPersonalArcadeUIV1:{openGarden:()=>{opened++;return true;}}};
 vm.runInNewContext(repo('js/museum-c429-gallery.js').toString(),{window:root});
 return {root,saved,get writes(){return writes;},get opened(){return opened;}};
}
function click(el){assert.ok(el?.listeners.click);el.listeners.click();}

test('C4.29 four Arcade milestones derive from actual account save and never grant rewards',()=>{
 const ctx=context(),host=new Element('section'),account='sandbox:du';
 const state=core.fresh(1700000000000);
 state.neon.guestsServed=26;state.mine.dug=40;state.garden.harvests=100;
 state.jade.sold=11;
 ctx.saved.set('dudu-personal-arcade:v1:'+encodeURIComponent(account),JSON.stringify(state));
 const ui=ctx.root.DuduMuseumGalleryC429;
 assert.equal(ui.milestones.length,4);
 assert.equal(ui.mount({container:host,ownerKey:'du',sandbox:true}),true);
 assert.equal(host.querySelector('.museum-c429-total').textContent,'2 / 4');
 assert.equal(host.querySelectorAll('.museum-c429-pedestal').length,4);
 assert.equal(host.querySelectorAll('.is-earned').length,2);
 click(host.querySelector('.museum-c429-pedestal-jade'));
 assert.equal(host.querySelector('.museum-c429-status-count').textContent,'11/12');
 assert.equal(ctx.writes,0,'museum is fully read-only');
});

test('C4.29 aquarium shows discovered species only and navigates back to Vườn Sương',()=>{
 const ctx=context(),host=new Element('section');
 const state=core.fresh(1700000000000);
 state.garden.fishAlbum.phoenix=2;state.garden.fishBest.phoenix=87;
 state.garden.fishAlbum.reed=1;
 ctx.saved.set('dudu-personal-arcade:v1:sandbox%3Adu',JSON.stringify(state));
 const ui=ctx.root.DuduMuseumGalleryC429;
 ui.mount({container:host,ownerKey:'du',sandbox:true});
 const fishTab=host.querySelectorAll('.museum-c429-wing')[1];click(fishTab);
 assert.ok(host.querySelector('.museum-c429-scene-fish'));
 assert.equal(host.querySelectorAll('.museum-c429-specimen').length,14);
 assert.equal(host.querySelectorAll('.is-found').length,2);
 assert.equal(host.querySelectorAll('.is-hidden').length,12);
 const known=host.querySelectorAll('.is-found');
 click(known[1]);
 assert.ok(host.querySelector('.museum-c429-fish-focus').querySelector('.fish-phoenix'));
 assert.equal(host.querySelector('.museum-c429-pond-progress').textContent,'2/14 LOÀI');
 click(host.querySelector('.museum-c429-go-garden'));
 assert.equal(ctx.opened,1);
 assert.equal(ctx.writes,0);
});

test('C4.29 account change clears species and metrics, does not leak other account data',()=>{
 const ctx=context(),host=new Element('section');
 const state=core.fresh(1700000000000);
 state.neon.guestsServed=500;state.garden.fishAlbum.dragon=1;
 ctx.saved.set('dudu-personal-arcade:v1:sandbox%3Aold',JSON.stringify(state));
 const ui=ctx.root.DuduMuseumGalleryC429;
 ui.mount({container:host,ownerKey:'old',sandbox:true});
 assert.equal(host.querySelector('.museum-c429-total').textContent,'1 / 4');
 ui.mount({container:host,ownerKey:'new',sandbox:true});
 assert.equal(host.querySelector('.museum-c429-total').textContent,'0 / 4');
 click(host.querySelectorAll('.museum-c429-wing')[1]);
 assert.equal(host.querySelectorAll('.is-found').length,0);
 assert.equal(host.querySelectorAll('.is-hidden').length,14);
 assert.equal(ctx.writes,0);
});

test('C4.29 keeps verified collectibles and Season1 preview separate, delivers compact WebP art',()=>{
 const html=repo('index.html').toString();
 const vault=repo('js/museum-vault-c426.js').toString();
 const gallery=repo('js/museum-c429-gallery.js').toString();
 assert.match(html,/museum-c429-gallery\.css\?v=c429-3/);
 assert.match(html,/museum-c429-gallery\.js\?v=c429-1/);
 assert.match(html,/museum-vault-c426\.js\?v=c426-2&amp;gallery=c429-1/);
 assert.match(vault,/\['preview','Quà mùa'\]/);
 assert.match(vault,/\['owned','Kỷ vật thật'\]/);
 assert.match(html,/await DuduCollectiblesClient\.mine\(\)/);
 assert.match(repo('js/personal-arcade-season-c423.js').toString(),/PHASE='preview'/);
 assert.doesNotMatch(gallery,/\.setItem\s*\(|\.grant\s*\(|\.claim\s*\(/);
 for(const art of ['aquarium-hall.webp','trophy-rotunda.webp']){
  const pathName='assets/museum-c429/'+art,b=repo(pathName);
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
  assert.ok(statSync(path.join(__dirname,'..',pathName)).size<230000,art);
 }
 for(const art of ['trophy-neon.webp','trophy-mine.webp','trophy-garden.webp','trophy-jade.webp']){
  const pathName='assets/museum-c429/'+art,b=repo(pathName);
  assert.equal(b.toString('ascii',0,4),'RIFF');
  assert.equal(b.toString('ascii',8,12),'WEBP');
  assert.ok(statSync(path.join(__dirname,'..',pathName)).size<95000,art);
  assert.match(repo('css/museum-c429-gallery.css').toString(),new RegExp(art));
 }
});
