// Actual IndexedDB and reloads, synthetic authenticated loaders; no production traffic.
'use strict';const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:375,height:800}});await page.route('**/*',r=>r.request().url()==='http://localhost:39992/'?r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><body><div id="count"></div></body>'}):r.abort());
 async function boot(){await page.goto('http://localhost:39992/');for(const f of ['epub-catalog-device-cache-r1.js','epub-catalog-perf-r1.js'])await page.addScriptTag({path:path.join(__dirname,'../js',f)});
  await page.evaluate(()=>{
   window.__time=1000000;window.__allowed=true;window.__user={uid:'fixture-a'};window.__loads={v49:0,r2:0};window.__views=[];
   window.__rows=Array.from({length:1000},(_,i)=>({id:'epub-'+(i+1).toString(16).padStart(32,'0'),title:'Synthetic '+i,author:'Fixture',desc:'',genre:'',status:'Đang ra',_cloudV49:true,_r2V1:true,_r2Revision:'r-'+'a'.repeat(32),chapters:[{id:'chapter-001',title:'Chapter',wordCount:1,content:'NEVER_PERSIST'}]}));
   window.__cache=DuduEpubCatalogDeviceCacheR1.create({scope:'fixture-project|fixture-worker',now:()=>__time});
   window.__catalog=DuduEpubCatalogPerfR1.create({deviceCache:__cache,now:()=>__time,session:()=>__user,ready:()=>__allowed,loadV49:async()=>{__loads.v49++;return [];},loadR2:async()=>{__loads.r2++;return __rows;},onBooks:books=>{__views=books;document.getElementById('count').textContent=books.length;}});
  });await page.evaluate(()=>__catalog.refresh());}
 await boot();assert.deepEqual(await page.evaluate(()=>__loads),{v49:1,r2:1});assert.equal(await page.locator('#count').textContent(),'1000');
 await boot();assert.deepEqual(await page.evaluate(()=>__loads),{v49:0,r2:0});assert.equal(await page.locator('#count').textContent(),'1000');assert.deepEqual(await page.evaluate(()=>__catalog.snapshot().states),{v49:'cached',r2:'cached'});
 assert.equal(await page.evaluate(()=>__views.some(b=>b.chapters.some(c=>c.content!==null))),false);
 await page.evaluate(async()=>{__rows=__rows.slice(1);await __catalog.refresh({fresh:true});});assert.deepEqual(await page.evaluate(()=>__loads),{v49:1,r2:1});assert.equal(await page.locator('#count').textContent(),'999');
 await boot();assert.deepEqual(await page.evaluate(()=>__loads),{v49:0,r2:0});assert.equal(await page.locator('#count').textContent(),'999','manual refresh persisted deletion');
 await page.evaluate(async()=>{__time+=6*60*60*1000;await __catalog.refresh();});assert.deepEqual(await page.evaluate(()=>__loads),{v49:1,r2:1});
 await page.evaluate(async()=>{__user={uid:'fixture-b'};await __catalog.refresh();});assert.deepEqual(await page.evaluate(()=>__loads),{v49:2,r2:2});
 assert.equal(await page.evaluate(()=>__cache.read('fixture-a')),null,'old account record removed');
 await page.evaluate(async()=>{__allowed=false;__catalog.invalidate();await new Promise(r=>setTimeout(r,20));});assert.equal(await page.locator('#count').textContent(),'0');assert.equal(await page.evaluate(()=>__cache.read('fixture-b')),null);
 await page.evaluate(async()=>{const denied=DuduEpubCatalogDeviceCacheR1.create({scope:'denied',indexedDB:{open(){throw Error('DENIED');}}});if(await denied.read('fixture-a')!==null)throw Error('DENIED_STORAGE_ACCEPTED');});
 console.log('DEVICE CATALOG browser PASS: real IndexedDB, 1000 books, zero catalog loaders after reload, fresh refresh/deletion persistence, 6h expiry, account isolation/revocation and denied storage. Fixture only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
