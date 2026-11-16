// Local website QA only. External requests and real transactions are blocked.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
(async()=>{
 const {createServer}=await import('../tools/tutien-integ-t0/serve.mjs');
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const mode=process.env.SHOP_QA_MODE||'before',out='docs/shop-r3/qa';await fs.mkdir(out,{recursive:true});
 try{for(const width of [320,355,390,430]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  await context.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('data:')?r.continue():r.abort());
  if(mode==='before')for(const file of ['index.html','js/market-ui-v43.js','css/market-v43.css']){
   const source=require('node:child_process').execFileSync('git',['show','a8250ae0:'+file]);
   await context.route(file==='index.html'?origin+'/?*':'**/'+file+'?*',async r=>{
    const {previewHTML}=await import('../tools/tutien-integ-t0/serve.mjs');
    await r.fulfill({body:file==='index.html'?previewHTML(source.toString()):source,contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html'});
   });
  }
  const page=await context.newPage();await page.goto(origin+'/?sandbox=1');
  await page.waitForFunction(()=>typeof openPhoneApp==='function'&&!!window.DuduMarketUIV43);
  await page.evaluate(()=>{closeModals();togglePhone();openPhoneApp('shop');});
  await page.waitForTimeout(600);
  await page.evaluate(()=>closeModals());
  if(width===320||width===390)await page.screenshot({path:`${out}/${mode}-${width}.png`});
  if(mode==='after'){
   assert.equal(await page.locator('.shop-r3-groups button').count(),4);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'page overflow '+width);
   const before=await page.evaluate(()=>JSON.stringify({currency:userProfile.currency,inventory:userProfile.inventory}));
   // The production renderer receives a test-only callback, never an economy write.
   await page.evaluate(()=>{
    window.__shopCalls=[];window.__sellCalls=[];
    const e=DuduEconomyCoreV43;
    window.__shopConfig={host:document.getElementById('shop-items-container'),coins:1000,personalMode:true,
     saleIds:[...e.SHOP_IDS,e.SUPPLY_ID,e.TOOL_ID,e.PULSE_ID],inventory:[],
     onBuy:id=>{__shopCalls.push(id);return new Promise(resolve=>window.__finishBuy=resolve);},
     onBulkSell:ids=>__sellCalls.push(ids)};
    DuduMarketUIV43.render(__shopConfig);
   });
   assert.equal(await page.locator('.shop-r3-groups button').count(),5);
   assert.equal(await page.locator('.dudu-v43-market-buy button:enabled').count(),15);
   assert.equal(await page.locator('.dudu-v43-market-buy button:disabled').count(),1,'coupon stays locked');
   const art=page.locator('.dudu-v43-market-icon').first();await art.click();
   assert.equal(await page.locator('.shop-r3-dialog').count(),1);
   await page.keyboard.press('Tab');assert.equal(await page.locator('.shop-r3-dialog>button').evaluate(e=>e===document.activeElement),true);
   await page.keyboard.press('Escape');assert.equal(await art.evaluate(e=>e===document.activeElement),true);
   await art.click();await page.locator('.shop-r3-modal').click({position:{x:2,y:2}});assert.equal(await page.locator('.shop-r3-dialog').count(),0);
   await art.click();await page.getByRole('button',{name:'Đóng chi tiết'}).click();
   await art.click();
   await page.evaluate(()=>{window.__originalAuth=DuduAuth;window.DuduAuth={uid:()=> 'qa-different-owner'};});
   await page.waitForFunction(()=>!document.querySelector('.shop-r3-modal'));
   await page.evaluate(()=>{window.DuduAuth=__originalAuth;});
   const search=page.getByRole('searchbox');await search.fill('Bánh Quy Khô');assert.equal(await page.locator('.dudu-v43-market-item').count(),1);await search.fill('');
   await page.getByLabel('Lọc phẩm',{exact:true}).selectOption('SSS');assert.equal(await page.locator('.dudu-v43-market-item').count(),0);await page.getByLabel('Lọc phẩm',{exact:true}).selectOption('');
   await page.getByLabel('Sắp xếp vật phẩm',{exact:true}).selectOption('price');
   await page.locator('.dudu-v43-market-buy button:enabled').first().evaluate(e=>{e.click();e.click();});
   assert.equal(await page.evaluate(()=>__shopCalls.length),1,'rapid click delegates once');
   await page.evaluate(()=>__finishBuy(true));
   await page.getByRole('button',{name:'Tu Tiên',exact:true}).click();assert.equal(await page.locator('.dudu-v43-market-buy button').count(),0);
   await page.getByRole('button',{name:'Ngoại Trang',exact:true}).click();assert.equal(await page.locator('.shop-r3-outfit').count(),2);assert.equal(await page.locator('.shop-r3-outfit button:disabled').count(),2);
   await page.getByRole('button',{name:'Sưu Tầm',exact:true}).click();assert.equal(await page.locator('.dudu-v43-market-tab').count(),3);
   await page.getByRole('button',{name:'Theo truyện',exact:true}).click();assert.equal(await page.locator('.dudu-v43-market-buy button').count(),0);
   await page.evaluate(()=>DuduMarketUIV43.render({...__shopConfig,stories:[{id:'qa-story',title:'QA Story',chapters:[{id:'locked',title:'Unreached chapter'}],specialItems:[{id:'qa-secret',name:'QA_SECRET_NAME',desc:'QA_SECRET_DESCRIPTION',rank:'D',type:'ITEM',scope:'CHAPTER',storyId:'qa-story',chapterId:'locked',published:true,acquisition:{method:'CHAPTER_EVENT'}}]}],readRewards:{}}));
   assert.equal(await page.locator('#shop-items-container').innerText().then(t=>/QA_SECRET/.test(t)),false,'unread metadata remains hidden');
   await page.getByRole('button',{name:'Bán Nhanh',exact:true}).click();assert.equal(await page.locator('.f34-quick-confirm').count(),1);
   await page.getByRole('button',{name:'Vật Phẩm',exact:true}).click();
   await page.evaluate(()=>DuduMarketUIV43.render({...__shopConfig,readOnly:true,saleIds:[]}));
   assert.equal(await page.locator('.dudu-v43-market-buy button:enabled').count(),0,'V52 disabled/guest contract stays read-only');
   assert.equal(await page.evaluate(()=>JSON.stringify({currency:userProfile.currency,inventory:userProfile.inventory})),before,'QA never changes wallet/inventory');
   assert.equal(await page.evaluate(()=>{const e=document.getElementById('shop-items-container');return e.scrollWidth<=e.clientWidth+1;}),true,'shop overflow '+width);
  }
  await context.close();
 }console.log('Shop '+mode+' screenshots/geometry PASS');}
 finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
