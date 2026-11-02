// C4.46b — greenhouse drawer must remain navigable inside desktop and mobile phones.
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
  const page=await browser.newPage({viewport:{width:1440,height:900}});
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
  await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduPersonalArcadeUIV1&&!!window.DuduPhoneAppsV67);
  // Let the Sandbox's delayed first-login modal appear before changing accounts.
  await page.waitForTimeout(800);
  const modal=page.locator('#auth-modal');
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  if(!(await modal.isVisible()))await page.locator('#account-status-btn').click();
  await page.locator('#auth-username').fill('c446b-farmer');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>typeof currentUsername!=='undefined'&&currentUsername==='c446b-farmer');
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  await page.evaluate(()=>{
   if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
   openPhoneApp('arcade');
   const time=Date.now(),core=window.DuduPersonalArcadeCoreV1;
   const saved=core.fresh(time);
   saved.coins=1234;saved.neon.running=false;saved.garden.plots=4;saved.garden.harvests=35;
   saved.garden.fishAlbum.reed=4;
   saved.garden.beds=[
    {status:'growing',crop:'bloom',readyAt:time+60000},
    {status:'growing',crop:'mint',readyAt:time+30000},
    {status:'growing',crop:'moon',readyAt:time-30000},
    {status:'dry',crop:'bloom',readyAt:0}
   ];
   const key='dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c446b-farmer');
   localStorage.setItem(key,JSON.stringify(saved));
   dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(saved)}));
   window.DuduPersonalArcadeUIV1.openGarden();
  });
  const openFarm=async()=>{
   await page.locator('#personal-arcade-v1 [data-arcade-drawer="garden-seeds"]').click();
   await page.locator('#personal-arcade-v1 .garden-sheet-back').waitFor();
  };
  await openFarm();
  const bounds=await page.evaluate(()=>{
   const root=document.querySelector('#personal-arcade-v1');
   const shell=root.querySelector('.arcade-shell').getBoundingClientRect();
   const sheet=root.querySelector('.arcade-sheet').getBoundingClientRect();
   const heading=root.querySelector('.arcade-sheet-heading').getBoundingClientRect();
   const back=root.querySelector('.garden-sheet-back').getBoundingClientRect();
   const body=root.querySelector('.arcade-sheet-body');
   return {shell,sheet,heading,back,hasHero:!!root.querySelector('.garden-farm-hero'),
    plotCount:body.querySelectorAll('.garden-plot').length,
    picture:getComputedStyle(body.querySelector('.garden-crop-sprite')).backgroundImage,
    writes:window.__arcadeExternalWrites.length};
  });
  assert.ok(bounds.heading.top>=bounds.shell.top-2,'Desktop popup heading must not be clipped above the phone');
  assert.ok(bounds.heading.bottom<=bounds.shell.bottom+2);
  assert.ok(bounds.back.top>=bounds.shell.top-2&&bounds.back.bottom<=bounds.shell.bottom+2);
  assert.ok(bounds.sheet.top>=bounds.shell.top-2&&bounds.sheet.bottom<=bounds.shell.bottom+2);
  assert.equal(bounds.plotCount,4);
  assert.ok(bounds.hasHero);
  assert.match(bounds.picture,/garden-growth-atlas\.webp/);
  assert.equal(bounds.writes,0);

  await page.locator('#personal-arcade-v1 .garden-sheet-back').click();
  assert.equal(await page.locator('#personal-arcade-v1 .arcade-sheet-overlay').count(),0);
  assert.equal(await page.locator('#personal-arcade-v1 .arcade-tab').count(),4);
  assert.equal(await page.locator('#personal-arcade-v1 .arcade-tab[data-arcade-tab="garden"]').getAttribute('aria-selected'),'true');

  await openFarm();
  await page.locator('#phone-app-arcade .phone-back-btn').click();
  assert.equal(await page.locator('#personal-arcade-v1 .arcade-sheet-overlay').count(),0,
   'Phone Back closes the greenhouse, not the four-game Arcade');
  assert.equal(await page.locator('#phone-app-arcade').evaluate(el=>el.style.display),'flex');

  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   await openFarm();
   const layout=await page.evaluate(()=>{
    const root=document.querySelector('#personal-arcade-v1');
    const body=root.querySelector('.arcade-sheet-body');
    const header=root.querySelector('.arcade-sheet-heading').getBoundingClientRect();
    const back=root.querySelector('.garden-sheet-back').getBoundingClientRect();
    const sheet=root.querySelector('.arcade-sheet').getBoundingClientRect();
    const plots=[...root.querySelectorAll('.garden-farm-workbench .garden-plot')]
     .map(el=>el.getBoundingClientRect());
    return {header,back,sheet,plots,overflow:body.scrollWidth-body.clientWidth,
     labels:[...root.querySelectorAll('.garden-plot-label b')].map(el=>el.textContent),
     seedCount:root.querySelectorAll('.garden-seed').length};
   });
   assert.ok(layout.header.top>=layout.sheet.top-1&&layout.back.bottom<=layout.header.bottom+1,
    `The 4-game back button stays visible at ${width}px`);
   assert.ok(layout.sheet.left>=0&&layout.sheet.right<=width+2);
   assert.ok(layout.overflow<=3,`Farm sheet should not scroll sideways at ${width}px`);
   assert.equal(layout.plots.length,4);
   assert.equal(layout.seedCount,3);
   assert.ok(layout.plots[0].right<=layout.plots[1].left+1,'Beds in one row do not overlap');
   assert.ok(layout.plots[0].bottom<=layout.plots[2].top+1,'Rows do not overlap');
   assert.ok(layout.labels.includes('Hoa sương')&&layout.labels.includes('Hoa nguyệt'));
   await page.locator('#personal-arcade-v1 .garden-sheet-back').click();
  }
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c446b-farmer'))));
  assert.equal(saved.coins,1234);
  assert.equal(saved.garden.harvests,35);
  assert.equal(saved.garden.plots,4);
  assert.equal(saved.garden.fishAlbum.reed,4);
  console.log('C4.46b greenhouse: desktop Back + mobile 320/375/390/430px ✓');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
