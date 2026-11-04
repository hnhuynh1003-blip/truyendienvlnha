'use strict';
// Offline browser contract for the shared EPUB/Web renderer; no production data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const fixture=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;background:#edf0f3;color:#293746;font:20px/1.85 Georgia,serif}#reader-view{display:block}#reader-settings-popover{position:fixed;left:8px;bottom:8px;z-index:100;background:white;padding:6px;max-width:290px}#reader-content{max-width:650px;padding:30px 20px;margin:auto}#reader-content p{margin:0 0 24px}#reader-name-modal-l53 section{font-family:system-ui}button{cursor:pointer}</style>
<div id="reader-view" style="display:block"><div id="reader-settings-popover"></div><article id="reader-paper"><div id="reader-content"></div></article>
<button id="reader-name-open-l53">Names</button><div id="reader-name-hint-l53" hidden></div><div id="reader-name-modal-l53" class="reader-name-overlay-l53" role="dialog" aria-modal="true" aria-labelledby="reader-name-title-l53" hidden></div></div></html>`;
async function setup(browser,options={}){
 const context=await browser.newContext({viewport:{width:1280,height:900},...options});const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Page error',e.message);});page.on('dialog',dialog=>dialog.accept());
 await page.route('http://reader.local/**',r=>r.fulfill({status:200,contentType:'text/html',body:fixture}));await page.goto('http://reader.local/');
 await page.evaluate(()=>localStorage.setItem('bookmark:epub:test',JSON.stringify({chapter:7,y:400})));
 for(const file of ['reader-names-l53.css','reader-names-l54.css'])await page.addStyleTag({path:path.join(root,'css',file)});
 for(const file of ['reader-name-dictionary-l53.js','reader-names-l54.js','reader-name-ui-l53.js','reader-name-ui-l54.js'])await page.addScriptTag({path:path.join(root,'js',file)});
 await page.evaluate(()=>{
  window.fixtureMount=(id,paragraphs)=>{
   DuduReaderNamesL53.setStory(id);DuduReaderNamesL53.prepareChapter(paragraphs);document.getElementById('reader-content').replaceChildren();
   for(const text of paragraphs){const p=document.createElement('p');DuduReaderNamesL53.bindParagraph(p,text);document.getElementById('reader-content').append(p);}
  };
 });return {page,context,errors};
}
async function point(page,paragraph,index){
 return page.locator('#reader-content > p').nth(paragraph).evaluate((p,index)=>{
  const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let node,count=0;
  while(node=walker.nextNode()){
   if(count+node.length>index){const range=document.createRange();range.setStart(node,index-count);range.setEnd(node,index-count+1);const box=range.getBoundingClientRect();return {x:box.x+box.width/2,y:box.y+box.height/2};}count+=node.length;
  }throw Error('No letter at '+index);
 },index);
}
async function choose(page,paragraph,index,touch=false){
 const p=page.locator('#reader-content > p').nth(paragraph);await p.scrollIntoViewIfNeeded();
 const xy=await point(page,paragraph,index);if(touch)await page.touchscreen.tap(xy.x,xy.y);else await page.mouse.click(xy.x,xy.y);
 try{await page.locator('#reader-name-modal-l53').waitFor({state:'visible',timeout:3000});}
 catch(error){console.error('Hit-test diagnostic',await page.evaluate(({x,y})=>({x,y,hit:document.elementFromPoint(x,y)?.outerHTML,mode:document.getElementById('reader-content').className,view:[innerWidth,innerHeight]}),xy));throw error;}
}
async function fits(page,selector){
 const box=await page.locator(selector).boundingBox(),view=page.viewportSize();
 assert.ok(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=view.width+1&&box.y+box.height<=view.height+1,`${selector}: ${JSON.stringify({box,view})}`);
}
async function desktop(browser){
 const {page,context,errors}=await setup(browser);
 await page.evaluate(()=>{
  localStorage.setItem('dudu-reader-names-l53:epub%3Alegacy',JSON.stringify([{from:'trần sao',to:'Trần An'}]));
  fixtureMount('epub:legacy',['trần sao nhìn tần mặc hàm.']);
 });
 assert.equal(await page.locator('#reader-content > p').textContent(),'Trần An nhìn tần mặc hàm.');
 assert.equal(await page.locator('#reader-name-modal-l53').isVisible(),false,'No unsolicited popup');
 await page.locator('#reader-name-edit-toggle-l54').click();await choose(page,0,15);
 assert.equal(await page.locator('#reader-name-from-l53').inputValue(),'tần');
 assert.equal(await page.evaluate(()=>String(getSelection())), '');
 await page.locator('[data-name-action="phrase"]').click();assert.equal(await page.locator('#reader-name-from-l53').inputValue(),'tần mặc hàm');
 await page.locator('[data-name-action="shrink"]').click();assert.equal(await page.locator('#reader-name-from-l53').inputValue(),'tần mặc');
 await page.locator('[data-name-action="grow"]').click();
 await page.locator('#reader-name-to-l53').fill('Tần Hạo');await page.locator('[data-name-action="save"]').click();
 assert.equal(await page.locator('#reader-content > p').textContent(),'Trần An nhìn Tần Hạo.');assert.equal(await page.locator('#reader-name-modal-l53').isVisible(),false);
 // A changed display length maps back to the source alias on the next edit.
 await choose(page,0,15);assert.equal(await page.locator('#reader-name-from-l53').inputValue(),'tần mặc hàm');
 await page.locator('[data-name-action="cancel"]').click();
 await page.locator('#reader-name-done-l54').click();assert.equal(await page.locator('#reader-name-done-l54').isVisible(),false);
 assert.notEqual(await page.locator('#reader-content').evaluate(n=>getComputedStyle(n).userSelect),'none');
 // Same rendered rules in Web; unrelated dictionaries and chapter navigation stay isolated.
 await page.evaluate(()=>fixtureMount('web:other',['trần sao đến.']));assert.equal(await page.locator('#reader-content > p').textContent(),'trần sao đến.');
 await page.evaluate(()=>fixtureMount('epub:legacy',['trần sao trở lại.']));assert.equal(await page.locator('#reader-content > p').textContent(),'Trần An trở lại.');
 // Long chapter: preserve actual on-screen paragraph position after a replacement.
 await page.evaluate(()=>fixtureMount('web:scroll',Array.from({length:80},(_,i)=>'Đoạn '+i+': tần mặc hàm bước đến và nhìn ra phía xa.')));
 await page.evaluate(()=>{scrollTo(0,1600);DuduReaderNamesL53.setMode(true);});
 const visible=await page.evaluate(()=>Array.from(document.querySelectorAll('#reader-content > p')).findIndex(p=>{const r=p.getBoundingClientRect();return r.top>120&&r.bottom<innerHeight-100;}));
 const index=await page.locator('#reader-content > p').nth(visible).evaluate(p=>p.textContent.toLocaleLowerCase('vi').indexOf('tần')+1);
 const before=await page.locator('#reader-content > p').nth(visible).evaluate(p=>p.getBoundingClientRect().top);
 await choose(page,visible,index);await page.locator('[data-name-action="phrase"]').click();await page.locator('#reader-name-to-l53').fill('Tần Mặc Hàm');await page.locator('[data-name-action="save"]').click();
 assert.ok(Math.abs((await page.locator('#reader-content > p').nth(visible).evaluate(p=>p.getBoundingClientRect().top))-before)<3,'Save must preserve viewport anchor');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('bookmark:epub:test'))),{chapter:7,y:400});
 // Font changes and next chapter do not leak edit state.
 await page.locator('#reader-name-done-l54').click();await page.locator('#reader-content').evaluate(n=>n.style.fontSize='26px');
 await page.evaluate(()=>fixtureMount('web:scroll',['tần mặc hàm nói.']));assert.equal(await page.locator('#reader-content > p').textContent(),'Tần Mặc Hàm nói.');
 assert.equal(await page.locator('#reader-name-done-l54').isVisible(),false);
 await page.evaluate(()=>fixtureMount('epub:scan',['tần minh nói. tần minh hỏi. tần minh cười. tần rõ ràng đến. ôn nếu hỏi.']));
 assert.match(await page.locator('#reader-content > p').textContent(),/Tần Minh nói/);assert.equal(await page.locator('#reader-name-modal-l53').isVisible(),false);
 await page.evaluate(()=>DuduReaderNamesL53.scan());await page.locator('.l54-result').first().waitFor();
 assert.equal(await page.locator('.l54-result[data-suspect="true"]').count(),2);
 await page.locator('.l54-result').first().getByRole('button').click();await page.locator('[data-name-action="save"]').click();
 // Manager: per-character details, alias link, remove, undo, backup, import.
 await page.evaluate(()=>DuduReaderNamesL53.openManager());await page.locator('.l54-character').first().click();
 assert.equal(await page.locator('.reader-name-row-l53').count(),1);
 await page.locator('[data-name-action="add"]').click();await page.locator('#reader-name-from-l53').fill('tần rõ ràng');await page.locator('#reader-name-to-l53').fill('Tần Minh');await page.locator('[data-name-action="save"]').click();
 await page.evaluate(()=>DuduReaderNamesL53.openManager());assert.equal(await page.locator('.l54-character').count(),1);assert.match(await page.locator('.l54-character').textContent(),/2 cách gọi/);
 await page.locator('.l54-character').click();await page.locator('.reader-name-row-l53').filter({hasText:'tần rõ ràng'}).getByRole('button',{name:'Xóa',exact:true}).click();
 assert.match(await page.locator('#reader-content > p').textContent(),/tần rõ ràng/);
 await page.locator('[data-name-action="undo"]').click();assert.match(await page.locator('#reader-content > p').textContent(),/Tần Minh đến/);
 const downloadEvent=page.waitForEvent('download');await page.locator('[data-name-action="export"]').click();const download=await downloadEvent;
 const backup=await require('node:fs/promises').readFile(await download.path(),'utf8');assert.equal(JSON.parse(backup).entries.length,2);
 await page.locator('#reader-name-import-l54').setInputFiles({name:'dictionary.json',mimeType:'application/json',buffer:Buffer.from(backup)});
 await page.waitForFunction(()=>document.getElementById('reader-name-status-l53').textContent.includes('Đã nhập'));
 await fits(page,'.l54-dialog');await page.screenshot({path:path.join(os.tmpdir(),'dudu-l54-pc.png')});
 assert.deepEqual(errors,[]);await context.close();
}
async function android(browser,width){
 const {page,context,errors}=await setup(browser,{viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await page.evaluate(()=>fixtureMount('epub:android',['Đây là đoạn văn mở đầu tần mặc hàm nói. tần mặc hàm hỏi. tần mặc hàm cười.']));
 await page.locator('#reader-name-edit-toggle-l54').tap();
 const i=await page.locator('#reader-content > p').evaluate(p=>p.textContent.indexOf('Tần')+1);await choose(page,0,i,true);
 assert.equal(await page.locator('#reader-name-from-l53').inputValue(),'tần');await page.locator('[data-name-action="phrase"]').tap();
 assert.equal(await page.locator('#reader-name-from-l53').inputValue(),'tần mặc hàm');
 await fits(page,'.l54-dialog');await page.locator('#reader-name-to-l53').focus();
 // Chromium cannot open a physical Android IME. A shorter viewport exercises
 // the same visualViewport resize path, including a landscape-sized keyboard.
 await page.setViewportSize({width,height:420});await page.waitForFunction(()=>document.getElementById('reader-name-modal-l53').getBoundingClientRect().height<=innerHeight);await fits(page,'.l54-dialog');await fits(page,'[data-name-action="save"]');
 await page.locator('#reader-name-to-l53').fill('Tần An');await page.locator('[data-name-action="save"]').tap();assert.match(await page.locator('#reader-content > p').textContent(),/Tần An/);
 await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 await page.locator('#reader-name-done-l54').tap();
 // A swipe in edit mode must scroll instead of opening a name dialog.
 await page.evaluate(()=>{fixtureMount('web:android',Array.from({length:50},()=> 'tần minh đang đứng cạnh cửa sổ.'));DuduReaderNamesL53.setMode(true);scrollTo(0,0);});
 const client=await context.newCDPSession(page);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width/2,y:600}]});
 for(const y of [550,450,350,250])await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width/2,y}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);
 assert.equal(await page.locator('#reader-name-modal-l53').isVisible(),false);assert.ok(await page.evaluate(()=>scrollY)>10,'Touch swipe must scroll');
 assert.equal(await page.locator('#reader-content').evaluate(n=>getComputedStyle(n).userSelect),'none');
 await page.evaluate(()=>DuduReaderNamesL53.setMode(false));assert.notEqual(await page.locator('#reader-content').evaluate(n=>getComputedStyle(n).userSelect),'none');
 if(width===390){await page.evaluate(()=>{scrollTo(0,0);DuduReaderNamesL53.openManager('tần minh');});await page.screenshot({path:path.join(os.tmpdir(),'dudu-l54-android.png')});}
 assert.deepEqual(errors,[]);await context.close();
}
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.L54_BROWSER_CHANNEL||undefined,executablePath:process.env.L54_CHROME_PATH||undefined});try{await desktop(browser);for(const width of [320,390,430])await android(browser,width);console.log('L5.4a/c PC + Android touch 320/390/430, reduced keyboard viewport, selection, scroll, shared EPUB/Web, profiles/undo/backup: PASS');}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});


