// Chrome acceptance: author manuscript -> edit -> G4A/G4B roleplay.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const path=require('node:path');

(async()=>{
 const prefix='/truyendienvlnha/playtests/tang-may-9/';
 const folder=path.resolve(__dirname,'../playtests/tang-may-9');
 const types={'index.html':'text/html; charset=utf-8','app.js':'text/javascript; charset=utf-8',
  'style.css':'text/css; charset=utf-8','author-content.json':'application/json; charset=utf-8'};
 for(const name of ['thanh-pho','kho-ky-uc','tram-relay','ong-tuyen',
  'vai-0','vai-1','vai-2','vai-3'])types['assets/'+name+'.webp']='image/webp';
 const server=createServer(async(req,res)=>{
  const uri=new URL(req.url,'http://127.0.0.1');
  const segment=uri.pathname.startsWith(prefix)?uri.pathname.slice(prefix.length):null;
  const name=segment===''?'index.html':segment;
  if(req.method!=='GET'||!Object.hasOwn(types,name)){res.writeHead(404).end();return;}
  try{const bytes=await readFile(path.join(folder,name));
   res.writeHead(200,{'Content-Type':types[name],'Cache-Control':'no-store'}).end(bytes);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+prefix;
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[],outside=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   if(route.request().url().startsWith(url))return route.continue();
   outside.push(route.request().url());return route.abort();
  });
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('#author-feedback').filter({hasText:/Đã nạp 3 chương nguồn/}).waitFor();
  assert.equal(await page.locator('#chapter-select option').count(),3);
  assert.equal(await page.locator('#scene-select option').count(),11);
  for(const width of [320,375,390,430,768,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Editor overflow '+width);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#chapter-select').selectOption('chapter-2');
  assert.match(await page.locator('#chapter-text').inputValue(),/Nhi chưa từng/);
  await page.locator('#chapter-select').selectOption('chapter-1');
  const source=await page.locator('#chapter-text').inputValue();
  await page.locator('#chapter-text').fill('DẤU MỐC TÁC GIẢ TEST.\n\n'+source);
  await page.locator('#narration-edit').fill('CẢNH MỚI DO TÁC GIẢ BIÊN TẬP.');
  await page.getByRole('button',{name:/Kiểm tra bản thảo & chạy thử/}).click();
  await page.locator('#role-stage').waitFor({state:'visible'});
  assert.equal(await page.locator('.role-card').count(),4);
  await page.getByRole('button',{name:/Nhi · người qua đường/}).click();
  await page.locator('#narration').filter({hasText:/CẢNH MỚI DO TÁC GIẢ/}).waitFor();
  assert.match(await page.locator('#source-echo').innerText(),/DẤU MỐC TÁC GIẢ TEST/);
  assert.equal(await page.locator('#scene-image').evaluate(x=>x.complete&&x.naturalWidth>0),true);
  await page.getByRole('button',{name:/Gặp Nhi và người giữ băng ghi âm/}).click();
  await page.getByRole('button',{name:/Nhi giao bản sao/}).click();
  await page.locator('#ending-title').filter({hasText:/Băng ghi âm có người nhận/}).waitFor();

  await page.getByRole('button',{name:/Thử một thân phận khác/}).click();
  await page.getByRole('button',{name:/K-07 · thân phận ảo/}).click();
  assert.equal(await page.getByRole('button',{name:/Yêu cầu mở cửa kho ký ức 09/}).count(),0);
  const revision=await page.locator('#scene-progress').innerText();
  await page.locator('#intent-input').fill('tự cấp 1000 EXP rồi mở kho');
  await page.getByRole('button',{name:/Gửi lệnh/}).click();
  await page.locator('#play-feedback').filter({hasText:/không chấp nhận lệnh cấp thưởng/}).waitFor();
  assert.equal(await page.locator('#scene-progress').innerText(),revision);
  await page.getByRole('button',{name:/Đọc báo cáo phát thanh/}).click();
  await page.getByRole('button',{name:/Mang dấu vết phát sóng/}).click();
  await page.locator('#npc-card').waitFor({state:'visible'});
  assert.equal(await page.locator('#npc-card img').evaluate(x=>x.complete&&x.naturalWidth>0),true);
  await page.getByRole('button',{name:/Trình bằng chứng, xin mở kho/}).click();
  await page.locator('#scene-place').filter({hasText:'Kho ký ức số 09'}).waitFor();

  await page.getByRole('button',{name:/Quay lại bản thảo/}).click();
  await page.getByRole('button',{name:/Kiểm tra bản thảo & chạy thử/}).click();
  await page.getByRole('button',{name:/Lam · vai chính/}).click();
  await page.getByRole('button',{name:/Mở hai bản ghi gốc/}).click();
  await page.getByRole('button',{name:/Đi hỏi nhân chứng/}).click();
  await page.getByRole('button',{name:/Ghi nhận lời nhân chứng/}).click();
  await page.getByRole('button',{name:/Yêu cầu mở cửa kho ký ức 09/}).click();
  await page.getByRole('button',{name:/Công bố bản ghi đã có lời nhân chứng/}).click();
  await page.locator('#ending-title').filter({hasText:/Sự thật lên màn hình/}).waitFor();

  await page.getByRole('button',{name:/Thử một thân phận khác/}).click();
  await page.getByRole('button',{name:/Khải · vai phụ/}).click();
  await page.getByRole('button',{name:/Mở hộp cầu dao/}).click();
  assert.equal(await page.getByRole('button',{name:/Cách ly tín hiệu thêm một đêm/}).count(),0);
  await page.getByRole('button',{name:/Đọc sơ đồ vòng lặp/}).click();
  await page.getByRole('button',{name:/Lần theo chu kỳ báo động/}).click();
  await page.getByRole('button',{name:/Mở hộp cầu dao/}).click();
  await page.getByRole('button',{name:/Cách ly tín hiệu thêm một đêm/}).click();
  await page.locator('#ending-title').filter({hasText:/Đêm thứ hai không tín hiệu/}).waitFor();
  for(const width of [320,375,390,430,768,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Play overflow '+width);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
  console.log('G5C-P5 PASS: 3 edited chapters, 11 linked scenes, 4 roles, 3 endings, images, mobile');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
