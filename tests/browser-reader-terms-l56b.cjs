'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const fixture='<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f1f5f7;color:#294255;font:18px/1.8 Georgia,serif}#reader-settings-popover{position:fixed;left:6px;bottom:6px;z-index:100;background:#fff;padding:6px}#reader-content{max-width:650px;padding:30px 20px;margin:auto}#reader-content>p{margin:0 0 25px}</style><div id="reader-view" style="display:block"><div id="reader-settings-popover"></div><div id="reader-content"></div><button id="reader-name-open-l53">Names</button><div id="reader-name-hint-l53" hidden></div><div id="reader-name-modal-l53" class="reader-name-overlay-l53" role="dialog" aria-modal="true" aria-labelledby="reader-name-title-l53" hidden></div></div></html>';
async function setup(browser,width){
 const context=await browser.newContext({viewport:{width,height:850},isMobile:width<=430,hasTouch:width<=430});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
 await page.route('http://reader.local/**',route=>route.fulfill({status:200,contentType:'text/html',body:fixture}));
 await page.goto('http://reader.local/');
 await page.evaluate(()=>localStorage.setItem('bookmark:epub:sample',JSON.stringify({chapter:5,y:90})));
 for(const name of ['reader-names-l53.css','reader-names-l54.css'])await page.addStyleTag({path:path.join(root,'css',name)});
 for(const name of ['reader-name-dictionary-l53.js','reader-names-l54.js','reader-name-scan-l56a.js','reader-terms-l56b.js','reader-name-ui-l53.js','reader-name-ui-l54.js'])
  await page.addScriptTag({path:path.join(root,'js',name)});
 await page.evaluate(()=>{
  window.loadChapter=(id,parts)=>{
   DuduReaderNamesL53.setStory(id);DuduReaderNamesL53.prepareChapter(parts);
   const host=document.getElementById('reader-content');host.replaceChildren();
   for(const source of parts){
    const p=document.createElement('p');DuduReaderNamesL53.bindParagraph(p,source);host.append(p);
   }
  };
 });
 return {page,context,errors};
}
const paragraph='Tu vi của nhân vật tăng. Linh căn được khảo nghiệm. Tu vi không đồng nghĩa với tên nhân vật.';
async function openTerms(page){
 await page.locator('.l54-tools button').filter({hasText:'Từ điển'}).click();
 await page.locator('[data-name-action="terms"]').click();
 assert.equal(await page.locator('#reader-name-title-l53').textContent(),'Thuật ngữ trong chương');
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1280,320,390,430]){
   const {page,context,errors}=await setup(browser,width);
   await page.evaluate(parts=>loadChapter('web:sample',parts),[paragraph]);
   await openTerms(page);
   const found=page.locator('.l56b-entry');
   assert.ok(await found.count()>=2,'Term candidates visible '+width);
   assert.match(await found.first().innerText(),/Xuất hiện/);
   const readerBefore=await page.locator('#reader-content').innerText();
   const termRow=(name)=>page.locator('.l56b-entry').filter({has:page.locator('strong:text-is("'+name+'")')});
   const noteRow=termRow("Tu vi");
   await noteRow.getByRole('button',{name:'Xem và lưu'}).click();
   await page.locator('#reader-term-note-l56b').fill('Mức tu luyện trong truyện này');
   await page.locator('[data-name-action="term-save"]').click();
   assert.match(await page.locator('#reader-name-status-l53').innerText(),/Đã lưu/);
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('dudu-reader-terms-l56b:web%3Asample')).entries),[{term:'Tu vi',note:'Mức tu luyện trong truyện này'}]);
   assert.equal(await page.locator('#reader-content').innerText(),readerBefore,'Source never rewritten');
   assert.equal(await page.evaluate(()=>localStorage.getItem('bookmark:epub:sample')),JSON.stringify({chapter:5,y:90}));
   await termRow('Linh căn').getByRole('button',{name:'Bỏ qua'}).click();
   assert.equal(await termRow('Linh căn').count(),0);
   await page.locator('.l56-ignore-row').filter({hasText:/Linh căn/i}).getByRole('button',{name:'Khôi phục'}).click();
   assert.ok(await termRow('Linh căn').count()>0);
   // A different story starts with no confirmed glossary entry.
   await page.locator('[data-name-action="close"]').click();
   await page.evaluate(parts=>loadChapter('epub:other',parts),[paragraph]);
   await openTerms(page);
   assert.equal(await termRow('Tu vi').getAttribute('data-suspect'),'true');
   // Test mobile modal geometry and scroll without changing normal selection behavior.
   const box=await page.locator('#reader-name-modal-l53 section').boundingBox();
   assert.ok(box&&box.x>=-1&&box.x+box.width<=width+1,'Overlay fits '+width);
   await page.locator('[data-name-action="close"]').click();
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
   assert.deepEqual(errors,[],'no JS runtime errors '+width);
   await context.close();
  }
  console.log('PASS L5.6B glossary browser: desktop + 320/390/430px, source, bookmark, per-story ignore/restore and confirmation');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
