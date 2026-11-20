// READER-BG R1 — isolated browser acceptance; sandbox only, no cloud writes.
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
    fs.readFile(file,(error,bytes)=>{
      if(error){res.writeHead(404).end();return;}
      const mime=/\.js$/.test(file)?'application/javascript':/\.css$/.test(file)?'text/css':
        /\.webp$/.test(file)?'image/webp':'text/html; charset=utf-8';
      res.writeHead(200,{'content-type':mime}).end(bytes);
    });
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  let browser;
  try{
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:375,height:844}});
    await page.route('https://www.gstatic.com/firebasejs/**',async route=>{
      const app=route.request().url().includes('firebase-app-compat');
      const stub=app?[
        'window.__readerBgExternalWrites=[];',
        'window.firebase={initializeApp(){},firestore(){return {collection(){return {doc(){return {',
        'get:async()=>({exists:false,data:()=>({})}),',
        'set:async x=>{window.__readerBgExternalWrites.push(x);throw Error("blocked");},',
        'update:async x=>{window.__readerBgExternalWrites.push(x);throw Error("blocked");},',
        'onSnapshot:()=>()=>{}};}};}};}}};',
        'window.firebase.firestore.FieldValue={serverTimestamp:()=>1};'
      ].join('\n'):'';
      await route.fulfill({status:200,contentType:'application/javascript',body:stub});
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',
      {waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.DuduReaderBackgroundR1&&
      !!document.querySelector('#reader-bg-r1-grid')&&!!window.DuduSiteV60);
    await page.evaluate(()=>{
      DuduSiteV60.navigate('library');
      document.getElementById('reader-view').style.display='block';
      document.body.classList.add('dudu-reading-active');
      window.DuduReaderBackgroundR1.refresh();
    });
    assert.equal(await page.locator('#reader-paper[data-reader-bg]').count(),0,
      'existing readers default to plain four-theme paper');
    await page.locator('#reader-settings-trigger').click();
    assert.equal(await page.locator('#reader-bg-r1-grid [data-reader-bg-id]').count(),10);
    assert.equal(await page.locator('[data-reader-bg-id="v39-whitefox"]').isDisabled(),true);
    assert.equal(await page.locator('[data-reader-bg-id="v38-jade"]').isDisabled(),true);
    assert.equal(await page.locator('[data-reader-bg-id="v38-moon"]').isDisabled(),false);
    await page.locator('[data-reader-bg-id="v38-moon"]').click();
    assert.equal(await page.locator('#reader-paper').getAttribute('data-reader-bg'),'v38-moon');
    const background=await page.locator('#reader-paper').evaluate(el=>getComputedStyle(el).backgroundImage);
    assert.match(background,/moon-garden\.webp/);
    assert.match(background,/linear-gradient/);
    assert.equal(await page.locator('[data-reader-bg-id="v38-moon"]').getAttribute('aria-pressed'),'true');
    await page.locator('#reader-bg-r1-opacity').evaluate(el=>{
      el.value='88';el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    assert.equal(await page.locator('#reader-paper').evaluate(el=>el.style.getPropertyValue('--reader-r1-shade')),'0.88');
    for(const width of [320,375,390,430,768,1440]){
      await page.setViewportSize({width,height:850});
      const box=await page.locator('#reader-paper').evaluate(el=>{
        const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};
      });
      assert.ok(box.width>0&&box.left>=-2&&box.right<=width+2,
        'reader background never creates horizontal overflow at '+width+'px');
    }
    await page.locator('#reader-bg-r1-enabled').uncheck();
    assert.equal(await page.locator('#reader-paper[data-reader-bg]').count(),0);
    await page.locator('#reader-settings-reset').click();
    assert.equal(await page.locator('#reader-bg-r1-opacity-value').textContent(),'72%');
    assert.equal(await page.locator('#reader-paper[data-reader-bg]').count(),0);
    assert.equal(await page.locator('#reader-settings-popover [data-reader-theme]').count(),4);
    assert.equal(await page.evaluate(()=>window.__readerBgExternalWrites?.length||0),0);
    console.log('READER-BG R1 browser PASS: 10 catalog entries, entitlements, layering, opacity, reset and 6 widths.');
  }finally{
    if(browser)await browser.close();
    await new Promise(done=>server.close(done));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
