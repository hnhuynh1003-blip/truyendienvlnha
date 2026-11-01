'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=path=>readFileSync(join(root,path));

test('C4.39R3 gallery backgrounds are original, lightweight single-stand WebP art',()=>{
 for(const name of ['solo-hall.webp','solo-rotunda.webp']){
  const path='assets/museum-c439r3/'+name,bytes=read(path);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(statSync(join(root,path)).size<500000,name+' must be phone-friendly');
 }
 const css=read('css/museum-stage-c439r3.css').toString('utf8');
 const index=read('index.html').toString('utf8');
 assert.match(css,/\.museum-c429-scene-trophies\{[\s\S]*?solo-rotunda\.webp/);
 assert.match(css,/\.museum-c426-stage\{[\s\S]*?solo-hall\.webp/);
 assert.match(css,/\.dudu-c439-scene\{[\s\S]*?solo-hall\.webp/);
 assert.match(css,/background-position:center 50%;background-size:cover/);
 assert.match(css,/\.museum-c429-feature-art\{\s*top:7%;height:51%/);
 assert.match(index,/museum-stage-c439r2\.css\?v=c439r2-3[\s\S]*museum-stage-c439r3\.css\?v=c439r3-1/);
 assert.equal((css.match(/\.webp'\)/g)||[]).length,3,
  'one rotunda and one hall backdrop, with hall shared between two wings');
});

test('C4.39R3 only changes staging; ownership and Season 01 stay protected',()=>{
 const season=read('js/personal-arcade-season-c423.js').toString('utf8');
 const vault=read('js/museum-vault-c426.js').toString('utf8');
 const display=read('js/arcade-showcase-ui-c439.js').toString('utf8');
 assert.match(season,/PHASE='preview'/);
 assert.match(vault,/Năm báu vật Mùa 1 xem trước/);
 assert.match(display,/Cá quý có Thủy Cung riêng/);
 assert.doesNotMatch(display,/scene\.append\(light,el\('div','dudu-c439-plinth'/);
 const css=read('css/museum-stage-c439r3.css').toString('utf8');
 assert.doesNotMatch(css,/data-arcade|localStorage|firestore|claim|wallet/i);
});
