'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
test('R2 long XHTML: V48 splits text, C11 packages canonical chapters and layouts losslessly',async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.route('http://localhost:38497/**',route=>
   route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body>R2 offline QA</body></html>'}));
  await page.goto('http://localhost:38497/');
  for(const name of ['epub-text-v57','library-r2-chapter-split-r1','epub-import-v48',
    'library-epub-r2-sidecar-l6c11'])
   await page.addScriptTag({path:path.join(root,'js',name+'.js')});
  const result=await page.evaluate(async()=>{
   const paragraph=('Tiên đạo vô tận, biển mây và chuyện nhân gian 🌸. ').repeat(7200);
   const longXhtml='<html><head><title>Chương thứ nhất</title></head><body>'+
    '<h1>Chương thứ nhất</h1><p>'+paragraph+'</p></body></html>';
   const items={
    'mimetype':'application/epub+zip',
    'META-INF/container.xml':'<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>',
    'OPS/book.opf':'<?xml version="1.0"?><package xmlns:dc="urn:dc"><metadata><dc:title>Kiếm Đạo</dc:title><dc:creator>Tác giả A</dc:creator></metadata><manifest>'+
       '<item id="c1" href="Text/chapter.xhtml" media-type="application/xhtml+xml"/></manifest>'+
       '<spine><itemref idref="c1"/></spine></package>',
    'OPS/Text/chapter.xhtml':longXhtml
   };
   const zipLib={loadAsync:async()=>({files:Object.fromEntries(Object.entries(items).map(([name,value])=>
     [name,{dir:false,_data:{uncompressedSize:new TextEncoder().encode(value).length}}])),
     file:name=>Object.hasOwn(items,name)?{async:async mode=>
       mode==='uint8array'?new TextEncoder().encode(items[name]):items[name]}:null})};
   const file=new File([new Uint8Array(40).fill(9)],'kiemd ao.epub',{type:'application/epub+zip'});
   const normal=await DuduEpubImportV48.parse(file,{zipLib,Parser:DOMParser})
     .then(()=> 'UNEXPECTED_OK',e=>String(e.message));
   const parsed=await DuduEpubImportV48.parse(file,
     {zipLib,Parser:DOMParser,splitOversizedChapters:true});
   const pack=await DuduEpubR2SidecarL6C11.buildPackage({
    file,parsed,bookId:'epub-'+'a'.repeat(32),revisionId:'r-'+'b'.repeat(32),
    zipLib,Parser:DOMParser,textV57:DuduEpubTextV57,cryptoApi:crypto});
   const source=DuduEpubTextV57.getText(longXhtml,DOMParser);
   const restored=parsed.chapters.map(c=>c.content).join('');
   const titles=parsed.chapters.map(c=>c.title);
   const aligned=pack.manifest.chapters.every((ch,i)=>
    ch.title===parsed.chapters[i].title&&ch.order===i&&
    pack.layouts[i].chapterId===ch.id&&
    pack.parts.some(part=>part.kind==='chapter'&&part.id===ch.id));
   return {normal,partCount:parsed.chapters.length,restored:restored===source,
    totalChars:restored.length,sourceChars:source.length,aligned,
    titleSuffix:titles.every((title,i)=>title.endsWith('(phần '+(i+1)+'/'+titles.length+')')),
    withinBounds:pack.manifest.chapters.every(c=>c.bytes>0&&c.bytes<=420000&&c.wordCount>0)&&
      pack.layouts.every(l=>l.bytes<=1048576),
    firstLayout:JSON.parse(new TextDecoder().decode(
      pack.parts.find(x=>x.kind==='layout').data)).segments,
    allParts:pack.parts.length,sourceHash:pack.manifest.source.sha256,
    canPublish:pack.authorizedToPublish};
  });
  assert.match(result.normal,/Một chương EPUB quá dài/);
  assert.ok(result.partCount>=2&&result.partCount<=160);
  assert.equal(result.restored,true);
  assert.equal(result.totalChars,result.sourceChars);
  assert.equal(result.aligned,true);
  assert.equal(result.titleSuffix,true);
  assert.equal(result.withinBounds,true);
  assert.equal(result.firstLayout.length,1);
  assert.equal(result.firstLayout[0].type,'text');
  assert.match(result.sourceHash,/^[a-f0-9]{64}$/);
  assert.equal(result.canPublish,false,'offline package is never authorization to publish');
 }finally{await browser.close();}
});
