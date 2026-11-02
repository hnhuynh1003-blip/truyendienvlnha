// C4.43: a real mobile DOM test for TOC/back and same-tab reload recovery.
// All account/story mutations stay in a fresh isolated Sandbox browser profile.
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

async function main(){
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+pathname,pathname.endsWith('/')?'index.html':'');
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  fs.readFile(file,(err,bytes)=>{
   if(err){response.writeHead(404).end();return;}
   const mime=/\.js$/.test(file)?'application/javascript':/\.css$/.test(file)?'text/css':
    /\.webp$/.test(file)?'image/webp':'text/html; charset=utf-8';
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
   const code=app?`window.__readerExternalWrites=[];window.firebase={
    initializeApp(){},firestore(){return {collection(){return {doc(){return {
     get:async()=>({exists:false,data:()=>({})}),
     set:async v=>{window.__readerExternalWrites.push(v);throw Error('blocked');},
     update:async v=>{window.__readerExternalWrites.push(v);throw Error('blocked');},
     onSnapshot:()=>()=>{}};}};}};}};
    window.firebase.firestore.FieldValue={serverTimestamp:()=>1};` : '';
   await route.fulfill({status:200,contentType:'application/javascript',body:code});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduReadingReturnC443&&!!window.DuduSiteV60);
  const modal=page.locator('#auth-modal');
  if(!(await modal.isVisible()))await page.locator('#account-status-btn').click();
  await page.locator('#auth-username').fill('c443-reader-tester');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>currentUsername==='c443-reader-tester');
  await page.evaluate(()=>{
   // Long-form fixture belongs to the isolated Sandbox browser context only.
   novels[0].chapters[0].content=Array.from({length:90},(_,i)=>
    'Đoạn '+(i+1)+': Một hành trình tiếp tục giữa trang sách. '.repeat(8)).join('\n\n');
   localStorage.setItem('dudu-sandbox-library',JSON.stringify(novels));
   smartReadAction(0);
  });
  await page.locator('#reader-view').waitFor({state:'visible'});
  // readChapter finishes its initial scroll reset after 50ms. Wait until that
  // transition settles before simulating a reader's fast downward swipe.
  await page.waitForTimeout(120);
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});
   const boxes=await page.evaluate(()=>{
    const shortcut=document.getElementById('floating-reading-bar');
    const a=shortcut.getBoundingClientRect(),phone=document.getElementById('phone-fab').getBoundingClientRect();
    const paper=document.getElementById('reader-paper').getBoundingClientRect();
    const content=document.getElementById('reader-content').getBoundingClientRect();
    return {left:a.left,right:a.right,phoneLeft:phone.left,visible:getComputedStyle(shortcut).display,
     paperLeft:paper.left,paperRight:paper.right,contentLeft:content.left,contentRight:content.right,
     overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.equal(boxes.visible,'none','TOC stays tucked away while reading at '+width);
   assert.ok(boxes.left>=0&&boxes.overflow<=2,'reader fits at '+width);
   assert.ok(Math.abs(boxes.paperLeft)<=1&&Math.abs(boxes.paperRight-width)<=1,
    'reading paper spans the screen without the old double gutter at '+width);
   assert.ok(boxes.contentLeft>=14&&boxes.contentLeft<=20&&
    width-boxes.contentRight>=14&&width-boxes.contentRight<=20,
    'text keeps a comfortable 15–18px inset at '+width);
  }
  await page.locator('#reader-ch-title').click();
  assert.equal(await page.locator('#floating-reading-bar').isVisible(),true,
   'tapping the reading paper reveals quick controls');
  assert.equal(await page.locator('#reader-quick-prev').isDisabled(),true);
  assert.equal(await page.locator('#reader-quick-next').isEnabled(),true);
  await page.locator('#reader-quick-settings').click();
  assert.equal(await page.locator('#reader-settings-popover').isVisible(),true,
   'quick settings opens the existing reader preference sheet');
  await page.locator('#reader-settings-close').click();
  assert.equal(await page.locator('#floating-reading-bar').isVisible(),false);
  // Flush the downward scroll event before reversing direction. Without this,
  // Chromium may coalesce two instant scrollTo() calls into one event at 560px.
  await page.evaluate(async()=>{
   window.scrollTo(0,700);
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
  await page.waitForFunction(()=>window.scrollY>500);
  assert.equal(await page.locator('#floating-reading-bar').isVisible(),false);
  await page.evaluate(()=>window.scrollTo(0,560));
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('floating-reading-bar')).display==='flex');
  assert.ok(parseInt(await page.locator('#reader-quick-progress').innerText(),10)>0,
   'quick progress measures the current chapter');
  const positions=await page.evaluate(()=>({
   right:document.getElementById('floating-reading-bar').getBoundingClientRect().right,
   phoneLeft:document.getElementById('phone-fab').getBoundingClientRect().left
  }));
  assert.ok(positions.right+6<=positions.phoneLeft,'revealed TOC stays clear of the Phone');
  await page.evaluate(()=>window.scrollTo(0,700));
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('floating-reading-bar')).display==='none');
  await page.waitForFunction(()=>{
   const saved=JSON.parse(sessionStorage.getItem(DuduReadingReturnC443.KEY)||'null');
   return saved?.scrollTop>500;
  });
  const before=await page.evaluate(()=>({
   y:window.scrollY,session:JSON.parse(sessionStorage.getItem(DuduReadingReturnC443.KEY)),
   exp:userProfile.exp}));
  assert.ok(before.session.scrollTop>500);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('reader-view').style.display==='block');
  await page.waitForFunction(()=>window.scrollY>500);
  assert.ok(Math.abs((await page.evaluate(()=>window.scrollY))-before.y)<80,
   'refresh restores the same chapter and approximately the exact scroll position');
  assert.equal(await page.evaluate(()=>userProfile.exp),before.exp,
   'refresh cannot grant chapter EXP twice');
  await page.evaluate(()=>history.back());
  await page.waitForFunction(()=>document.getElementById('cover-view').style.display==='block');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem(DuduReadingReturnC443.KEY)),null,
   'browser Back returns to TOC and clears the volatile active-reading route');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduSiteV60);
  assert.notEqual(await page.locator('#reader-view').evaluate(el=>el.style.display),'block',
   'manual exit does not force an unexpected reader reopen on refresh');
  assert.equal(await page.evaluate(()=>window.__readerExternalWrites?.length||0),0);
  console.log('C4.43 mobile reader PASS: pinned TOC, Phone clearance, browser back, reload scroll, no external writes');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
