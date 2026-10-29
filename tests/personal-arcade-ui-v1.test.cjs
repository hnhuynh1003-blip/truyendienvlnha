'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const core=require('../js/personal-arcade-core-v1.js');

function harness(){
 const db=new Map(),listeners={};let uid='reader-one';
 const notice={textContent:''};
 const host={innerHTML:'',scrollTop:0,listeners:{},
  querySelector:()=>notice,addEventListener(name,fn){this.listeners[name]=fn;}};
 const app={style:{display:'flex'}};
 const document={getElementById:id=>id==='personal-arcade-v1'?host:
  id==='phone-app-arcade'?app:null};
 const window={document,DuduPersonalArcadeCoreV1:core,
  DuduAuth:{uid:()=>uid,isReady:()=>!!uid},
  localStorage:{getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v)},
  setInterval:fn=>{listeners.tick=fn;return 1;},
  addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const source=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 vm.runInNewContext(source,{window,document});
 return {db,host,notice,window,listeners,setUid:next=>{uid=next;}};
}

test('Arcade phone UI renders three named tabs and a disabled transfer control',()=>{
 const {host,window}=harness();
 assert.equal(window.DuduPersonalArcadeUIV1.render(),true);
 assert.match(host.innerHTML,/Trạm Neon/);
 assert.match(host.innerHTML,/Địa Tầng 07/);
 assert.match(host.innerHTML,/Vườn Sương/);
 assert.match(host.innerHTML,/Chuyển vào ví Xu hệ thống · chờ Rules/);
 assert.match(host.innerHTML,/data-arcade-action="transfer" disabled/);
 assert.match(host.innerHTML,/LOCAL \/ FREE/);
 assert.match(host.innerHTML,/arcade-stage neon-stage/);
 assert.match(host.innerHTML,/neon-computer-rack/);
 assert.match(host.innerHTML,/\+0,01 <small>Xu \/ giây<\/small>/);
 assert.match(host.innerHTML,/data-arcade-action="cpu"/);
 assert.match(host.innerHTML,/data-arcade-action="gpu"/);
 assert.match(host.innerHTML,/data-arcade-action="station"/);
 assert.match(host.innerHTML,/neon-computer-2 is-locked/);
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
 assert.equal(window.DuduPersonalArcadeUIV1.interact('plant-0'),true);
 assert.match(host.innerHTML,/data-arcade-action="water-0"/);
});
test('Arcade UI requires login before any game save',()=>{
 const {db,host,window,setUid}=harness();setUid(null);
 window.DuduPersonalArcadeUIV1.render();
 assert.match(host.innerHTML,/Đăng nhập tài khoản/);
 assert.equal(window.DuduPersonalArcadeUIV1.interact('mine'),false);
 assert.equal(db.size,0);
});
