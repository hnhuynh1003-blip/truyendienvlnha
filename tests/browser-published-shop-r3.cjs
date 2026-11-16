// Public guest UI verification only: block non-GET requests, no sign-in or purchase.
const {chromium}=require('playwright'),fs=require('node:fs/promises'),assert=require('node:assert/strict');
(async()=>{
 const base='https://hnhuynh1003-blip.github.io/truyendienvlnha/';
 const browser=await chromium.launch({headless:true,executablePath:process.env.SHOP_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const report={url:base,widths:[],writesBlocked:0};
 try{for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  await context.route('**/*',r=>{if(!['GET','HEAD'].includes(r.request().method())){report.writesBlocked++;return r.abort();}return r.continue();});
  const page=await context.newPage();await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof openPhoneApp==='function'&&!!window.DuduMarketUIV43);
  await page.evaluate(()=>{closeModals();togglePhone();openPhoneApp('shop');});
  await page.locator('.shop-r3-hero').waitFor();await page.evaluate(()=>closeModals());
  assert.equal(await page.locator('.shop-r3-groups button').count(),4);
  assert.equal(await page.locator('.dudu-v43-market-buy button:enabled').count(),0,'guest cannot purchase');
  assert.equal(await page.locator('.shop-r3-hero>img').evaluate(async i=>{await i.decode();return i.naturalWidth>0;}),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await fs.mkdir('docs/shop-r3/qa',{recursive:true});await page.screenshot({path:`docs/shop-r3/qa/published-${width}.png`});
  report.widths.push({width,status:'PASS'});await context.close();
 }await fs.writeFile('docs/shop-r3/qa/published-report.json',JSON.stringify(report,null,2)+'\n');console.log('Published Shop guest UI VERIFIED',JSON.stringify(report));}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
