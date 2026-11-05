'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=file=>readFileSync(join(root,file),'utf8');

test('C4.46c pauses only Van Gioi entry points while Library and Arcade remain available',()=>{
 const ui=read('js/site-shell-v60.js');
 const html=read('index.html');
 assert.match(ui,/const WORLDS_PAUSED=window\.DuduFeaturesT0\?\.worlds!==true/);
 assert.ok(ui.indexOf('if(WORLDS_PAUSED){')<ui.indexOf('const taxonomy=window.DuduWorldTaxonomyV66;',ui.indexOf('function fillWorlds()')));
 assert.match(ui,/root\.append\(seal\);\s*return;/,'World cards and playtest links never render while sealed');
 assert.match(ui,/WORLDS_PAUSED&&n\.id==='d60-world-creator-launch'/);
 assert.match(ui,/if\(!WORLDS_PAUSED\)root\.append\(button\('◇ Khung kịch bản'/);
 assert.match(ui,/window\.DuduSiteV60=\{navigate,refresh/,'Library navigation remains available');
 assert.match(html,/site-shell-v60\.js\?v=l2d2-1&amp;pause=c446c-1/);
});

test('C4.46c garden selection cards are compact and navigation is one icon',()=>{
 const ui=read('js/personal-arcade-ui-v1.js');
 const css=read('css/arcade-c445-garden-popup.css');
 assert.match(ui,/class="garden-sheet-back"[^']*?>‹<\/button>/);
 assert.match(ui,/aria-label="Quay về bốn trò chơi"/);
 assert.match(css,/min-width:0;min-height:61px;padding:5px 3px/);
 assert.match(css,/\.garden-seed\{min-height:58px;padding:4px 2px\}/);
});

test('C4.46c CI skips the paused worlds while preserving NPC AI and reading checks',()=>{
 const fast=read('.github/workflows/phase1-smoke.yml');
 const world=read('.github/workflows/vangioi-manual-paused.yml');
 const worker=read('.github/workflows/npc-ai-worker-changes.yml');
 assert.doesNotMatch(fast,/node tests\/browser-vangioi-|node tools\/vangioi\/|contracts\/vangioi\/|npm test --prefix cloudflare/);
 assert.match(fast,/NPC AI request and Gemini regression/);
 assert.match(fast,/browser-arcade-garden-c446b\.cjs/);
 assert.match(fast,/browser-library-catalog-l2e\.cjs/);
 assert.match(world,/workflow_dispatch:/);
 assert.doesNotMatch(world,/^  push:|^  pull_request:/m);
 assert.match(worker,/cloudflare\/src\/\*\*/);
});
