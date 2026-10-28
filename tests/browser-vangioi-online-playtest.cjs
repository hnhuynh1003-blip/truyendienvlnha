// Chromium QA for G5C-P3 static public demo under the GitHub Pages repo prefix.
// Host below serves ONLY authored static assets. No external traffic or writes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const path=require('node:path');

(async()=>{
 const prefix='/truyendienvlnha/playtests/ben-suong/';
 const folder=path.resolve(__dirname,'../playtests/ben-suong');
 const types={'index.html':'text/html; charset=utf-8','app.js':'text/javascript; charset=utf-8',
  'style.css':'text/css; charset=utf-8','demo-content.json':'application/json; charset=utf-8'};
 const server=createServer(async(req,res)=>{
  const name=new URL(req.url,'http://127.0.0.1').pathname;
  const segment=name.startsWith(prefix)?name.slice(prefix.length):null;
  const file=segment===''?'index.html':segment;
  if(!Object.hasOwn(types,file)||req.method!=='GET'){
   res.writeHead(404).end();return;
  }
  try{
   const bytes=await readFile(path.join(folder,file));
   res.writeHead(200,{'Content-Type':types[file],'Cache-Control':'no-store'}).end(bytes);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const url=base+prefix;
 const errors=[],outside=[];
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const request=route.request();
   if(request.url().startsWith(url))return route.continue();
   outside.push(request.url());return route.abort();
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Người tập việc địa phương/}).waitFor();
  assert.equal(await page.locator('#story').isVisible(),false);
  for(const width of [320,375,390,430,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,
    `Public entry overflows ${width}px`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:/Người tập việc địa phương/}).click();
  await page.locator('#reaction').filter({hasText:/Con biết con nước/}).waitFor({state:'visible'});
  await page.getByRole('button',{name:/Kéo người chèo thuyền lên trước/}).click();
  await page.getByRole('button',{name:/Nhìn về cầu cảng/}).click();
  await page.locator('#ending').waitFor({state:'visible'});
  assert.match(await page.locator('#narration').innerText(),/Người chèo thuyền được cứu/);
  assert.match(await page.locator('#ending').innerText(),/không cấp EXP/);
  for(const width of [320,375,390,430,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,
    `Public ending overflows ${width}px`);
  }
  await page.getByRole('button',{name:'Thử thân phận khác'}).click();
  await page.getByRole('button',{name:/Thanh tra tín hiệu/}).click();
  await page.locator('#reaction').filter({hasText:/Thanh tra mới đến/}).waitFor({state:'visible'});
  await page.getByRole('button',{name:/Chạy lên giữ đèn báo hiệu/}).click();
  await page.getByRole('button',{name:/Nhìn ra cửa biển/}).click();
  await page.locator('#ending').waitFor({state:'visible'});
  assert.match(await page.locator('#narration').innerText(),/vẫn mất tích/);
  assert.deepEqual(errors,[]);
  assert.deepEqual(outside,[]);
  console.log('G5C-P3 Pages static demo: G4A/B real choices, two roles, mobile, CSP PASS');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
