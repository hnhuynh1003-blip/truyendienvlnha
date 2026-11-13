'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const honor=require('../js/personal-honor-c46.js');
const arcade=require('../js/personal-arcade-core-v1.js');

test('C4.12 every collectible title has a canonical unlock clue and a safe secret state',()=>{
 const a=arcade.fresh(1000);
 a.neon.guestsServed=24;
 const profile={currency:35,exp:70};
 const v=honor.view(profile,a);
 assert.equal(v.titles.length,20);
 assert.equal(v.titles.filter(t=>t.goal).length,19);
 const neon=v.titles.find(t=>t.id==='neon-owner');
 assert.equal(neon.unlocked,false);
 assert.deepEqual(neon.goal,{
  id:'neon-25',current:24,target:25,unlocked:false,secret:false,
  description:'Phục vụ 25 lượt khách ở Trạm Neon.'
 });
 assert.equal(v.nextHunt.id,'neon-owner','suggest a nearly finished rarity instead of an impossible trophy');
 const dragon=v.titles.find(t=>t.id==='garden-legend');
 assert.equal(dragon.goal.secret,true);
 assert.equal(dragon.goal.description,'Điều kiện đang được che giấu.');
 assert.equal(v.nextHunt.id!=='garden-legend',true);
 assert.equal(profile.currency,35);
 assert.equal(profile.exp,70);
 assert.equal(profile.honorV1,undefined,'view cannot change the ledger');
 a.garden.fishAlbum.dragon=1;
 const discovered=honor.view(profile,a).titles.find(t=>t.id==='garden-legend');
 assert.equal(discovered.unlocked,true);
 assert.equal(discovered.goal.secret,false);
 assert.match(discovered.goal.description,/Long ngư tinh vân/);
});

class Node{
 constructor(tag){this.tag=tag;this.dataset={};this.style={};this.children=[];
  this.className='';this.textContent='';this.listeners={};this.attributes={};this.scrollTop=-1;}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,cb){this.listeners[k]=cb;}
}
const flatten=node=>[node,...node.children.flatMap(flatten)];
const rendered=node=>flatten(node).map(n=>n.textContent||'').join(' ');
function harness(){
 const nodes=new Map(['dudu-honor-content-c46','dudu-honor-home-title',
  'dudu-honor-home-title-label','dudu-honor-home-rarity'].map(id=>[id,new Node('div')]));
 const doc={getElementById:id=>nodes.get(id),createElement:tag=>new Node(tag)};
 const profile={currency:15,exp:4,honorV1:{earned:[],equipped:'entity',pinned:[]}};
 const root={document:doc,DuduPersonalHonorC46:honor,DuduPersonalArcadeCoreV1:arcade,
  localStorage:{getItem:()=>null},DuduAuth:{uid:()=>null,isReady:()=>false}};
 const ctx={window:root,document:doc,IS_SANDBOX_MODE:true,
  currentUsername:'c412-collector',userProfile:profile};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-honor-ui-c46.js'),'utf8'),ctx);
 const host=nodes.get('dudu-honor-content-c46');
 const click=b=>{assert.ok(b);assert.equal(typeof b.listeners.click,'function');b.listeners.click();};
 const button=name=>flatten(host).find(n=>n.tag==='button'&&n.textContent===name);
 return {root,host,profile,click,button};
}
test('C4.12 locked titles display useful progress and can open the exact earning condition',()=>{
 const x=harness();x.root.DuduHonorUIV46.render();
 const home=rendered(x.host);
 assert.match(home,/MỤC TIÊU ĐÁNG SĂN/);
 assert.match(home,/Lữ Khách Trang Sách/);
 assert.match(home,/Đọc chương truyện đầu tiên/);
 assert.match(home,/0\/1/);
 assert.equal(flatten(x.host).filter(n=>n.className.includes('dudu-honor-title-card')).length,8);
 const reader=flatten(x.host).find(n=>n.className.includes('dudu-honor-title-card')&&
  rendered(n).includes('Lữ Khách Trang Sách'));
 assert.ok(reader);
 assert.equal(reader.dataset.rarity,'rare');
 x.click(flatten(reader).find(n=>n.tag==='button'&&n.textContent==='Xem mốc ›'));
 assert.ok(flatten(x.host).some(n=>n.className.includes('dudu-honor-achievement is-locked is-target')));
 assert.match(rendered(x.host),/Lật Trang Đầu Tiên/);
 assert.equal(x.host.scrollTop,0);
 assert.equal(x.profile.honorV1.equipped,'entity');
 assert.equal(x.profile.currency,15);
});

test('C4.12 rarity filters keep the mystery sealed while offering a hunt path',()=>{
 const x=harness();x.root.DuduHonorUIV46.render();
 x.click(x.button('Huyền thoại'));
 const cards=flatten(x.host).filter(n=>n.className.includes('dudu-honor-title-card'));
 assert.equal(cards.length,4);
 assert.ok(cards.every(n=>n.dataset.rarity==='mythic'));
 assert.ok(cards.some(n=>rendered(n).includes('Danh hiệu bí ẩn')));
 assert.equal(rendered(x.host).includes('Câu được Long ngư tinh vân'),false);
 const secret=cards.find(n=>rendered(n).includes('Danh hiệu bí ẩn'));
 x.click(flatten(secret).find(n=>n.tag==='button'&&n.textContent==='Xem mốc ›'));
 assert.ok(flatten(x.host).some(n=>n.className.includes('dudu-honor-achievement is-locked is-target')));
 assert.match(rendered(x.host),/Bí mật chưa khám phá/);
 assert.equal(rendered(x.host).includes('Câu được Long ngư tinh vân'),false);
 x.click(x.button('Danh hiệu'));
 x.click(x.button('Đã sở hữu'));
 const owned=flatten(x.host).filter(n=>n.className.includes('dudu-honor-title-card'));
 assert.equal(owned.length,1);
 assert.match(rendered(owned[0]),/Thực Thể Ký Tự/);
});

test('C4.12 styles and cache busting apply only to cosmetic collection UI',()=>{
 const css=readFileSync(join(__dirname,'../css/personal-honor-c46.css'),'utf8');
 const html=readFileSync(join(__dirname,'../index.html'),'utf8');
 assert.match(css,/\.dudu-honor-hunt-spotlight\{/);
 assert.match(css,/\.dudu-honor-title-card\.is-locked/);
 assert.match(css,/\.dudu-honor-title-scopes button\.is-active/);
 assert.match(css,/\.dudu-honor-achievement\.is-target/);
 for(const file of ['personal-honor-c46.css','personal-honor-c46.js','personal-honor-ui-c46.js'])
  assert.ok(html.includes(file+'?v=c412-1'),file);
});
