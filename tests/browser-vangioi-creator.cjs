// Real main HTML/JS + local IndexedDB; fake Firebase, no production writes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const firebase=require('./fixtures/creator-firebase.cjs');
(async()=>{
 const root=path.resolve(__dirname,'..'),errors=[],networkWrites=[];
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname),url.pathname.endsWith('/')?'index.html':'');
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end();return;}
   res.writeHead(200,{'content-type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8'}).end(bytes);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser,page;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,serviceWorkers:'block'});page=await context.newPage();
  const base='http://127.0.0.1:'+server.address().port;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const r=route.request(),url=r.url();
   if(url.startsWith(base+'/')){await route.continue();return;}
   if(r.method()!=='GET')networkWrites.push(url);
   if(url.startsWith('https://www.gstatic.com/firebasejs/')){
    await route.fulfill({status:200,contentType:'application/javascript',body:url.includes('firebase-app-compat')?'('+firebase.toString()+')();':''});return;
   }
   await route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.DuduWorldCreator&&!!window.DuduSystemAppsV69&&!!window.DuduAuth);
  assert.equal(await page.evaluate(()=>IS_SANDBOX_MODE),false);
  assert.equal(await page.evaluate(()=>DuduWorldCreator.mount(document.getElementById('dudu-v69-core-view'))),false);
  await page.evaluate(()=>__creatorLogin('creator-reader',false));
  assert.equal(await page.evaluate(()=>DuduSystemAppsV69.isAuthor()),false);
  await page.evaluate(()=>__creatorLogin('creator-owner-a',true));
  await page.waitForFunction(()=>DuduSystemAppsV69.isAuthor());
  const launch=async()=>{
   await page.evaluate(()=>{if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();openPhoneApp('core-console');});
   await page.getByRole('button',{name:'MỞ BẢN SOẠN WORLD',exact:true}).click();
   await page.locator('#dudu-world-creator').waitFor();
  };
  await launch();
  const editor=page.locator('#dudu-world-creator');
  assert.equal(await editor.getByRole('button',{name:'Gửi duyệt',exact:true}).isDisabled(),true);
  const secret='CREATOR_PRIVATE_A';
  await editor.getByLabel('Tên tiểu thế giới',{exact:true}).fill('Một căn phòng');
  await editor.getByLabel('Thể loại',{exact:true}).selectOption('era');
  await editor.getByLabel('Bậc đề nghị',{exact:true}).selectOption('S');
  await editor.getByLabel('Sự thật ẩn · chỉ dành cho tác giả',{exact:true}).fill(secret);
  await editor.getByRole('button',{name:'Lưu trên thiết bị',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('vg-save-state').textContent.includes('Đã lưu'));
  await editor.getByRole('button',{name:'Địa điểm & cảnh',exact:true}).click();
  await editor.getByRole('button',{name:'+ Thêm địa điểm',exact:true}).click();
  await editor.getByLabel('Tên địa điểm',{exact:true}).fill('Phòng phía Đông');
  await editor.getByRole('button',{name:'+ Thêm cảnh',exact:true}).click();
  await editor.getByLabel('Mô tả cảnh',{exact:true}).fill('Một lá thư trên bàn.');
  await editor.getByRole('button',{name:'Xem trước',exact:true}).click();
  await editor.getByLabel('Cảnh xem trước',{exact:true}).selectOption({label:'Một lá thư trên bàn.'});
  assert.match(await editor.locator('#vg-scene-preview').innerText(),/Phòng phía Đông/);
  await editor.getByRole('button',{name:'Lưu trên thiết bị',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('vg-save-state').textContent.includes('Đã lưu'));
  await editor.getByRole('button',{name:'Kiểm tra hồ sơ',exact:true}).click();
  assert.match(await editor.locator('#vg-report').innerText(),/Cần chỉnh/);
  assert.equal((await editor.locator('#vg-report').innerText()).includes(secret),false);
  await editor.getByRole('button',{name:'Thông tin',exact:true}).click();
  await editor.getByLabel('Ý tưởng trong một câu',{exact:true}).fill('<img src=x onerror="window.__creatorXss=1">');
  await editor.getByRole('button',{name:'Lưu trên thiết bị',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('vg-save-state').textContent.includes('Đã lưu'));
  await editor.locator('.vg-files summary').click();
  const downloadEvent=page.waitForEvent('download');await editor.getByRole('button',{name:'Xuất JSON',exact:true}).click();
  const download=await downloadEvent,content=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(content.requestedWorldRank,'S');assert.equal(content.story.secretTruth,secret);
  assert.equal(content.places[0].sceneIds[0],content.scenes[0].sceneId);
  assert.equal('ownerUid' in content,false);assert.equal('status' in content,false);
  assert.equal(await page.evaluate(()=>window.__creatorXss||0),0);
  // Bad imports preserve the current model and do not trust authority metadata.
  await editor.locator('#vg-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...content,status:'approved'}))});
  await page.waitForFunction(()=>document.getElementById('vg-message').textContent.includes('sai định dạng'));
  await editor.getByLabel('Tên tiểu thế giới',{exact:true}).waitFor();
  assert.equal(await editor.getByLabel('Tên tiểu thế giới',{exact:true}).inputValue(),'Một căn phòng');
  await editor.locator('#vg-import').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(content))});
  await page.waitForFunction(()=>document.getElementById('vg-message')?.textContent.includes('Đã nhập nội dung'));
  assert.equal(await editor.getByLabel('Sự thật ẩn · chỉ dành cho tác giả',{exact:true}).inputValue(),secret);
  // Verify responsive content does not overflow horizontally on phone widths.
  for(const width of [320,375,390,430,1280]){
   await page.setViewportSize({width,height:900});
   assert.equal(await editor.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'Creator overflow at '+width);
  }
  if(process.env.CREATOR_QA_DIR){
   fs.mkdirSync(process.env.CREATOR_QA_DIR,{recursive:true});
   for(const width of [390,1280]){
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>document.getElementById('dudu-v69-core-view').scrollTop=0);
    await page.locator('#cyber-phone').screenshot({path:path.join(process.env.CREATOR_QA_DIR,'creator-'+width+'.png')});
   }
  }
  // Returning through the AU shell keeps the in-session draft.
  await editor.getByRole('button',{name:'‹ Chủ Thần AU',exact:true}).click();
  await page.getByRole('button',{name:'MỞ BẢN SOẠN WORLD',exact:true}).click();
  assert.equal(await editor.getByLabel('Sự thật ẩn · chỉ dành cho tác giả',{exact:true}).inputValue(),secret);
  // UID swap clears old DOM, old memory and filters local IndexedDB ownership.
  await page.evaluate(()=>__creatorLogin('creator-owner-b',true));
  assert.equal(await page.locator('#dudu-world-creator').count(),0);
  assert.equal((await page.locator('body').innerText()).includes(secret),false);
  await launch();
  assert.equal(await editor.getByLabel('Tên tiểu thế giới',{exact:true}).inputValue(),'');
  await editor.locator('.vg-files summary').click();await editor.getByRole('button',{name:'Mở nháp đã lưu',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('vg-local-list').textContent.includes('Chưa có'));
  // Sign back in, open the old UID's persisted draft, no migration or mix-up.
  await page.evaluate(()=>__creatorLogin('creator-owner-a',true));await launch();
  await editor.locator('.vg-files summary').click();await editor.getByRole('button',{name:'Mở nháp đã lưu',exact:true}).click();
  await editor.locator('#vg-local-list').getByRole('button',{name:'Một căn phòng',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('vg-message')?.textContent.includes('Đã mở bản nháp'));
  assert.equal(await editor.getByLabel('Sự thật ẩn · chỉ dành cho tác giả',{exact:true}).inputValue(),secret);
  // Editing raw JSON cannot silently save the previous form snapshot.
  await editor.getByRole('button',{name:'Dữ liệu nâng cao',exact:true}).click();
  await editor.getByLabel('JSON nội dung',{exact:true}).fill('{');
  await editor.getByRole('button',{name:'Lưu trên thiết bị',exact:true}).click();
  assert.match(await editor.locator('#vg-message').innerText(),/Áp dụng hoặc hoàn tác/);
  await editor.getByRole('button',{name:'Áp dụng JSON',exact:true}).click();
  assert.match(await editor.locator('#vg-message').innerText(),/JSON chưa hợp lệ/);
  await editor.getByRole('button',{name:'Hoàn tác phần JSON đang sửa',exact:true}).click();
  await editor.getByLabel('JSON nội dung',{exact:true}).fill(JSON.stringify({...content,endings:[{endingId:'ending-json',title:'Kết cục từ JSON'}]}));
  await editor.getByRole('button',{name:'Áp dụng JSON',exact:true}).click();
  await editor.getByRole('button',{name:'Thông tin',exact:true}).click();
  assert.equal(await editor.getByLabel('Tên tiểu thế giới',{exact:true}).inputValue(),'Một căn phòng');
  assert.equal(await editor.getByLabel('Sự thật ẩn · chỉ dành cho tác giả',{exact:true}).inputValue(),secret);
  // Save failure keeps content; no fake success and no external fallback writes.
  await editor.getByLabel('Tên tiểu thế giới',{exact:true}).fill('Chưa lưu do lỗi');
  await page.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw Error('Synthetic quota failure');};});
  await editor.getByRole('button',{name:'Lưu trên thiết bị',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('vg-message').textContent.includes('Không lưu được'));
  assert.match(await editor.locator('#vg-save-state').innerText(),/chưa lưu/);
  await page.evaluate(()=>__creatorLogin(null));
  assert.equal(await page.locator('#dudu-world-creator').count(),0);
  assert.equal(await page.evaluate(()=>DuduWorldCreator.mount(document.getElementById('dudu-v69-core-view'))),false);
  assert.deepEqual(await page.evaluate(()=>__creatorWrites),[]);assert.deepEqual(networkWrites,[]);assert.deepEqual(errors,[]);
  console.log('PASS Creator main UI: forms, local storage, import/export, private UID isolation, raw JSON, quota failure, 320–1280px; no live writes');
 }catch(error){
  if(process.env.CREATOR_QA_DIR&&page){fs.mkdirSync(process.env.CREATOR_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.CREATOR_QA_DIR,'creator-failure.png'),fullPage:true});}
  throw error;
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
