'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const {join}=require('node:path');
const file=p=>join(__dirname,'..',p);
const src=p=>readFileSync(file(p),'utf8');

test('C4.24 ships optimized real illustrated assets, no placeholder icon glyphs',()=>{
 const names=['s01-moon-sanctuary.webp','s01-relic-atlas.webp','s01-founder-crest.webp'];
 for(const name of names){
  const art=file('assets/arcade-season/'+name);
  const data=readFileSync(art);
  assert.equal(data.toString('ascii',8,12),'WEBP',name+' must be valid WebP');
  assert.ok(statSync(art).size>15000,name+' should contain rendered art');
 }
 assert.ok(names.reduce((sum,name)=>sum+statSync(file('assets/arcade-season/'+name)).size,0)<600000,
  'Mobile asset payload should stay below 600 KB');
 const ui=src('js/personal-arcade-ui-v1.js');
 assert.match(ui,/class="arcade-season-relic arcade-season-exhibit/);
 assert.match(ui,/class="arcade-season-exhibit-art" aria-hidden="true"/);
 assert.doesNotMatch(ui,/class="arcade-season-relic-art"/);
 assert.match(ui,/data-arcade-season-go="\$\{item\.id\}"/);
 assert.match(ui,/class="arcade-season-final-crest" aria-hidden="true"><\/span>/);
});

test('C4.24 artifact gallery has unique atlas coordinates and readable responsive titles',()=>{
 const css=src('css/arcade-season-c424-art.css');
 assert.match(css,/s01-moon-sanctuary\.webp/);
 assert.match(css,/s01-founder-crest\.webp/);
 assert.match(css,/s01-relic-atlas\.webp/);
 for(const [theme,position] of Object.entries({cyan:'left top',violet:'right top',rose:'left bottom',gold:'right bottom'}))
  assert.match(css,new RegExp(`\\.season-theme-${theme} \\.arcade-season-exhibit-art\\{background-position:${position}\\}`));
 assert.match(css,/\.arcade-season-relic-grid\{\s*display:flex;flex-direction:column/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const html=src('index.html');
 assert.match(html,/arcade-season-c424-art\.css\?v=c424-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=c424-1/);
});
