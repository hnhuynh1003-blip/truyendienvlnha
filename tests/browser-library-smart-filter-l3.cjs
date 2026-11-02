// L3 acceptance: a fresh isolated Sandbox catalog, no live Firebase writes.
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
   const code=app?`window.__l3ExternalWrites=[];window.firebase={
    initializeApp(){},firestore(){return {collection(){return {doc(){return {
     get:async()=>({exists:false,data:()=>({})}),
     set:async value=>{window.__l3ExternalWrites.push(value);throw Error('blocked');},
     update:async value=>{window.__l3ExternalWrites.push(value);throw Error('blocked');},
     onSnapshot:()=>()=>{}};}};}};}};
    window.firebase.firestore.FieldValue={serverTimestamp:()=>1};`:'';
   await route.fulfill({status:200,contentType:'application/javascript',body:code});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduSiteV60&&!!window.DuduLibrarySmartFilterL3);
  const modal=page.locator('#auth-modal');
  if(!(await modal.isVisible()))await page.locator('#account-status-btn').click();
  await page.locator('#auth-username').fill('l3-catalog-test');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>currentUsername==='l3-catalog-test');
  await page.waitForTimeout(700); // Initial welcome timer can reopen the dialog.
  if(await modal.isVisible())await modal.getByRole('button',{name:'Đóng'}).click();
  await page.evaluate(()=>{
   const chapters=n=>Array.from({length:n},(_,i)=>({id:'ch'+i,title:'Chương '+(i+1),content:'Nội dung.'}));
   novels.splice(0,novels.length,
    {id:'a',title:'Đường tu tiên',author:'Tác giả A',genre:'Huyền Huyễn, Tu Tiên',status:'Đang ra',chapters:chapters(3)},
    {id:'b',title:'Cung điện',author:'Tác giả B',genre:'Huyền huyễn, Hậu Cung',status:'Hoàn thành',chapters:chapters(1)},
    {id:'c',title:'Bí kíp EPUB',author:'Tác giả C',genre:'hUYEN HUYEN / TU TIEN; EPUB',_cloudV49:true,status:'Hoàn thành',chapters:chapters(5)},
    {id:'d',title:'Tiên lộ',author:'Tác giả D',genre:'Tu tiên, Ngược',status:'Đang ra',chapters:chapters(2)});
   DuduSiteV60.navigate('library');
  });
  await page.waitForFunction(()=>document.querySelectorAll('#novel-grid-container .novel-card').length===4);
  assert.equal(await page.locator('#search-result-count').innerText(),'4 / 4 tác phẩm');
  for(const width of [320,390,768,1366,1920]){
   await page.setViewportSize({width,height:900});
   const state=await page.evaluate(()=>{
    const grid=document.getElementById('novel-grid-container').getBoundingClientRect();
    const cards=[...document.querySelectorAll('#novel-grid-container .novel-card')]
      .map(node=>node.getBoundingClientRect());
    return {overflow:document.documentElement.scrollWidth-innerWidth,
      gridLeft:grid.left,gridRight:grid.right,
      cards:cards.map(r=>({left:r.left,right:r.right,width:r.width,height:r.height}))};
   });
   assert.ok(state.overflow<=2,'no viewport overflow at '+width+'px');
   assert.ok(state.cards.every(card=>card.left>=-1&&card.right<=width+1&&card.height>=170),
    'library card content remains contained at '+width+'px');
   if(width>=1366)assert.ok(state.gridRight-state.gridLeft<=1062,
    'desktop catalog keeps a balanced bounded line length');
  }
  await page.setViewportSize({width:390,height:844});
  const drawer=page.locator('#archive-filter-details');
  await drawer.locator(':scope > summary').click();
  await page.waitForFunction(()=>document.getElementById('archive-filter-details').open);
  const panel=await page.locator('.archive-filter-content').boundingBox();
  assert.ok(panel.x>=0&&panel.x+panel.width<=391,'mobile filter drawer fits the screen');
  const tags=page.locator('#tag-cloud-container');
  await tags.getByRole('button',{name:'Huyền Huyễn: Không chọn'}).click();
  await tags.getByRole('button',{name:'Tu Tiên: Không chọn'}).click();
  await tags.getByRole('button',{name:'Hậu Cung: Không chọn'}).click();
  await tags.getByRole('button',{name:'Hậu Cung: Bao gồm'}).click();
  assert.equal(await tags.getByRole('button',{name:'Hậu Cung: Loại trừ'}).getAttribute('aria-pressed'),'mixed');
  await drawer.getByRole('button',{name:'Áp dụng'}).click();
  assert.equal(await page.locator('#search-result-count').innerText(),'2 / 4 tác phẩm');
  assert.deepEqual(await page.locator('.novel-title-button').allInnerTexts(),['Đường tu tiên','Bí kíp EPUB']);
  assert.equal(await page.locator('#archive-active-filters [data-kind="exclude"]').count(),1);
  await drawer.locator(':scope > summary').click();
  await page.waitForFunction(()=>document.getElementById('archive-filter-details').open);
  await drawer.getByLabel('Khớp ít nhất một (OR)').check();
  await drawer.getByRole('button',{name:'Áp dụng'}).click();
  assert.equal(await page.locator('#search-result-count').innerText(),'3 / 4 tác phẩm');
  await page.locator('#archive-active-filters [data-kind="include"]').first().click();
  assert.equal(await page.locator('#archive-active-filters [data-kind="include"]').count(),1);
  await drawer.locator(':scope > summary').click();
  await page.waitForFunction(()=>document.getElementById('archive-filter-details').open);
  await drawer.getByRole('button',{name:'EPUB',exact:true}).click();
  await drawer.getByRole('button',{name:'Áp dụng'}).click();
  assert.deepEqual(await page.locator('.novel-title-button').allInnerTexts(),['Bí kíp EPUB']);
  await page.locator('#search-novel-input').fill('Tác giả D');
  assert.equal(await page.locator('#search-result-count').innerText(),'0 / 4 tác phẩm');
  await page.locator('#search-novel-input').fill('Tác giả C');
  assert.equal(await page.locator('#search-result-count').innerText(),'1 / 4 tác phẩm');
  assert.equal(await page.evaluate(()=>window.__l3ExternalWrites?.length||0),0);
  console.log('L3 Library PASS: tri-state AND/OR, exclude, source, search, 320–1920px, no external writes');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
