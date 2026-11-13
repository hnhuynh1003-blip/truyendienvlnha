// Actual Chromium acceptance of localhost-only G5C-P2. No Firebase, writes,
// external requests, published World or player credentials.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const {createOfflineRoleplayBrowserServer}=await import('../tools/vangioi/author-roleplay-browser-server.mjs');
 const local=await createOfflineRoleplayBrowserServer();
 const outside=[],errors=[];
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   if(route.request().url().startsWith(local.url+'/'))return route.continue();
   outside.push(route.request().url());return route.abort();
  });
  await page.goto(local.url+'/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Người tập việc địa phương/}).waitFor();
  assert.equal(await page.locator('#story').isVisible(),false);
  for(const width of [320,375,390,430,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,
    `Entry overflows ${width}px`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:/Người tập việc địa phương/}).click();
  await page.locator('#story').waitFor({state:'visible'});
  assert.match(await page.locator('#reaction').innerText(),/Con biết con nước/);
  assert.equal(await page.locator('#scene-number').innerText(),'Cảnh 1');
  await page.getByRole('button',{name:/Kéo người chèo thuyền lên trước/}).click();
  await page.getByRole('button',{name:/Nhìn về cầu cảng/}).click();
  await page.locator('#ending').waitFor({state:'visible'});
  assert.match(await page.locator('#narration').innerText(),/Người chèo thuyền được cứu/);
  assert.match(await page.locator('#ending').innerText(),/không cấp EXP/);
  for(const width of [320,375,390,430,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,
    `Ending overflows ${width}px`);
  }
  await page.getByRole('button',{name:'Thử thân phận khác'}).click();
  await page.getByRole('button',{name:/Thanh tra tín hiệu/}).click();
  // The local G4B start request is async. Wait for the new scene projection;
  // immediately reading the still-hidden old node yields empty innerText.
  await page.locator('#reaction').filter({hasText:/Thanh tra mới đến/})
   .waitFor({state:'visible'});
  assert.match(await page.locator('#reaction').innerText(),/Thanh tra mới đến/);
  await page.getByRole('button',{name:/Chạy lên giữ đèn báo hiệu/}).click();
  await page.getByRole('button',{name:/Nhìn ra cửa biển/}).click();
  await page.locator('#ending').waitFor({state:'visible'});
  assert.match(await page.locator('#narration').innerText(),/vẫn mất tích/);
  assert.deepEqual(errors,[]);
  assert.deepEqual(outside,[]);
  console.log('G5C-P2 browser: two roles, two endings, mobile widths and offline boundaries PASS');
 }finally{
  if(browser)await browser.close();
  await local.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
