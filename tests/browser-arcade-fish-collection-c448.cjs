// C4.48b — collection rewards, instant essence forging and mobile popup layout.
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
  await page.locator('#auth-username').fill('c448-fish-collector');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>typeof currentUsername!=='undefined'&&currentUsername==='c448-fish-collector');
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  await page.evaluate(()=>{
   if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
   openPhoneApp('arcade');
   const saved=window.DuduPersonalArcadeCoreV1.fresh(Date.now());
   saved.coins=1000;saved.neon.running=false;saved.garden.pondTier=2;
   saved.garden.fishAlbum.reed=9;saved.garden.fishAlbum.carp=2;
   saved.garden.fishAlbum.silver=1;saved.garden.fishAlbum.koi=1;
   saved.garden.fishAlbum.moonfish=7;
   saved.garden.fishBest.reed=28;saved.garden.pondDisplay=['koi'];
   const key='dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c448-fish-collector');
   localStorage.setItem(key,JSON.stringify(saved));
   dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(saved)}));
   window.DuduPersonalArcadeUIV1.openGarden();
  });
  await page.locator('#personal-arcade-v1 [data-arcade-drawer="garden-album"]').click();
  const sheet=page.locator('#personal-arcade-v1 .arcade-sheet-body');
  const tab=id=>sheet.locator(`[data-arcade-fish-tab="${id}"]`);
  assert.equal(await sheet.locator('.garden-fish-tabs button').count(),3);
  assert.equal(await tab('atlas').getAttribute('aria-selected'),'true');
  assert.equal(await sheet.locator('.garden-fish-showcase-slot').count(),3);
  assert.match(await sheet.locator('.garden-fish-records').innerText(),/28 cm/);
  assert.match(await sheet.locator('.garden-fish-entry.fish-reed').innerText(),/Dư 8/);
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   const layout=await sheet.evaluate(el=>{
    const panel=document.querySelector('#personal-arcade-v1 .arcade-sheet').getBoundingClientRect();
    const tabs=[...el.querySelectorAll('.garden-fish-tabs button')].map(node=>node.getBoundingClientRect());
    return {panel,tabs,overflow:el.scrollWidth-el.clientWidth};
   });
   assert.ok(layout.panel.left>=-1&&layout.panel.right<=width+2,`Album fits ${width}px`);
   assert.ok(layout.overflow<=3,`No sideways album scroll at ${width}px`);
   assert.ok(layout.tabs.every((node,i)=>i===0||layout.tabs[i-1].right<=node.left+1));
   assert.ok(layout.tabs.every(node=>node.height>=35));
  }
  await tab('sets').click();
  assert.equal(await tab('sets').getAttribute('aria-selected'),'true');
  assert.equal(await sheet.locator('.garden-fish-set-card').count(),4);
  const setButton=sheet.locator('[data-arcade-action="garden-fish-set-0"]');
  assert.equal(await setButton.isEnabled(),true);
  await setButton.click();
  assert.equal(await setButton.isDisabled(),true);
  await tab('orders').click();
  assert.equal(await sheet.locator('.garden-fish-order').count(),5);
  const order=sheet.locator('[data-arcade-action="garden-fish-order-0"]');
  assert.equal(await order.isEnabled(),true);
  await order.click();
  assert.equal(await order.isDisabled(),true);
  assert.match(await sheet.locator('.garden-fish-forge-head').innerText(),/không chờ tuần/);
  const tradeReed=sheet.locator('[data-arcade-action="garden-fish-trade-reed"]');
  const tradeMoon=sheet.locator('[data-arcade-action="garden-fish-trade-moonfish"]');
  const upgrade=sheet.locator('[data-arcade-action="garden-fish-essence-upgrade"]');
  const charm=sheet.locator('[data-arcade-action="garden-fish-record-charm"]');
  assert.equal(await upgrade.isDisabled(),true);
  await tradeReed.click();
  for(let i=0;i<3;i++)await tradeMoon.click();
  assert.match(await sheet.locator('.garden-fish-essence-count').innerText(),/10\/200/);
  assert.equal(await upgrade.isEnabled(),true);
  await upgrade.click();
  assert.match(await sheet.locator('.garden-fish-essence-actions').innerText(),/Dây Sương · cấp 1\/3/);
  for(let i=0;i<2;i++)await tradeMoon.click();
  assert.equal(await charm.isEnabled(),true);
  await charm.click();
  await tradeReed.click();
  assert.equal(await tradeReed.isEnabled(),true,'No weekly limit after many instant exchanges');
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   const overflow=await sheet.evaluate(el=>el.scrollWidth-el.clientWidth);
   assert.ok(overflow<=3,`No sideways fish orders at ${width}px`);
  }
  await page.locator('#personal-arcade-v1 .arcade-sheet-close').click();
  assert.equal(await page.locator('#personal-arcade-v1 .arcade-tab').count(),4);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c448-fish-collector'))));
  assert.equal(saved.coins,1090);
  assert.equal(saved.garden.fishAlbum.reed,9);
  assert.equal(saved.garden.fishSpent.reed,4);
  assert.equal(saved.garden.fishSpent.moonfish,5);
  assert.equal(saved.garden.fishAlbum.moonfish,7);
  assert.equal(saved.garden.fishEssence,3);
  assert.equal(saved.garden.fishEssenceLevel,1);
  assert.equal(saved.garden.recordCharms,1);
  assert.equal(saved.garden.fishBest.reed,28);
  assert.deepEqual(saved.garden.pondDisplay,['koi']);
  assert.deepEqual(saved.garden.fishSetsClaimed,[0]);
  assert.deepEqual(saved.garden.fishOrdersDone,[0]);
  assert.equal(saved.garden.fishTradeUsed,0,'No weekly timer or counter is consumed');
  assert.equal(saved.garden.bait,4);
  assert.equal(await page.evaluate(()=>window.__arcadeExternalWrites.length),0);
  console.log('C4.48b instant fish essence, permanent forge, record charms and four phone widths ✓');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
