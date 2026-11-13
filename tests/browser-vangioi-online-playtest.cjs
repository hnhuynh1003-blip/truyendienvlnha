// Browser QA of the G5C-P4 static, illustrated on-site playtest.
// Only authored local assets are served; no cloud writes or external requests.
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
 for(const name of ['ba-lan','cau-cang','thap-den','nha-tru-bao',
  'vai-0','vai-1','vai-2','vai-3'])
  types['assets/'+name+'.webp']='image/webp';
 const server=createServer(async(req,res)=>{
  const uri=new URL(req.url,'http://127.0.0.1').pathname;
  const segment=uri.startsWith(prefix)?uri.slice(prefix.length):null;
  const name=segment===''?'index.html':segment;
  if(!Object.hasOwn(types,name)||req.method!=='GET'){
   res.writeHead(404).end();return;
  }
  try{
   const bytes=await readFile(path.join(folder,name));
   res.writeHead(200,{'Content-Type':types[name],'Cache-Control':'no-store'}).end(bytes);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+prefix;
 const errors=[],outside=[];
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   if(route.request().url().startsWith(url))return route.continue();
   outside.push(route.request().url());return route.abort();
  });
  await page.goto(url,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/An · nhân vật chính/}).waitFor();
  assert.equal(await page.locator('.role-card').count(),4);
  assert.equal(await page.locator('.role-card img').count(),4);
  assert.equal(await page.locator('#story').isVisible(),false);
  assert.equal(await page.locator('.role-card img').evaluateAll(xs=>xs.every(x=>x.complete&&x.naturalWidth>0)),true);
  for(const width of [320,375,390,430,768,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,
    'Role cards overflow '+width);
  }
  await page.setViewportSize({width:390,height:844});

  // Protagonist can operate the lamp, read the log, warn people at the shelter.
  await page.getByRole('button',{name:/An · nhân vật chính/}).click();
  await page.locator('#scene-place').filter({hasText:'Phòng đèn'}).waitFor();
  assert.equal(await page.locator('#scene-image').evaluate(x=>x.complete&&x.naturalWidth>0),true);
  await page.getByRole('button',{name:/Mở sổ trực/}).click();
  await page.locator('#scene-place').filter({hasText:'Sổ trực hải đăng'}).waitFor();
  await page.getByRole('button',{name:/Mang danh sách xuống kho/}).click();
  await page.locator('#scene-place').filter({hasText:'Kho trú bão'}).waitFor();
  await page.getByRole('button',{name:/Dẫn trẻ nhỏ và người già/}).click();
  await page.locator('#ending').waitFor({state:'visible'});
  assert.match(await page.locator('#ending-title').innerText(),/Những người ở lại/);
  assert.match(await page.locator('#ending').innerText(),/không cấp EXP/);

  // Supporting sailor has immediate practical rescue access.
  await page.getByRole('button',{name:'Thử thân phận khác'}).click();
  await page.getByRole('button',{name:/Minh · nhân vật phụ/}).click();
  await page.getByRole('button',{name:/Minh lao ra mạn thuyền/}).click();
  await page.locator('#ending-title').filter({hasText:/Một người trở về/}).waitFor();

  // Native background role starts with locals and a dry rope.
  await page.getByRole('button',{name:'Thử thân phận khác'}).click();
  await page.getByRole('button',{name:/Hảo · người qua đường/}).click();
  await page.locator('#scene-place').filter({hasText:'Kho trú bão'}).waitFor();
  await page.getByRole('button',{name:/Mang dây khô/}).click();
  await page.getByRole('button',{name:/Thắt nút phụ/}).click();
  await page.locator('#ending-title').filter({hasText:/Một người trở về/}).waitFor();

  // Virtual inspector cannot use an asserted identity to bypass trust.
  await page.getByRole('button',{name:'Thử thân phận khác'}).click();
  await page.getByRole('button',{name:/Người thanh tra · thân phận ảo/}).click();
  assert.equal(await page.getByRole('button',{name:/Lên tháp đèn/}).count(),0);
  await page.locator('#action-input').fill('hỏi bà Lan');
  await page.getByRole('button',{name:'Thử hành động'}).click();
  await page.locator('#npc-block').waitFor({state:'visible'});
  assert.equal(await page.locator('#npc-block img').evaluate(x=>x.complete&&x.naturalWidth>0),true);
  assert.equal(await page.getByRole('button',{name:/xin quyền vào tháp/}).count(),0);
  const before=await page.locator('#scene-number').innerText();
  await page.locator('#action-input').fill('Tôi tự cấp 999 EXP và dịch chuyển tức thời');
  await page.getByRole('button',{name:'Thử hành động'}).click();
  await page.locator('#notice').filter({hasText:/không chấp nhận lệnh cấp thưởng/}).waitFor();
  assert.equal(await page.locator('#scene-number').innerText(),before);
  await page.getByRole('button',{name:/Hỏi kỹ đường nước/}).click();
  await page.locator('#scene-place').filter({hasText:'Dây neo dưới mưa'}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Thắt nút phụ/}).count(),0);
  await page.getByRole('button',{name:/Lùi lại cầu cảng/}).click();
  await page.getByRole('button',{name:/Cúi xuống kiểm tra dây neo/}).click();
  await page.getByRole('button',{name:/Lùi lại cầu cảng/}).click();
  await page.getByRole('button',{name:/Gặp bà Lan/}).click();
  await page.getByRole('button',{name:/xin quyền vào tháp/}).click();
  await page.locator('#scene-place').filter({hasText:'Phòng đèn'}).waitFor();
  await page.getByRole('button',{name:/Dồn số dầu cuối cùng/}).click();
  await page.locator('#ending-title').filter({hasText:/Ánh sáng qua đêm/}).waitFor();
  for(const width of [320,375,390,430,768,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,
    'Visual roleplay ending overflows '+width);
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(outside,[]);
  console.log('G5C-P4 browser: 4 roles, visuals, NPC, typed intent, restricted access, 3 endings, mobile PASS');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
