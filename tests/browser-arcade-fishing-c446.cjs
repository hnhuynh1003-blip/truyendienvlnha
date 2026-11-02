// C4.46 — real mobile fishing controls; sandbox-only account and no cloud writes.
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
  const pathname=decodeURIComponent(url.pathname);
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
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('https://www.gstatic.com/firebasejs/**',async route=>{
   const app=route.request().url().includes('firebase-app-compat');
   await route.fulfill({status:200,contentType:'application/javascript',body:app?
    `window.__arcadeExternalWrites=[];window.firebase={initializeApp(){},firestore(){return {collection(){return {doc(){return {get:async()=>({exists:false,data:()=>({})}),set:async()=>{window.__arcadeExternalWrites.push(1);throw Error('blocked');},onSnapshot:()=>()=>{}};}};}};}};window.firebase.firestore.FieldValue={serverTimestamp:()=>1};`:''});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduPersonalArcadeUIV1&&!!window.DuduPhoneAppsV67);
  const modal=page.locator('#auth-modal');
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  if(!(await modal.isVisible()))await page.locator('#account-status-btn').click();
  await page.locator('#auth-username').fill('c446-fisher');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>typeof currentUsername!=='undefined'&&currentUsername==='c446-fisher');
  await page.evaluate(()=>{
   if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
   openPhoneApp('arcade');window.DuduPersonalArcadeUIV1.openGarden();
  });

  // Every width must keep the moving target and one primary thumb action usable.
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   await page.evaluate(()=>{
    const time=Date.now(),core=window.DuduPersonalArcadeCoreV1;
    const saved=core.fresh(time);
    saved.coins=2330;saved.garden.pondTier=5;saved.garden.rod=3;
    saved.garden.fishAlbum.reed=4;saved.garden.fishBest.reed=28;
    saved.garden.line={fishId:'dragon',biteAt:time-5000,escapeAt:time+20000,
     size:82,rod:3,lure:'moon'};
    const key='dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c446-fisher');
    localStorage.setItem(key,JSON.stringify(saved));
    dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(saved)}));
    window.DuduPersonalArcadeUIV1.openGarden();
   });
   const reel=page.locator('#personal-arcade-v1 .garden-reel-challenge');
   await reel.waitFor();
   const view=await page.evaluate(()=>{
    const host=document.querySelector('#personal-arcade-v1');
    const track=host.querySelector('.garden-reel-track').getBoundingClientRect();
    const safe=host.querySelector('.garden-reel-safe').getBoundingClientRect();
    const button=host.querySelector('button[data-arcade-action="reel-pulse"]');
    const pond=host.querySelector('.garden-stage');
    const scroll=host.querySelector('.arcade-scroll');
    const marker=host.querySelector('.garden-reel-marker');
    return {track:{left:track.left,right:track.right,width:track.width},
     safe:{left:safe.left,right:safe.right,width:safe.width},
     buttonWidth:button.getBoundingClientRect().width,
     overflow:scroll.scrollWidth-scroll.clientWidth,
     phaseCount:host.querySelectorAll('.garden-reel-phases span').length,
     pondLevel:pond.classList.contains('garden-pond-tier-5'),
     animation:getComputedStyle(marker).animationName,
     writes:window.__arcadeExternalWrites.length};
   });
   assert.equal(view.phaseCount,3,'Legendary requires three distinct phases');
   assert.ok(view.pondLevel,'Keeps the original level-5 AI pond');
   assert.equal(view.animation,'c425f-reel-travel');
   assert.ok(view.track.left>=0&&view.track.right<=width+2,
    `Entire skill track remains inside ${width}px mobile viewport`);
   assert.ok(view.safe.left>=view.track.left&&view.safe.right<=view.track.right);
   assert.ok(view.safe.width>=20,'Late phases remain visible and hittable');
   assert.ok(view.buttonWidth>=180,'Keep a large thumb control');
   assert.ok(view.overflow<=2,'No horizontal scroll in Arcade');
   assert.equal(view.writes,0);
  }

  // A real DOM click only scores when the visible marker overlaps the target.
  // Advance a fake clock between clicks to avoid a slow/flaky real-time test.
  const caught=await page.evaluate(()=>{
   const original=Date.now;let time=original();Date.now=()=>time;
   const container=document.querySelector('#personal-arcade-v1');
   try{
    for(let beat=0;beat<7;beat++){
     const safe=container.querySelector('.garden-reel-safe');
     const track=container.querySelector('.garden-reel-track');
     const marker=container.querySelector('.garden-reel-marker');
     const s=safe.getBoundingClientRect(),t=track.getBoundingClientRect();
     marker.style.animation='none';
     marker.style.left=((s.left+s.right)/2-t.left)/t.width*100+'%';
     container.querySelector('button[data-arcade-action="reel-pulse"]').click();
     time+=550;
    }
    const raw=localStorage.getItem('dudu-personal-arcade:v1:'+encodeURIComponent('sandbox:c446-fisher'));
    return JSON.parse(raw);
   }finally{Date.now=original;}
  });
  assert.equal(caught.garden.line,null,'Success consumes the active line once');
  assert.equal(caught.garden.fishAlbum.dragon,1);
  assert.equal(caught.garden.fishAlbum.reed,4,'Prior catches remain unchanged');
  assert.equal(caught.garden.fishBest.reed,28,'Old personal records are preserved');
  assert.equal(caught.coins,2470,'Rod-3 legendary payout is issued exactly once');
  assert.equal(await page.locator('#personal-arcade-v1 button[data-arcade-action="reel-pulse"]').count(),0);
  console.log('C4.46 mobile fishing: 320/375/390/430px, 3 phases, catch and save ✓');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
