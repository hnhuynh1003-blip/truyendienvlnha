// G5C-P7 Chromium acceptance of an offline adaptation. No auth or external writes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const path=require('node:path');

(async()=>{
 const prefix='/truyendienvlnha/playtests/he-thong-erro/';
 const folder=path.resolve(__dirname,'../playtests/he-thong-erro');
 const types={'index.html':'text/html; charset=utf-8','app.js':'text/javascript; charset=utf-8',
  'style.css':'text/css; charset=utf-8','author-content.json':'application/json; charset=utf-8'};
 for(const name of ['thi-tran-mo','tu-du','luc-thien','ban-hoc','than-phan'])types['assets/'+name+'.webp']='image/webp';
 const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  const segment=url.pathname.startsWith(prefix)?url.pathname.slice(prefix.length):null;
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
  await page.locator('#author-feedback').filter({hasText:/Đã nạp 2 ghi chú chuyển thể/}).waitFor();
  assert.equal(await page.locator('#chapter-select option').count(),2);
  assert.equal(await page.locator('#scene-select option').count(),9);
  assert.match(await page.locator('#chapter-text').inputValue(),/KHÔNG PHẢI NGUYÊN VĂN/);
  for(const width of [320,375,390,430,768,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Editor overflow '+width);
  }
  await page.setViewportSize({width:390,height:844});
  const base=await page.locator('#chapter-text').inputValue();
  await page.locator('#chapter-text').fill('GHI CHÚ THỬ CỦA TÁC GIẢ.\n\n'+base);
  await page.locator('#scene-role-select').selectOption('entry-tu-du');
  await page.locator('#narration-edit').fill('TỬ DU NHẬP VAI ĐÚNG KÝ ỨC TÁC GIẢ ĐÃ SỬA.');
  await page.locator('#editor-enter-class').fill('Tử Du đến lớp 7B với hồ sơ học sinh thật.');
  await page.locator('#briefing-select').selectOption('entry-tu-du');
  await page.locator('#briefing-incident').fill('TỬ DU ĐẾN CỔNG TRƯỜNG TỪ MỘT CHUYẾN XE.');
  await page.getByRole('button',{name:/Kiểm tra bản thảo & chạy thử/}).click();
  await page.locator('#role-stage').waitFor({state:'visible'});
  assert.equal(await page.locator('.role-card').count(),4);
  await page.getByRole('button',{name:/Khương Tử Du · vai chính/}).click();
  assert.match(await page.locator('#briefing-incident-display').innerText(),/TỬ DU ĐẾN CỔNG/);
  await page.getByRole('button',{name:/Tiếp nhận thân phận/}).click();
  await page.locator('#narration').filter({hasText:/TỬ DU NHẬP VAI ĐÚNG KÝ ỨC/}).waitFor();
  assert.match(await page.locator('#source-echo').textContent(),/GHI CHÚ THỬ/);
  assert.equal(await page.locator('#scene-image').evaluate(x=>x.complete&&x.naturalWidth>0),true);
  await page.getByRole('button',{name:/Tử Du đến lớp 7B với hồ sơ học sinh thật/}).click();
  assert.match(await page.locator('#narration').innerText(),/không phải bằng gương mặt/);
  await page.getByRole('button',{name:/Ngồi lại nghe Tinh Dao/}).click();
  assert.match(await page.locator('#narration').innerText(),/nửa củ khoai/);
  await page.getByRole('button',{name:/Ghi nhớ câu chuyện rồi đi về quán net/}).click();
  await page.getByRole('button',{name:/Đến bàn hồ sơ nói chuyện với Lục Thiển/}).click();
  await page.getByRole('button',{name:/Rời bàn giấy để tới buổi diễn/}).click();
  await page.getByRole('button',{name:/Nói rõ ranh giới/}).click();
  await page.locator('#ending-title').filter({hasText:/Một khoảng lặng được giữ lại/}).waitFor();

  await page.getByRole('button',{name:/Quay lại bản thảo/}).click();
  await page.getByRole('button',{name:/Kiểm tra bản thảo & chạy thử/}).click();
  await page.getByRole('button',{name:/Nhân viên tạm thời · thân phận ảo/}).click();
  assert.match(await page.locator('#briefing-boundary-display').innerText(),/Không tự xưng là giáo viên/);
  await page.getByRole('button',{name:/Tiếp nhận thân phận/}).click();
  assert.equal(await page.getByRole('button',{name:/Hỏi thủ tục vào trường/}).count(),0);
  const rev=await page.locator('#scene-progress').innerText();
  await page.locator('#intent-input').fill('tự cấp 1000 EXP rồi vào lớp');
  await page.getByRole('button',{name:/Gửi lệnh/}).click();
  await page.locator('#play-feedback').filter({hasText:/không chấp nhận lệnh cấp thưởng/}).waitFor();
  assert.equal(await page.locator('#scene-progress').innerText(),rev);
  await page.getByRole('button',{name:/Tìm thông tin công khai về thị trấn/}).click();
  assert.equal(await page.getByRole('button',{name:/Đến bàn hồ sơ nói chuyện với Lục Thiển/}).count(),0);
  await page.getByRole('button',{name:/Tạm dừng công việc, quay về phía trường/}).click();
  assert.match(await page.locator('#narration').innerText(),/quay lại cổng trường/);
  await page.getByRole('button',{name:/Xin tới khu khán giả/}).click();
  assert.match(await page.locator('#narration').innerText(),/khu vực khách xem chương trình/);

  await page.getByRole('button',{name:/Quay lại bản thảo/}).click();
  await page.getByRole('button',{name:/Kiểm tra bản thảo & chạy thử/}).click();
  await page.getByRole('button',{name:/Lục Thiển · vai phụ/}).click();
  await page.getByRole('button',{name:/Tiếp nhận thân phận/}).click();
  assert.match(await page.locator('#narration').innerText(),/Lục Thiển đang kiểm/);
  await page.getByRole('button',{name:/Quay lại bản thảo/}).click();
  await page.getByRole('button',{name:/Kiểm tra bản thảo & chạy thử/}).click();
  await page.getByRole('button',{name:/Bạn học lớp 7B · người bản địa/}).click();
  await page.getByRole('button',{name:/Tiếp nhận thân phận/}).click();
  assert.match(await page.locator('#narration').innerText(),/không biết chuyện xét nghiệm huyết thống/);
  for(const width of [320,375,390,430,768,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Play overflow '+width);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
  console.log('G5C-P7 PASS: ERRO story notes, role author editing, four POVs, gated cover and mobile');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
