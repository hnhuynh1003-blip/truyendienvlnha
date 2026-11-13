const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
test('V57 real-style EPUB: preserve <br>, distinguish notice, preview cover and omit notice by default',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.route('**/*',r=>r.request().url()==='http://localhost/'
   ?r.fulfill({contentType:'text/html',body:
    '<div id="epub-import-modal" style="display:none"><div id="epub-import-content"></div></div>'})
   :r.abort());
  await page.goto('http://localhost/');
  await page.addScriptTag({path:path.resolve(__dirname,'../js/epub-text-v57.js')});
  await page.addScriptTag({path:path.resolve(__dirname,'../js/epub-import-v48.js')});
  const parsed=await page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=120;canvas.height=170;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#aa3333';ctx.fillRect(0,0,120,170);
   const data=canvas.toDataURL('image/jpeg',.85).split(',')[1];
   const binary=atob(data),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
   const docs={
    'META-INF/container.xml':'<container><rootfile full-path="OPS/book.opf"/></container>',
    'OPS/book.opf':'<package><metadata><title>Truyện minh họa</title><creator>Tác giả</creator><meta name="cover" content="coverpic"/></metadata><manifest>'+
      '<item id="coverpic" href="images/cover.jpg" media-type="image/jpeg"/>'+
      '<item id="coverPage" href="cover.xhtml" media-type="application/xhtml+xml"/>'+
      '<item id="title" href="title_page.xhtml" media-type="application/xhtml+xml"/>'+
      '<item id="intro" href="intro.xhtml" media-type="application/xhtml+xml"/>'+
      '<item id="notice" href="notice.xhtml" media-type="application/xhtml+xml"/>'+
      '<item id="chapter" href="chapter01.xhtml" media-type="application/xhtml+xml"/></manifest>'+
      '<spine><itemref idref="coverPage"/><itemref idref="title"/>'+
      '<itemref idref="intro"/><itemref idref="notice"/>'+
      '<itemref idref="chapter"/></spine></package>',
    'OPS/cover.xhtml':'<html><body><img src="images/cover.jpg"></body></html>',
    'OPS/title_page.xhtml':'<html><head><title>Title Page</title></head><body><p>Thông tin đóng gói</p></body></html>',
    'OPS/intro.xhtml':'<html><body><h3>Văn án</h3><p>Lời mở đầu.</p></body></html>',
    'OPS/notice.xhtml':'<html><body><h3>Quan Trọng</h3><p>Lời của người đóng gói.</p></body></html>',
    'OPS/chapter01.xhtml':'<html><body><h3>Chương 1</h3>'+
      '<p>Ánh sáng ban mai.<br/>Dòng thứ hai.<br/>Đoạn thứ ba.</p>'+
      '<script>window.injected=1</script></body></html>'
   };
   const files={};
   for(const [name,value] of Object.entries(docs))
    files[name]={_data:{uncompressedSize:value.length}};
   files['OPS/images/cover.jpg']={_data:{uncompressedSize:bytes.length}};
   window.JSZip={loadAsync:async()=>({files,file:name=>
    name==='OPS/images/cover.jpg'?{async:async format=>format==='uint8array'?bytes:null}:
    docs[name]?{async:async()=>docs[name]}:null
   })};
   window.testNovels=[];
   return DuduEpubImportV48.parse(new File(['mock'],'sample.epub')).then(x=>({
    title:x.title,chapterCount:x.chapters.length,
    notices:x.noticeCount,skipped:x.skippedMetadata,
    kinds:x.chapters.map(c=>c.kind),
    body:x.chapters.at(-1).content,coverImage:x.coverImage
   }));
  });
  assert.equal(parsed.chapterCount,3);
  assert.equal(parsed.notices,1);assert.equal(parsed.skipped,2);
  assert.deepEqual(parsed.kinds,['intro','notice','chapter']);
  assert.match(parsed.body,/Ánh sáng ban mai\.\nDòng thứ hai\.\nĐoạn thứ ba\./);
  assert.doesNotMatch(parsed.body,/inject/);
  assert.match(parsed.coverImage,/^data:image\/jpeg;base64,/);
  assert.ok(parsed.coverImage.length<32000);
  await page.evaluate(()=>DuduEpubImportV48.open({canEdit:()=>true,sandbox:true,
   novels:window.testNovels,saveDB:()=>{},author:'Tác giả'}));
  await page.locator('#epub-import-content input[type=file]').setInputFiles({
   name:'sample.epub',mimeType:'application/epub+zip',buffer:Buffer.from('mock')
  });
  await page.getByText(/dự kiến nhập 2/).waitFor();
  assert.equal(await page.locator('#epub-import-content img').isVisible(),true);
  assert.equal(await page.locator('#epub-import-content input[type=checkbox]').isChecked(),false);
  await page.getByRole('button',{name:'Nhập chương vào Sandbox'}).click();
  const books=await page.evaluate(()=>window.testNovels);
  assert.equal(books[0].chapters.length,2);
  assert.match(books[0].chapters[1].content,/ban mai\.\nDòng/);
 }finally{await browser.close()}
});
