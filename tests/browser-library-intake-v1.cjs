// Standalone browser smoke; no Firebase/Cloudflare/outbound requests.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {resolve}=require('node:path');
const base=resolve(__dirname,'..');

test('Library Intake author routes, revoke guard, mobile layout and Escape',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:780}});
  let external=0;
  await page.route('**/*',route=>{
   if(route.request().url()==='http://localhost/')return route.fulfill({
    contentType:'text/html',body:'<!doctype html><html><body><button id="launch">Đăng truyện</button></body></html>'});
   external++;return route.abort();
  });
  await page.goto('http://localhost/');
  await page.addStyleTag({path:resolve(base,'css/library-intake-v1.css')});
  await page.evaluate(()=>{
   window.allowed=false;window.actions=[];
   window.canEditStories=()=>window.allowed;
   window.openStoryModal=()=>window.actions.push('manual');
   window.openEpubImportV48=()=>window.actions.push('epub');
   window.DuduSiteV60={navigate:page=>window.actions.push('nav:'+page)};
   window.DuduWorldCreator={open:()=>{window.actions.push('world');return true;}};
  });
  await page.addScriptTag({path:resolve(base,'js/library-intake-v1.js')});
  await page.evaluate(()=>{
   document.querySelector('#launch').onclick=()=>window.DuduLibraryIntakeV1.open();
  });
  await page.getByRole('button',{name:'Đăng truyện'}).click();
  assert.equal(await page.locator('.dudu-library-intake-dialog[open]').count(),0);
  await page.evaluate(()=>{window.allowed=true;});
  await page.getByRole('button',{name:'Đăng truyện'}).click();
  await page.getByRole('heading',{name:'Đưa truyện vào Thư viện'}).waitFor();
  assert.equal(await page.locator('.dudu-library-intake-choice').count(),4);
  const bounds=await page.locator('.dudu-library-intake-dialog').boundingBox();
  assert.ok(bounds.x>=0&&bounds.x+bounds.width<=391);
  assert.ok(bounds.y>=0&&bounds.y+bounds.height<=781);
  const columns=await page.locator('.dudu-library-intake-grid').evaluate(x=>
   getComputedStyle(x).gridTemplateColumns.split(' ').length);
  assert.equal(columns,1);
  await page.getByRole('button',{name:/Nhập tệp EPUB/}).click();
  assert.deepEqual(await page.evaluate(()=>window.actions),['epub']);
  await page.getByRole('button',{name:'Đăng truyện'}).click();
  await page.evaluate(()=>{window.allowed=false;});
  await page.getByRole('button',{name:/Viết truyện theo chương/}).click();
  assert.deepEqual(await page.evaluate(()=>window.actions),['epub']);
  await page.evaluate(()=>{window.allowed=true;});
  await page.getByRole('button',{name:'Đăng truyện'}).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.dudu-library-intake-dialog[open]').count(),0);
  assert.equal(external,0);
 }finally{await browser.close();}
});
