'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const {join}=require('node:path');
const honor=require('../js/personal-honor-c46.js');
const root=join(__dirname,'..');
const css=readFileSync(join(root,'css/honor-presentation-c437p.css'),'utf8');
const ui=readFileSync(join(root,'js/personal-honor-ui-c46.js'),'utf8');
const html=readFileSync(join(root,'index.html'),'utf8');

test('C4.37P: every title has a unique assigned illustration slot',()=>{
 assert.equal(honor.TITLES.length,20,'Artwork is tied to the canonical 20-title collection');
 const all=honor.TITLES.map(t=>t.id);
 assert.equal(new Set(all).size,all.length);
 for(const id of all){
  assert.ok(css.includes(`[data-honor-art="${id}"]`),`${id} has an illustration rule`);
  const occurrences=css.match(new RegExp(`\\[data-honor-art="${id}"\\]`,'g'))||[];
  assert.equal(occurrences.length,2,`${id} has exactly one atlas and one slot`);
 }
 for(let i=1;i<=5;i++){
  assert.ok(css.includes(`honor-atlas-${i}.webp`));
  const path=join(root,`assets/honor-c437p/honor-atlas-${i}.webp`);
  const bytes=readFileSync(path);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(statSync(path).size<410_000,`Atlas ${i} is lightweight on mobile`);
 }
});

test('C4.37P: locked secrets, account ownership and small screens remain protected',()=>{
 assert.match(ui,/if\(!secret\)illustrated\(symbol,t\.id\)/);
 assert.match(ui,/hidden\?null:a\.titleId/);
 assert.match(ui,/illustrated\(emblem,selected\.id\)/);
 assert.match(css,/\.dudu-honor-title-card\.is-locked \.dudu-honor-symbol/);
 assert.match(css,/@media \(max-width:390px\)/);
 assert.match(css,/@media \(max-width:340px\)/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(html,/honor-presentation-c437p\.css\?v=c437p-1/);
 assert.match(html,/personal-honor-ui-c46\.js\?v=c412-1[^"\n]*art=c437p-1/);
 assert.doesNotMatch(ui,/writeDevicePreferences\(.*honorArt/);
 assert.equal(honor.CATALOG.length,44,'Achievement ledger is unchanged');
});
