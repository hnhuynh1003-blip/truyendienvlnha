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

  // C4.34R1: the four AI dock portraits must beat legacy per-game gradients.
  const dockArt=await page.evaluate(async()=>{
   const icon=document.querySelector('#personal-arcade-v1 .arcade-tab-icon');
   const rule=getComputedStyle(icon).backgroundImage;
   const asset=rule.match(/url\(["']?([^"')]+)/)?.[1];
   if(!asset)return false;
   const image=new Image();image.src=asset;
   try{await image.decode();return image.naturalWidth>=256&&image.naturalHeight>=256;}
   catch(_){return false;}
  });
  assert.ok(dockArt,'Four Arcade tabs use a loaded AI sprite, not blank gradients');
  const dockPositions=await page.evaluate(()=>Object.fromEntries(
   [...document.querySelectorAll('#personal-arcade-v1 .arcade-tab[data-arcade-tab]')]
    .map(tab=>[tab.dataset.arcadeTab,
     getComputedStyle(tab.querySelector('.arcade-tab-icon')).backgroundPosition])));
  assert.deepEqual(dockPositions,{
   neon:'0% 0%',mine:'100% 0%',garden:'0% 100%',jade:'100% 100%'
  },'Each game dock icon uses its own quadrant of the AI sprite');

  // C4.23: a compact header button opens the interactive Season passport.
  await page.locator('#arcade-season-portal-c423').click();
  const passport=page.locator('.arcade-season-book');
  assert.equal(await passport.locator('.arcade-season-relic').count(),4);
  assert.match(await passport.innerText(),/CHƯA MỞ · XEM TRƯỚC/,
   'Season 01 marks are reserved until the one-time account reset and Rules review');
  const passportFit=await passport.evaluate(el=>({
   width:el.getBoundingClientRect().width,
   overflow:el.scrollWidth-el.clientWidth}));
  assert.ok(passportFit.width>190 && passportFit.overflow<=2,
   'Season passport must fit a narrow phone without horizontal overflow');
  await passport.locator('[data-arcade-season-go="mine"]').click();
  assert.equal(await tab('mine').getAttribute('aria-selected'),'true',
   'A relic takes the player to the real game rather than a dead-end collectible card');
  await page.locator('#arcade-season-portal-c423').click();
  await passport.locator('[data-arcade-season="close"]').click();
  await tab('neon').click();

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
  // C4.37: follow up to three long journeys without claiming anything.
  await page.setViewportSize({width:320,height:844});
  await page.evaluate(()=>{openPhoneApp('honors');window.DuduHonorUIV46.openGame('Trạm Neon');});
  const journeyBoard=page.locator('#dudu-honor-content-c46 .dudu-c437-board');
  await journeyBoard.waitFor();
  assert.equal(await journeyBoard.locator('.dudu-c437-focus').count(),0);
  await page.locator('.dudu-honor-more').filter({hasText:'Xem cả 4 hành trình'}).click();
  for(let i=0;i<3;i++)await page.locator('.dudu-c437-follow:not(.is-followed)').first().click();
  assert.equal(await journeyBoard.locator('.dudu-c437-focus').count(),3);
  await page.locator('.dudu-c437-follow:not(.is-followed)').click();
  assert.equal(await journeyBoard.locator('.dudu-c437-focus').count(),3,
   'The fourth journey cannot replace a tracked one without an explicit unpin');
  await journeyBoard.locator('.dudu-c437-focus-remove').first().click();
  await page.locator('.dudu-c437-follow:not(.is-followed)').last().click();
  assert.equal(await journeyBoard.locator('.dudu-c437-focus').count(),3);
  for(const width of [320,360,390]){
   await page.setViewportSize({width,height:844});
   const fit=await journeyBoard.evaluate(el=>({overflow:el.scrollWidth-el.clientWidth,
    width:el.getBoundingClientRect().width,
    buttons:[...el.querySelectorAll('.dudu-c437-focus-actions button')].map(b=>{
     const r=b.getBoundingClientRect(),p=el.getBoundingClientRect();
     return r.left>=p.left-2&&r.right<=p.right+2;
    })}));
   assert.ok(fit.width>190&&fit.overflow<=2,'C4.37 board fits '+width+'px');
   assert.ok(fit.buttons.every(Boolean),'C4.37 board buttons fit '+width+'px');
  }
  const firstTracked=await journeyBoard.locator('.dudu-c437-focus').first().getAttribute('data-game');
  await journeyBoard.locator('.dudu-c437-focus-play').first().click();
  assert.equal(await page.locator('#phone-app-arcade').evaluate(el=>el.style.display),'flex');
  assert.equal(await tab(firstTracked).getAttribute('aria-selected'),'true',
   'The tracked-journey play button opens its matching Arcade game');
  await page.evaluate(()=>{openPhoneApp('honors');window.DuduHonorUIV46.openGame('Trạm Neon');});
  assert.equal(await journeyBoard.locator('.dudu-c437-focus').count(),3,
   'Following choices survive the app switch without writing a reward');
  // Restore the Hall's original entry tab before legacy title-scoping checks.
  await page.locator('#dudu-honor-content-c46 .dudu-honor-tabs')
   .getByRole('button',{name:'Danh hiệu'}).click();
  await page.evaluate(()=>openPhoneApp('arcade'));
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
     iconBackground:getComputedStyle(active.querySelector('.arcade-tab-icon')).backgroundImage,
     overflow:document.querySelector('.arcade-scroll').scrollWidth-
      document.querySelector('.arcade-scroll').clientWidth};
   });
   assert.equal(look.display,'none',game+' removes its duplicate titleplate');
   assert.equal(look.headingHeight,0,game+' dedicates screen space to gameplay');
   assert.ok(look.stageTop>=look.titleBottom-2,game+' stage must clear the masthead');
   assert.ok(look.iconWidth>=26&&look.iconHeight>=26,game+' dock icon is substantial');
   assert.match(look.iconBackground,/world-tabs\.webp/,game+' dock displays its AI sprite');
   assert.ok(look.overflow<=2,game+' game world has no horizontal clipping');
   if(game==='neon'){
    assert.equal(await page.locator('.neon-order-actions button').count(),4,
     'C4.41B Neon uses a four-direction timed rhythm counter');
   }
   if(game==='mine'){
    assert.equal(await page.locator('.mine-seam-tunnel').count(),3,
     'C4.20 mining uses three genuinely selectable underground seams');
   }
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
  assert.equal(await market.locator('.jade-market-stop').count(),5,
   'All five districts appear in one swipeable navigation rail');
  assert.ok(await market.locator('.jade-market-route').evaluate(el=>el.getBoundingClientRect().height)<55,
   'C4.20 district navigation must be a compact chip rail, not giant cards');
  assert.equal(await market.locator('.jade-market-card').count(),1,
   'Only the chosen stall is rendered, never a long stacked market');
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
  const scanDrawer=page.locator('#personal-arcade-v1 .jade-scan-drawer');
  assert.equal(await scanDrawer.evaluate(el=>el.open),false,
   'Soi dấu hiệu stays folded until requested');
  await scanDrawer.locator('summary').click();
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
  await page.locator('#personal-arcade-v1 button[data-arcade-drawer="mine-bag"]').click();
  await page.locator('.arcade-sheet-overlay button[data-arcade-action="sell-ores"]').click();
  await page.locator('.arcade-sheet-close').click();
  await tab('garden').click();
  assert.equal(await page.locator('.garden-stage .garden-plot-area').count(),0,
   'The AI lake is never covered by the planted beds');
  await page.locator('.arcade-world-garden button[data-arcade-drawer="garden-seeds"]').click();
  await page.locator('.arcade-sheet-overlay button[data-arcade-action="plant-0"]').click();
  await page.locator('.arcade-sheet-overlay button[data-arcade-action="water-0"]').click();
  assert.equal(await page.locator('.arcade-sheet-overlay .garden-plot').count(),2,
   'The farm sheet keeps the active number of purchased beds');
  const farmAtWidth=async width=>{
   await page.setViewportSize({width,height:844});
   return page.evaluate(()=>{
    const sheet=document.querySelector('.arcade-sheet-overlay[data-sheet="garden-seeds"]');
    const area=sheet.querySelector('.garden-plot-area');
    const clones=[];
    while(area.children.length<4){
     const clone=area.firstElementChild.cloneNode(true);
     area.appendChild(clone);clones.push(clone);
    }
    const rect=area.getBoundingClientRect();
    const beds=[...area.children].map(el=>el.getBoundingClientRect());
    const result={count:beds.length,inside:beds.every(b=>b.left>=rect.left-1&&b.right<=rect.right+1),
     twoColumns:Math.abs(beds[0].top-beds[1].top)<2&&beds[2].top>beds[0].bottom,
     noOverlap:beds[0].right<=beds[1].left&&beds[2].right<=beds[3].left,
     actionHeight:sheet.querySelector('.garden-plot-label em').getBoundingClientRect().height,
     spriteWidth:sheet.querySelector('.garden-crop-sprite').getBoundingClientRect().width,
     sheetWithin:sheet.querySelector('.arcade-sheet').getBoundingClientRect().width<=innerWidth};
    clones.forEach(el=>el.remove());
    return result;
   });
  };
  for(const width of [390,320]){
   const layout=await farmAtWidth(width);
   assert.equal(layout.count,4);
   assert.ok(layout.inside&&layout.twoColumns&&layout.noOverlap&&layout.sheetWithin,
    `Farm popup fits four beds in a compact 2x2 grid at ${width}px`);
   assert.ok(layout.actionHeight>=26&&layout.spriteWidth<=120,
    `Readable actions and compact flowers at ${width}px`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.arcade-sheet-close').click();
  const stages=await page.evaluate(()=>{
   const panel=document.querySelector('.arcade-world-garden');
   const pond=panel.querySelector('.garden-stage').getBoundingClientRect();
   const controls=panel.querySelector('.garden-fishing-controls').getBoundingClientRect();
   const tabbar=document.querySelector('.arcade-tabs').getBoundingClientRect();
   return {controlsBelowPond:controls.top>=pond.bottom,tabbarInside:tabbar.height>30};
  });
  assert.equal(stages.controlsBelowPond,true,'Fishing control must not cover the pond');
  assert.equal(stages.tabbarInside,true);
  const pondVisual=await page.evaluate(async()=>{
   const stage=document.querySelector('.garden-stage'),pond=stage.querySelector('.garden-pond');
   const width=pond.getBoundingClientRect().width/stage.getBoundingClientRect().width;
   const glaze=pond.querySelector('.garden-water-surface');
   const fish=pond.querySelector('.garden-fish');
   const artifacts=pond.querySelectorAll('.garden-pond-upgrade').length;
   const overlays=pond.querySelectorAll('.garden-water-ripples,.garden-shore-mist,.garden-moon-reflection').length;
   const submerged=Number(getComputedStyle(glaze).zIndex)>Number(getComputedStyle(fish).zIndex)
    &&Number(getComputedStyle(fish).opacity)<1;
   const original=stage.className,paintings=[];
   for(let tier=1;tier<=5;tier++){
    stage.className=original.replace(/garden-pond-tier-\d+/,'garden-pond-tier-'+tier);
    const imagePath=getComputedStyle(stage).backgroundImage.match(/url\(["']?([^"')]+)/)?.[1]||'';
    const picture=new Image();picture.src=imagePath;
    let decoded=false;
    try{await picture.decode();decoded=picture.naturalWidth>=1000;}catch(_){/* report below */}
    paintings.push({tier,decoded,correct:imagePath.includes('pond-level-'+tier+'.webp'),url:imagePath});
   }
   stage.className=original;
   return {width,submerged,artifacts,overlays,
    distinct:new Set(paintings.map(p=>p.url)).size===5,
    loaded:paintings.every(p=>p.decoded&&p.correct)};
  });
  assert.ok(pondVisual.width>.88,'Painted pond uses most of the stage width');
  assert.equal(pondVisual.artifacts,0,'No free-standing architecture floats over the fish');
  assert.equal(pondVisual.overlays,0,'No synthetic scenery layers sit over the lake');
  assert.ok(pondVisual.submerged,'Water highlights sit above translucent fish artwork');
  assert.ok(pondVisual.distinct&&pondVisual.loaded,'All five AI-painted pond levels load distinctly on mobile');

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
  assert.equal(await jadeTitle.locator('[data-honor-art="jade-appraiser"]').count(),1,
   'Each owned title is presented with its own original illustrated emblem');
  assert.match(await jadeTitle.locator('[data-honor-art]').evaluate(
   el=>getComputedStyle(el,'::after').backgroundImage),/honor-atlas-4\.webp/,
   'The illustrated emblem atlas must be actually painted, not a decorative class');
  assert.equal(await jadeTitle.locator('.dudu-honor-action').innerText(),'Sử dụng');
  await hall.locator('.dudu-honor-title-scopes').getByRole('button',{name:'Huyền thoại'}).click();
  const hidden=hall.locator('.dudu-honor-title-card.is-locked');
  assert.equal(await hidden.count(),1);
  assert.match(await hidden.innerText(),/Danh hiệu bí ẩn/);
  assert.equal(await hidden.locator('[data-honor-art]').count(),0,
   'Secret title art must not leak before the discovery');
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
  // C4.38: the new folio reads existing local Arcade discoveries. Even a
  // season save must never masquerade as a verified, owned Season 01 reward.
  await page.evaluate(()=>openPhoneApp('arcade'));
  await page.locator('#arcade-treasure-launch-c438').click();
  const treasures=page.locator('#dudu-treasure-content-c438');
  await treasures.locator('.dudu-c438-hero').waitFor();
  assert.match(await treasures.locator('.dudu-c438-hero').innerText(),/Sổ Báu Vật/);
  await treasures.getByRole('group',{name:'Lọc theo game'})
   .getByRole('button',{name:'Địa Tầng 07'}).click();
  const relic=treasures.locator('[data-treasure-id="ore-relic"]');
  assert.ok(await relic.isVisible(),'The full mineral catalogue includes archaeology');
  assert.match(await relic.locator('.dudu-c438-art').evaluate(
   el=>getComputedStyle(el).backgroundImage),/ore-atlas\.webp/);
  await treasures.getByRole('group',{name:'Lọc theo game'})
   .getByRole('button',{name:'Bốn game'}).click();
  await treasures.getByRole('group',{name:'Lọc theo mùa'})
   .getByRole('button',{name:'Mùa 01'}).click();
  await treasures.getByRole('group',{name:'Lọc theo tình trạng'})
   .getByRole('button',{name:'Xem trước'}).click();
  assert.equal(await treasures.locator('.dudu-c438-card[data-status="preview"]').count(),5);
  assert.equal(await treasures.locator('.dudu-c438-card[data-status="owned"]').count(),0);
  for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});
   const overflow=await treasures.evaluate(el=>el.scrollWidth-el.clientWidth);
   assert.ok(overflow<=2,'Treasure Folio must not overflow at '+width+'px');
  }
  await page.locator('#dudu-treasure-back-c438').click();
  assert.equal(await page.locator('#phone-app-arcade').evaluate(el=>el.style.display),'flex');
  console.log('C4.38 Sổ Báu Vật: existing discoveries, honest season previews, mobile fit OK');

  // C4.39: fixture changes ONLY the disposable Sandbox test account save.
  // Four choices are gallery preferences, not an item grant or main-wallet write.
  await page.evaluate(()=>{
   const key='dudu-personal-arcade:v1:sandbox%3Ac410-mobile-tester';
   const data=JSON.parse(localStorage.getItem(key));
   data.neon.contracts=[0];
   data.mine.found.stone=1;data.mine.found.gold=1;data.mine.found.crystal=1;
   data.garden.fishAlbum.koi=1;data.jade.album['5-1']=1;
   localStorage.setItem(key,JSON.stringify(data));
   window.DuduArcadeTreasureUIV438.open('arcade');
  });
  await treasures.getByRole('group',{name:'Lọc theo mùa'})
   .getByRole('button',{name:'Mọi thời kỳ'}).click();
  await treasures.getByRole('group',{name:'Lọc theo tình trạng'})
   .getByRole('button',{name:'Đã tìm thấy'}).click();
  const fishPin=treasures.locator('[data-treasure-id="fish-koi"] .dudu-c439-treasure-action');
  assert.equal(await fishPin.count(),0,'Fish are recorded in the Fish Album and Aquarium, not the Showcase');
  for(const id of ['neon-contract-0','ore-stone','ore-gold','jade-5-1']){
   const pin=treasures.locator('[data-treasure-id="'+id+'"] .dudu-c439-treasure-action');
   assert.equal(await pin.getAttribute('aria-pressed'),'false');
   await pin.click();
   assert.equal(await treasures.locator('[data-treasure-id="'+id+'"] .dudu-c439-treasure-action')
    .getAttribute('aria-pressed'),'true');
  }
  const displayKey='dudu-arcade-showcase:v1:sandbox%3Ac410-mobile-tester';
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).selected.length,displayKey),4);
  await treasures.locator('[data-treasure-id="ore-crystal"] .dudu-c439-treasure-action').click();
  assert.match(await treasures.locator('.dudu-c439-notice').innerText(),/đủ 4 bệ/);
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).selected.length,displayKey),4);
  await treasures.locator('[data-treasure-id="ore-stone"] .dudu-c439-treasure-action').click();
  await treasures.locator('[data-treasure-id="ore-crystal"] .dudu-c439-treasure-action').click();
  assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).selected,displayKey),
   ['neon-contract-0','ore-gold','jade-5-1','ore-crystal']);
  await treasures.locator('.dudu-c439-visit-display').click();
  const gallery=page.locator('#museum-c426-panel-display');
  await gallery.locator('.dudu-c439-scene').waitFor();
  assert.equal(await page.locator('.museum-c426-tab[data-tab="display"]')
   .getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('.museum-c426-tab[data-tab="owned"]').innerText(),'Đã sở hữu');
  assert.equal(await gallery.locator('.dudu-c439-slot.is-filled').count(),4);
  assert.equal(await gallery.locator('.dudu-c439-scene').getAttribute('data-kind'),'contract');
  const museumFlow=await page.evaluate(()=>({
   actionsBottom:document.querySelector('.dudu-c439-actions').getBoundingClientRect().bottom,
   helpTop:document.querySelector('#phone-app-museum .dudu-v27-museum-help').getBoundingClientRect().top
  }));
  assert.ok(museumFlow.helpTop>=museumFlow.actionsBottom-2,
   'Museum help must follow the full display room instead of covering its action buttons');
  assert.match(await gallery.locator('.dudu-c439-scene .dudu-c438-art').evaluate(
   el=>getComputedStyle(el).backgroundImage),/honor-atlas-2\.webp/,
   'The plinth uses the original illustrated item, not a generic emoji');
  assert.equal(await gallery.locator('.dudu-c439-plinth, .dudu-c439-plinth-foot').count(),0,
   'The hall already has a physical stone dais; do not overlay a second CSS stand');
  assert.match(await gallery.locator('.dudu-c439-scene').evaluate(
   el=>getComputedStyle(el).backgroundImage),/solo-hall\.webp/,
   'The personal display must show only one photographed central podium');
  await gallery.locator('.dudu-c439-slot.is-filled').nth(2).click();
  assert.match(await gallery.locator('.dudu-c439-plaque').innerText(),/Ngọc Phường/);
  assert.equal(await gallery.locator('.dudu-c439-scene').getAttribute('data-kind'),'jade');
  for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});
   const fit=await gallery.evaluate(el=>({overflow:el.scrollWidth-el.clientWidth,
    scene:el.querySelector('.dudu-c439-scene').getBoundingClientRect().width,
    slots:el.querySelector('.dudu-c439-slots').getBoundingClientRect().width}));
   assert.ok(fit.overflow<=2,'C4.39 display hall must not overflow at '+width+'px');
   assert.ok(fit.scene>190&&fit.slots<=fit.scene+2,'Four pedestals remain usable at '+width+'px');
  }
  await gallery.locator('.dudu-c439-open-book').click();
  assert.equal(await treasures.getByRole('group',{name:'Lọc theo tình trạng'})
   .getByRole('button',{name:'Đã tìm thấy'}).getAttribute('aria-pressed'),'true');
  await page.locator('#dudu-treasure-back-c438').click();
  assert.equal(await page.locator('.museum-c426-tab[data-tab="display"]')
   .getAttribute('aria-selected'),'true','Returning from Sổ preserves the personal display room');
  assert.equal(await gallery.locator('.dudu-c439-slot.is-filled').count(),4);
  await page.locator('.museum-c426-tab[data-tab="preview"]').click();
  const seasonal=page.locator('#museum-c426-panel-preview');
  assert.equal(await seasonal.locator('.museum-c426-select').count(),5);
  assert.equal(await seasonal.locator('.museum-c426-art').getAttribute('data-relic'),'neon');
  assert.match(await seasonal.locator('.museum-c426-art').evaluate(
   el=>getComputedStyle(el).backgroundImage),/s01-relic-atlas\.webp/);
  const previewTops={neon:await seasonal.locator('.museum-c426-art').evaluate(
   el=>parseFloat(getComputedStyle(el).top))};
  for(const relic of ['mine','garden','jade','founder']){
   await seasonal.locator('.museum-c426-select[data-exhibit="s01-'+relic+'"]').click();
   assert.equal(await seasonal.locator('.museum-c426-art').getAttribute('data-relic'),relic);
   previewTops[relic]=await seasonal.locator('.museum-c426-art').evaluate(
    el=>parseFloat(getComputedStyle(el).top));
  }
  assert.ok(previewTops.garden>previewTops.mine&&previewTops.jade>previewTops.mine,
   'Garden and jade have more transparent base padding, so their art sits lower');
  assert.ok(previewTops.founder>previewTops.mine,
   'Founder crest needs its own physical contact offset');
  assert.match(await seasonal.locator('.museum-c426-art').evaluate(
   el=>getComputedStyle(el).backgroundImage),/s01-founder-crest\.webp/);
  assert.match(await seasonal.locator('.museum-c426-stage').evaluate(
   el=>getComputedStyle(el).backgroundImage),/solo-hall\.webp/,
   'The seasonal gallery shares the single-plinth exhibit hall');
  await page.locator('.museum-c426-tab[data-tab="display"]').click();
  assert.match(await page.locator('.museum-c429-scene-trophies').evaluate(
   el=>getComputedStyle(el).backgroundImage),/solo-rotunda\.webp/,
   'The four achievement statues take turns on just one physical podium');
  assert.equal(await page.evaluate(()=>window.__arcadeExternalWrites?.length||0),0);
  console.log('C4.39 Tủ Trưng Bày: four honest favorites, museum room, phone fit OK');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
