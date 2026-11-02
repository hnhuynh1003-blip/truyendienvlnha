'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8');

test('C4.45 plants move into a compact farm sheet and leave the AI lake clear',()=>{
 const css=read('css/arcade-c445-garden-popup.css');
 const html=read('index.html');
 const ui=read('js/personal-arcade-ui-v1.js');
 assert.match(html,/arcade-c443b-garden-space\.css\?v=c443b-1[\s\S]*?arcade-c445-garden-popup\.css\?v=c445-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=c445-1/);
 assert.match(ui,/data-arcade-drawer="\$\{name\}"/);
 assert.match(ui,/drawerButton\('Vườn cây'/);
 assert.match(ui,/class="garden-farm-workbench" data-arcade-panel="garden-seeds"/);
 assert.match(ui,/class="garden-plot-area" role="group" aria-label="Luống cây"/);
 assert.doesNotMatch(ui,/class="garden-plot-area">/,'No more plant overlay in the lake');
 assert.match(ui,/class="garden-quick-actions"/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.garden-farm-workbench \.garden-plot\{/);
 assert.match(css,/\.garden-farm-workbench \.garden-plot \.garden-crop-sprite\{/);
 assert.match(css,/max-height:min\(80dvh,690px\)/);
 assert.match(ui,/aria-label="Luống \$\{index\+1\}/,'Screen readers keep full plot identity');
 assert.match(ui,/class="garden-plot-label"><b>\$\{String\(index\+1\)/,'Visible labels no longer repeat LUỐNG');
});
