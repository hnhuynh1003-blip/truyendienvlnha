'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
async function run(){
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1280,320,390,430]){
   const context=await browser.newContext({viewport:{width,height:860},isMobile:width<=430,hasTouch:width<=430});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('http://reader-layout.local/**',route=>route.fulfill({
    status:200,contentType:'text/html',body:'<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body><main id="chapter">Old reader remains</main><aside id="other">Bookmark unchanged</aside></body></html>'
   }));
   await page.goto('http://reader-layout.local/');
   await page.addScriptTag({path:path.join(root,'js/library-epub-layout-l6p2c3.js')});
   const result=await page.evaluate(async()=>{
    const name='epub-fake-book',revisionId='r-0123456789abcdef',chapterId='chapter-0001';
    const chapterText='Chương 1 Văn bản <script>window.__attack=true</script> và phép thuật. Tiếp.';
    const segments=[
     {type:'text',text:'Chương 1'},
     {type:'text',text:'Văn bản <script>window.__attack=true</script> và phép thuật.'},
     {type:'image',assetId:'asset-0001',alt:'Bìa pháp bảo'},
     {type:'text',text:'Tiếp.'}
    ];
    const api=DuduEpubLayoutL6P2C3;
    const encoded=await api.encodeLayout({bookId:name,revisionId,chapterId,segments,
     assetIds:['asset-0001'],chapterText});
    const decoded=await api.decodeLayout(encoded.data,{bookId:name,revisionId,chapterId,
     assetIds:['asset-0001'],chapterText,expectedBytes:encoded.bytes,expectedSha256:encoded.sha256});
    const host=document.getElementById('chapter');
    const cleanup=await api.renderPreview(host,decoded,{fetchImage:async(id)=>{
     if(id!=='asset-0001')throw Error('wrong image');
     return new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,1,2])],{type:'image/png'});
    }});
    const image=host.querySelector('img');
    const before={elements:[...host.children].map(x=>x.tagName),
     imageUrl:image?.src,alt:image?.alt,htmlScripts:host.querySelectorAll('script').length,
     marked:!!window.__attack,text:host.textContent,other:document.getElementById('other').textContent,
     width:host.getBoundingClientRect().width,viewport:window.innerWidth};
    cleanup.cleanup();
    let refused='',unchanged=host.textContent;
    try{await api.renderPreview(host,decoded,{fetchImage:async()=> 'https://example.test/steal'});}
    catch(e){refused=String(e.message);}
    return {before,refused,unchangedAfter:host.textContent===unchanged};
   });
   assert.deepEqual(result.before.elements,['P','P','IMG','P'],'ordering '+width);
   assert.ok(result.before.imageUrl.startsWith('blob:'),'image is objectURL '+width);
   assert.equal(result.before.alt,'Bìa pháp bảo');
   assert.equal(result.before.htmlScripts,0);
   assert.equal(result.before.marked,false);
   assert.match(result.before.text,/<script>window.__attack=true<\/script>/);
   assert.equal(result.before.other,'Bookmark unchanged');
   assert.ok(result.before.width<=result.before.viewport+1);
   assert.match(result.refused,/Layout EPUB không hợp lệ/);
   assert.equal(result.unchangedAfter,true);
   assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('PASS L6-P2C3 layout render: 1280/320/390/430px, text-only HTML, Blob-only images and original reader isolation');
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
