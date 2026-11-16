'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Permanent retirement cannot be enabled by query, storage or compatibility loaders',async()=>{
 let effects=0;
 const window={location:{search:'?worlds=true&archive=1&legacy=1'},localStorage:{getItem:()=> 'true',setItem:()=>effects++},document:{createElement:()=>{effects++;throw Error('script forbidden');},addEventListener:()=>effects++}};
 vm.runInNewContext(read('js/features-t0.js'),{window});
 assert.equal(window.DuduFeaturesT0.worlds,false);assert.ok(Object.isFrozen(window.DuduFeaturesT0));
 assert.equal(await window.DuduFeaturesT0.loadLegacy(),false);
 assert.equal(await window.DuduFeaturesT0.restoreArchive(),false);assert.equal(effects,0);
 assert.doesNotMatch(read('js/features-t0.js'),/createElement|append|setItem|indexedDB|fetch\(/);
});
test('Retired URLs are notices with no gameplay, assets or database operations',()=>{
 for(const file of ['dudu-pilot.html','playtests/ben-suong/index.html','playtests/tang-may-9/index.html','playtests/he-thong-erro/index.html']){
  const s=read(file);assert.match(s,/Vạn Giới đã ngừng hoạt động/);
  assert.doesNotMatch(s,/<script|<img|<iframe|<link|indexedDB|localStorage|firebase/);
 }
});
test('Retirement leaves Shop, collection, story metadata and Tu Tien identity contracts loaded',()=>{
 const html=read('index.html');assert.doesNotMatch(html,/application\/x-dudu-archive|data-src="js\/(?:world-|vangioi-|dudu-story-engine)/);
 for(const file of ['world-items-v44-1','world-collection-v44-1','item-catalog-v2','story-market-v43','market-ui-v43','economy-live-v52','cultivation-t0'])assert.ok(html.includes('js/'+file+'.js'),file);
 assert.match(html,/DuduCultivationIdentityT0=Object\.freeze/);
 const cultivation=read('js/cultivation-t0.js');assert.doesNotMatch(cultivation,/loadLegacy|Thiên Mệnh cũ|setItem|runTransaction|db\.collection/);
 assert.match(cultivation,/same Firebase UID/);assert.match(cultivation,/single profile EXP/);
 for(const [file] of Object.entries(JSON.parse(read('docs/vangioi-retirement/deleted-files.json'))))assert.equal(fs.existsSync(path.join(__dirname,'..',file)),false,file);
});
test('Every local active index script and stylesheet resolves after cleanup',()=>{
 const html=read('index.html');
 for(const [,url] of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="((?:js|css)\/[^"?]+)(?:\?[^" ]*)?"/g))assert.ok(fs.existsSync(path.join(__dirname,'..',url)),url);
});
