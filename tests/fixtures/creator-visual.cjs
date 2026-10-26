// Synthetic PNG fixtures and a visual-authoring journey; no production art/data.
const assert=require('node:assert/strict'),fs=require('node:fs'),{deflateSync}=require('node:zlib'),{createHash}=require('node:crypto');
function chunk(type,data){
 const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);out.write(type,4);data.copy(out,8);
 let crc=0xffffffff;for(const byte of out.subarray(4,-4)){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;
}
function fixture(broken=false){
 const width=480,height=240,ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 const rows=Buffer.alloc((width*4+1)*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*(width*4+1)+1+x*4,c=x<width/2?[24,58,100,255]:[215,175,90,255];for(let k=0;k<4;k++)rows[i+k]=c[k];
 }
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',broken?Buffer.from('not-zlib'):deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
module.exports=async function visualCreator({page,editor,secret}){
 const png=fixture(),hash=createHash('sha256').update(png).digest('hex');
 const tab=async name=>editor.getByRole('button',{name,exact:true}).click();
 const fill=async(scope,name,value)=>scope.getByLabel(name,{exact:true}).fill(value);
 const select=async(scope,name,value)=>scope.getByLabel(name,{exact:true}).selectOption(value);
 const click=async(scope,name)=>scope.getByRole('button',{name,exact:true}).click();
 const rows=kind=>editor.locator('[data-vg-kind="'+kind+'"]');
 const upload=async(row,bytes)=>row.getByLabel('Chọn PNG xem thử',{exact:true}).setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:bytes});
 await tab('Nguồn & ảnh');let room=editor.locator('.vg-card').nth(1);
 await upload(room,png);await page.waitForFunction(()=>document.getElementById('vg-message').textContent.includes('không trùng hash'));
 assert.equal(await room.getByLabel('Hash nội dung ảnh',{exact:true}).inputValue(),'b'.repeat(64));
 await fill(room,'Hash nội dung ảnh','');await upload(room,png);
 await page.waitForFunction(()=>document.getElementById('vg-message').textContent.includes('Đã mở ảnh xem thử'));
 assert.equal(await room.getByLabel('Hash nội dung ảnh',{exact:true}).inputValue(),hash);
 await fill(room,'Điểm lấy khung X (0–1)','0.8');await fill(room,'Điểm lấy khung Y (0–1)','0.3');
 await click(editor,'+ Thêm tham chiếu ảnh');let sprite=editor.locator('.vg-card').last();
 await fill(sprite,'Mã asset','art-sprite-local');await select(sprite,'Loại hình ảnh','characterSprite');
 await fill(sprite,'Phiên bản asset','v1');await fill(sprite,'Mô tả ngắn, tránh lộ bí mật','Nhân vật thử');
 await upload(sprite,fixture(true));await page.waitForFunction(()=>document.getElementById('vg-message').textContent.includes('không giải mã được'));
 assert.equal(await sprite.getByLabel('Hash nội dung ảnh',{exact:true}).inputValue(),'');
 await upload(sprite,Buffer.from('<svg onload="window.__imageXss=1"/>'));
 await page.waitForFunction(()=>document.getElementById('vg-message').textContent.includes('PNG không hợp lệ'));
 assert.equal(await page.evaluate(()=>window.__imageXss||0),0);
 await upload(sprite,png);await page.waitForFunction(()=>document.getElementById('vg-message').textContent.includes('Đã mở ảnh xem thử'));
 assert.equal(await sprite.getByLabel('Hash nội dung ảnh',{exact:true}).inputValue(),hash);
 await tab('Tạo hình & bố cục');
 await fill(editor,'Bảng màu · mỗi dòng một ý','Xanh đêm\nVàng giấy');await fill(editor,'Dấu mốc nhận diện · mỗi dòng một ý','Bàn nhận thư');
 await fill(editor,'Bầu không khí','Yên tĩnh, bí ẩn');await fill(editor,'Phong cách hình ảnh','Minh họa màu nước');
 await click(editor,'+ Thêm hồ sơ tạo hình');const visual=rows('visual').first();
 await select(visual,'Nhân vật tạo hình',{label:'Người giữ thư'});await select(visual,'Mức ưu tiên tạo hình','signature');
 await fill(visual,'Ghi chú nhận diện nhân vật','Dáng đứng thẳng.');await fill(visual,'Đặc điểm cố định · mỗi dòng một ý','Áo xanh\nTúi thư');
 await click(visual,'+ Thêm biến thể tạo hình');const variant=rows('visual-variant').first();
 await select(variant,'Dạng tạo hình','sprite');await select(variant,'Ảnh của tạo hình','art-sprite-local');await fill(variant,'Biểu cảm','Bình tĩnh');
 await fill(variant,'Tư thế','Đứng');await fill(variant,'Nhãn trang phục','courier');await fill(variant,'Mốc thời gian tạo hình','opening');
 await click(editor,'+ Thêm lần xuất hiện');const appearance=rows('appearance').first();
 await select(appearance,'Nhân vật xuất hiện',{label:'Người giữ thư'});await select(appearance,'Góc nhìn xuất hiện',{label:'Bàn nhận thư'});
 await select(appearance,'Biến thể xuất hiện',{label:'Nhân vật trong cảnh · Bình tĩnh'});
 await select(appearance,'Lúc hiện nhân vật','event_flag');await fill(appearance,'Cờ kích hoạt xuất hiện','portrait_ready');
 await select(appearance,'Lúc hiện nhân vật','dialogue_start');await select(appearance,'Lời thoại kích hoạt',{label:'Con dấu thuộc bưu cục phía Đông.'});
 await select(appearance,'Lúc ẩn nhân vật','dialogue_end');await fill(appearance,'Cờ cần có khi xuất hiện','heard-seal');await fill(appearance,'Cờ cấm khi xuất hiện','hidden-face');
 await select(appearance,'Neo bố cục','custom');await fill(appearance,'Vị trí nhân vật X (0–1)','0.25');await fill(appearance,'Vị trí nhân vật Y (0–1)','0.9');
 await fill(appearance,'Tỷ lệ nhân vật (lớn hơn 0, tối đa 3)','1.25');await fill(appearance,'Lớp hiển thị (0–20)','2');
 await fill(appearance,'Mô tả khi thiếu ảnh','Người giữ thư đứng cạnh bàn.');
 await appearance.getByLabel('Ẩn hình của nhân vật khi người chơi đang nhập vai họ',{exact:true}).uncheck();
 await click(editor,'Kiểm tra hồ sơ');assert.match(await editor.locator('#vg-report').innerText(),/ẩn sprite/);
 await appearance.getByLabel('Ẩn hình của nhân vật khi người chơi đang nhập vai họ',{exact:true}).check();
 await fill(appearance,'Cờ cấm khi xuất hiện','heard-seal');await click(editor,'Kiểm tra hồ sơ');assert.match(await editor.locator('#vg-report').innerText(),/vừa bắt buộc vừa bị cấm/);
 await fill(appearance,'Cờ cấm khi xuất hiện','hidden-face');await fill(appearance,'Lớp hiển thị (0–20)','21');
 await click(editor,'Lưu trên thiết bị');assert.match(await editor.locator('#vg-message').innerText(),/sai định dạng/);
 await fill(appearance,'Lớp hiển thị (0–20)','2');await click(editor,'Kiểm tra hồ sơ');assert.match(await editor.locator('#vg-report').innerText(),/Cấu trúc đủ/);
 await click(variant,'Xóa biến thể tạo hình');assert.equal(await rows('visual-variant').count(),1);
 await select(variant,'Dạng tạo hình','portrait');assert.equal(await rows('visual-variant').first().getByLabel('Dạng tạo hình',{exact:true}).inputValue(),'sprite');
 await click(visual,'Xóa hồ sơ tạo hình');assert.equal(await rows('visual').count(),1);
 await click(editor,'Lưu trên thiết bị');await page.waitForFunction(()=>document.getElementById('vg-save-state').textContent.includes('Đã lưu'));
 await tab('Xem trước');await select(editor,'Cảnh xem trước',{label:'Một lá thư trên bàn.'});
 let stage=editor.locator('.vg-scene-stage');await stage.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('.vg-scene-stage>.vg-art-image')?.naturalWidth===480);
 assert.equal(await stage.locator('>.vg-art-image').evaluate(n=>getComputedStyle(n).objectPosition),'80% 30%');
 let ratio=await stage.evaluate(n=>n.getBoundingClientRect().width/n.getBoundingClientRect().height);assert.ok(Math.abs(ratio-16/9)<0.03);
 await select(editor,'Khung xem trước','portrait');ratio=await stage.evaluate(n=>n.getBoundingClientRect().width/n.getBoundingClientRect().height);assert.ok(Math.abs(ratio-9/16)<0.03);
 await editor.getByLabel('Xem bố cục nhân vật',{exact:true}).check();assert.equal(await editor.locator('[data-vg-preview-character]').count(),1);
 await select(editor,'Vai xem thử',{label:'Người giữ thư'});assert.equal(await editor.locator('[data-vg-preview-character]').count(),0);
 await select(editor,'Vai xem thử',{label:'Người hàng xóm'});assert.equal(await editor.locator('[data-vg-preview-character]').count(),1);
 assert.equal(await editor.locator('[data-vg-preview-character]').evaluate(n=>n.style.left),'25%');
 if(process.env.CREATOR_QA_DIR){const path=require('node:path');fs.mkdirSync(process.env.CREATOR_QA_DIR,{recursive:true});await page.locator('#vg-creator-dialog').screenshot({path:path.join(process.env.CREATOR_QA_DIR,'visual-preview.png')});}
 const beforeScene=await stage.getAttribute('data-scene-id');await stage.locator('>.vg-art-image').evaluate(n=>{n.src='blob:missing-preview';});
 await page.waitForFunction(()=>document.querySelector('.vg-scene-stage>.vg-art-empty')?.textContent.includes('bị lỗi'));
 assert.equal(await stage.getAttribute('data-scene-id'),beforeScene);assert.match(await editor.locator('#vg-scene-preview').innerText(),/Bàn nhận thư/);
 if(!await editor.locator('.vg-files').evaluate(n=>n.open))await editor.locator('.vg-files summary').click();
 const waiting=page.waitForEvent('download');await click(editor,'Xuất JSON');const exported=await waiting;
 const draft=JSON.parse(fs.readFileSync(await exported.path(),'utf8'));
 assert.deepEqual(draft.assets[1].focalPoint,[0.8,0.3]);assert.equal(draft.assets[1].contentHash,hash);
 assert.equal(draft.characterAppearances[0].variantId,draft.characterVisuals[0].variants[0].variantId);
 assert.equal(draft.characterAppearances[0].triggerRef,draft.npcs[0].dialogueNodes[1].nodeId);
 assert.equal(draft.characterAppearances[0].displayMode,'sprite');assert.equal(draft.characterAppearances[0].suppressWhenPossessed,true);
 assert.equal(draft.characterAppearances[0].position.scale,1.25);assert.equal(draft.story.secretTruth,secret);
 assert.equal(JSON.stringify(draft).includes('blob:'),false);assert.equal(JSON.stringify(draft).includes('image/png'),false);
 assert.equal('status' in draft,false);assert.equal(await page.evaluate(()=>DuduWorldCreator.backendConnected),false);
 // Hold a file read across an A→B→A account change to test stale async work.
 await tab('Nguồn & ảnh');
 await page.evaluate(bytes=>{window.__priorPngRead=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){
  if(this.name==='deferred.png')return new Promise(resolve=>{window.__resolveDeferredPng=()=>resolve(new Uint8Array(bytes).buffer);});
  return window.__priorPngRead.call(this);
 };},[...png]);
 await editor.locator('.vg-card').nth(1).getByLabel('Chọn PNG xem thử',{exact:true}).setInputFiles({name:'deferred.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>typeof window.__resolveDeferredPng==='function');
 // Switching UID must discard the session-only art cache, even if hashes match.
 await page.evaluate(()=>__creatorLogin('creator-owner-b',true));assert.equal(await page.locator('#vg-creator-dialog').count(),0);
 await page.evaluate(()=>__creatorLogin('creator-owner-a',true));await page.locator('#d60-world-creator-launch').click();
 await editor.locator('.vg-files summary').click();await click(editor,'Mở nháp đã lưu');
 await editor.locator('#vg-local-list').getByRole('button',{name:'Một căn phòng',exact:true}).first().click();
 await page.waitForFunction(()=>document.getElementById('vg-message')?.textContent.includes('Đã mở bản nháp'));
 await page.evaluate(async()=>{window.__resolveDeferredPng();await new Promise(r=>setTimeout(r,50));File.prototype.arrayBuffer=window.__priorPngRead;});
 await tab('Nguồn & ảnh');assert.equal(await editor.locator('.vg-art-thumb').count(),0);
 assert.equal(await editor.locator('.vg-card').nth(1).getByLabel('Hash nội dung ảnh',{exact:true}).inputValue(),hash);
 await tab('Tạo hình & bố cục');assert.equal(await rows('appearance').count(),1);
 await tab('Thông tin');assert.equal(await editor.getByLabel('Sự thật ẩn · chỉ dành cho tác giả',{exact:true}).inputValue(),secret);
 console.log('PASS G1I local PNG integrity/decode, visual forms, crop ratios, possession suppression, fallback, JSON pins and UID art cleanup');
};
