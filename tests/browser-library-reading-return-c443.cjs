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
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});
   const boxes=await page.evaluate(()=>{
    const shortcut=document.getElementById('floating-reading-bar');
    const a=shortcut.getBoundingClientRect(),phone=document.getElementById('phone-fab').getBoundingClientRect();
    return {left:a.left,right:a.right,phoneLeft:phone.left,visible:getComputedStyle(shortcut).display,
     overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.equal(boxes.visible,'flex','TOC stays visible without an upward scroll');
   assert.ok(boxes.right+6<=boxes.phoneLeft,'TOC shortcut cannot overlap the Phone at '+width);
   assert.ok(boxes.left>=0&&boxes.overflow<=2,'reader fits at '+width);
  }
  await page.evaluate(()=>window.scrollTo(0,700));
  await page.waitForFunction(()=>window.scrollY>500);
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
