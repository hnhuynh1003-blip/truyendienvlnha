'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const ROOT=path.resolve(__dirname,'..');
const fixture=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;background:#15202c;color:#e6e9ee;font:20px/1.85 Georgia,serif}#reader-content{max-width:650px;padding:30px 18px;margin:auto}#reader-content p{margin:0 0 24px}#reader-settings-popover{position:fixed;left:8px;bottom:8px;z-index:50;padding:6px;background:#182f3d}button{cursor:pointer}</style>
<div id="reader-view" style="display:block"><div id="reader-settings-popover"></div><article id="reader-paper"><div id="reader-content"></div></article><button id="reader-name-open-l53">Tên riêng</button><div id="reader-name-hint-l53" hidden></div><div id="reader-name-modal-l53" class="reader-name-overlay-l53" role="dialog" aria-modal="true" aria-labelledby="reader-name-title-l53" hidden></div></div></html>`;
let failData=false,slowData=false,failWrites=false;
const requests=[];
const server=http.createServer(async(req,res)=>{
 try{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);requests.push(pathname);
  if(pathname==='/fixture'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(fixture);return;}
  if(pathname.endsWith('/characters.json')||pathname.endsWith('/meanings.json')){if(failData){res.writeHead(503).end('unavailable');return;}if(slowData)await new Promise(r=>setTimeout(r,400));}
  const file=path.resolve(ROOT,'.'+pathname);if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  let buffer=await fs.readFile(file);const mime=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/plain';
  if(failWrites&&pathname.endsWith('/reader-name-lookup-worker-l55.js'))buffer=Buffer.concat([Buffer.from('IDBObjectStore.prototype.put=function(){throw new DOMException("simulated storage failure","QuotaExceededError");};\n'),buffer]);
  res.writeHead(200,{'Content-Type':mime+'; charset=utf-8','Cache-Control':'no-store'}).end(buffer);
 }catch(_){res.writeHead(404).end();}
});
let base;
async function load(page){
 await page.goto(base+'/fixture');
 for(const file of ['reader-names-l53.css','reader-names-l54.css','reader-name-lookup-l55.css'])await page.addStyleTag({url:base+'/css/'+file});
 for(const file of ['reader-name-dictionary-l53.js','reader-name-lookup-l55.js','reader-names-l54.js','reader-name-ui-l53.js','reader-name-ui-l54.js'])await page.addScriptTag({url:base+'/js/'+file});
 await page.evaluate(()=>{
  window.fixtureMount=(id,paragraphs)=>{DuduReaderNamesL53.setStory(id);DuduReaderNamesL53.prepareChapter(paragraphs);document.getElementById('reader-content').replaceChildren();for(const text of paragraphs){const p=document.createElement('p');DuduReaderNamesL53.bindParagraph(p,text);document.getElementById('reader-content').append(p);}};
 });
}
async function context(browser,viewport={width:1280,height:900},touch=false){
 const c=await browser.newContext({viewport,isMobile:touch,hasTouch:touch,acceptDownloads:true}),p=await c.newPage();const errors=[],dialogs=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>{dialogs.push(d.message());d.accept();});
 await c.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
 await load(p);return {c,p,errors,dialogs};
}
async function fits(page,selector){const b=await page.locator(selector).boundingBox(),v=page.viewportSize();assert.ok(b&&b.x>=-1&&b.y>=-1&&b.x+b.width<=v.width+1&&b.y+b.height<=v.height+1,selector+' '+JSON.stringify({b,v}));}
const source='Cô nhìn lộc biết thuyền nói. lộc biết thuyền hỏi. lộc biết thuyền cười. tần rõ ràng đến. ôn nếu hỏi.';
async function desktop(browser){
 const {c,p,errors,dialogs}=await context(browser);let dataBefore=requests.filter(r=>r.endsWith('.json')).length;
 await p.evaluate(source=>{localStorage.setItem('bookmark:lookup',JSON.stringify({chapter:8,y:220}));fixtureMount('epub:lookup',[source]);},source);
 assert.equal(requests.filter(r=>r.endsWith('.json')).length,dataBefore,'No eager dictionary payload');
 assert.equal(await p.locator('#reader-content > p').textContent(),source,'No unconfirmed reverse translation');
 // Delayed first load must never overwrite manual input or the clear action.
 slowData=true;await p.evaluate(()=>DuduReaderNamesL53.openManager('lộc biết thuyền'));
 await p.locator('[data-name-action="manual"]').click();await p.locator('#reader-name-to-l53').fill('Tên Do Du Chọn');
 await p.locator('#reader-name-proposals-l55 .l55-choice').filter({hasText:'Lộc Tri Chu'}).waitFor({timeout:20000});slowData=false;
 assert.equal(await p.locator('#reader-name-to-l53').inputValue(),'Tên Do Du Chọn');
 await p.locator('#reader-name-proposals-l55 .l55-choice').getByText('Lộc Tri Chu',{exact:true}).click();assert.equal(await p.locator('#reader-name-to-l53').inputValue(),'Lộc Tri Chu');
 assert.match(await p.locator('#reader-name-proposals-l55').textContent(),/知/);assert.match(await p.locator('#reader-name-proposals-l55').textContent(),/舟/);
 await p.locator('[data-name-action="save"]').click();assert.match(await p.locator('#reader-content > p').textContent(),/Lộc Tri Chu nói/);
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('bookmark:lookup'))),{chapter:8,y:220});
 const dataAfter=requests.filter(r=>r.endsWith('.json')).length;assert.equal(dataAfter-dataBefore,2);
 await p.evaluate(()=>DuduReaderNamesL53.scan());await p.locator('.l54-result').first().waitFor({timeout:10000});
 assert.match(await p.locator('#reader-name-list-l53').textContent(),/tần rõ ràng → Tần Minh/);assert.match(await p.locator('#reader-name-list-l53').textContent(),/ôn nếu → Ôn Nhược/);
 assert.ok(await p.locator('.l55-excerpt').count()>0,'Scan must show source context');
 await p.locator('.l54-result').filter({hasText:'tần rõ ràng →'}).getByRole('button',{name:'Kiểm tra'}).click();
 await p.locator('#reader-name-proposals-l55 .l55-choice').getByText('Tần Minh',{exact:true}).waitFor();
 await p.screenshot({path:path.join(os.tmpdir(),'dudu-l55-pc.png')});await p.locator('[data-name-action="cancel"]').click();
 await p.evaluate(()=>DuduReaderNamesL53.openManager());await p.locator('#reader-lookup-query-l55').fill('鹿知舟');await p.locator('[data-name-action="lookup"]').click();
 await p.locator('#reader-lookup-results-l55 .l55-choice').getByText('Lộc Tri Chu',{exact:true}).waitFor();
 await p.locator('.l55-sources').first().locator('summary').click();await p.waitForFunction(()=>document.getElementById('reader-lookup-info-l55').textContent.includes('109.168'));assert.match(await p.locator('#reader-lookup-info-l55').textContent(),/MIT/);
 await p.locator('.l55-sources').nth(1).locator('summary').click();
 await p.locator('#reader-lookup-file-l55').setInputFiles({name:'Names.txt',mimeType:'text/plain',buffer:Buffer.from('鹿知舟=Lộc Tri Châu\n林青=Lâm Thanh')});
 await p.waitForFunction(()=>document.getElementById('reader-name-status-l53').textContent.includes('Đã lưu bộ tra'));
 assert.ok(dialogs.some(d=>d.includes('Nhập 2 mục')));
 await p.locator('[data-name-action="lookup"]').click();await p.locator('#reader-lookup-results-l55 .l55-choice').getByText('Lộc Tri Châu',{exact:true}).waitFor();
 const downloadEvent=p.waitForEvent('download');await p.locator('[data-name-action="export-pack"]').click();const exported=JSON.parse(await fs.readFile(await (await downloadEvent).path(),'utf8'));assert.equal(exported.entries.length,2);assert.equal(exported.format,'dudu-name-lookup-pack');
 const rules=await p.evaluate(()=>localStorage.getItem('dudu-reader-names-l53:epub%3Alookup'));
 await p.locator('#reader-lookup-file-l55').setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from('{"format":"dudu-reader-names","entries":[]}')});
 await p.waitForFunction(()=>document.getElementById('reader-name-status-l53').dataset.error==='true');assert.equal(await p.evaluate(()=>localStorage.getItem('dudu-reader-names-l53:epub%3Alookup')),rules);
 failWrites=true;await load(p);await p.evaluate(source=>{fixtureMount('epub:lookup',[source]);DuduReaderNamesL53.openManager();},source);await p.evaluate(()=>DuduReaderNameLookupL55.load());
 await p.locator('.l55-sources').nth(1).locator('summary').click();
 await p.locator('#reader-lookup-file-l55').setInputFiles({name:'Replacement.txt',mimeType:'text/plain',buffer:Buffer.from('鹿知舟=Tên Thay Sai')});
 await p.waitForFunction(()=>document.getElementById('reader-name-status-l53').dataset.error==='true'&&document.getElementById('reader-name-status-l53').textContent.includes('lưu'));
 failWrites=false;
 assert.equal((await p.evaluate(()=>DuduReaderNameLookupL55.suggest('鹿知舟')))[0].name,'Lộc Tri Châu','Quota failure must leave the old pack intact');
 // Persistence is real IndexedDB, not just the current worker's memory.
 await load(p);await p.evaluate(source=>fixtureMount('epub:lookup',[source]),source);assert.match(await p.locator('#reader-content > p').textContent(),/Lộc Tri Chu nói/);
 await p.evaluate(()=>DuduReaderNamesL53.openManager());await p.locator('#reader-lookup-query-l55').fill('鹿知舟');await p.locator('[data-name-action="lookup"]').click();await p.locator('#reader-lookup-results-l55 .l55-choice').getByText('Lộc Tri Châu',{exact:true}).waitFor({timeout:20000});
 assert.equal(requests.filter(r=>r.endsWith('.json')).length,dataAfter,'Reload uses the on-device dictionary cache');
 await p.locator('.l55-sources').nth(1).locator('summary').click();await p.locator('[data-name-action="clear-packs"]').click();await p.waitForFunction(()=>document.getElementById('reader-name-status-l53').textContent.includes('Đã gỡ'));
 assert.equal(await p.evaluate(()=>localStorage.getItem('dudu-reader-names-l53:epub%3Alookup')),rules);
 await p.locator('[data-name-action="lookup"]').click();await p.locator('#reader-lookup-results-l55 .l55-choice').getByText('Lộc Tri Chu',{exact:true}).waitFor();
 await p.evaluate(()=>{DuduReaderNamesL53.close();fixtureMount('web:another',['lộc biết thuyền nói.']);});assert.equal(await p.locator('#reader-content > p').textContent(),'lộc biết thuyền nói.');
 // Opt-in automatic display is reversible and never silently saves a rule.
 const automaticText='lộc đốm lấp lánh nói. lộc đốm lấp lánh hỏi. lộc đốm lấp lánh cười.';
 await p.evaluate(text=>{fixtureMount('web:auto',[text]);DuduReaderNamesL53.openManager();},automaticText);
 if(await p.locator('.l55-sources').nth(1).getAttribute('open')===null)await p.locator('.l55-sources').nth(1).locator('summary').click();await p.locator('#reader-lookup-kind-l55').selectOption('meanings');
 await p.locator('#reader-lookup-file-l55').setInputFiles({name:'VietPhrase.txt',mimeType:'text/plain',buffer:Buffer.from('星=đốm lấp lánh')});
 await p.waitForFunction(()=>document.getElementById('reader-name-status-l53').textContent.includes('Đã lưu bộ tra'));
 await p.locator('#reader-lookup-auto-l55').check();await p.evaluate(text=>DuduReaderNameLookupL55.analyze(text,[]),automaticText);await p.evaluate(()=>DuduReaderNamesL53.close());
 assert.match(await p.locator('#reader-content > p').textContent(),/Lộc Tinh nói/);assert.equal(await p.evaluate(()=>localStorage.getItem('dudu-reader-names-l53:web%3Aauto')),null);
 await p.evaluate(()=>DuduReaderNamesL53.openManager());await p.locator('#reader-lookup-auto-l55').uncheck();await p.evaluate(()=>DuduReaderNamesL53.close());assert.equal(await p.locator('#reader-content > p').textContent(),automaticText);
 assert.deepEqual(errors,[]);await c.close();
}
async function android(browser,width){
 const {c,p,errors}=await context(browser,{width,height:844},true);
 await p.evaluate(()=>fixtureMount('web:mobile',['lộc biết thuyền nói. lộc biết thuyền hỏi. lộc biết thuyền cười.']));
 await p.locator('#reader-name-edit-toggle-l54').tap();const point=await p.locator('#reader-content > p').evaluate(node=>{const r=document.createRange();r.setStart(node.firstChild,1);r.setEnd(node.firstChild,2);const b=r.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
 await p.touchscreen.tap(point.x,point.y);await p.locator('#reader-name-modal-l53').waitFor({state:'visible'});assert.equal(await p.locator('#reader-name-from-l53').inputValue(),'lộc');
 await p.locator('[data-name-action="phrase"]').waitFor({state:'visible',timeout:20000});await p.locator('[data-name-action="phrase"]').tap();assert.equal(await p.locator('#reader-name-from-l53').inputValue(),'lộc biết thuyền');
 await p.locator('#reader-name-proposals-l55 .l55-choice').getByText('Lộc Tri Chu',{exact:true}).waitFor();await fits(p,'.l54-dialog');
 if(width===390)await p.screenshot({path:path.join(os.tmpdir(),'dudu-l55-android.png')});
 // The name stays untouched until explicit confirmation, even with candidates.
 assert.match(await p.locator('#reader-content > p').textContent(),/lộc biết thuyền/);
 await p.locator('#reader-name-to-l53').focus();await p.setViewportSize({width,height:420});await p.waitForFunction(()=>document.getElementById('reader-name-modal-l53').getBoundingClientRect().height<=innerHeight);await fits(p,'.l54-dialog');await fits(p,'[data-name-action="save"]');
 await p.locator('[data-name-action="manual"]').tap();await p.locator('#reader-name-to-l53').fill('Lộc Tri Chu');await p.locator('[data-name-action="save"]').tap();assert.match(await p.locator('#reader-content > p').textContent(),/Lộc Tri Chu nói/);
 await p.setViewportSize({width,height:844});await p.locator('#reader-name-done-l54').tap();assert.notEqual(await p.locator('#reader-content').evaluate(n=>getComputedStyle(n).userSelect),'none');
 assert.deepEqual(errors,[]);await c.close();
}
async function failure(browser){
 failData=true;const {c,p,errors}=await context(browser);await p.evaluate(()=>{fixtureMount('epub:failure',['lộc biết thuyền đến.']);DuduReaderNamesL53.openManager('lộc biết thuyền');});
 await p.waitForFunction(()=>document.getElementById('reader-name-proposals-l55').textContent.includes('thủ công'),{},{timeout:10000});
 await p.locator('[data-name-action="manual"]').click();await p.locator('#reader-name-to-l53').fill('Lộc Thủ Công');await p.locator('[data-name-action="save"]').click();assert.equal(await p.locator('#reader-content > p').textContent(),'Lộc Thủ Công đến.');
 failData=false;await p.evaluate(()=>DuduReaderNamesL53.openManager('tần rõ ràng'));await p.locator('#reader-name-proposals-l55 .l55-choice').getByText('Tần Minh',{exact:true}).waitFor({timeout:20000});
 assert.deepEqual(errors,[]);await c.close();
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,channel:process.env.L54_BROWSER_CHANNEL||undefined,executablePath:process.env.L54_CHROME_PATH||undefined});
 try{await desktop(browser);for(const width of [320,390,430])await android(browser,width);await failure(browser);console.log('L5.5 real dictionary + Worker: PC, touch 320/390/430, keyboard viewport, proposal selection, manual fallback, excerpts, Names import, IndexedDB persistence, cache, corrupt imports, network failure/retry: PASS');}
 finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
