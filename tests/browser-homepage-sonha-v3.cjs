// Homepage Sơn Hà Art V3: isolated local browser acceptance, no production writes.
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
   const stub=app?`window.__sonhaExternalWrites=[];window.firebase={
     initializeApp(){},firestore(){return {collection(){return {doc(){return {
     get:async()=>({exists:false,data:()=>({})}),
     set:async x=>{window.__sonhaExternalWrites.push(x);throw Error('blocked');},
     update:async x=>{window.__sonhaExternalWrites.push(x);throw Error('blocked');},
     onSnapshot:()=>()=>{}};}};}};}};
     window.firebase.firestore.FieldValue={serverTimestamp:()=>1};`:'';
   await route.fulfill({status:200,contentType:'application/javascript',body:stub});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?sandbox=1',
    {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduSiteV60 && !!document.querySelector('#d60-home .sonha-hero'));
  await page.evaluate(()=>{
   const a=novels[0];
   const ch=Array.isArray(a?.chapters)&&a.chapters.length?a.chapters:
    [{id:'a',title:'Chương 1',content:'Nội dung thử nghiệm'}];
   novels.splice(0,novels.length,...Array.from({length:4},(_,i)=>({
     ...a,id:'sonha-fixture-'+i,title:'Tác phẩm kiểm thử '+(i+1),
     coverImage:'',genre:'Tu tiên',chapters:ch.map(v=>({...v}))
   })));
   DuduSiteV60.navigate('home');
  });
  await page.waitForFunction(()=>document.querySelectorAll('#d60-home .sonha-book').length===4);
  assert.equal(await page.locator('#d60-home .d61-code-art').count(),0);
  assert.equal(await page.locator('#d60-home .sonha-book-title').first().textContent(),'Tác phẩm kiểm thử 1');
  assert.equal(await page.locator('#d60-home .sonha-resume-empty').count(),1);
  const images=await page.evaluate(()=>{
   const rule=selector=>getComputedStyle(document.querySelector(selector)).backgroundImage;
   return [rule('.sonha-hero'),rule('.sonha-reading'),rule('.sonha-gallery')];
  });
  assert.match(images[0],/hero-h1\.webp/);
  assert.match(images[1],/transition-h2\.webp/);
  assert.match(images[2],/gallery-h3b\.webp/);
  for(const width of [320,375,390,768,1440]){
   await page.setViewportSize({width,height:850});
   const layout=await page.evaluate(()=>{
    const hero=document.querySelector('.sonha-hero').getBoundingClientRect();
    const rail=document.querySelector('.sonha-book-rail');
    return {overflow:document.documentElement.scrollWidth-innerWidth,
      hero:hero.height,railScrollable:rail.scrollWidth>rail.clientWidth+3};
   });
   assert.ok(layout.overflow<=2,'no document horizontal overflow at '+width+'px');
   if(width<=390){
    assert.ok(layout.hero<210,'mobile hero stays compact at '+width+'px');
    assert.equal(layout.railScrollable,true,'mobile books scroll horizontally');
   }
  }
  await page.evaluate(()=>document.querySelector('.sonha-book-cover').click());
  assert.equal(await page.locator('#cover-view').isVisible(),true);
  // COVER-GLASS T2: assert actual computed translucent layers and H3B artwork,
  // rather than merely checking selector text. Reader remains untouched.
  const coverGlass=await page.evaluate(async()=>{
    const alpha=selector=>{
      const color=getComputedStyle(document.querySelector(selector)).backgroundColor;
      if(color==='transparent')return 0;
      const values=color.match(/[\\d.]+/g)?.map(Number)||[];
      return values.length>=4?values[3]:1;
    };
    const background=getComputedStyle(document.querySelector('#cover-view')).backgroundImage;
    const path=new URL('assets/homepage-sonha-v3/gallery-h3b.webp',document.baseURI).href;
    const image=await fetch(path);
    const bitmap=image.ok?await createImageBitmap(await image.blob()):null;
    const decoded=!!bitmap&&bitmap.width>100&&bitmap.height>100;
    bitmap?.close();
    return {background,decoded,status:image.status,
      banner:alpha('#cover-view .book-cover-banner'),
      intro:alpha('#cover-view .intro-terminal-box'),
      index:alpha('#cover-view .chapter-items'),
      chapter:alpha('#cover-view .chapter-item'),
      back:alpha('#cover-view .archive-cover-dock-back'),
      read:alpha('#cover-view #btn-main-reading-action')};
  });
  assert.match(coverGlass.background,/gallery-h3b\\.webp/);
  assert.equal(coverGlass.status,200,'cover artwork must load');
  assert.equal(coverGlass.decoded,true,'cover artwork must decode');
  for(const key of ['banner','intro','back'])assert.ok(coverGlass[key]>.3&&coverGlass[key]<.8,
    key+' must be legible translucent glass');
  assert.ok(coverGlass.index<.5,'chapter index backdrop must be transparent enough for art');
  assert.equal(coverGlass.chapter,0,'chapter rows remain individually transparent');
  assert.equal(coverGlass.read,1,'primary Read button remains solid gold');
  for(const width of [320,375,390,430,768,1440]){
    await page.setViewportSize({width,height:850});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=2,'cover glass has no horizontal overflow at '+width+'px');
  }
  await page.evaluate(()=>DuduSiteV60.navigate('library'));
  assert.equal(await page.locator('#novel-grid-container .novel-card').count(),4);
  const libraryBg=await page.locator('#home-view').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(libraryBg,/gallery-h3b\.webp/);
  await page.evaluate(()=>DuduSiteV60.navigate('shelf'));
  assert.equal(await page.locator('#d60-shelf .d60-shelf-tab').count(),3);
  const shelfBg=await page.locator('#d60-shelf').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(shelfBg,/gallery-h3b\.webp/);
  assert.equal(await page.evaluate(()=>window.__sonhaExternalWrites?.length||0),0);
  console.log('Sơn Hà Art V3 browser PASS: real list, real actions, 3 art layers, 5 responsive widths, Library/Shelf preservation.');
 }finally{
  if(browser)await browser.close();
  await new Promise(done=>server.close(done));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
