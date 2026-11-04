'use strict';
// Browser-level L5.3 interaction: no Firebase, Worker or production requests.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  // A newly created about:blank page has an opaque origin: Chromium rejects
  // localStorage, which is required for device-local reader name aliases.
  // Intercept a fictitious HTTP origin so this test remains fully offline.
  await page.route('http://reader.local/**',route=>route.fulfill({
   status:200,contentType:'text/html',body:'<!doctype html><title>Offline reader fixture</title>'
  }));
  await page.goto('http://reader.local/');
  await page.setContent(`<!doctype html><html><body>
   <div id="reader-view" style="display:block">
    <div id="reader-content"><p id="chapter-p">Trần Sao gặp Trần Sao.</p></div>
    <div id="reader-name-hint-l53" class="reader-name-hint-l53" hidden>
     <button id="reader-name-hint-button-l53" onclick="DuduReaderNamesL53.openSelected()">✎ Sửa tên</button>
    </div>
    <div id="reader-name-modal-l53" class="reader-name-overlay-l53" hidden>
     <section class="reader-name-dialog-l53">
      <input id="reader-name-from-l53"><input id="reader-name-to-l53">
      <button id="reader-name-save" onclick="DuduReaderNamesL53.save()">Lưu</button>
      <div id="reader-name-list-l53"></div><span id="reader-name-count-l53"></span>
      <p id="reader-name-status-l53"></p>
     </section>
    </div>
   </div></body></html>`);
  const root=path.resolve(__dirname,'..');
  await page.addStyleTag({path:path.join(root,'css/reader-names-l53.css')});
  await page.addScriptTag({path:path.join(root,'js/reader-name-dictionary-l53.js')});
  await page.addScriptTag({path:path.join(root,'js/reader-name-ui-l53.js')});
  await page.evaluate(()=>{
   DuduReaderNamesL53.setStory('epub:reader-test');
   const node=document.getElementById('chapter-p');
   DuduReaderNamesL53.bindParagraph(node,node.textContent);
   const range=document.createRange();range.setStart(node.firstChild,0);
   range.setEnd(node.firstChild,8);
   const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  });
  await page.locator('#reader-name-hint-l53').waitFor({state:'visible',timeout:3000});
  await page.locator('#reader-name-hint-button-l53').click();
  assert.equal(await page.locator('#reader-name-from-l53').inputValue(),'Trần Sao');
  await page.locator('#reader-name-to-l53').fill('Trần An');
  await page.locator('#reader-name-save').click();
  assert.match(await page.locator('#reader-name-status-l53').textContent(),
   /Đã lưu/, 'Name alias must persist to the fixture’s localStorage');
  assert.equal(await page.locator('#chapter-p').textContent(),'Trần An gặp Trần An.');
  // Even after changing viewport, controls must remain fully inside the screen.
  await page.setViewportSize({width:390,height:844});
  const bounds=await page.locator('.reader-name-dialog-l53').boundingBox();
  assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=391,
   `Mobile popup must fit viewport: ${JSON.stringify(bounds)}`);
  await page.evaluate(()=>DuduReaderNamesL53.close());
  await page.evaluate(()=>{
   DuduReaderNamesL53.setStory('web:other-book');
   const node=document.createElement('p');node.id='other-book-p';
   DuduReaderNamesL53.bindParagraph(node,'Trần Sao gặp Trần Sao.');
   document.getElementById('reader-content').appendChild(node);
  });
  assert.equal(await page.locator('#other-book-p').textContent(),
   'Trần Sao gặp Trần Sao.','Aliases must not bleed into unrelated books');
  // Mobile native Copy/Search controls appear around the selected text.
  // Our edit action must be docked near the bottom, away from that overlay.
  for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});
   await page.evaluate(()=>{
    const node=document.getElementById('other-book-p').firstChild;
    const range=document.createRange();range.setStart(node,0);range.setEnd(node,8);
    const selection=window.getSelection();
    selection.removeAllRanges();selection.addRange(range);
   });
   await page.locator('#reader-name-hint-l53').waitFor({state:'visible',timeout:3000});
   const hint=await page.locator('#reader-name-hint-l53').boundingBox();
   assert.ok(hint&&hint.x>=0&&hint.x+hint.width<=width+1,
    `Mobile ${width}px name action must fit horizontally: ${JSON.stringify(hint)}`);
   assert.ok(hint.y>690&&hint.y+hint.height<=834,
    `Mobile ${width}px name action must stay at bottom away from Copy menu: ${JSON.stringify(hint)}`);
   await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));
   await page.waitForTimeout(300);
   assert.equal(await page.locator('#reader-name-hint-l53').isVisible(),true,
    'Automatic scrolling during text-selection should not dismiss the mobile action');
   await page.locator('#reader-name-hint-button-l53').click();
   assert.equal(await page.locator('#reader-name-from-l53').inputValue(),'Trần Sao');
   await page.evaluate(()=>{
    DuduReaderNamesL53.close();
    window.getSelection().removeAllRanges();
   });
  }
  console.log('L5.3 mobile fixed bottom edit action (320/390/430px), desktop, alias isolation: PASS');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
