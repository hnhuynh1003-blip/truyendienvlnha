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
        'window.firebase={',
        'initializeApp(){},',
        'firestore(){',
        'const documentRef={',
        'get:async()=>({exists:false,data:()=>({})}),',
        'set:async x=>{window.__readerBgExternalWrites.push(x);throw Error("blocked");},',
        'update:async x=>{window.__readerBgExternalWrites.push(x);throw Error("blocked");},',
        'onSnapshot:()=>()=>{}',
        '};',
        'return {collection:()=>({doc:()=>documentRef})};',
        '}',
        '};',
        'window.firebase.firestore.FieldValue={serverTimestamp:()=>1};'
      ].join('\n'):'';
      await route.fulfill({status:200,contentType:'application/javascript',body:stub});
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',
      {waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.DuduReaderBackgroundR1&&
      !!document.querySelector('#reader-bg-r1-grid')&&!!window.DuduSiteV60);
    // Complete the delayed Sandbox welcome lifecycle before Reader interactions.
    await page.locator('#auth-modal').waitFor({state:'visible'});
    await page.locator('#auth-username').fill('reader-background-fixture');
    await page.locator('#auth-sandbox-controls button').click();
    await page.locator('#auth-modal').waitFor({state:'hidden'});
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
    // R1 originally passed while requesting /css/assets/... (404) because it
    // only asserted the asset file name in getComputedStyle. Verify decoded WebP.
    await page.waitForFunction(()=>document.querySelector('#reader-paper')?.dataset.readerBg==='v38-moon');
    const imageState=await page.locator('#reader-paper').evaluate(async el=>{
      const expected=new URL('assets/wallpapers/v38/moon-garden.webp',document.baseURI).href;
      const background=getComputedStyle(el).backgroundImage;
      const res=await fetch(expected);
      const bitmap=await createImageBitmap(await res.blob());
      const output={expected,background,status:res.status,
        width:bitmap.width,height:bitmap.height,
        correctCssUrl:background.includes(expected)};
      bitmap.close();
      return output;
    });
    assert.equal(imageState.status,200,'WebP must respond successfully');
    assert.ok(imageState.width>100&&imageState.height>100,'WebP must decode');
    assert.equal(imageState.correctCssUrl,true,'CSS must reference the actual site image URL');
    assert.match(imageState.background,/linear-gradient/);
    assert.doesNotMatch(imageState.background,/\/css\/assets\/wallpapers\//);
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
    // Force a deterministic image decode failure even if artwork was cached.
    // The previous network route was nondeterministic with already-loaded thumbnails.
    await page.evaluate(()=>{
      const RealImage=window.Image;
      window.Image=function(...args){
        const image=new RealImage(...args);
        const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
        Object.defineProperty(image,'src',{
          configurable:true,
          get(){return src.get.call(image);},
          set(value){
            if(String(value).includes('abyss-sanctuary.webp'))
              queueMicrotask(()=>image.dispatchEvent(new Event('error')));
            else src.set.call(image,value);
          }
        });
        return image;
      };
    });
    await page.locator('[data-reader-bg-id="v38-abyss"]').click();
    await page.waitForFunction(()=>document.querySelector('#reader-bg-r1-status')?.textContent?.includes('Không tải được ảnh nền'),
      null,{timeout:8000});
    assert.equal(await page.locator('#reader-paper[data-reader-bg]').count(),0,
      'failed image must fall back to the original paper theme');
    await page.locator('#reader-bg-r1-enabled').uncheck();
    assert.equal(await page.locator('#reader-paper[data-reader-bg]').count(),0);
    await page.locator('#reader-settings-reset').click();
    assert.equal(await page.locator('#reader-bg-r1-opacity-value').textContent(),'72%');
    assert.equal(await page.locator('#reader-paper[data-reader-bg]').count(),0);
    assert.equal(await page.locator('#reader-settings-popover [data-reader-theme]').count(),4);
    assert.equal(await page.evaluate(()=>window.__readerBgExternalWrites?.length||0),0);
    console.log('READER-BG R1 browser PASS: decoded WebP URL, broken image fallback, entitlements, opacity, reset, 6 widths.');
  }finally{
    if(browser)await browser.close();
    await new Promise(done=>server.close(done));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
