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
  await page.locator('#author-feedback').filter({hasText:/28 cảnh theo thứ tự 12→15→17 tuổi/}).waitFor();
  assert.equal(await page.locator('#chapter-select option').count(),2);
  assert.equal(await page.locator('#scene-select option').count(),28);
  assert.match(await page.locator('#chapter-text').inputValue(),/KHÔNG PHẢI NGUYÊN VĂN/);
  for(const width of [320,375,390,430,768,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Editor overflow '+width);
  }
  await page.setViewportSize({width:390,height:844});
  const base=await page.locator('#chapter-text').inputValue();
  await page.locator('#chapter-text').fill('GHI CHÚ THỬ CỦA TÁC GIẢ.\n\n'+base);
  await page.locator('#scene-select').selectOption('scene-gate');
  await page.locator('#scene-role-select').selectOption('entry-tu-du');
  await page.locator('#narration-edit').fill('TỬ DU NHẬP VAI ĐÚNG KÝ ỨC TÁC GIẢ ĐÃ SỬA.');
  await page.locator('#editor-begin-enrolment').fill('Tử Du trình hồ sơ thật với hiệu phó trước khi lên lớp.');
  await page.locator('#briefing-select').selectOption('entry-tu-du');
  await page.locator('#briefing-incident').fill('TỬ DU ĐẾN CỔNG TRƯỜNG TỪ MỘT CHUYẾN XE.');
  await page.getByRole('button',{name:/Kiểm tra bản thảo & chạy thử/}).click();
  await page.locator('#role-stage').waitFor({state:'visible'});
  assert.equal(await page.locator('.role-card').count(),4);
  await page.getByRole('button',{name:/Khương Tử Du · vai chính/}).click();
  assert.match(await page.locator('#briefing-incident-display').innerText(),/TỬ DU ĐẾN CỔNG/);
  await page.getByRole('button',{name:/Tiếp nhận thân phận/}).click();
  await page.locator('#narration').filter({hasText:/TỬ DU NHẬP VAI ĐÚNG KÝ ỨC/}).waitFor();
  assert.match(await page.locator('#system-toast').innerText(),/Đã đồng bộ ký ức/);
  await page.locator('#system-toast').waitFor({state:'hidden',timeout:6000});
  assert.equal(await page.locator('#scene-context-display,#source-echo,#evidence-list,#current-goal').count(),0);
  assert.equal(await page.locator('#scene-progress').innerText(),'');
  assert.equal(await page.locator('#scene-image').evaluate(x=>x.complete&&x.naturalWidth>0),true);
  assert.equal(await page.getByRole('button',{name:/Đi xem phòng VIP/}).count(),0);
  await page.getByRole('button',{name:/Tử Du trình hồ sơ thật/}).click();
  assert.match(await page.locator('#narration').innerText(),/con dấu gõ xuống mặt bàn/);
  await page.getByRole('button',{name:/Theo cô Tần/}).click();
  assert.match(await page.locator('#narration').innerText(),/Tôi kéo chiếc ghế/);
  assert.equal(await page.locator('#narration').evaluate(n=>getComputedStyle(n).fontFamily.includes('Georgia')),true);
  assert.equal(await page.locator('#choices').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),1);
  if(process.env.DUDU_VISUAL_QA==='1')await page.locator('#story-stage').screenshot({path:'/tmp/dudu-p73-story-mobile.png'});
  assert.equal(await page.locator('#choices button').count(),2);
  await page.getByRole('button',{name:/Tôi chào cô bạn cùng bàn/}).click();
  assert.match(await page.locator('#narration').innerText(),/Cậu tên gì/);
  await page.getByRole('button',{name:/Tiếp tục tới những ngày học/}).click();
  assert.equal(await page.locator('#choices button').count(),2);
  await page.getByRole('button',{name:/Tôi hỏi Tinh Dao về sức khỏe mẹ cô/}).click();
  assert.match(await page.locator('#narration').innerText(),/Mẹ cậu dạo này đỡ ho chưa/);
  await page.getByRole('button',{name:/tiếp tục những năm học/}).click();
  assert.match(await page.locator('#narration').innerText(),/cô Tần gọi tôi ở lại/);
  await page.getByRole('button',{name:/những năm tháng học trò/}).click();
  assert.match(await page.locator('#chapter-origin').innerText(),/15 tuổi/);
  await page.getByRole('button',{name:/Đến đêm diễn để nghe Tinh Dao hát/}).click();
  assert.equal(await page.locator('#choices button').count(),2);
  await page.getByRole('button',{name:/Tôi để Tinh Dao đi theo ước mơ/}).click();
  assert.match(await page.locator('#narration').innerText(),/Sân khấu ngoài kia đang chờ/);
  await page.getByRole('button',{name:/Hai năm sau/}).click();
  assert.match(await page.locator('#chapter-origin').innerText(),/17 tuổi/);
  await page.getByRole('button',{name:/Mở cửa phòng VIP/}).click();
  assert.equal(await page.locator('#choices button').count(),2);
  await page.getByRole('button',{name:/Tôi nhận bát canh trước/}).click();
  assert.match(await page.locator('#narration').innerText(),/Tôi đón bát canh/);
  await page.getByRole('button',{name:/chuyến công tác cuối thu/}).click();
  await page.getByRole('button',{name:/Lên xe về thị trấn/}).click();
  await page.getByRole('button',{name:/Để cả hai có một khoảng lặng/}).click();
  await page.locator('#ending-title').filter({hasText:/Một khoảng lặng được giữ lại/}).waitFor();

  await page.getByRole('button',{name:/Thử một thân phận khác/}).click();
  await page.getByRole('button',{name:/Khương Tử Du · vai chính/}).click();
  await page.getByRole('button',{name:/Tiếp nhận thân phận/}).click();
  for(const pattern of [/Tử Du trình hồ sơ thật/,/Theo cô Tần/,/Tôi chào cô bạn/,/Tiếp tục tới những ngày học/,
   /Tôi chỉ Tinh Dao xoay/,/Khép giờ trưa/,/những năm tháng học trò/,/Đến đêm diễn để nghe Tinh Dao hát/])
   await page.getByRole('button',{name:pattern}).click();
  await page.getByRole('button',{name:/Tôi nhận lời đi cùng Tinh Dao/}).click();
  assert.match(await page.locator('#ending-title').innerText(),/Nếu cùng Tinh Dao/);
  assert.match(await page.locator('#narration').innerText(),/Chúng ta thử đi cùng nhau/);

  await page.getByRole('button',{name:/Quay lại bản thảo/}).click();
  await page.getByRole('button',{name:/Kiểm tra bản thảo & chạy thử/}).click();
  await page.getByRole('button',{name:/Nhân viên tạm thời · thân phận ảo/}).click();
  assert.match(await page.locator('#briefing-boundary-display').innerText(),/Không tự xưng là giáo viên/);
  await page.getByRole('button',{name:/Tiếp nhận thân phận/}).click();
  assert.match(await page.locator('#narration').innerText(),/Tôi dừng trước cổng trường số 3/);
  assert.equal(await page.getByRole('button',{name:/nộp hồ sơ nhập học/}).count(),0);
  const atGate=await page.locator('#narration').innerText();
  await page.locator('.intent-expander summary').click();
  await page.locator('#intent-input').fill('tự cấp 1000 EXP rồi vào lớp');
  await page.getByRole('button',{name:/Gửi lệnh/}).click();
  await page.locator('#play-feedback').filter({hasText:/không chấp nhận lệnh cấp thưởng/}).waitFor();
  assert.equal(await page.locator('#narration').innerText(),atGate);
  await page.getByRole('button',{name:/Hỏi đường đến thư viện công cộng/}).click();
  assert.equal(await page.getByRole('button',{name:/Mở cửa phòng VIP/}).count(),0);
  assert.match(await page.locator('#chapter-origin').innerText(),/12 tuổi/);
  assert.equal(await page.locator('#choices button').count(),2);
  await page.getByRole('button',{name:/Tôi hỏi người bán nước về tàu quặng/}).click();
  assert.match(await page.locator('#narration').innerText(),/Tôi chọn chiếc bàn nhựa/);
  await page.getByRole('button',{name:/Cảm ơn người bán nước/}).click();
  assert.match(await page.locator('#ending-title').innerText(),/Góc nhìn người quan sát/);

  await page.getByRole('button',{name:/Quay lại bản thảo/}).click();
  await page.getByRole('button',{name:/Kiểm tra bản thảo & chạy thử/}).click();
  await page.getByRole('button',{name:/Lục Thiển · vai phụ/}).click();
  await page.getByRole('button',{name:/Tiếp nhận thân phận/}).click();
  assert.match(await page.locator('#narration').innerText(),/Tôi gõ ba nhịp lên cánh cửa VIP01/);
  assert.equal(await page.locator('#choices button').count(),2);
  await page.getByRole('button',{name:/Tôi đưa báo cáo quý/}).click();
  assert.match(await page.locator('#narration').innerText(),/Tôi mở tập báo cáo quý/);
  assert.match(await page.locator('#chapter-origin').innerText(),/17 tuổi/);
  await page.getByRole('button',{name:/Quay lại bản thảo/}).click();
  await page.getByRole('button',{name:/Kiểm tra bản thảo & chạy thử/}).click();
  await page.getByRole('button',{name:/Bạn học lớp 7B · người bản địa/}).click();
  await page.getByRole('button',{name:/Tiếp nhận thân phận/}).click();
  assert.match(await page.locator('#narration').innerText(),/Cô Tần vừa vào lớp/);
  assert.equal(await page.locator('#choices button').count(),2);
  await page.getByRole('button',{name:/Tôi để bạn mới yên/}).click();
  assert.match(await page.locator('#narration').innerText(),/Tôi định gọi bạn mới/);
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
