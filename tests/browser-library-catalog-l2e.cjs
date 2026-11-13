// L2E mobile catalog acceptance: all fixtures remain inside an isolated Sandbox tab.
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
   const mime=/\.js$/.test(file)?'application/javascript':/\.css$/.test(file)?'text/css':
    /\.webp$/.test(file)?'image/webp':'text/html; charset=utf-8';
   res.writeHead(200,{'content-type':mime}).end(bytes);
  });
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('https://www.gstatic.com/firebasejs/**',async route=>{
   const app=route.request().url().includes('firebase-app-compat');
   const code=app?`window.__l2eExternalWrites=[];window.firebase={
    initializeApp(){},firestore(){return {collection(){return {doc(){return {
     get:async()=>({exists:false,data:()=>({})}),
     set:async v=>{window.__l2eExternalWrites.push(v);throw Error('blocked');},
     update:async v=>{window.__l2eExternalWrites.push(v);throw Error('blocked');},
     onSnapshot:()=>()=>{}};}};}};}};
    window.firebase.firestore.FieldValue={serverTimestamp:()=>1};` : '';
   await route.fulfill({status:200,contentType:'application/javascript',body:code});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduSiteV60&&!!window.DuduLibraryCatalogL2E);
  const modal=page.locator('#auth-modal');
  if(!(await modal.isVisible()))await page.locator('#account-status-btn').click();
  await page.locator('#auth-username').fill('l2e-catalog-test');
  await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
  await page.waitForFunction(()=>currentUsername==='l2e-catalog-test');
  await page.evaluate(()=>{
   const template=novels[0];
   const chapters=template?.chapters?.length?template.chapters:
    [{id:'one',title:'Chương 1',content:'Một chương thử nghiệm.'}];
   const fake=Array.from({length:247},(_,i)=>({
    ...template,id:'l2e-test-'+i,title:'Truyện thử phân trang '+String(i+1).padStart(2,'0'),
    desc:'Văn án mẫu độc lập',coverImage:'',genre:'Hành trình',
    chapters:chapters.map(ch=>({...ch}))
   }));
   novels.splice(0,novels.length,...fake);
   localStorage.setItem('dudu-sandbox-library',JSON.stringify(novels));
   DuduSiteV60.navigate('library');
  });
  await page.waitForFunction(()=>document.querySelectorAll('#novel-grid-container .novel-card').length===20);
  assert.equal(await page.locator('#search-result-count').innerText(),'247 / 247 tác phẩm');
  for(const width of [320,390,768,1366]){
   await page.setViewportSize({width,height:844});
    const state=await page.evaluate(()=>{
     const top=document.getElementById('library-catalog-pager-top');
     const bottom=document.getElementById('library-catalog-pager-bottom');
     const topRect=top.getBoundingClientRect();
     const parts=[...top.querySelectorAll('.library-catalog-page-step,.library-catalog-page-range,.library-catalog-page-jump-toggle')]
       .map(node=>node.getBoundingClientRect());
     const bounds={left:Math.min(...parts.map(r=>r.left)),right:Math.max(...parts.map(r=>r.right))};
     return {count:document.querySelectorAll('#novel-grid-container .novel-card').length,
      overflow:document.documentElement.scrollWidth-window.innerWidth,
      pager:topRect.right,topHeight:topRect.height,
      bottomHeight:bottom.getBoundingClientRect().height,
      pagerCenter:topRect.left+topRect.width/2,controlsCenter:(bounds.left+bounds.right)/2};
   });
   assert.equal(state.count,20);
   assert.ok(state.overflow<=2&&state.pager<=width+2,
    'catalog pagination fits '+width+'px without horizontal overflow');
   assert.ok(state.topHeight<=60&&state.bottomHeight<=115,
    'pagination uses compact toolbars at '+width+'px');
   assert.ok(Math.abs(state.pagerCenter-state.controlsCenter)<=3,
    'top pagination and jump toggle stay centered at '+width+'px');
  }
  await page.locator('#library-catalog-pager-bottom .library-catalog-page-number[data-page="2"]').click();
  assert.equal(await page.locator('#library-catalog-pager-bottom .library-catalog-page-number.is-current').innerText(),'2');
  assert.equal(await page.locator('#novel-grid-container .novel-card').count(),20);
  assert.equal(await page.locator('#library-catalog-pager-top .library-catalog-page-range').innerText(),
   'Trang 2/13');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('#novel-grid-container .novel-card').length===20&&
   document.querySelector('#library-catalog-pager-top .library-catalog-page-range')?.textContent==='Trang 2/13');
  await page.waitForTimeout(90); // page-jump position settles before recording a return.
  await page.evaluate(()=>window.scrollTo(0,800));
  await page.waitForFunction(()=>window.scrollY>400);
  const before=await page.evaluate(()=>window.scrollY);
  await page.evaluate(()=>document.querySelectorAll('#novel-grid-container .novel-title-button')[8].click());
  await page.locator('#cover-view').waitFor({state:'visible'});
  await page.locator('#cover-view').getByRole('button',{name:'‹ Thư viện'}).click();
  await page.waitForFunction(()=>document.getElementById('home-view').style.display==='block');
  await page.waitForFunction(expected=>Math.abs(window.scrollY-expected)<80,before);
  assert.equal(await page.locator('#library-catalog-pager-top .library-catalog-page-range').innerText(),'Trang 2/13',
   'returning from synopsis keeps the exact catalog page');
  await page.locator('#search-novel-input').fill('Truyện thử phân trang 247');
  await page.waitForFunction(()=>document.querySelectorAll('#novel-grid-container .novel-card').length===1);
  assert.equal(await page.locator('#library-catalog-pager-top').isVisible(),false,
   'search recalculates pages and resets to page one');
  await page.locator('#search-novel-input').fill('');
  assert.equal(await page.locator('#novel-grid-container .novel-card').count(),20);
  assert.equal(await page.locator('#library-catalog-pager-top .library-catalog-page-range').innerText(),'Trang 1/13');
  assert.equal(await page.locator('#library-catalog-pager-bottom .library-catalog-page-dots').count(),1,
   'many-page catalogs show an ellipsis before the final page numbers');
  await page.locator('#library-catalog-pager-top .library-catalog-page-jump-toggle').click();
  const jump=page.locator('#library-catalog-pager-top .library-catalog-page-jump');
  const centered=await jump.evaluate(el=>{
   const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();
   return {formCenter:r.left+r.width/2,pagerCenter:p.left+p.width/2};
  });
  assert.ok(Math.abs(centered.formCenter-centered.pagerCenter)<=3,
   'the Go to page form opens in the horizontal center');
  await jump.locator('input').fill('12');
  await jump.locator('button[type="submit"]').click();
  assert.equal(await page.locator('#library-catalog-pager-bottom .library-catalog-page-range').innerText(),
   '221–240 / 247 truyện','direct jump reaches beyond nine pages');
  await page.locator('#library-catalog-pager-top .library-catalog-page-jump-toggle').click();
  await jump.locator('input').fill('90');
  await jump.locator('button[type="submit"]').click();
  assert.equal(await jump.locator('.library-catalog-page-error').innerText(),
   'Chọn trang từ 1 đến 13');
  await jump.locator('input').fill('7');
  await jump.locator('button[type="submit"]').click();
  assert.equal(await page.locator('#library-catalog-pager-bottom .library-catalog-page-number.is-current').innerText(),'7');
  assert.equal(await page.locator('#library-catalog-pager-bottom .library-catalog-page-range').innerText(),
   '121–140 / 247 truyện');
  assert.equal(await page.evaluate(()=>window.__l2eExternalWrites?.length||0),0);
  console.log('L2E browser PASS: 20/page, numbered 13-page strip, arbitrary jump, synopsis return scroll/page, filter reset, mobile widths, no external writes');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
