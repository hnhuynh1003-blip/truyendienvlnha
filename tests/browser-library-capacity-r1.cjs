// R1: owner-only capacity panel, lightweight catalogue and no Firestore writes.
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

async function main(){
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+pathname,pathname.endsWith('/')?'index.html':'');
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,bytes)=>{
   if(err){res.writeHead(404).end();return;}
   const mime=/\.js$/.test(file)?'application/javascript':/\.css$/.test(file)?'text/css':'text/html; charset=utf-8';
   res.writeHead(200,{'content-type':mime}).end(bytes);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('https://www.gstatic.com/firebasejs/**',async route=>{
   const app=route.request().url().includes('firebase-app-compat');
   const code=app?`window.__r1ExternalWrites=[];window.firebase={
    initializeApp(){},firestore(){return {collection(){return {doc(){return {
     get:async()=>({exists:false,data:()=>({})}),
     set:async value=>{window.__r1ExternalWrites.push(value);throw Error('blocked');},
     update:async value=>{window.__r1ExternalWrites.push(value);throw Error('blocked');},
     onSnapshot:()=>()=>{}};}};}};}};
    window.firebase.firestore.FieldValue={serverTimestamp:()=>1};`:'';
   await route.fulfill({status:200,contentType:'application/javascript',body:code});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduSiteV60&&!!window.DuduLibraryCapacityR1);
  const modal=page.locator('#auth-modal');
  if(!(await modal.isVisible()))await page.locator('#account-status-btn').click();
  await page.locator('#auth-username').fill('r1-capacity-test');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>currentUsername==='r1-capacity-test');
  await page.waitForTimeout(700);
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  await page.evaluate(()=>{
   userProfile.role='admin';applyUserRole();
   novels.push({id:'r1-big-web',title:'Văn bản tiếng Việt dùng để kiểm thử',
    chapters:[{content:'Nội dung '.repeat(1000),wordCount:2000}]});
   novels.push({id:'r1-epub',title:'Truyện EPUB dài',_cloudV49:true,
    chapters:[{id:'chapter-0001',wordCount:10000,content:null}]});
   DuduSiteV60.navigate('library');renderHome();
  });
  const panel=page.locator('#library-capacity-r1');
  assert.equal(await panel.isVisible(),true);
  await panel.locator('summary').click();
  await page.locator('#library-capacity-body-r1 .library-capacity-card-r1').first()
   .waitFor({state:'visible'});
  assert.match(await panel.innerText(),/Truyện Web/);
  assert.match(await panel.innerText(),/Truyện EPUB/);
  assert.match(await panel.innerText(),/Văn bản tiếng Việt dùng để kiểm thử/);
  assert.match(await panel.innerText(),/1 GiB/);
  assert.equal(await panel.getByRole('button',{name:'Đo'}).isDisabled(),true,
   'Sandbox never reads remote EPUB chapters');
  for(const width of [320,390,768,1366]){
   await page.setViewportSize({width,height:900});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(overflow<=2,'capacity panel must fit viewport '+width);
  }
  await page.evaluate(()=>{userProfile.role='reader';applyUserRole();renderHome();});
  assert.equal(await panel.isVisible(),false);
  assert.equal(await page.evaluate(()=>window.__r1ExternalWrites?.length||0),0);
  console.log('R1 Library PASS: owner-only capacity panel, mobile/tablet/desktop, no remote reads or writes');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
