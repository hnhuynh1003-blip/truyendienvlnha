'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const root=join(__dirname,'..');
const source=path=>readFileSync(join(root,path),'utf8');

test('C4.57c includes three actual distinct transparent WebP sprite atlases',()=>{
 const digests=new Set();
 for(const setting of ['jade','silver','gold']){
  const file=join(root,`assets/arcade-c457c/jade-jewelry-${setting}.webp`);
  const bytes=readFileSync(file);
  assert.equal(bytes.toString('ascii',8,12),'WEBP',setting);
  assert.ok(statSync(file).size>50000,`Missing real ${setting} jewelry artwork`);
  assert.ok(statSync(file).size<450000,`${setting} sheet must stay mobile-friendly`);
  digests.add(createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(digests.size,3,'Each material must have its own rendered art');
 const css=source('css/arcade-jewelry-c457c.css');
 for(const setting of ['jade','silver','gold'])assert.match(css,new RegExp(`jade-jewelry-${setting}\\.webp`));
 assert.match(css,/background-size:400% 300%/);
 for(const craft of Object.keys(jade.CRAFTS))assert.ok(css.includes(`.jade-jewelry-${craft}`));
 for(let design=0;design<3;design++)assert.ok(css.includes(`.jade-jewelry-design-${design}`));
 for(let setting=0;setting<3;setting++)assert.ok(css.includes(`.jade-jewelry-setting-${setting}`));
});

test('C4.57c one matching real sprite appears on stage, in vault and in exhibition',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(source('js/personal-jade-ui-v1.js'),{window});
 const ui=window.DuduPersonalJadeUIV1;
 const time=1793450000000;
 let state=arcade.fresh(time);state.coins=10000;
 for(const craft of Object.keys(jade.CRAFTS)){
  for(let design=0;design<3;design++){
   for(let setting=0;setting<3;setting++){
    const piece={...jade.generate(0,2,.6),id:100+design*3+setting,phase:'crafted',
     craft,design,setting,grade:5,flaw:'perfect',size:7};
    state.jade.active=piece;
    state.jade.vault=[{...piece}];
    state.jade.exhibits=[{...piece}];
    ui.chooseDesign(design);ui.chooseSetting(setting);
    const html=ui.panel(state);
    const classes=`jade-jewelry-sprite jade-jewelry-${craft} jade-jewelry-design-${design} jade-jewelry-setting-${setting}`;
    assert.ok(html.split(classes).length>=5,`Missing consistent ${craft}/${design}/${setting} art`);
    assert.doesNotMatch(html,/jade-finish-emblem|jade-jewel-variant/);
   }
  }
 }
 const shell=source('index.html');
 assert.match(shell,/arcade-jewelry-c457c\.css\?v=c457c-1/);
 assert.match(shell,/personal-jade-ui-v1\.js[^"\n]*c457c=1/);
});

test('C4.57c raw and cut gems still use their existing jade artwork, and old rim is removed',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(source('js/personal-jade-ui-v1.js'),{window});
 const state=arcade.fresh(1793450000000);
 state.jade.active={...jade.generate(0,2,.6),phase:'cut',grade:3,flaw:'perfect'};
 const html=window.DuduPersonalJadeUIV1.panel(state);
 const stage=html.split('jade-stage-base')[0];
 assert.match(stage,/jade-item-art jade-item-gem jade-tier-/);
 assert.doesNotMatch(stage,/jade-item-art jade-jewelry-sprite/);
 assert.doesNotMatch(source('css/personal-arcade-v1.css'),/\.jade-finish-emblem|\.jade-jewel-variant/);
});
