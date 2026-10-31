// C4.10: mobile Arcade real-DOM acceptance in Sandbox, with no production writes.
// GitHub browser CI runs this after installing Playwright Chromium.
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

async function main(){
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  const filename=path.resolve(root,'.'+pathname,pathname.endsWith('/')?'index.html':'');
  if(!filename.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  fs.readFile(filename,(error,bytes)=>{
   if(error){response.writeHead(404).end();return;}
   const mime=/\.js$/.test(filename)?'text/javascript':/\.css$/.test(filename)?'text/css':
    /\.webp$/.test(filename)?'image/webp':'text/html; charset=utf-8';
   response.writeHead(200,{'content-type':mime}).end(bytes);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  await page.route('https://www.gstatic.com/firebasejs/**',async route=>{
   const app=route.request().url().includes('firebase-app-compat');
   const code=app?`window.__arcadeExternalWrites=[];window.firebase={
    initializeApp(){},firestore(){return {collection(){return {doc(){return {
     get:async()=>({exists:false,data:()=>({})}),
     set:async v=>{window.__arcadeExternalWrites.push(v);throw Error('blocked');},
     update:async v=>{window.__arcadeExternalWrites.push(v);throw Error('blocked');},
     onSnapshot:()=>()=>{}};}};}};}};
    window.firebase.firestore.FieldValue={serverTimestamp:()=>1};`:'';
   await route.fulfill({status:200,contentType:'application/javascript',body:code});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduPersonalArcadeUIV1&&!!window.DuduPhoneAppsV67);
  await page.waitForTimeout(800);
  const modal=page.locator('#auth-modal');
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  if(!(await modal.isVisible()))await page.locator('#account-status-btn').click();
  await page.locator('#auth-username').fill('c410-mobile-tester');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>typeof currentUsername!=='undefined'&&
   currentUsername==='c410-mobile-tester');
  await page.evaluate(()=>{
   if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
   openPhoneApp('arcade');window.DuduPersonalArcadeUIV1.render();
  });
  await page.locator('#personal-arcade-v1 .arcade-world-neon').waitFor();
  const rootSelector='#personal-arcade-v1';
  const tab=id=>page.locator(rootSelector+' [data-arcade-tab="'+id+'"]');
  const action=id=>page.locator(rootSelector+' button[data-arcade-action="'+id+'"]');

  for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});
   const layout=await page.evaluate(()=>{
    const port=document.querySelector('.arcade-scroll'),tabs=document.querySelector('.arcade-tabs');
    const box=port.getBoundingClientRect(),nav=tabs.getBoundingClientRect();
    const phone=document.getElementById('cyber-phone').getBoundingClientRect();
    const close=document.querySelector('#cyber-phone .phone-close-btn').getBoundingClientRect();
    const arcade=document.getElementById('phone-app-arcade');
    const app=arcade.getBoundingClientRect();
    const wallet=document.getElementById('arcade-header-wallet-v1').getBoundingClientRect();
    const appHeader=arcade.querySelector('.phone-app-header').getBoundingClientRect();
    return {overflow:port.scrollWidth-port.clientWidth,tabs:tabs.children.length,
     portWidth:box.width,navWidth:nav.width,phoneWidth:phone.width,phoneHeight:phone.height,
     phoneLeft:phone.left,phoneRight:phone.right,closeWidth:close.width,
     closeLeft:close.left,closeTop:close.top,closeBottom:close.bottom,
     walletRight:wallet.right,appTop:app.top,appHeaderBottom:appHeader.bottom,
     homeBar:getComputedStyle(document.querySelector('#cyber-phone .phone-home-bar')).display,
     siteHeader:getComputedStyle(document.querySelector('body > header')).display,
     siteBottomNav:getComputedStyle(document.querySelector('.d60-bottomnav')).display};
   });
   assert.ok(layout.portWidth>190,'Arcade should have a usable content width at '+width);
   assert.ok(layout.overflow<=2,'No horizontal Arcade overflow at '+width+'px');
   assert.equal(layout.tabs,4,'Four game tabs stay available on a narrow viewport');
   assert.ok(layout.navWidth<=layout.phoneWidth,'Bottom game navigation fits the phone');
   assert.ok(Math.abs(layout.phoneWidth-width)<=2,'C4.15 R3 phone fills width at '+width+'px');
   assert.ok(Math.abs(layout.phoneHeight-844)<=2,'C4.15 R3 phone fills height at '+width+'px');
   assert.ok(Math.abs(layout.phoneLeft)<=2 && Math.abs(layout.phoneRight-width)<=2,
    'C4.15 R3 phone reaches both mobile edges');
   assert.equal(layout.siteHeader,'none','C4.15 R3 site header is hidden while phone is open');
   assert.equal(layout.siteBottomNav,'none','C4.15 R3 site bottom nav is hidden while phone is open');
   assert.ok(layout.closeWidth>=30,'C4.15 global close X stays tappable');
   assert.ok(layout.closeTop>=layout.appTop-4 && layout.closeBottom<=layout.appHeaderBottom+5,
    'C4.15 R2 close X shares the app header instead of using a second row');
   assert.ok(layout.closeLeft>=layout.walletRight-2,'C4.15 R2 close X clears the Arcade wallet action');
   assert.equal(layout.homeBar,'none','C4.15 duplicate bottom line is hidden');
  }
  // C4.18: four different game worlds with no redundant heading above the stage.
  const stageLooks=new Set();
  for(const game of ['neon','mine','garden','jade']){
   await tab(game).click();
   const look=await page.evaluate(()=>{
    const world=document.querySelector('#personal-arcade-v1 .arcade-world');
    const heading=world.querySelector('.arcade-world-heading');
    const stage=world.querySelector('.arcade-stage');
    const active=document.querySelector('.arcade-tab[aria-selected="true"]');
    const titleRect=heading.getBoundingClientRect();
    const stageRect=stage.getBoundingClientRect();
    const iconRect=active.querySelector('.arcade-tab-icon').getBoundingClientRect();
    return {display:getComputedStyle(heading).display,
     headingHeight:titleRect.height,stageTop:stageRect.top,titleBottom:titleRect.bottom,
     stageBackground:getComputedStyle(stage).backgroundImage,
     iconWidth:iconRect.width,iconHeight:iconRect.height,
     overflow:document.querySelector('.arcade-scroll').scrollWidth-
      document.querySelector('.arcade-scroll').clientWidth};
   });
   assert.equal(look.display,'none',game+' removes its duplicate titleplate');
   assert.equal(look.headingHeight,0,game+' dedicates screen space to gameplay');
   assert.ok(look.stageTop>=look.titleBottom-2,game+' stage must clear the masthead');
   assert.ok(look.iconWidth>=26&&look.iconHeight>=26,game+' dock icon is substantial');
   assert.ok(look.overflow<=2,game+' game world has no horizontal clipping');
   stageLooks.add(look.stageBackground);
   if(process.env.ARCADE_C417_SHOTS){
    fs.mkdirSync(process.env.ARCADE_C417_SHOTS,{recursive:true});
    await page.screenshot({path:path.join(process.env.ARCADE_C417_SHOTS,game+'.png')});
   }
  }
  assert.equal(stageLooks.size,4,'Each game has a distinct scene palette');
  await tab('neon').click();
  // Reading uses the same immersive phone; reader controls return on close.
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>document.body.classList.add('dudu-site-v60','dudu-reading-active'));
  const readingFrame=await page.locator('#cyber-phone').evaluate(el=>{
   const rect=el.getBoundingClientRect();
   return {ratio:rect.width/rect.height,bottom:innerHeight-rect.bottom,right:innerWidth-rect.right};
  });
  assert.ok(Math.abs(readingFrame.ratio-320/568)<.01,'C4.15 reader phone uses full portrait viewport');
  assert.ok(Math.abs(readingFrame.bottom)<=2,'C4.15 reader phone reaches bottom of viewport');
  assert.ok(Math.abs(readingFrame.right)<=2,'C4.15 reader phone reaches right edge');
  await page.evaluate(()=>document.body.classList.remove('dudu-reading-active'));
  await page.setViewportSize({width:390,height:844});

  // A player leaving the Neon workshop must see the Jade stage, not Neon scroll offset.
  await page.evaluate(()=>document.querySelector('.arcade-scroll').scrollTop=220);
  await tab('jade').click();
  assert.equal(await page.locator('.arcade-scroll').evaluate(el=>el.scrollTop),0);
  // C4.13: enter the market, handpick one free sample into the waiting bag,
  // then bring that exact stone home for inspection. Existing direct free CTA
  // is still exercised in unit tests for old-player compatibility.
  await action('jade-open-market').click();
  const market=page.locator('.arcade-sheet-overlay');
  assert.equal(await market.locator('.jade-stall-stone').count(),3,
   'C4.18 the market has three tangible rough stones on its playable stall');
  await market.locator('.jade-stall-stone').nth(1).click();
  assert.equal(await market.locator('.jade-market-tray').first().evaluate(el=>el.open),true,
   'Touching a stone opens the matching hand-pick tray');
  assert.equal(await market.locator('.jade-market-tray').first().getAttribute('data-selected-slot'),'1',
   'The upper B stone must select B in the actual offer view');
  assert.equal(await market.locator('.jade-market-sample:visible').count(),1,
   'Selecting B must hide A and C instead of showing duplicate cards');
  await market.locator('[data-jade-preview-all]').click();
  assert.equal(await market.locator('.jade-market-sample:visible').count(),3,
   'Compare mode makes all three distinct offers visible');
  await market.locator('.jade-stall-stone').nth(1).click();
  await market.locator('button[data-arcade-action="jade-pick-0-1"]').click();
  const basket=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:sandbox%3Ac410-mobile-tester'))?.jade);
  assert.equal(basket.stash.length,1);
  assert.equal(basket.active,null);
  assert.equal(basket.bought,1);
  await page.locator('.arcade-sheet-close').click();
  await action('jade-select-0').first().click();
  for(let i=0;i<3;i++)await action('jade-scan-'+i).click();
  const scans=await page.evaluate(()=>{
   const raw=localStorage.getItem('dudu-personal-arcade:v1:sandbox%3Ac410-mobile-tester');
   const game=raw?JSON.parse(raw):null;
   return {scans:game?.jade?.active?.scans,coins:game?.coins};
  });
  assert.deepEqual(scans.scans,[true,true,true]);
  assert.equal(scans.coins,0,'First Jade sample is free');
  await action('jade-cut').click();
  await action('jade-vault-store').click();
  const heldJade=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:sandbox%3Ac410-mobile-tester'))?.jade);
  assert.equal(heldJade.active,null,'Cut stone no longer blocks the cutting table');
  assert.equal(heldJade.vault.length,1,'Cut stone waits for a favorable quote in the vault');
  await action('jade-open-vault').click();
  assert.match(await page.locator('.arcade-sheet-overlay').innerText(),/Bảng giá sắc ngọc/);
  await page.locator('.arcade-sheet-overlay button[data-arcade-action="jade-vault-sell-0"]').click();
  const honorMoment=page.locator('#cyber-phone .dudu-c411-unlock-toast');
  await honorMoment.waitFor({state:'visible',timeout:2500});
  assert.equal(await honorMoment.getAttribute('data-rarity'),'rare',
   'The first Jade sale unlocks a rare collectible title');
  assert.match(await honorMoment.innerText(),/Tập Sự Thẩm Ngọc/);
  assert.equal(await honorMoment.evaluate(el=>getComputedStyle(el).pointerEvents),'none',
   'The new title must never block game actions');
  const jadeAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:sandbox%3Ac410-mobile-tester')));
  assert.equal(jadeAfter.jade.sold,1);
  assert.equal(jadeAfter.jade.vault.length,0);
  await page.locator('.arcade-sheet-close').click();

  await page.evaluate(()=>document.querySelector('.arcade-scroll').scrollTop=180);
  await tab('mine').click();
  assert.equal(await page.locator('.arcade-scroll').evaluate(el=>el.scrollTop),0);
  await action('mine').click();
  await action('sell-ores').click();
  await tab('garden').click();
  await action('plant-0').click();
  await action('water-0').click();
  const stages=await page.evaluate(()=>{
   const panel=document.querySelector('.arcade-world-garden');
   const pond=panel.querySelector('.garden-stage').getBoundingClientRect();
   const controls=panel.querySelector('.garden-fishing-controls').getBoundingClientRect();
   const tabbar=document.querySelector('.arcade-tabs').getBoundingClientRect();
   return {controlsBelowPond:controls.top>=pond.bottom,tabbarInside:tabbar.height>30};
  });
  assert.equal(stages.controlsBelowPond,true,'Fishing control must not cover the pond');
  assert.equal(stages.tabbarInside,true);

  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:sandbox%3Ac410-mobile-tester')));
  assert.equal(saved.mine.dug,1);
  assert.equal(saved.garden.beds[0].status,'growing');
  assert.equal(saved.jade.sold,1);
  assert.equal(saved.neon.running,true);
  assert.equal(await page.evaluate(()=>window.__arcadeExternalWrites?.length||0),0);
  // C4.12: the phone collection must make real targets discoverable without
  // leaking hidden title criteria or scrolling through unrelated game panels.
  await page.evaluate(()=>openPhoneApp('honors'));
  const hall=page.locator('#dudu-honor-content-c46');
  await hall.locator('.dudu-honor-title-scopes').waitFor();
  assert.ok(await hall.locator('.dudu-honor-hunt-spotlight').isVisible());
  await hall.locator('.dudu-honor-filters').getByRole('button',{name:'Ngọc Phường'}).click();
  const jadeTitle=hall.locator('.dudu-honor-title-card').filter({hasText:'Tập Sự Thẩm Ngọc'});
  assert.ok(await jadeTitle.isVisible(),'The already earned Jade title is in the collection');
  assert.equal(await jadeTitle.locator('.dudu-honor-action').innerText(),'Sử dụng');
  await hall.locator('.dudu-honor-title-scopes').getByRole('button',{name:'Huyền thoại'}).click();
  const hidden=hall.locator('.dudu-honor-title-card.is-locked');
  assert.equal(await hidden.count(),1);
  assert.match(await hidden.innerText(),/Danh hiệu bí ẩn/);
  assert.doesNotMatch(await hidden.innerText(),/Long Thạch Chủng/);
  await hidden.locator('.dudu-honor-action').click();
  assert.ok(await hall.locator('.dudu-honor-tabs button.is-active').getByText('Bí ẩn').isVisible());
  assert.ok(await hall.locator('.dudu-honor-achievement.is-target').isVisible());
  assert.doesNotMatch(await hall.locator('.dudu-honor-achievement.is-target').innerText(),/Long Thạch Chủng/);
  for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});
   const overflow=await hall.evaluate(el=>el.scrollWidth-el.clientWidth);
   assert.ok(overflow<=2,'Honor Hall must not overflow horizontally at '+width+'px');
  }
  console.log('C4.12 mobile Honor: rarity filters, honest clues, locked secrets, no overflow OK');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
