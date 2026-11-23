// Synthetic real-viewport acceptance; private GETs are local fixtures, all network blocked.
'use strict';const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:375,height:700}});await page.route('**/*',route=>route.request().url()==='http://localhost:39991/'?route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><body style="margin:0"></body>'}):route.abort());await page.goto('http://localhost:39991/');
 for(const file of ['library-r2-private-media-l6p2c5c7.js','library-r2-preview-media-bridge-l6p2c5c8.js'])await page.addScriptTag({path:path.join(__dirname,'../js',file)});
 await page.evaluate(()=>{
  window.__gets=0;const user={uid:'fixture-owner',getIdToken:async()=>'synthetic'.repeat(20)};
  window.__bridge=DuduR2PreviewMediaBridgeL6P2C5C8.create({enabled:true,privateMediaApi:DuduR2PrivateMediaL6P2C5C7,workerBaseUrl:'https://fixture.invalid',auth:()=>({currentUser:user}),fetchFn:async(url,options)=>{if(options.method!=='GET'||!url.includes('/read/asset/'))throw Error('UNEXPECTED_REQUEST');__gets++;return new Response(Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/png'}});}});
  window.__work=[];for(let i=0;i<20;i++){const el=document.createElement('div');el.style.cssText='height:250px;box-sizing:border-box';el.textContent='Synthetic cover '+i;__work.push(__bridge.loadCardCover({_r2V1:true,id:'epub-'+i.toString(16).padStart(32,'0'),_r2Revision:'r-'+'a'.repeat(32),_r2CoverAssetId:'cover-0001'},el));document.body.append(el);}
 });
 await page.waitForFunction(()=>window.__gets===4);assert.equal(await page.evaluate(()=>__gets),4,'only viewport and 100px margin cards fetch');
 await page.evaluate(()=>scrollTo(0,5000));await page.waitForFunction(()=>window.__gets===8);assert.equal(await page.evaluate(()=>__gets),8,'newly visible bottom cards fetch, middle cards remain deferred');
 await page.evaluate(async()=>{__bridge.dispose();await Promise.all(__work);scrollTo(0,2000);});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__gets),8,'disposed observer cannot restart private work');
 console.log('R2 cover viewport PASS: 20 cards, 4 initial authenticated fixture GETs, 4 more after scroll, no work after dispose; no production requests.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
