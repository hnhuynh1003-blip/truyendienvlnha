// Production page/assets and public catalog; no purchases or external requests.
const {chromium}=require('playwright'),fs=require('node:fs/promises'),assert=require('node:assert/strict');
(async()=>{
 const {createServer}=await import('../tools/tutien-integ-t0/serve.mjs');const server=createServer();
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const mode=process.env.CARD_QA_MODE||'before',out=process.env.CARD_QA_OUT||'docs/shop-r3/qa/card-v3';await fs.mkdir(out,{recursive:true});const report=[];
 try{for(const width of [320,355,390,430]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  await context.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('data:')?r.continue():r.abort());
  if(mode==='before')for(const file of ['index.html','css/market-v43.css','js/market-ui-v43.js']){
   const bytes=require('node:child_process').execFileSync('git',['show','743a952:'+file]);
   await context.route(file==='index.html'?origin+'/?*':'**/'+file+'?*',async r=>{const {previewHTML}=await import('../tools/tutien-integ-t0/serve.mjs');await r.fulfill({body:file==='index.html'?previewHTML(bytes.toString()):bytes,contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html'});});
  }
  const page=await context.newPage();await page.goto(origin+'/?sandbox=1');
  await page.waitForFunction(()=>typeof openPhoneApp==='function'&&!!window.DuduMarketUIV43);
  await page.evaluate(()=>{closeModals();togglePhone();openPhoneApp('shop');});await page.waitForTimeout(600);await page.evaluate(()=>closeModals());
  if(mode==='after')assert.equal(await page.locator('.dudu-v43-market-item').evaluateAll(cards=>cards.every(c=>{
   const info=c.querySelector('.dudu-v43-market-copy'),buy=c.querySelector('.dudu-v43-market-buy'),art=c.querySelector('.dudu-v43-market-icon').getBoundingClientRect(),r=buy.getBoundingClientRect();
   return info.contains(buy)&&c.scrollWidth<=c.clientWidth+1&&r.left>=art.right;
  })),true,'all catalog cards keep purchase in the information column without overflow');
  // Close-up framing only: hide surrounding sections and other catalog entries.
  await page.addStyleTag({content:'.shop-r3-hero,.shop-r3-combos,.dudu-v43-market-toolbar,.dudu-v43-market-footer{display:none!important}.dudu-v43-market-item:nth-child(n+5){display:none!important}'});
  const cards=page.locator('.dudu-v43-market-item').filter({visible:true});
  const rows=await cards.evaluateAll(async elements=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   return Promise.all(elements.map(async card=>{const art=card.querySelector('.dudu-v43-market-icon'),image=art.querySelector('img'),copy=card.querySelector('.dudu-v43-market-copy'),buy=card.querySelector('.dudu-v43-market-buy'),name=copy.querySelector('strong'),note=copy.querySelector('small');await image.decode();return {id:card.dataset.itemId,card:rect(card),art:rect(art),image:rect(image),copy:rect(copy),buy:rect(buy),button:rect(buy.querySelector('button')),price:rect(buy.querySelector('strong')),name:rect(name),nameLine:parseFloat(getComputedStyle(name).lineHeight),note:rect(note),noteDisplay:getComputedStyle(note).display,fit:getComputedStyle(image).objectFit,scroll:card.scrollWidth-card.clientWidth};}));
  });
  const phoneWidth=await page.locator('#cyber-phone').evaluate(e=>e.clientWidth),contentWidth=await page.locator('#shop-items-container').evaluate(e=>e.clientWidth);
  report.push({width,phoneWidth,contentWidth,rows});
  assert.deepEqual(rows.map(r=>r.id),['common-biscuit','common-bottled-water','e2','common-flashlight']);
  if(mode==='after')for(const r of rows){
   assert.equal(r.art.width,68,r.id+' art width');assert.equal(r.art.height,68,r.id+' art height');assert.equal(r.fit,'contain');
   assert.ok(r.image.x>=r.art.x-.5&&r.image.y>=r.art.y-.5&&r.image.right<=r.art.right+.5&&r.image.bottom<=r.art.bottom+.5,r.id+' image fits its box');
   assert.ok(r.copy.x>=r.art.right+5,r.id+' text beside art');assert.ok(r.buy.x>=r.copy.x&&r.buy.right<=r.copy.right+.5,r.id+' buy within information');
   assert.ok(Math.abs(r.price.y+r.price.height/2-r.button.y-r.button.height/2)<2,'price and button share line');
   assert.ok(r.button.height>=44,'purchase touch target');
   assert.ok(r.card.height>=88&&r.card.height<=110,r.id+' compact height');
   assert.ok(r.name.height<=r.nameLine*2+1);assert.equal(r.noteDisplay,'none');assert.ok(r.scroll<=1);
  }
  if(width===320||width===390)await page.screenshot({path:`${out}/${mode}-${width}.png`});
  if(mode==='after'){
   const description=await page.evaluate(()=>DuduEconomyCoreV43.shopCatalog()[0].desc);await page.locator('[data-item-id="common-biscuit"] .dudu-v43-market-icon').click();
   assert.ok((await page.locator('.shop-r3-dialog').innerText()).includes(description));await page.keyboard.press('Escape');
  }
  {
   await page.evaluate(()=>{const c=document.querySelector('.dudu-v43-market-item');c.classList.add('qa-long-card');c.querySelector('.dudu-v43-market-copy strong').textContent='Tên vật phẩm rất dài để kiểm tra bố cục không ép nhỏ ảnh hoặc che nút Mua — trường hợp kiểm thử tên vượt quá hai dòng trên mọi chiều rộng Cyber Phone';c.querySelector('.dudu-v43-market-copy small').textContent='Ghi chú dài cần rút gọn một dòng và giữ mô tả đầy đủ trong popup chi tiết.';});
   await page.addStyleTag({content:'.dudu-v43-market-item:not(.qa-long-card){display:none!important}'});
   const art=page.locator('.qa-long-card .dudu-v43-market-icon');assert.equal(await art.evaluate(e=>e.getBoundingClientRect().height),mode==='after'?68:72);
   if(mode==='after')assert.equal(await page.locator('.qa-long-card').evaluate(c=>{const n=c.querySelector('.dudu-v43-market-copy>strong'),b=c.querySelector('.dudu-v43-market-buy');return n.scrollHeight>n.clientHeight&&n.getBoundingClientRect().bottom<=b.getBoundingClientRect().top;}),true,'long name clamps without covering purchase');
   if(width===320||width===390)await page.locator('.qa-long-card').screenshot({path:`${out}/${mode}-long-name-${width}.png`});
  }
  await context.close();
 }await fs.writeFile(`${out}/${mode}-geometry.json`,JSON.stringify(report,null,2)+'\n');console.log('Card art '+mode+' QA PASS at 320/355/390/430');}
 finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
