// C4.52 — Neon, Mine and Jade on real 320/375/390/430px game surfaces.
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

async function main(){
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost');
  const name=decodeURIComponent(url.pathname);
  const filename=path.resolve(root,'.'+name,name.endsWith('/')?'index.html':'');
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
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('https://www.gstatic.com/firebasejs/**',async route=>{
   const app=route.request().url().includes('firebase-app-compat');
   const code=app?`window.__arcadeExternalWrites=[];window.firebase={initializeApp(){},
    firestore(){return {collection(){return {doc(){return {
     get:async()=>({exists:false,data:()=>({})}),
     set:async v=>{window.__arcadeExternalWrites.push(v);throw Error('blocked');},
     update:async v=>{window.__arcadeExternalWrites.push(v);throw Error('blocked');},
     onSnapshot:()=>()=>{}};}};}};}};
    window.firebase.firestore.FieldValue={serverTimestamp:()=>1};` : '';
   await route.fulfill({status:200,contentType:'application/javascript',body:code});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduPersonalArcadeUIV1&&!!window.DuduPhoneAppsV67);
  await page.waitForTimeout(800);
  const modal=page.locator('#auth-modal');
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  if(!(await modal.isVisible()))await page.locator('#account-status-btn').click();
  await page.locator('#auth-username').fill('c452-multi-game');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>typeof currentUsername!=='undefined'&&
   currentUsername==='c452-multi-game');
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  await page.evaluate(()=>{
   if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
   openPhoneApp('arcade');
   const time=Date.now(),core=window.DuduPersonalArcadeCoreV1;
   const state=core.fresh(time);
   state.coins=50000;state.neon.router=5;
   state.mine.scanner=3;state.mine.charge=5;
   state.jade.lamp=4;
   state.jade.inspected=['1:0:1'];
   const key='dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c452-multi-game');
   localStorage.setItem(key,JSON.stringify(state));
   dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(state)}));
  });
  const game='#personal-arcade-v1';
  const tab=id=>page.locator(game+' [data-arcade-tab="'+id+'"]');
  const action=id=>page.locator(game+' button[data-arcade-action="'+id+'"]');
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   await tab('neon').click();
   assert.match(await page.locator('.neon-order-footer').innerText(),/MẠNG: \+1,6s NHỊP/);
   assert.match(await action('neon-beat-start').innerText(),/13\.6s/);
   await tab('mine').click();
   assert.match(await page.locator('.mine-seam-footer').innerText(),/\+3 MẪU/);
   assert.equal(await page.locator('.mine-seam-tunnel').count(),3);
   await tab('jade').click();
   await action('jade-open-market').click();
   const sheet=page.locator('.arcade-sheet-overlay');
   await sheet.locator('.jade-stall-stone').nth(1).click();
   assert.equal(await sheet.locator('.jade-market-tray').getAttribute('data-selected-slot'),'1');
   assert.equal(await sheet.locator('.jade-market-tray.is-focused .jade-clue-line').count(),3);
   const layout=await page.evaluate(()=>{
    const root=document.querySelector('#personal-arcade-v1');
    const scroller=root.querySelector('.arcade-scroll');
    const sheet=root.querySelector('.arcade-sheet-body');
    return {world:scroller.scrollWidth-scroller.clientWidth,
     sheet:sheet.scrollWidth-sheet.clientWidth,
     clues:[...sheet.querySelectorAll('.jade-market-tray.is-focused .jade-clue-line')]
      .map(el=>{const a=el.getBoundingClientRect(),b=sheet.getBoundingClientRect();
       return a.right<=b.right+2&&a.left>=b.left-2;})};
   });
   assert.ok(layout.world<=2,`No Arcade horizontal overflow at ${width}px`);
   assert.ok(layout.sheet<=3,`No Jade sheet horizontal overflow at ${width}px`);
   assert.ok(layout.clues.every(Boolean),`All Jade clues fit inside ${width}px`);
   await sheet.locator('.arcade-sheet-close').click();
  }
  await page.setViewportSize({width:390,height:844});
  await tab('neon').click();
  await action('neon-beat-start').click();
  for(const direction of [0,2,1])await action('neon-beat-'+direction).click();
  await tab('mine').click();
  await action('mine-probe-1').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(
   'dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c452-multi-game'))));
  assert.equal(saved.neon.orderWon,1);
  assert.equal(saved.mine.probeHits,1);
  assert.ok(Object.values(saved.mine.ores).reduce((sum,x)=>sum+x,0)>=4);
  assert.equal(saved.jade.lamp,4);
  assert.deepEqual(saved.jade.inspected,['1:0:1']);
  assert.equal(await page.evaluate(()=>window.__arcadeExternalWrites.length),0);
  console.log('C4.52 Neon, Mine and Jade mobile 320/375/390/430px, actions, save and zero external writes ✓');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
