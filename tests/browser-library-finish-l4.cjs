// L4: real responsive EPUB dossier and 200+ chapter TOC in isolated Sandbox.
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
   const code=app?`window.__l4ExternalWrites=[];window.firebase={
    initializeApp(){},firestore(){return {collection(){return {doc(){return {
     get:async()=>({exists:false,data:()=>({})}),
     set:async value=>{window.__l4ExternalWrites.push(value);throw Error('blocked');},
     update:async value=>{window.__l4ExternalWrites.push(value);throw Error('blocked');},
     onSnapshot:()=>()=>{}};}};}};}};
    window.firebase.firestore.FieldValue={serverTimestamp:()=>1};`:'';
   await route.fulfill({status:200,contentType:'application/javascript',body:code});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduSiteV60&&!!window.DuduLibrarySmartFilterL3);
  const modal=page.locator('#auth-modal');
  if(!(await modal.isVisible()))await page.locator('#account-status-btn').click();
  await page.locator('#auth-username').fill('l4-chapter-test');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>currentUsername==='l4-chapter-test');
  await page.waitForTimeout(700);
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  await page.evaluate(()=>{
   const original=novels[0];
   const chapters=Array.from({length:205},(_,i)=>({
    id:'chapter-'+String(i+1).padStart(4,'0'),title:'Chương '+(i+1)+': '+
     'Hành trình đi qua những miền ký ức và câu chuyện rất dài',
    wordCount:1500+i,content:null
   }));
   novels.splice(0,novels.length,{...original,id:'l4-epub-story',_cloudV49:true,
    title:'Truyện EPUB có tên rất dài để thử giới hạn và cân đối của phần thông tin trên điện thoại',
    author:'Tác giả của câu chuyện dài',genre:'Huyền Huyễn; Tu Tiên; Nhập EPUB',
    status:'Hoàn thành',desc:'Văn án dài dành cho trình đọc EPUB',
    introData:{text:'Văn án '.repeat(120)},chapters});
   DuduSiteV60.navigate('library');
   openCover(0);
  });
  await page.locator('#cover-view').waitFor({state:'visible'});
  assert.equal(await page.locator('#chapter-list-container .chapter-item').count(),80);
  assert.equal(await page.locator('#chapter-index-count-l4').innerText(),'80 / 205 chương');
  assert.equal(await page.locator('#book-genre-tags span').count(),2);
  assert.ok(!(await page.locator('#book-genre-tags').innerText()).includes('Nhập EPUB'));
  assert.equal(await page.locator('#book-intro-expand').isVisible(),true);
  await page.locator('#chapter-search-l4').fill('203');
  assert.equal(await page.locator('#chapter-list-container .chapter-item').count(),1);
  assert.equal(await page.locator('#chapter-index-count-l4').innerText(),'1 / 1 chương');
  assert.match(await page.locator('#chapter-list-container .chapter-item').first().innerText(),/Chương 203/);
  await page.locator('#chapter-search-l4').fill('');
  assert.equal(await page.locator('#chapter-list-container .chapter-item').count(),80);
  await page.locator('#chapter-index-more-l4').click();
  assert.equal(await page.locator('#chapter-list-container .chapter-item').count(),160);
  await page.locator('#chapter-index-more-l4').click();
  assert.equal(await page.locator('#chapter-list-container .chapter-item').count(),205);
  assert.equal(await page.locator('#chapter-index-more-l4').isVisible(),false);
  await page.locator('#cover-view').getByRole('button',{name:'Đảo ⇅'}).click();
  assert.equal(await page.locator('#chapter-list-container .chapter-item').count(),80);
  assert.match(await page.locator('#chapter-list-container .chapter-item').first().innerText(),/Chương 205/);
  for(const width of [320,390,768,1366]){
   await page.setViewportSize({width,height:900});
   const geometry=await page.evaluate(()=>{
    const top=document.querySelector('#cover-view .archive-cover-topbar').getBoundingClientRect();
    const title=document.getElementById('book-title').getBoundingClientRect();
    return {overflow:document.documentElement.scrollWidth-innerWidth,
     topRight:top.right,titleRight:title.right,titleLeft:title.left};
   });
   assert.ok(geometry.overflow<=2&&geometry.topRight<=width+2&&geometry.titleRight<=width+2,
    'detail controls and very long titles fit '+width+'px');
  }
  assert.equal(await page.evaluate(()=>window.__l4ExternalWrites?.length||0),0);
  console.log('L4 Library PASS: responsive details, EPUB genres, TOC search, progressive 205 chapters, no writes');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
