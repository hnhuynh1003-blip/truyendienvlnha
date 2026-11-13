'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const core=require('../js/personal-arcade-core-v1.js');
const TIME=1793360000000;
const read=path=>readFileSync(join(__dirname,'..',path),'utf8');

function jadePanel(state){
 const window={DuduPersonalArcadeCoreV1:core};
 vm.runInNewContext(read('js/personal-jade-ui-v1.js'),{window});
 return window.DuduPersonalJadeUIV1.panel(state);
}

test('C4.56 rough-stone actions are compact, show actual costs, and keep every action ID',()=>{
 let state=core.fresh(TIME);
 state=core.act(state,'jade-buy-0',TIME,.6).state;
 const raw=jadePanel(state);
 assert.match(raw,/jade-stone-workbench/);
 assert.match(raw,/class="jade-tool-action jade-tool-gold" data-arcade-action="jade-window"/);
 assert.match(raw,/class="jade-tool-action jade-tool-emerald" data-arcade-action="jade-cut"/);
 assert.match(raw,/data-arcade-action="jade-store"/);
 assert.doesNotMatch(raw,/Thiếu tiền cắt\?|Trả lại đá nguyên vỏ|Chạm để soi|Đổi viên khác/);
 assert.match(raw,/Miễn phí/,'The free starter stone should have a genuine zero-cost badge');
 state=core.act(state,'jade-window',TIME,.6).state;
 const windowed=jadePanel(state);
 assert.match(windowed,/data-arcade-action="jade-sell-window"/);
 assert.match(windowed,/data-arcade-action="jade-cut"/);
 assert.match(windowed,/jade-tool-copy/);
 assert.doesNotMatch(windowed,/Giá thay đổi theo thị trường sắc ngọc/);
});

test('C4.56 paid raw stone exposes salvage value with a short secondary control',()=>{
 let state=core.fresh(TIME);state.coins=1000;
 state=core.act(state,'jade-buy-0',TIME,.6).state;
 state=core.act(state,'jade-cut',TIME,.6).state;
 state=core.act(state,'jade-sell',TIME,.6).state;
 state=core.act(state,'jade-buy-0',TIME,.6).state;
 const html=jadePanel(state);
 assert.match(html,/data-arcade-action="jade-sell-raw"/);
 assert.match(html,/title="Thanh lý đá thô: thu hồi 25% giá mua/);
 assert.match(html,/jade-salvage-button/);
 assert.doesNotMatch(html,/jade-recovery-compact/);
});

test('C4.56 Neon tick only repaints on events belonging to the selected game',()=>{
 const ui=read('js/personal-arcade-ui-v1.js');
 assert.match(ui,/const activeGameChanged=tab==='neon'\?customerServed\|\|boostExpired\|\|turboReady\|\|nextOrder\|\|missedBeat/);
 assert.match(ui,/tab==='mine'\?completedRepair/);
 assert.match(ui,/tab==='garden'\?waterRefilled\|\|bubbleAppeared\|\|plantMatured/);
 assert.match(ui,/tab==='jade'&&\(craftReady\|\|orderReady\|\|rerollReady\)/);
 assert.match(ui,/lastRenderedKey!==activeKey\|\|activeGameChanged/);
 assert.match(ui,/refreshNeonBeatStep\(\)\)return true;/,
  'Correct arrow presses should patch only the counter instead of rebuilding the full café');
});

test('C4.56 Neon smooths marker and eliminates animated heavy pod filter',()=>{
 const css=read('css/arcade-c425d-play-surface.css');
 const ui=read('js/personal-arcade-ui-v1.js');
 assert.match(css,/animation:c456-neon-pod-breathe/);
 assert.match(css,/@keyframes c456-neon-pod-breathe\{\s*from\{opacity:/);
 assert.match(css,/animation:c456-neon-hit-sweep/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(ui,/--neon-hit-elapsed:/);
 assert.match(ui,/root\.matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
 const index=read('index.html');
 assert.match(index,/css\/arcade-c425d-play-surface\.css\?v=c425d-2&amp;c456=1/);
 assert.match(index,/js\/personal-arcade-ui-v1\.js[^"\n]+&amp;c456=1/);
});
