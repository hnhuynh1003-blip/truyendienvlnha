'use strict';
// F4.1: real transaction engine, isolated in-memory profiles; all HTTP stays local.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const path=require('node:path');const fs=require('node:fs/promises');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.DUDU_BROWSER_CHANNEL?{channel:process.env.DUDU_BROWSER_CHANNEL}:{})});
 try{const page=await browser.newPage({viewport:{width:390,height:844}}),base=path.resolve(__dirname,'..');const assetRequests=[];page.on('request',r=>{if(r.url().includes('/assets/van-tuong/f42b/'))assetRequests.push(r.url());});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://hunt.local/**',async route=>{const url=new URL(route.request().url());
  if(url.pathname.startsWith('/assets/'))return route.fulfill({status:200,body:await fs.readFile(path.join(base,url.pathname.slice(1))),contentType:'image/webp'});
  return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#080b18;color:#f7ecd8;font:14px Arial}#cyber-phone{max-width:520px;margin:auto;padding:10px}</style><body class="dudu-phone-v11"><main id="cyber-phone"><span id="dudu-fun-header-balance"></span><div id="dudu-fun-content-v43"></div><button id="dudu-fun-launch-v43" hidden></button></main>'});});
 await page.goto('https://hunt.local/');
 await page.evaluate(()=>{window.drawnArt=[];const original=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if((image?.src?.includes('/stream-f42b1/')||image?.src?.startsWith('data:image/svg')))window.drawnArt.push(image.src);return original.call(this,image,...args);};});
 for(const f of ['css/item-visuals-v13.css','css/dudu-fun-v43.css','css/fun-art-f42b.css'])await page.addStyleTag({path:path.join(base,f)});
 for(const f of ['world-items-v44-1','item-catalog-v2','economy-core-v43','personal-collection-c24','fun-vantvat-f31','personal-vantvat-f31','item-visuals-v13','fun-wheel-f39','fun-art-f42b','fun-stream-f42b1','fun-cosmos-f41'])await page.addScriptTag({path:path.join(base,'js',f+'.js')});
 await page.evaluate(()=>{
  window.currentUsername='du';window.IS_SANDBOX_MODE=false;window.userProfile={currency:10000};
  window.auth={currentUser:{uid:'du'}};window.accounts={du:{currency:10000,inventory:[],storyStates:{}},other:{currency:10000,inventory:[],storyStates:{}}};
  window.calls=0;window.writes=0;window.delayReceipt=false;window.forcedIds=['f31-apple-moon'];window.unknown=false;
  window.db={collection(){return{doc(uid){return{uid,get:async()=>({exists:true,data:()=>structuredClone(accounts[uid])})};}};},async runTransaction(work){const patches=[];const r=await work({get:async ref=>({exists:true,data:()=>structuredClone(accounts[ref.uid])}),update:(ref,p)=>patches.push([ref.uid,p])});for(const [uid,p]of patches){Object.assign(accounts[uid],structuredClone(p));writes++;}return r;}};
  window.DuduAuth={isReady:()=>true,uid:()=>auth.currentUser?.uid};
  window.DuduFunRulesV43={norm:()=>({rounds:{box:null,ticket:null},history:[]})};window.DuduPersonalFunC25={utcDay:()=> '2026-11-04'};
  window.DuduFunLiveBridgeC25={uid:()=>auth.currentUser?.uid,ready:()=>true,load:async()=>({state:{}})};
  window.DuduVantVatLiveBridgeF31={uid:()=>auth.currentUser?.uid,ready:()=>!!auth.currentUser,load:()=>DuduPersonalVantVatF31.load({db,auth,uid:auth.currentUser.uid}),async runBatch(p){calls++;
   const payload={...p,db,auth,uid:auth.currentUser.uid,rolls:p.rolls.map((_,i)=>{const id=forcedIds[i%forcedIds.length];let sum=0;for(const row of DuduFunVantVatF31.POOL){if(row.itemId===id)return sum;sum+=row.weight;}throw Error('bad forced prize');})};
   const result=await DuduPersonalVantVatF31.runBatch(payload);userProfile.currency=result.currency;
   if(delayReceipt)await new Promise(resolve=>{window.releaseReceipt=resolve;});
   if(unknown){unknown=false;throw Error('lost response');}return result;},run:p=>DuduPersonalVantVatF31.run({...p,db,auth,uid:auth.currentUser.uid})};
 });
 await page.addScriptTag({path:path.join(base,'js/dudu-fun-ui-v43.js')});assert.equal(assetRequests.length,0,'AI images must not load merely from opening the app page');await page.evaluate(()=>DuduFunUIV43.showVantVat());await page.locator('.f41-cosmos').waitFor();
 assert.equal(await page.locator('.f34-vantvat-wheel').count(),0);assert.equal(await page.locator('.f41-universe').count(),1);assert.equal(await page.locator('.f41-drift,.f41-core,.f41-ring').count(),0);
 await page.waitForLoadState('networkidle');
 assert.ok(assetRequests.length>0);assert.ok(assetRequests.every(url=>!url.includes('/sample-')),'unmapped samples are not the flying prize stream');assert.ok(assetRequests.every(url=>!url.includes('/open-')),'rare FX are demand loaded');
 await page.waitForFunction(()=>window.drawnArt.length>0);
 const firstFrame=await page.locator('.f41-universe').evaluate(c=>c.toDataURL());await page.waitForTimeout(150);assert.notEqual(await page.locator('.f41-universe').evaluate(c=>c.toDataURL()),firstFrame,'depth particles must actually move');
 await page.waitForFunction(()=>[...document.querySelectorAll('.f42b-background,.f42b-gate')].every(i=>i.complete&&i.naturalWidth));
 async function startHunt(n){await page.locator('.f41-count').nth([1,5,10].indexOf(n)).click();await page.locator('.f41-hunt').click();}
 async function awaitTarget(){await page.waitForFunction(()=>document.querySelector('.f41-cosmos')?.dataset.phase==='target');assert.equal(await page.locator('.f41-crystal').count(),0,'prize stays hidden before retrieval');const expected=await page.evaluate(()=>{const receipts=Object.values(accounts[currentUsername].storyStates.__duduVantVatF31.batchReceipts);return DuduVantVatWheelF39.featured(receipts[receipts.length-1].results).itemId;});const item=await page.evaluate(id=>DuduItemCatalog.byId(id),expected);if(item)assert.ok((await page.locator('.f42b-sealed-vessel').getAttribute('src')).includes(item.id),'sealed target uses the actual prize thumbnail');}

 for(const width of [320,360,390,430,1280]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow '+width);
  const buttons=await page.locator('.f36-vantvat-spin').all();assert.equal(buttons.length,3);for(const b of buttons)assert.ok((await b.boundingBox()).height>=44);assert.equal(await page.locator('.f42b-gate').evaluate(el=>getComputedStyle(el).objectFit),'contain');}
 await page.setViewportSize({width:390,height:844});if(process.env.DUDU_QA_SCREENSHOT){await page.screenshot({path:process.env.DUDU_QA_SCREENSHOT});const raster=await page.locator('.f41-universe').evaluate(c=>c.toDataURL('image/png').split(',')[1]);await fs.writeFile(process.env.DUDU_QA_SCREENSHOT.replace('.png','-canvas.png'),Buffer.from(raster,'base64'));}
 // Skip before confirmation never finishes or pays a second time.
 await page.evaluate(()=>{delayReceipt=true;});await startHunt(1);await page.waitForFunction(()=>typeof releaseReceipt==='function');
 await page.locator('.f41-skip').click();assert.equal(await page.locator('.f36-vantvat-overlay').count(),0);assert.equal(await page.evaluate(()=>calls),1);assert.equal(await page.evaluate(()=>writes),1);
 await page.evaluate(()=>{delayReceipt=false;releaseReceipt();});await page.locator('.f36-vantvat-overlay').waitFor();assert.equal(await page.locator('.f36-vantvat-reward').count(),1);
 assert.equal(await page.locator('.f36-vantvat-reward.f37-tier-e').count(),1);assert.ok(assetRequests.every(url=>!url.includes('/open-')),'ordinary E reward must not load rare FX');assert.equal(await page.evaluate(()=>writes),1);await page.locator('.f36-vantvat-close').click();
 // Five crystals, exact committed IDs; double clicks cannot start another batch.
 await page.evaluate(()=>{forcedIds=['f32-cult-sword','f31-apple-moon','f32-fossil-egg','f31-doll-starlight','F31_COIN_30'];});
 await startHunt(5);await awaitTarget();await page.evaluate(()=>DuduFunUIV43.render());assert.equal(await page.locator('.f41-cosmos').getAttribute('data-phase'),'target','background refresh must preserve retrieval');await page.locator('.f41-target').click();await page.waitForFunction(()=>document.querySelectorAll('.f41-crystal').length===5);
 assert.ok(await page.locator('.f41-crystal .f41-prize-art img').first().getAttribute('src').then(src=>src.includes('f32-cult-sword.webp')),'real prize keeps its catalog image');
 assert.deepEqual(await page.locator('.f41-crystal').evaluateAll(ns=>ns.map(n=>n.dataset.itemId)),['f32-cult-sword','f31-apple-moon','f32-fossil-egg','f31-doll-starlight','F31_COIN_30']);
 await page.evaluate(()=>document.querySelector('.f41-hunt').click());assert.equal(await page.evaluate(()=>calls),2);
 await page.waitForFunction(()=>document.querySelector('.f42b-effect-image')?.complete&&document.querySelector('.f42b-effect-image')?.naturalWidth);assert.ok(assetRequests.some(url=>url.includes('/open-ss.webp')));
 await page.locator('.f41-skip').click();await page.locator('.f36-vantvat-overlay').waitFor();assert.equal(await page.locator('.f36-vantvat-reward').count(),5);assert.ok(await page.evaluate(()=>accounts.du.inventory.some(i=>i.id==='f32-cult-sword')),'the displayed sword is the physical inventory prize');assert.equal(await page.evaluate(()=>writes),2);
 await page.locator('.f36-vantvat-view').first().click();assert.equal(await page.locator('.f36-vantvat-overlay').count(),0);assert.equal(await page.locator('.f33-vantvat-zoom').count(),1);await page.locator('.f33-vantvat-zoom-close').click();
 // Ten-star shower completes naturally and preserves every receipt result.
 await page.evaluate(()=>{forcedIds=['f34-origin-dawn-goddess'];});await startHunt(10);
 await awaitTarget();if(process.env.DUDU_QA_SCREENSHOT)await page.waitForTimeout(650);if(process.env.DUDU_QA_SCREENSHOT)await page.screenshot({path:process.env.DUDU_QA_SCREENSHOT.replace('.png','-target.png')});const targetBox=await page.locator('.f41-target').boundingBox();await page.mouse.move(targetBox.x+targetBox.width/2,targetBox.y+targetBox.height/2);await page.mouse.down();await page.mouse.move(targetBox.x+targetBox.width/2,targetBox.y+targetBox.height/2+72,{steps:8});await page.mouse.up();await page.waitForFunction(()=>document.querySelectorAll('.f41-crystal').length===10);assert.equal(await page.locator('.f41-crystal.rank-sss').count(),10);
 await page.waitForFunction(()=>document.querySelector('.f42b-effect-image')?.complete&&document.querySelector('.f42b-effect-image')?.naturalWidth>0);
 assert.ok(assetRequests.some(url=>url.includes('/open-sss.webp')));
 if(process.env.DUDU_QA_SCREENSHOT){await page.waitForTimeout(1200);await page.screenshot({path:process.env.DUDU_QA_SCREENSHOT.replace('.png','-crystals.png')});}
 await page.locator('.f36-vantvat-overlay').waitFor();assert.equal(await page.locator('.f36-vantvat-reward').count(),10);
 for(const card of await page.locator('.f36-vantvat-reward').all()){const image=await card.locator('.f36-vantvat-reward-art').boundingBox(),name=await card.locator('b').boundingBox();assert.ok(image.y+image.height<=name.y+1,'art must not overlap item name');}
 if(process.env.DUDU_QA_SCREENSHOT)await page.screenshot({path:process.env.DUDU_QA_SCREENSHOT.replace('.png','-results.png')});assert.equal(await page.evaluate(()=>writes),3);await page.locator('.f36-vantvat-close').click();
 // Reduced motion gets the committed result immediately.
 await page.emulateMedia({reducedMotion:'reduce'});await startHunt(1);await awaitTarget();await page.locator('.f41-target').click();await page.locator('.f36-vantvat-overlay').waitFor();assert.equal(await page.evaluate(()=>writes),4);await page.locator('.f36-vantvat-close').click();
 // S gets exactly its approved layer; ordinary retrieval never adds a rare FX request.
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{forcedIds=['f32-cult-sword'];});await startHunt(1);await awaitTarget();await page.locator('.f41-target').click();
 await page.waitForFunction(()=>document.querySelector('.f42b-effect-image')?.complete&&document.querySelector('.f42b-effect-image')?.naturalWidth);
 assert.ok((await page.locator('.f42b-effect-image').getAttribute('src')).endsWith('/open-s.webp'));await page.locator('.f36-vantvat-overlay').waitFor();await page.locator('.f36-vantvat-close').click();
 const rareRequests=assetRequests.filter(url=>url.includes('/open-')).length;
 await page.evaluate(()=>{forcedIds=['f31-apple-moon'];});await startHunt(1);await awaitTarget();await page.locator('.f41-target').click();await page.locator('.f36-vantvat-overlay').waitFor();
 assert.equal(assetRequests.filter(url=>url.includes('/open-')).length,rareRequests);await page.locator('.f36-vantvat-close').click();await page.evaluate(()=>{forcedIds=['f34-origin-dawn-goddess'];});
 // Native Chromium touch events at Android width exercise capture, cancel and pull.
 await page.emulateMedia({reducedMotion:'no-preference'});await startHunt(1);await awaitTarget();
 await page.waitForTimeout(600);const touchBox=await page.locator('.f41-target').boundingBox();
 const touchX=touchBox.x+touchBox.width/2,touchY=touchBox.y+touchBox.height/2;
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 const touchPoint=(y)=>({x:touchX,y,id:1,radiusX:3,radiusY:3,force:1});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchPoint(touchY)]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 assert.equal(await page.locator('.f41-cosmos').getAttribute('data-phase'),'target');assert.equal(await page.locator('.f41-crystal').count(),0);
 const touchWrites=await page.evaluate(()=>writes);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchPoint(touchY)]});
 for(let dy=10;dy<=70;dy+=10)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touchPoint(touchY+dy)]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.locator('.f36-vantvat-overlay').waitFor();assert.equal(await page.evaluate(()=>writes),touchWrites);
 await page.locator('.f36-vantvat-close').click();await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 // Leaving while the sealed target waits releases the interaction without a late popup.
 await startHunt(1);await awaitTarget();const leaveWrites=await page.evaluate(()=>writes);
 await page.evaluate(()=>{document.getElementById('dudu-fun-content-v43').style.display='none';});await page.waitForTimeout(200);
 assert.equal(await page.locator('.f36-vantvat-overlay').count(),0);assert.equal(await page.evaluate(()=>writes),leaveWrites);
 await page.evaluate(()=>{document.getElementById('dudu-fun-content-v43').style.display='';DuduFunUIV43.render();});await page.locator('.f41-hunt:not(:disabled)').waitFor();
 await page.emulateMedia({reducedMotion:'reduce'});
 // A lost response retains its receipt and retries the same transaction once.
 await page.evaluate(()=>{unknown=true;});await startHunt(1);await page.waitForFunction(()=>document.querySelector('.dudu-fun-notice').textContent.includes('Chưa xác nhận'));
 const afterLoss=await page.evaluate(()=>({writes,currency:accounts.du.currency,spins:accounts.du.storyStates.__duduVantVatF31.totalSpins}));
 await page.locator('.dudu-fun-claim').click();await awaitTarget();await page.locator('.f41-target').click();await page.locator('.f36-vantvat-overlay').waitFor();assert.deepEqual(await page.evaluate(()=>({writes,currency:accounts.du.currency,spins:accounts.du.storyStates.__duduVantVatF31.totalSpins})),afterLoss);await page.locator('.f36-vantvat-close').click();
 // Leaving the app does not place a late result dialog over another screen.
 await page.evaluate(()=>{delayReceipt=true;delete window.releaseReceipt;});await startHunt(1);await page.waitForFunction(()=>typeof releaseReceipt==='function');
 const beforeLeave=await page.evaluate(()=>writes);await page.evaluate(()=>{document.getElementById('dudu-fun-content-v43').style.display='none';releaseReceipt();delayReceipt=false;});await page.waitForTimeout(100);
 assert.equal(await page.locator('.f36-vantvat-overlay').count(),0);assert.equal(await page.evaluate(()=>writes),beforeLeave);
 await page.evaluate(()=>{document.getElementById('dudu-fun-content-v43').style.display='';DuduFunUIV43.render();});await page.locator('.f41-cosmos').waitFor();
 // Account switch in flight: no previous user's result dialog or artifacts.
 await page.evaluate(()=>{delayReceipt=true;});await startHunt(1);await page.waitForFunction(()=>typeof releaseReceipt==='function');
 await page.evaluate(()=>{currentUsername='other';auth.currentUser={uid:'other'};userProfile={currency:10000};DuduFunUIV43.render();});await page.locator('.f41-cosmos').waitFor();
 await page.evaluate(()=>{releaseReceipt();delayReceipt=false;});await page.waitForTimeout(100);assert.equal(await page.locator('.f36-vantvat-overlay').count(),0);assert.equal(await page.evaluate(()=>accounts.other.inventory.length),0);
 assert.deepEqual(errors,[]);console.log('F4.2B.1 browser passed: canonical flying prizes, bounded thumbnail stream, lazy approved layers and FX, correct catalog images, sealed target, native touch cancel/pull, mouse drag, 1/5/10, skip, retry, account/exit isolation, reduced motion and five widths.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
