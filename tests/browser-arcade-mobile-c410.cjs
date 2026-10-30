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
    return {overflow:port.scrollWidth-port.clientWidth,tabs:tabs.children.length,
     portWidth:box.width,navWidth:nav.width,phoneWidth:document.getElementById('cyber-phone').getBoundingClientRect().width};
   });
   assert.ok(layout.portWidth>190,'Arcade should have a usable content width at '+width);
   assert.ok(layout.overflow<=2,'No horizontal Arcade overflow at '+width+'px');
   assert.equal(layout.tabs,4,'Four game tabs stay available on a narrow viewport');
   assert.ok(layout.navWidth<=layout.phoneWidth,'Bottom game navigation fits the phone');
  }

  // A player leaving the Neon workshop must see the Jade stage, not Neon scroll offset.
  await page.evaluate(()=>document.querySelector('.arcade-scroll').scrollTop=220);
  await tab('jade').click();
  assert.equal(await page.locator('.arcade-scroll').evaluate(el=>el.scrollTop),0);
  await action('jade-buy-0').click();
  for(let i=0;i<3;i++)await action('jade-scan-'+i).click();
  const scans=await page.evaluate(()=>{
   const raw=localStorage.getItem('dudu-personal-arcade:v1:sandbox%3Ac410-mobile-tester');
   const game=raw?JSON.parse(raw):null;
   return {scans:game?.jade?.active?.scans,coins:game?.coins};
  });
  assert.deepEqual(scans.scans,[true,true,true]);
  assert.equal(scans.coins,0,'First Jade sample is free');
  await action('jade-cut').click();
  await action('jade-sell').click();
  const jadeAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:sandbox%3Ac410-mobile-tester')));
  assert.equal(jadeAfter.jade.sold,1);

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
  console.log('C4.10 mobile Arcade: four games, touch actions, scroll and local saves OK');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
