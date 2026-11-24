'use strict';
// Local HTTP + real lookup worker. No Firebase, remote API or chapter writes.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=process.env.L57_QA_DIR||path.join(require('node:os').tmpdir(),'dudu-l57');fs.mkdirSync(out,{recursive:true});
const fixture='<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="reader-view" style="display:block"><div id="reader-settings-popover"></div><div id="reader-content"></div><button id="reader-name-open-l53">Tên riêng</button><div id="reader-name-hint-l53" hidden></div><div id="reader-name-modal-l53" class="reader-name-overlay-l53" role="dialog" hidden></div></div></body></html>';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://local');if(url.pathname==='/fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fixture);}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/json');res.end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({headless:true});
  for(const width of [320,390,1280]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],writes=[];
   await context.route('**/*',r=>{if(r.request().method()!=='GET')writes.push(r.request().method());return r.request().url().startsWith(base)?r.continue():r.abort();});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.goto(base+'/fixture');for(const f of ['reader-names-l53','reader-names-l54','reader-name-lookup-l55'])await page.addStyleTag({url:base+'/css/'+f+'.css'});
   for(const f of ['reader-name-dictionary-l53','reader-name-lookup-l55','reader-names-l54','reader-name-scan-l56a','reader-name-ui-l53','reader-natural-names-l57','reader-name-ui-l54'])await page.addScriptTag({url:base+'/js/'+f+'.js'});
   await page.evaluate(()=>{window.mount=(id)=>{DuduReaderNamesL53.setStory(id);DuduReaderNamesL53.prepareChapter([]);const p=document.createElement('p');DuduReaderNamesL53.bindParagraph(p,'Khi Dã nói khi trời sáng. Nhưng Chân hỏi nhưng không đáp.');document.getElementById('reader-content').replaceChildren(p);};mount('epub:l57');localStorage.setItem('bookmark:l57','unchanged');DuduReaderNamesL53.openManager('Khi Dã');});
   const proposal=page.locator('#reader-name-proposals-l55');await proposal.locator('[data-name-group="natural"] .l55-choice').getByText('Kỳ Dã',{exact:true}).waitFor({timeout:30000});
   assert.equal(await proposal.locator('section').count(),3);assert.equal(await proposal.locator('small').count(),0,'No explanatory lines in result groups');assert.equal(await page.locator('#reader-name-to-l53').inputValue(),'Khi Dã','no inferred autofill');
   await proposal.getByText('Kỳ Dã',{exact:true}).click();assert.match(await page.locator('#reader-content').textContent(),/Khi Dã/,'click is not confirmation');
   await page.locator('[data-name-action="save"]').click();assert.equal(await page.locator('#reader-content').textContent(),'Kỳ Dã nói khi trời sáng. Nhưng Chân hỏi nhưng không đáp.');
   await page.evaluate(()=>{mount('web:l57');DuduReaderNamesL53.openManager('Nhưng Chân');});await proposal.getByText('Nhược Chân',{exact:true}).waitFor();
   assert.match(await page.locator('#reader-content').textContent(),/Khi Dã/,'story isolation');await proposal.locator('[data-name-group="keep"] .l55-choice').click();await page.locator('[data-name-action="save"]').click();assert.match(await page.locator('#reader-content').textContent(),/Nhưng Chân/);
   await page.evaluate(()=>DuduReaderNamesL53.openManager('Khi Dã'));await proposal.getByText('Kỳ Dã',{exact:true}).waitFor();
   const b=await page.locator('.l54-dialog').boundingBox();assert(b.x>=-1&&b.x+b.width<=width+1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:path.join(out,'l57-'+width+'.png')});assert.equal(await page.evaluate(()=>localStorage.getItem('bookmark:l57')),'unchanged');assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);await context.close();console.log('L57 browser PASS width='+width+' Web/EPUB confirm, keep, isolation, no writes');
  }
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
