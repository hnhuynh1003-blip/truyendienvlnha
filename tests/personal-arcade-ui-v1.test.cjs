'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const core=require('../js/personal-arcade-core-v1.js');
const quotePolicy=require('../js/personal-arcade-exchange-v1.js');

function harness(options={}){
 const db=new Map(),listeners={};let uid='reader-one';
 const notice={textContent:''};
 const headerWallet={textContent:'',disabled:false,listeners:{},
  addEventListener(name,fn){this.listeners[name]=fn;}};
 const host={innerHTML:'',scrollTop:0,listeners:{},
  querySelector:()=>notice,addEventListener(name,fn){this.listeners[name]=fn;}};
 const app={style:{display:'flex'}};
 const document={getElementById:id=>id==='personal-arcade-v1'?host:
  id==='phone-app-arcade'?app:id==='arcade-header-wallet-v1'?headerWallet:null};
 const window={document,DuduPersonalArcadeCoreV1:core,
  DuduAuth:{uid:()=>uid,isReady:()=>!!uid},
  localStorage:{getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v),removeItem:k=>db.delete(k)},
  setInterval:fn=>{listeners.tick=fn;return 1;},
  addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const profile={currency:30};let savedProfiles=0,walletRefreshes=0;
 const context={window,document,userProfile:profile,
  saveCurrentAccount(){savedProfiles++;}};
 if(options.spark){
  const currentUser={uid:'reader-one'};
  const firestore={};
  window.DUDU_SPARK_EXCHANGE_V1_READY=true;
  window.DuduPersonalArcadeExchangeV1=quotePolicy;
  window.DuduPersonalSparkExchangeV1={
   requestId:()=> 'ex-12345678-1234-1234-1234-123456789abc',
   transfer:async args=>{assert.equal(args.uid,'reader-one');return {
    status:'credited',balance:31,walletXu:1,gameXu:10,id:args.id};}
  };
  window.firebase={auth:()=>({currentUser}),firestore:()=>firestore};
  window.renderWallet=()=>{walletRefreshes++;};
 }
 const source=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 vm.runInNewContext(source,context);
 return {db,host,notice,headerWallet,window,listeners,profile,
  getSavedProfiles:()=>savedProfiles,getWalletRefreshes:()=>walletRefreshes,
  setUid:next=>{uid=next;}};
}

test('Arcade phone UI renders three named tabs and a disabled transfer control',()=>{
 const {host,window,headerWallet}=harness();
 assert.equal(window.DuduPersonalArcadeUIV1.render(),true);
 assert.match(host.innerHTML,/Trạm Neon/);
 assert.match(host.innerHTML,/Địa Tầng 07/);
 assert.match(host.innerHTML,/Vườn Sương/);
 assert.equal(headerWallet.textContent,'🪙 0 Xu');
 assert.equal(headerWallet.disabled,false);
 assert.doesNotMatch(host.innerHTML,/CHƠI TỰ DO|arcade-topbar/);
 assert.match(host.innerHTML,/class="arcade-scroll"/);
 assert.match(host.innerHTML,/<nav class="arcade-tabs"/);
 assert.ok(host.innerHTML.indexOf('<nav class="arcade-tabs"')>
  host.innerHTML.indexOf('aria-label="Trạm Neon"'));
 assert.doesNotMatch(host.innerHTML,/arcade-privacy|LOCAL \/ FREE/);
 assert.match(host.innerHTML,/arcade-stage neon-stage/);
 assert.match(host.innerHTML,/neon-computer-rack/);
 assert.match(host.innerHTML,/\+0,01 <small>Xu \/ giây<\/small>/);
 assert.match(host.innerHTML,/data-arcade-action="cpu"/);
 assert.match(host.innerHTML,/data-arcade-action="gpu"/);
 assert.match(host.innerHTML,/data-arcade-action="station"/);
 assert.match(host.innerHTML,/data-arcade-action="router"/);
 assert.match(host.innerHTML,/data-arcade-action="skin"/);
 assert.match(host.innerHTML,/neon-computer-2 is-locked/);
 assert.match(host.innerHTML,/data-neon-service-track/);
 assert.match(host.innerHTML,/data-arcade-action="room-tier" disabled/);
 assert.match(host.innerHTML,/data-arcade-action="seating"/);
 assert.match(host.innerHTML,/data-arcade-action="ambiance"/);
 assert.match(host.innerHTML,/data-arcade-action="snack"/);
 assert.match(host.innerHTML,/data-arcade-action="neon-milestone-0"/);
 assert.match(host.innerHTML,/data-arcade-drawer="neon-upgrades"/);
 assert.match(host.innerHTML,/data-arcade-drawer="neon-awards"/);
 assert.match(host.innerHTML,/data-arcade-panel="neon-awards"/);
});
test('C4.3 clicking the header Arcade Xu opens the guarded exchange dialog',()=>{
 const {host,window,headerWallet}=harness();
 window.DuduPersonalArcadeUIV1.render();
 headerWallet.listeners.click();
 assert.match(host.innerHTML,/role="dialog"/);
 assert.match(host.innerHTML,/Chuyển Xu · Sắp mở/);
});
test('C4.2 expanded Neon room renders more machines and visitors without changing wallet',()=>{
 const {db,host,window}=harness();
 const game=core.fresh(Date.now());game.neon.roomTier=2;game.neon.stations=5;
 game.neon.seating=5;game.neon.guestsServed=54;
 db.set('dudu-personal-arcade:v1:reader-one',JSON.stringify(game));
 window.DuduPersonalArcadeUIV1.render();
 assert.match(host.innerHTML,/neon-room-tier-2/);
 assert.match(host.innerHTML,/neon-rack-wide/);
 assert.match(host.innerHTML,/neon-computer-5/);
 assert.match(host.innerHTML,/neon-guest/);
 assert.match(host.innerHTML,/54<\/b> khách/);
 assert.match(host.innerHTML,/data-arcade-action="station" disabled/);
});
test('Exchange opens from wallet and remains disabled until trusted Rules exist',()=>{
 const {host,window}=harness();
 window.DuduPersonalArcadeUIV1.render();
 const click=choice=>host.listeners.click({target:{closest:()=>({disabled:false,tagName:'BUTTON',
  dataset:{arcadeExchange:choice}})}});
 click('open');
 assert.match(host.innerHTML,/role="dialog"/);
 assert.match(host.innerHTML,/Chuyển Xu · Sắp mở/);
 assert.match(host.innerHTML,/data-arcade-action="transfer" disabled/);
 click('close');
 assert.doesNotMatch(host.innerHTML,/role="dialog"/);
});
test('Enabled personal exchange credits wallet once and deducts local Arcade coins',async()=>{
 const {db,host,window,profile,getSavedProfiles,getWalletRefreshes}=harness({spark:true});
 const key='dudu-personal-arcade:v1:reader-one';
 db.set(key,JSON.stringify({...core.norm(null,Date.now()),coins:250}));
 window.DuduPersonalArcadeUIV1.render();
 window.DuduPersonalArcadeUIV1.openExchange();
 assert.match(host.innerHTML,/✓ Chuyển vào Ví Xu/);
 assert.doesNotMatch(host.innerHTML,/data-arcade-action="transfer" disabled/);
 host.listeners.click({target:{closest:selector=>selector==='button'?{
  disabled:false,dataset:{arcadeAction:'transfer'}}:null}});
 await new Promise(resolve=>setImmediate(resolve));
 const game=JSON.parse(db.get(key));
 assert.equal(game.coins,150);
 assert.equal(profile.currency,31);
 assert.equal(getSavedProfiles(),1);
 assert.equal(getWalletRefreshes(),1);
 assert.equal(db.has('dudu-personal-arcade:exchange-pending-v1:reader-one'),false);
 assert.equal(db.get('dudu-personal-arcade:exchange-settled-v1:reader-one'),
  'ex-12345678-1234-1234-1234-123456789abc');
});
test('Arcade UI changes game tabs and stores a local UID-specific mining round',()=>{
 const {db,host,window,setUid}=harness();
 window.DuduPersonalArcadeUIV1.render();
 host.listeners.click({target:{closest:()=>({disabled:false,dataset:{arcadeTab:'mine'}})}});
 assert.match(host.innerHTML,/CORE \/ 07/);
 assert.match(host.innerHTML,/mine-ore-button/);
 assert.equal(window.DuduPersonalArcadeUIV1.interact('mine'),true);
 const key='dudu-personal-arcade:v1:reader-one',saved=JSON.parse(db.get(key));
 assert.equal(saved.mine.durability,99);
 assert.equal(saved.mine.dug,1);
 assert.match(host.innerHTML,/mine-drop/);
 setUid('reader-two');window.DuduPersonalArcadeUIV1.render();
 assert.match(host.innerHTML,/<b>100<small>\/100<\/small><\/b>/);
 assert.equal(db.has('dudu-personal-arcade:v1:reader-two'),false,
  'A new reader must not inherit or accidentally overwrite the prior user game');
});
test('Garden is a playable scene with plots and animated pond, not generic data tiles',()=>{
 const {host,window}=harness();
 window.DuduPersonalArcadeUIV1.render();
 host.listeners.click({target:{closest:()=>({disabled:false,dataset:{arcadeTab:'garden'}})}});
 assert.match(host.innerHTML,/garden-stage/);
 assert.match(host.innerHTML,/garden-plot-area/);
 assert.match(host.innerHTML,/garden-fish garden-fish-a/);
 assert.match(host.innerHTML,/data-arcade-action="plant-0"/);
 assert.match(host.innerHTML,/data-arcade-action="water-cap"/);
 assert.match(host.innerHTML,/data-arcade-action="pond-tier"/);
 assert.match(host.innerHTML,/garden-shore-lantern/);
 assert.match(host.innerHTML,/garden-bank-reeds/);
 assert.match(host.innerHTML,/garden-fishing-controls/);
 assert.match(host.innerHTML,/data-arcade-drawer="garden-album"/);
 assert.match(host.innerHTML,/data-arcade-panel="garden-album"/);
 assert.equal(window.DuduPersonalArcadeUIV1.interact('plant-0'),true);
 assert.match(host.innerHTML,/data-arcade-action="water-0"/);
});
test('C4.3 Arcade game helpers remain accessible in concise modal toolbars',()=>{
 const ui=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 const css=readFileSync(join(__dirname,'../css/personal-arcade-v1.css'),'utf8');
 assert.match(ui,/data-arcade-panel="mine-tools"/);
 assert.match(ui,/data-arcade-panel="mine-bag"/);
 assert.match(ui,/data-arcade-panel="garden-seeds"/);
 assert.match(ui,/data-arcade-panel="garden-upgrades"/);
 assert.match(ui,/sections\.map\(node=>node\.outerHTML\)/);
 assert.match(ui,/aria-modal="true" aria-label="\$\{drawerTitles\[drawerOpen\]\}"/);
 assert.match(css,/\.arcade-world \[data-arcade-panel\]\{display:none!important\}/);
 assert.match(css,/\.arcade-sheet-overlay/);
 assert.match(css,/\.arcade-fishing-controls|\.garden-fishing-controls/);
 const garden=ui.slice(ui.indexOf('function gardenPanel('),ui.indexOf('function render(){'));
 assert.ok(garden.indexOf('class="arcade-control-panel"')<garden.indexOf('garden-cast-button'),
  'Cast button must be below the pond scene, never overlaid on it');
});
test('C4.1 fishing presents a two-step reel control and an eight-species album',()=>{
 const {db,host,window}=harness();
 const key='dudu-personal-arcade:v1:reader-one';
 const state=core.fresh(Date.now());state.garden.bait=1;
 db.set(key,JSON.stringify(state));
 window.DuduPersonalArcadeUIV1.render();
 host.listeners.click({target:{closest:()=>({disabled:false,dataset:{arcadeTab:'garden'}})}});
 assert.match(host.innerHTML,/Sổ sưu tầm cá/);
 assert.match(host.innerHTML,/data-arcade-action="cast-line"/);
 assert.equal(window.DuduPersonalArcadeUIV1.interact('cast-line'),true);
 assert.match(host.innerHTML,/data-arcade-action="reel-line" disabled/);
 assert.match(host.innerHTML,/garden-fishing-line/);
 assert.match(host.innerHTML,/Phao đang chờ/);
 assert.equal(JSON.parse(db.get(key)).garden.fish,0);
});
test('Arcade UI requires login before any game save',()=>{
 const {db,host,window,setUid}=harness();setUid(null);
 window.DuduPersonalArcadeUIV1.render();
 assert.match(host.innerHTML,/Đăng nhập tài khoản/);
 assert.equal(window.DuduPersonalArcadeUIV1.interact('mine'),false);
 assert.equal(db.size,0);
});
