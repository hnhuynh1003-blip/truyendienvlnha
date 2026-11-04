'use strict';
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs/promises');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.DUDU_BROWSER_CHANNEL?{channel:process.env.DUDU_BROWSER_CHANNEL}:{})});try{
 const base=path.resolve(__dirname,'..');const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://museum.local/**',async r=>{const url=new URL(r.request().url());if(url.pathname.startsWith('/assets/')){return r.fulfill({status:200,body:await fs.readFile(path.join(base,url.pathname.slice(1))),contentType:'image/webp'});}return r.fulfill({status:200,body:'<!doctype html><html><body class="dudu-phone-v11"><main id="cyber-phone"><div id="museum"></div></main></body></html>',contentType:'text/html'});});
 await page.goto('http://museum.local/');
 for(const f of ['css/museum-vault-c426.css','css/museum-vanbao-v1.css'])await page.addStyleTag({path:path.join(base,f)});
 for(const f of ['js/world-items-v44-1.js','js/item-catalog-v2.js','js/item-visuals-v13.js','js/museum-collection-f40.js','js/museum-vault-c426.js']){
 // Catalog's optional world expansion is irrelevant to the read-only FUN shelf.
 if(f==='js/world-items-v44-1.js')continue;
 await page.addScriptTag({path:path.join(base,f)});}
 await page.evaluate(()=>{window.account='alice';window.payload={state:{album:DuduItemCatalog.funVantVat.filter(x=>['S','SS','SSS'].includes(x.rank)).map(x=>x.id)}};
 window.calls=0;window.DuduVantVatLiveBridgeF31={ready:()=>true,uid:()=>account,load:async()=>{calls++;return payload;}};
 DuduMuseumVaultC426.init({container:document.querySelector('#museum'),ownerKey:'alice'});DuduMuseumVaultC426.showVanVat();});
 await page.locator('.museum-f40-filter').waitFor();
 assert.equal(await page.locator('.museum-vantvat-card.is-owned').count(),14);
 assert.equal(await page.locator('.museum-f40-realm.is-complete').count(),4);
 for(const width of [320,360,390,430,1280]){await page.setViewportSize({width,height:800});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow '+width);
 await page.locator('.museum-vantvat-card.is-owned').first().click();await page.locator('dialog').waitFor({state:'visible'});
 await page.waitForFunction(()=>[...document.querySelectorAll('dialog img')].every(i=>i.complete&&i.naturalWidth>0));
 if(width===390&&process.env.DUDU_QA_SCREENSHOT)await page.screenshot({path:process.env.DUDU_QA_SCREENSHOT});
 const bounds=await page.locator('dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
 await page.locator('.museum-f40-close').click();assert.equal(await page.locator('dialog').count(),0);}
 await page.locator('.museum-f40-filter select').selectOption('PALEO');assert.equal(await page.locator('.museum-vantvat-card').count(),2);
 await page.locator('.museum-f40-filter select').selectOption('CYBER');assert.equal(await page.locator('.museum-vantvat-card').count(),0);
 await page.evaluate(()=>{payload={state:{album:[]}};account='bob';DuduMuseumVaultC426.init({container:document.querySelector('#museum'),ownerKey:'bob'});DuduMuseumVaultC426.showVanVat();});
 await page.waitForFunction(()=>document.querySelector('.museum-f40-filter'));assert.equal(await page.locator('.is-owned.museum-vantvat-card').count(),0);
 assert.equal(await page.locator('.museum-vantvat-unfound:not([open])').count(),1);
 await page.evaluate(()=>{payload={state:{album:['f34-origin-dawn-goddess']}};DuduMuseumVaultC426.showVanVat();});
 await page.locator('.museum-vantvat-card.is-owned').waitFor();await page.locator('.museum-vantvat-card.is-owned').click();
 await page.evaluate(()=>{account='charlie';DuduMuseumVaultC426.init({container:document.querySelector('#museum'),ownerKey:'charlie'});});assert.equal(await page.locator('dialog').count(),0);
 const prior=await page.evaluate(()=>calls);await page.evaluate(()=>{DuduMuseumVaultC426.init({container:document.querySelector('#museum'),ownerKey:'sandbox:alice',sandbox:true});DuduMuseumVaultC426.showVanVat();});
 assert.equal(await page.evaluate(()=>calls),prior);assert.equal(await page.locator('.museum-vantvat-card').count(),0);
 assert.deepEqual(errors,[]);console.log('F4.0 browser: five widths, detail X, filters, full/empty albums, account switch, sandbox passed');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
