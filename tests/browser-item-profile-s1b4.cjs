// S1-B4: isolated Shop/Inventory UI at 320 / 355 / 390 / 430 px.
// No production auth, backend, Xu or inventory writes.
'use strict';
const {chromium}=require('playwright');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');

test('S1-B4 Shop and Kho item profiles / appearance placeholders',async()=>{
  const base=path.resolve(__dirname,'..');
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.route('https://s1b4.local/**',async route=>{
      const requestPath=new URL(route.request().url()).pathname;
      if(!/^\/assets\/shop-r3\/(thanh-van|banner-bg)\.webp$/.test(requestPath))
        return route.abort();
      await route.fulfill({status:200,contentType:'image/webp',
        body:await fs.readFile(path.join(base,requestPath.slice(1)))});
    });
    await page.setContent('<base href="https://s1b4.local/"><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<style>body{margin:0;color:#fff;background:#101725}.dudu-phone-v11 #cyber-phone{display:flex;flex-direction:column;width:min(100%,430px);box-sizing:border-box}#shop-items-container{min-width:0}#phone-app-inventory{display:flex;flex-direction:column}</style>'+
      '<main id="cyber-phone"><section id="shop-items-container"></section>'+
      '<section id="phone-app-inventory"><div id="inventory-v2-toolbar"></div>'+
      '<div id="inventory-v12-detail"></div><div id="inventory-container"></div></section></main>');
    await page.evaluate(()=>document.body.classList.add('dudu-phone-v11'));
    for(const file of ['market-v43.css','inventory-v42.css','item-profile-s1b4.css'])
      await page.addStyleTag({path:path.join(base,'css',file)});
    for(const file of ['world-items-v44-1','card-blanks-f44','item-catalog-v2',
      'economy-core-v43','inventory-model-v42','item-profile-s1b4',
      'market-ui-v43','inventory-view-v42'])
      await page.addScriptTag({path:path.join(base,'js',file+'.js')});
    await page.evaluate(()=>{
      const core=window.DuduEconomyCoreV43;
      window.__s1b4Buys=[];
      window.__s1b4Render=()=>window.DuduMarketUIV43.render({
        host:document.getElementById('shop-items-container'),
        personalMode:true,coins:5000,
        saleIds:[...core.SHOP_IDS,core.TOOL_ID,core.SUPPLY_ID,core.PULSE_ID],
        inventory:[],onBuy:async id=>window.__s1b4Buys.push(id)});
      window.__s1b4Render();
    });
    assert.equal(await page.locator('.dudu-v43-market-buy button:enabled').count(),15,
      '15 existing eligible SKU still rendered');
    const first=page.locator('.dudu-v43-market-icon').first();
    await first.click();
    assert.equal(await page.locator('.shop-r3-dialog .s1b4-profile-row').count(),9);
    assert.equal(await page.locator('.shop-r3-dialog').getByText('Nguồn định nghĩa').count(),1);
    await page.locator('.shop-r3-dialog>button').click();
    await page.locator('.shop-r3-groups button').filter({hasText:'Ngoại Hình'}).click();
    assert.equal(await page.locator('.s1b4-appearance-card').count(),3);
    const badges=await page.locator('.s1b4-appearance-label').allTextContents();
    assert.deepEqual(badges,['PLACEHOLDER','EXISTING','ART_PENDING']);
    assert.equal(await page.locator('.s1b4-appearance-card [data-buy]').count(),0);
    const existing=page.locator('[data-visual-status="EXISTING"] img');
    await existing.evaluate(async img=>{await img.decode();});
    assert.equal(await existing.evaluate(img=>img.naturalWidth>0),true);
    for(const width of [320,355,390,430]){
      await page.setViewportSize({width,height:844});
      const boxes=await page.locator('.s1b4-appearance-card').evaluateAll(els=>
        els.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};}));
      assert.ok(boxes.every(b=>b.width>0&&b.left>=-2&&b.right<=width+2),
        'preview cards fit narrow width '+width);
    }
    const one=page.locator('.s1b4-appearance-visual').first();
    await one.click();
    assert.equal(await page.locator('.shop-r3-dialog').getByText('appearanceId').count(),1);
    assert.equal(await page.locator('.shop-r3-dialog').getByText('Chỉ xem trước · Không tạo giao dịch hoặc lựa chọn').count(),1);
    await page.locator('.shop-r3-dialog>button').click();
    assert.deepEqual(await page.evaluate(()=>window.__s1b4Buys),[],'preview must never grant or buy');
    await page.evaluate(()=>{
      const core=DuduEconomyCoreV43;
      const p=core.shopCatalog()[0];
      window.__s1b4Inventory=[{...p,instanceId:'receipt-original',
        obtainedFrom:{kind:'SHOP',source:'DUDU_MARKET'}}];
      window.__s1b4ViewArgs={inventory:window.__s1b4Inventory,
        selected:window.__s1b4Inventory[0],stories:[],personalMode:true,
        onClose(){},onSelect(){},coins:0};
      DuduInventoryViewV42.render(window.__s1b4ViewArgs);
    });
    assert.equal(await page.locator('#inventory-v42-modal').getAttribute('aria-hidden'),'false');
    assert.equal(await page.locator('.dudu-v42-inspector-facts').getByText('receipt-original').count(),1);
    assert.equal(await page.locator('.dudu-v42-inspector-facts').getByText(/bản ghi chưa đối soát máy chủ/).count(),1);
    assert.equal(await page.evaluate(()=>__s1b4Inventory[0].instanceId),'receipt-original');
    console.log('S1-B4 browser PASS: 15 SKU, shared profile, no purchase, preview cards and 4 mobile widths.');
  }finally{await browser.close();}
});
