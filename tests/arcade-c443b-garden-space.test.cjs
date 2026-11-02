'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8');

test('C4.43B garden crops stay compact above the AI lake on phones',()=>{
 const css=read('css/arcade-c443b-garden-space.css');
 const html=read('index.html');
 const ui=read('js/personal-arcade-ui-v1.js');
 assert.match(html,/arcade-c443-pond-ai\.css\?v=c443c-1[\s\S]*?arcade-c443b-garden-space\.css\?v=c443b-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=c443c-1/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/\.garden-expanded \.garden-plot-area/);
 assert.match(css,/\.garden-plot\{\s*height:120px!important/);
 assert.match(css,/\.garden-crop-sprite\{\s*width:min\(86%,92px\)/);
 assert.match(css,/\.garden-plot\.empty \.garden-soil/);
 assert.match(ui,/aria-label="Luống \$\{index\+1\}/,'Screen readers keep full plot identity');
 assert.match(ui,/class="garden-plot-label"><b>\$\{String\(index\+1\)/,'Visible labels no longer repeat LUỐNG');
});
