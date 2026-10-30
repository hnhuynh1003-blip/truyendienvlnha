'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const honor=require('../js/personal-honor-c46.js');
const arcade=require('../js/personal-arcade-core-v1.js');
const copy=x=>structuredClone(x);

test('C4.6 catalog has unique stable IDs and every collectible title has an achievement',()=>{
 assert.equal(new Set(honor.CATALOG.map(a=>a.id)).size,honor.CATALOG.length);
 assert.equal(new Set(honor.TITLES.map(t=>t.id)).size,honor.TITLES.length);
 assert.ok(honor.CATALOG.some(a=>a.secret));
 for(const title of honor.TITLES.filter(t=>t.id!=='entity'))
  assert.ok(honor.CATALOG.some(a=>a.titleId===title.id),title.id);
 for(const game of ['Trạm Neon','Địa Tầng 07','Vườn Sương','Ngọc Phường'])
  assert.ok(honor.CATALOG.some(a=>a.source===game),game);
});

function fixture(){
 let profile={currency:215,exp:40,level:3,inventory:[{id:'item-old'}],
  title:'Thực Thể Ký Tự',storyStates:{story1:{npcs:{friend:true}}},
  quests:[],readRewards:{}};
 const auth={currentUser:{uid:'du'}},db={collection(name){
  assert.equal(name,'profiles_v2');return{doc(uid){return{uid};}};
 },async runTransaction(fn){
  const patches=[],tx={async get(){return{exists:true,data:()=>copy(profile)};},
   update(ref,patch){assert.equal(ref.uid,'du');patches.push(copy(patch));}};
  const value=await fn(tx);for(const patch of patches)Object.assign(profile,patch);
  return value;
 }};
 const run=(kind,opts={})=>honor.run({db,auth,uid:'du',kind,...opts});
 return {run,get profile(){return profile;},auth,db};
}

test('C4.6 achievement catalog derives from all four existing Arcade progressions',()=>{
 const p={readRewards:{a:true,b:true,c:true,d:true,e:true,f:true},
  quests:[{id:'q_npc_gifts',current:1}],storyStates:{__duduBlindBoxC29:{album:['fun-firefly-lamp']}}};
 const s=arcade.fresh(Date.parse('2026-10-30T12:00:00Z'));
 s.neon.contracts=[0];s.neon.guestsServed=105;s.neon.roomTier=3;
 s.mine.dug=180;
 for(const ore of Object.keys(s.mine.found))s.mine.found[ore]=1;
 s.garden.fish=12;s.garden.fishAlbum.dragon=1;
 s.jade.sold=12;s.jade.exhibits=[{},{},{}];s.jade.album['7-6']=1;
 const v=honor.view(p,s);
 for(const title of ['reader-master','neon-tycoon','mine-collector',
  'garden-legend','jade-curator','jade-king','npc-friend','fun-visitor']){
  assert.equal(v.titles.find(x=>x.id===title).unlocked,true,title);
 }
 assert.ok(v.achievements.every(a=>a.current<=a.target));
 assert.equal(v.achievements.find(x=>x.id==='jade-longstone').unlocked,true);
 assert.equal(v.achievements.find(x=>x.id==='mine-collection').current,10);
});

test('C4.6 owner transaction remembers discoveries without modifying wallet or inventory',async()=>{
 const h=fixture(),s=arcade.fresh();s.neon.guestsServed=25;
 const once=await h.run('sync',{arcade:s});
 assert.equal(once.status,'applied');
 assert.ok(once.newIds.includes('neon-25'));
 assert.equal(h.profile.honorV1.earned.includes('neon-25'),true);
 const repeated=await h.run('sync',{arcade:s});
 assert.equal(repeated.status,'already-applied');
 assert.deepEqual(repeated.newIds,[]);
 assert.equal(h.profile.currency,215);
 assert.equal(h.profile.exp,40);
 assert.equal(h.profile.level,3);
 assert.deepEqual(h.profile.inventory,[{id:'item-old'}]);
 assert.deepEqual(h.profile.storyStates,{story1:{npcs:{friend:true}}});
 assert.equal(h.profile.title,'Thực Thể Ký Tự');
});

test('C4.6 an unfinished Vạn Bảo box cannot unlock a collectible title',()=>{
 const user={storyStates:{__duduBlindBoxC29:{total:2,album:[],
  active:{status:'sealed'}}}};
 assert.equal(honor.discovered(user,arcade.fresh()).includes('fun-first'),false);
 user.storyStates.__duduBlindBoxC29.album=['fun-firefly-lamp'];
 assert.equal(honor.discovered(user,arcade.fresh()).includes('fun-first'),true);
});

test('C4.6 only unlocked titles can be equipped; pinned medals cap at three',async()=>{
 const h=fixture(),s=arcade.fresh();
 await assert.rejects(h.run('equip',{titleId:'jade-king',arcade:s}),
  e=>e.reason==='title-locked');
 assert.equal(h.profile.honorV1,undefined);
 s.neon.guestsServed=100;
 const e=await h.run('equip',{titleId:'neon-owner',arcade:s});
 assert.equal(e.title,'Chủ Tiệm Neon');
 assert.equal(h.profile.honorV1.equipped,'neon-owner');
 assert.equal(h.profile.title,'Chủ Tiệm Neon');
 assert.equal((await h.run('equip',{titleId:'entity'})).title,'Thực Thể Ký Tự');
 s.mine.dug=160;s.garden.fish=10;s.jade.sold=12;
 await h.run('sync',{arcade:s});
 for(const id of ['neon-25','mine-40','garden-one','jade-first'])
  await h.run('pin',{achievementId:id});
 assert.equal(h.profile.honorV1.pinned.length,3);
 assert.deepEqual(h.profile.honorV1.pinned,['mine-40','garden-one','jade-first']);
 await h.run('pin',{achievementId:'garden-one'});
 assert.deepEqual(h.profile.honorV1.pinned,['mine-40','jade-first']);
 await assert.rejects(h.run('pin',{achievementId:'garden-dragon'}),
  e=>e.reason==='achievement-locked');
 h.auth.currentUser={uid:'stranger'};
 await assert.rejects(h.run('equip',{titleId:'entity'}),
  e=>e.reason==='invalid-account');
});

test('C4.6.1 local cosmetic unlock survives lagging cloud profile without publishing progress or Xu',async()=>{
 const h=fixture(),arcadeState=arcade.fresh();
 await assert.rejects(h.run('equip',{titleId:'reader',arcade:arcadeState}),
  e=>e.reason==='title-locked');
 const result=await h.run('equip',{titleId:'reader',arcade:arcadeState,
  localProfile:{readRewards:{'chapter-read-locally':true},currency:999999,
   inventory:[{id:'forged-item'}],exp:999999}});
 assert.equal(result.title,'Lữ Khách Trang Sách');
 assert.ok(h.profile.honorV1.earned.includes('read-one'));
 assert.equal(h.profile.title,'Lữ Khách Trang Sách');
 assert.deepEqual(h.profile.readRewards,{});
 assert.deepEqual(h.profile.inventory,[{id:'item-old'}]);
 assert.equal(h.profile.currency,215);
 assert.equal(h.profile.exp,40);
 assert.equal((await h.run('sync',{localProfile:{readRewards:{'chapter-read-locally':true}}})).status,
  'already-applied');
});

test('C4.6.3 owner can reconcile device-only title and pinned medals atomically',async()=>{
 const h=fixture();
 const localProfile={readRewards:{chapter1:true},currency:999999};
 const result=await h.run('preferences',{titleId:'reader',pinnedIds:['read-one'],localProfile});
 assert.equal(result.title,'Lữ Khách Trang Sách');
 assert.equal(h.profile.honorV1.equipped,'reader');
 assert.deepEqual(h.profile.honorV1.pinned,['read-one']);
 assert.equal(h.profile.currency,215);
 assert.equal((await h.run('preferences',{titleId:'reader',pinnedIds:['read-one']})).status,
  'already-applied');
 await assert.rejects(h.run('preferences',{titleId:'reader',pinnedIds:['read-six'],
  localProfile}),e=>e.reason==='achievement-locked');
 await assert.rejects(h.run('preferences',{titleId:'reader',pinnedIds:Array(4).fill('read-one')}),
  e=>e.reason==='achievement-locked');
 assert.deepEqual(h.profile.honorV1.pinned,['read-one']);
});

test('C4.6.1 live Honor Hall equips a title unlocked on the phone before profile sync',async()=>{
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.listeners={};
   this.textContent='';this.className='';this.disabled=false;}
  append(...xs){this.children.push(...xs);}
  replaceChildren(...xs){this.children=xs;}
  setAttribute(k,v){this[k]=v;}
  addEventListener(k,fn){this.listeners[k]=fn;}
 }
 const h=fixture(),nodes=new Map(['dudu-honor-home-title','dudu-honor-home-title-label',
  'dudu-honor-home-emblem','profile-title',
  'dudu-honor-content-c46'].map(id=>[id,new Node('div')]));
 const localProfile={title:'Thực Thể Ký Tự',readRewards:{'new-chapter':true},
  currency:123456,inventory:[{id:'local-only'}]};
 const store=new Map(),alerts=[],window={document:{getElementById:id=>nodes.get(id),
  createElement:tag=>new Node(tag)},DuduPersonalHonorC46:honor,
  DuduPersonalArcadeCoreV1:arcade,localStorage:{getItem:k=>store.get(k)||null,
   setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  DuduAuth:{isReady:()=>true,uid:()=> 'du'},
  firebase:{firestore:()=>h.db,auth:()=>h.auth},
  showSystemAlert:(head,body)=>alerts.push({head,body}),updatePhoneUI:()=>{}};
 const code=readFileSync(join(__dirname,'../js/personal-honor-ui-c46.js'),'utf8');
 const context={window,document:window.document,currentUsername:'du',
  IS_SANDBOX_MODE:false,userProfile:localProfile};
 vm.runInNewContext(code,context);
 assert.equal(window.DuduHonorUIV46.render(),true);
 const flatten=n=>[n,...n.children.flatMap(flatten)];
 const actions=flatten(nodes.get('dudu-honor-content-c46'));
 const equip=actions.find(n=>n.className==='dudu-honor-action'&&n.textContent==='Sử dụng');
 assert.ok(equip);
 equip.listeners.click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.profile.title,'Lữ Khách Trang Sách');
 assert.equal(h.profile.currency,215);
 assert.deepEqual(h.profile.readRewards,{});
 assert.equal(localProfile.honorV1.equipped,'reader');
 assert.ok(alerts.some(x=>x.head==='ĐÃ TRANG BỊ DANH HIỆU'));
 const normalRunTransaction=h.db.runTransaction;
 let deniedCount=0;
 h.db.runTransaction=async()=>{deniedCount++;throw Object.assign(new Error('permission-denied'),
  {code:'permission-denied'});};
 window.DuduHonorUIV46.render();
 const retry=flatten(nodes.get('dudu-honor-content-c46'))
  .find(n=>n.className==='dudu-honor-action'&&n.textContent==='Sử dụng');
 assert.ok(retry);retry.listeners.click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(alerts.some(x=>x.head==='ĐÃ LƯU TRÊN THIẾT BỊ'&&
  x.body.includes('bị từ chối')));
 assert.equal(h.profile.title,'Lữ Khách Trang Sách');
 assert.equal(JSON.parse(store.get('dudu-honor-device-v1:du')).equipped,'entity');
 assert.equal(localProfile.title,'Lữ Khách Trang Sách');
 assert.equal(nodes.get('dudu-honor-home-title-label')?.textContent,'Thực Thể Ký Tự');
 // A fresh page reads the cloud title, then reapplies the UID-bound local
 // cosmetic nameplate without mutating the cloud profile.
 context.userProfile=copy(h.profile);
 vm.runInNewContext(code,context);
 assert.equal(nodes.get('dudu-honor-home-title-label').textContent,'Thực Thể Ký Tự');
 assert.equal(h.profile.title,'Lữ Khách Trang Sách');
 window.DuduHonorUIV46.render();
 const achievementsTab=flatten(nodes.get('dudu-honor-content-c46'))
  .find(n=>n.tag==='button'&&n.textContent==='Thành tựu');
 assert.ok(achievementsTab);achievementsTab.listeners.click();
 const pin=flatten(nodes.get('dudu-honor-content-c46'))
  .find(n=>n.className==='dudu-honor-pin'&&n.textContent==='☆');
 assert.ok(pin);pin.listeners.click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(JSON.parse(store.get('dudu-honor-device-v1:du')).pinned.includes('read-one'));
 assert.equal(h.profile.honorV1.pinned.length,0);
 const before=deniedCount;
 window.DuduHonorUIV46.render();
 const unpin=flatten(nodes.get('dudu-honor-content-c46'))
  .find(n=>n.className.includes('dudu-honor-pin')&&n.textContent==='★');
 assert.ok(unpin);unpin.listeners.click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(JSON.parse(store.get('dudu-honor-device-v1:du')).pinned,[]);
 assert.equal(deniedCount,before);
 // The operator can explicitly retry after publishing the restricted Rules.
 h.db.runTransaction=normalRunTransaction;
 window.DuduHonorUIV46.render();
 const syncButton=flatten(nodes.get('dudu-honor-content-c46'))
  .find(n=>n.tag==='button'&&n.textContent==='Thử đồng bộ');
 assert.ok(syncButton);syncButton.listeners.click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(store.has('dudu-honor-device-v1:du'),false);
 assert.equal(h.profile.honorV1.equipped,'entity');
 assert.deepEqual(h.profile.honorV1.pinned,[]);
 assert.ok(alerts.some(x=>x.head==='ĐÃ ĐỒNG BỘ VINH DANH'));
});

test('C4.6 phone shows equipped title, collectible tabs and preserves compact Arcade layout',()=>{
 const html=readFileSync(join(__dirname,'../index.html'),'utf8');
 const arcadeUi=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 const css=readFileSync(join(__dirname,'../css/personal-honor-c46.css'),'utf8');
 for(const id of ['phone-app-honors','dudu-honor-home-title','dudu-honor-home-title-label',
  'dudu-honor-home-emblem','dudu-honor-profile-summary',
  'dudu-honor-content-c46'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/DuduHonorUIV46\?\.open\(\)/);
 assert.match(html,/DuduHonorUIV46\?\.refresh\?\.\(\)/);
 assert.match(arcadeUi,/DuduHonorUIV46\?\.observeArcade\?\.\(candidate,previousState\)/);
 assert.match(css,/\.dudu-honor-identity-frame/);
 assert.match(css,/\.dudu-honor-home-chip/);
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.listeners={};
   this.textContent='';this.className='';this.disabled=false;}
  append(...xs){this.children.push(...xs);}
  replaceChildren(...xs){this.children=xs;}
  setAttribute(k,v){this[k]=v;}
  addEventListener(k,fn){this.listeners[k]=fn;}
  closest(selector){return selector==='.dudu-honor-identity-frame'?
   nodes.get('dudu-honor-identity-frame'):null;}
 }
 const nodes=new Map(['dudu-honor-home-title','dudu-honor-home-title-label',
  'dudu-honor-home-emblem','dudu-honor-home-rarity','dudu-honor-identity-frame',
  'dudu-honor-profile-count',
  'dudu-honor-profile-summary','profile-title','dudu-honor-content-c46'].map(id=>[id,new Node('div')]));
 const window={document:{getElementById:id=>nodes.get(id),createElement:tag=>new Node(tag)},
  DuduPersonalHonorC46:honor,DuduPersonalArcadeCoreV1:arcade,
  localStorage:{getItem:()=>null},DuduAuth:{uid:()=>null,isReady:()=>false}};
 const ctx={window,document:window.document,currentUsername:'demo',IS_SANDBOX_MODE:true,
  saveCurrentAccount:()=>{},
  userProfile:{title:'Thực Thể Ký Tự',honorV1:{version:1,earned:['neon-25'],equipped:'neon-owner',pinned:['neon-25']}}};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-honor-ui-c46.js'),'utf8'),ctx);
 assert.match(nodes.get('dudu-honor-home-title-label').textContent,/Chủ Tiệm Neon/);
 assert.equal(nodes.get('dudu-honor-home-title').dataset.rarity,'rare');
 assert.equal(nodes.get('dudu-honor-identity-frame').dataset.rarity,'rare');
 assert.equal(nodes.get('dudu-honor-home-rarity').textContent,'VINH DANH · HIẾM');
 assert.equal(nodes.get('dudu-honor-profile-summary').children[0].dataset.rarity,'rare');
 assert.equal(nodes.get('dudu-honor-profile-summary').children.length,1);
 assert.equal(window.DuduHonorUIV46.render(),true);
 const root=nodes.get('dudu-honor-content-c46');
 assert.ok(root.children.length>=3);
 assert.equal(root.children[0].dataset.rarity,'rare');
 const flatten=n=>[n,...n.children.flatMap(flatten)];
 const titleTab=flatten(root).find(n=>n.className==='dudu-honor-action'&&n.textContent==='Sử dụng');
 assert.ok(titleTab);titleTab.listeners.click();
 assert.equal(ctx.userProfile.honorV1.equipped,'entity');
 assert.equal(ctx.userProfile.title,'Thực Thể Ký Tự');
 assert.equal(nodes.get('dudu-honor-home-rarity').textContent,'VINH DANH · THƯỜNG');
 // C4.7: title rarity derives solely from the canonical Honor catalog.
 ctx.userProfile.honorV1={version:1,earned:['neon-100'],equipped:'neon-tycoon',pinned:['neon-100']};
 window.DuduHonorUIV46.render();
 assert.equal(nodes.get('dudu-honor-home-title').dataset.rarity,'epic');
 assert.equal(nodes.get('dudu-honor-identity-frame').dataset.rarity,'epic');
 assert.equal(nodes.get('dudu-honor-home-rarity').textContent,'VINH DANH · SỬ THI');
 assert.equal(nodes.get('dudu-honor-profile-summary').children[0].dataset.rarity,'epic');
 assert.equal(root.children[0].dataset.rarity,'epic');
 ctx.userProfile.honorV1={version:1,earned:['garden-dragon'],equipped:'garden-legend',pinned:['garden-dragon']};
 window.DuduHonorUIV46.render();
 assert.equal(nodes.get('dudu-honor-home-title').dataset.rarity,'mythic');
 assert.equal(nodes.get('dudu-honor-home-rarity').textContent,'VINH DANH · HUYỀN THOẠI');
 assert.equal(nodes.get('dudu-honor-profile-summary').children[0].dataset.rarity,'mythic');
 assert.equal(root.children[0].dataset.rarity,'mythic');
});

test('C4.7 rarity finish is compact, collectible, accessible and motion-safe',()=>{
 const html=readFileSync(join(__dirname,'../index.html'),'utf8');
 const css=readFileSync(join(__dirname,'../css/personal-honor-c46.css'),'utf8');
 assert.match(html,/id="dudu-honor-home-rarity"/);
 assert.match(html,/personal-honor-c46\.css\?v=c411-1/);
 assert.match(html,/personal-honor-ui-c46\.js\?v=c411-1/);
 for(const tier of ['common','rare','epic','mythic']){
  assert.match(css,new RegExp('dudu-honor-home-chip\\[data-rarity="'+tier+'"\\]'));
  assert.match(css,new RegExp('dudu-honor-hero\\[data-rarity="'+tier+'"\\]'));
 }
 assert.match(css,/\.dudu-honor-card\.is-equipped\[data-rarity="mythic"\]/);
 assert.match(css,/duduHonorSweep/);
 assert.match(css,/duduHonorPulse/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(css,/animation:none!important/);
 assert.match(css,/overflow:hidden;border:1px solid transparent/);
});
