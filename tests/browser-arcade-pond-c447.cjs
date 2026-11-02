// C4.47 — real journal/pond upgrade UI at desktop and small phone widths.
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
  await page.locator('#auth-username').fill('c447-pond-visitor');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>typeof currentUsername!=='undefined'&&currentUsername==='c447-pond-visitor');
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  await page.evaluate(()=>{
   if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
   openPhoneApp('arcade');
   const state=window.DuduPersonalArcadeCoreV1.fresh(Date.now());
   state.coins=12345;state.garden.pondTier=1;state.garden.fishAlbum.dragon=1;
   state.garden.fishBest.dragon=88;state.garden.pondDisplay=['dragon'];
   const key='dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c447-pond-visitor');
   localStorage.setItem(key,JSON.stringify(state));
   dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(state)}));
   window.DuduPersonalArcadeUIV1.openGarden();
  });
  const open=async drawer=>{
   await page.locator(`#personal-arcade-v1 [data-arcade-drawer="${drawer}"]`).click();
   await page.locator('#personal-arcade-v1 .arcade-sheet-body').waitFor();
  };
  await open('garden-album');
  const journal=page.locator('#personal-arcade-v1 .arcade-sheet-body');
  assert.match(await journal.locator('.garden-pond-progress').innerText(),/Hồ cấp 1\/5 · 3 loài/);
  assert.equal(await journal.locator('.garden-pond-path>span').count(),5);
  assert.equal(await journal.locator('.garden-fish-entry.is-unknown').count(),13);
  assert.match(await journal.locator('.garden-fish-entry.fish-dragon').innerText(),/88 cm/);
  assert.equal(await journal.locator('.garden-fish-entry.fish-dragon button').isDisabled(),true,
   'An old legendary catch survives but cannot swim in a starter pond');
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   const layout=await journal.evaluate(el=>{
    const shell=document.querySelector('#personal-arcade-v1 .arcade-sheet').getBoundingClientRect();
    const progress=el.querySelector('.garden-pond-progress').getBoundingClientRect();
    const chips=[...el.querySelectorAll('.garden-pond-path>span')].map(node=>node.getBoundingClientRect());
    return {shell,progress,chips,scroll:el.scrollWidth-el.clientWidth};
   });
   assert.ok(layout.shell.left>=-1&&layout.shell.right<=width+2,`Journal fits ${width}px`);
   assert.ok(layout.scroll<=3,`No journal sideways scrolling at ${width}px`);
   assert.equal(layout.chips.length,5);
   assert.ok(layout.chips.every((rect,i)=>i===0||layout.chips[i-1].right<=rect.left+1),
    `Five level chips do not overlap at ${width}px`);
   assert.ok(layout.progress.width<=layout.shell.width+1);
  }
  await page.locator('#personal-arcade-v1 .arcade-sheet-close').click();
  await open('garden-upgrades');
  assert.match(await page.locator('#personal-arcade-v1 .garden-pond-next').innerText(),/Hồ cấp 2 · \+4 loài/);
  assert.match(await page.locator('#personal-arcade-v1 .garden-tackle-chance').innerText(),/Cá hiếm mở từ hồ cấp 2/);
  await page.locator('#personal-arcade-v1 .arcade-sheet-close').click();
  assert.equal(await page.locator('#personal-arcade-v1 .arcade-tab').count(),4);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c447-pond-visitor'))));
  assert.equal(saved.coins,12345);
  assert.equal(saved.garden.pondTier,1);
  assert.equal(saved.garden.fishAlbum.dragon,1);
  assert.deepEqual(saved.garden.pondDisplay,['dragon']);
  assert.equal(await page.evaluate(()=>window.__arcadeExternalWrites.length),0);
  console.log('C4.47 pond levels, journal locks, historical catches and mobile layouts ✓');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
