const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
test('EPUB V48 parses OPF spine, strips scripts, previews chapters and imports into Sandbox',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();let external=0;
  await page.route('**/*',r=>{
   if(r.request().url()==='http://localhost/')return r.fulfill({contentType:'text/html',body:
    '<div id="epub-import-modal" style="display:none"><div id="epub-import-content"></div></div>'});
   external++;return r.abort();
  });
  await page.goto('http://localhost/');
  await page.addScriptTag({path:path.resolve(__dirname,'../js/epub-import-v48.js')});
  const setup=await page.evaluate(()=>{
   const docs={
    'META-INF/container.xml':'<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>',
    'OPS/book.opf':'<package xmlns:dc="urn:dc"><metadata><dc:title>Cuốn sách thử</dc:title><dc:creator>Người viết</dc:creator></metadata><manifest><item id="i1" href="Text/01.xhtml" media-type="application/xhtml+xml"/><item id="i2" href="Text/02.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="i1"/><itemref idref="i2"/></spine></package>',
    'OPS/Text/01.xhtml':'<html><body><h1>Chương 1</h1><p>Xin chào <b>thế giới</b>.</p><script>window.evil=1</script></body></html>',
    'OPS/Text/02.xhtml':'<html><body><h2>Chương 2</h2><p>Tình tiết tiếp theo.</p></body></html>'
   };
   const files={};for(const k of Object.keys(docs))files[k]={_data:{uncompressedSize:docs[k].length}};
   window.JSZip={loadAsync:async()=>({files,file:p=>docs[p]?{async:async()=>docs[p]}:null})};
   window.sandboxNovels=[];window.saveCalls=0;
   const sample=new File(['stub'],'sample.epub',{type:'application/epub+zip'});
   return DuduEpubImportV48.parse(sample).then(x=>({title:x.title,chapters:x.chapters.length,content:x.chapters[0].content}));
  });
  assert.equal(setup.title,'Cuốn sách thử');assert.equal(setup.chapters,2);
  assert.ok(setup.content.includes('Xin chào thế giới.'));
  assert.ok(!setup.content.includes('window.evil'));
  await page.evaluate(()=>DuduEpubImportV48.open({canEdit:()=>true,sandbox:true,novels:window.sandboxNovels,
    saveDB:()=>{window.saveCalls++},author:'Tác giả'}));
  await page.getByRole('textbox',{name:'Chọn tệp EPUB'}).count().catch(()=>0);
  await page.locator('#epub-import-content input[type=file]').setInputFiles({
   name:'sample.epub',mimeType:'application/epub+zip',buffer:Buffer.from('stub')
  });
  await page.getByText(/Đã nhận 2 mục văn bản/).waitFor();
  await page.getByRole('button',{name:'Nhập chương vào Sandbox'}).click();
  await page.getByText(/Đã nhập 2 chương/).waitFor();
  const snapshot=await page.evaluate(()=>({novels:window.sandboxNovels,saveCalls:window.saveCalls,evil:window.evil}));
  assert.equal(snapshot.novels.length,1);
  assert.equal(snapshot.novels[0].chapters.length,2);
  assert.equal(snapshot.saveCalls,1);
  assert.equal(snapshot.evil,undefined);
  assert.equal(external,0);
 }finally{await browser.close()}
});
