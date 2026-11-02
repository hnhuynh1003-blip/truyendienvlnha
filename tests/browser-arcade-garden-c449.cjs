// C4.49 — soil upgrades, retroactive garden orders, harvest and small phone layouts.
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
   const code=app?`window.__arcadeExternalWrites=[];window.firebase={initializeApp(){},
    firestore(){return {collection(){return {doc(){return {
     get:async()=>({exists:false,data:()=>({})}),
     set:async v=>{window.__arcadeExternalWrites.push(v);throw Error('blocked');},
     update:async v=>{window.__arcadeExternalWrites.push(v);throw Error('blocked');},
     onSnapshot:()=>()=>{}};}};}};}};
    window.firebase.firestore.FieldValue={serverTimestamp:()=>1};`:'';
   await route.fulfill({status:200,contentType:'application/javascript',body:code});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduPersonalArcadeUIV1&&!!window.DuduPhoneAppsV67);
  await page.waitForTimeout(800);
  const modal=page.locator('#auth-modal');
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  if(!(await modal.isVisible()))await page.locator('#account-status-btn').click();
  await page.locator('#auth-username').fill('c449-greenhouse');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>typeof currentUsername!=='undefined'&&currentUsername==='c449-greenhouse');
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  await page.evaluate(()=>{
   if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
   openPhoneApp('arcade');
   const t=Date.now(),s=window.DuduPersonalArcadeCoreV1.fresh(t);
   s.neon.running=false;s.coins=1234;
   s.garden.plots=4;s.garden.harvests=0;s.garden.cropStock={bloom:10,mint:10,moon:10};
   s.garden.cropHarvested={bloom:3,mint:3,moon:0};
   s.garden.cropOrdersDone=[0,1,2];
   s.garden.beds=[{status:'growing',crop:'bloom',readyAt:t-1000},
    {status:'growing',crop:'moon',readyAt:t+9*60000},
    {status:'dry',crop:'mint',readyAt:0},
    {status:'empty',crop:'bloom',readyAt:0}];
   delete s.garden.gardenSeals;delete s.garden.gardenSoilLevel;
   const key='dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c449-greenhouse');
   localStorage.setItem(key,JSON.stringify(s));
   dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(s)}));
   window.DuduPersonalArcadeUIV1.openGarden();
  });
  await page.locator('#personal-arcade-v1 [data-arcade-drawer="garden-seeds"]').click();
  const sheet=page.locator('#personal-arcade-v1 .arcade-sheet-body');
  const soil=sheet.locator('.garden-soil-workshop');
  assert.match(await soil.innerText(),/12 Dấu Vườn/);
  assert.equal(await sheet.locator('.garden-seed').count(),3);
  assert.equal(await sheet.locator('.garden-plot').count(),4);
  assert.match(await sheet.locator('.garden-crop-orders').innerText(),/3\/5/);
  const beforeMoon=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c449-greenhouse'))).garden.beds[1].readyAt);
  const harvest=sheet.locator('[data-arcade-action="harvest-0"]');
  assert.equal(await harvest.isEnabled(),true);
  await harvest.click();
  assert.equal(await sheet.locator('[data-arcade-action="crop-mint"]').isEnabled(),true,
   'Four bloom harvests unlock mint without ten repetitions');
  const soilButton=sheet.locator('[data-arcade-action="garden-soil-upgrade"]');
  for(let i=0;i<2;i++){
   assert.equal(await soilButton.isEnabled(),true);
   await soilButton.click();
  }
  const afterMoon=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c449-greenhouse'))).garden.beds[1].readyAt);
  assert.ok(afterMoon<beforeMoon,'Existing growing plants benefit immediately');
  assert.match(await soil.innerText(),/cấp 2\/3/);
  await sheet.locator('[data-arcade-action="garden-order-3"]').click();
  await sheet.locator('[data-arcade-action="garden-order-4"]').click();
  assert.match(await sheet.locator('.garden-crop-orders').innerText(),/5\/5/);
  assert.equal(await soilButton.isEnabled(),true);
  await soilButton.click();
  assert.match(await soil.innerText(),/cấp 3\/3/);
  assert.equal(await soilButton.isDisabled(),true);
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   const layout=await sheet.evaluate(el=>{
    const panel=document.querySelector('#personal-arcade-v1 .arcade-sheet').getBoundingClientRect();
    const seeds=[...el.querySelectorAll('.garden-seed')].map(node=>node.getBoundingClientRect());
    const beds=[...el.querySelectorAll('.garden-plot')].map(node=>node.getBoundingClientRect());
    const soil=el.querySelector('.garden-soil-workshop').getBoundingClientRect();
    return {panel,seeds,beds,soil,overflow:el.scrollWidth-el.clientWidth};
   });
   assert.ok(layout.panel.left>=-1&&layout.panel.right<=width+2,`Farm fits ${width}px`);
   assert.ok(layout.overflow<=3,`No sideways farm scrolling at ${width}px`);
   assert.ok(layout.seeds.every(rect=>rect.height<=69),`Seeds remain compact at ${width}px`);
   assert.ok(layout.beds[0].right<=layout.beds[1].left+1);
   assert.ok(layout.beds[0].bottom<=layout.beds[2].top+1);
   assert.ok(layout.soil.right<=layout.panel.right+1);
  }
  await page.locator('#personal-arcade-v1 .garden-sheet-back').click();
  assert.equal(await page.locator('#personal-arcade-v1 .arcade-tab').count(),4);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c449-greenhouse'))));
  assert.equal(saved.coins,1284);
  assert.equal(saved.garden.harvests,1);
  assert.equal(saved.garden.cropHarvested.bloom,4);
  assert.equal(saved.garden.gardenSoilLevel,3);
  assert.equal(saved.garden.gardenSeals,0);
  assert.deepEqual(saved.garden.cropOrdersDone,[0,1,2,3,4]);
  assert.equal(saved.garden.cropStock.bloom,4);
  assert.equal(saved.garden.cropStock.mint,3);
  assert.equal(saved.garden.cropStock.moon,4);
  assert.equal(await page.evaluate(()=>window.__arcadeExternalWrites.length),0);
  console.log('C4.49 garden orders, soil upgrades, harvest reload state and four phone widths ✓');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
