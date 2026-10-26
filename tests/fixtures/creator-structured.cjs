// A complete structural authoring journey using forms, not an injected JSON model.
const assert=require('node:assert/strict');
const fs=require('node:fs');
module.exports=async function structuredCreator({page,editor,secret}){
 const tab=async name=>editor.getByRole('button',{name,exact:true}).click();
 const fill=async(scope,name,value)=>scope.getByLabel(name,{exact:true}).fill(value);
 const select=async(scope,name,value)=>scope.getByLabel(name,{exact:true}).selectOption(value);
 const click=async(scope,name)=>scope.getByRole('button',{name,exact:true}).click();
 const records=kind=>editor.locator('[data-vg-kind="'+kind+'"]');
 await tab('Thông tin');
 await fill(editor,'Phiên bản nội dung','2.0.0');await select(editor,'Mức nguy hiểm','low');
 for(const [name,text] of [['Ý tưởng trong một câu','Tìm người gửi lá thư.'],['Bối cảnh','Một căn phòng yên tĩnh.'],
  ['Vai trò người chơi','Người giữ thư.'],['Mở đầu','Một lá thư vừa được mang tới.'],['Nhịp truyện · mỗi dòng một ý','Đọc thư\nHỏi người đưa thư'],['Quy tắc thế giới · mỗi dòng một ý','Chỉ biết điều đã chứng kiến.']])await fill(editor,name,text);
 await tab('Nguồn & ảnh');
 await select(editor,'Loại nguồn','library');await fill(editor,'Mã truyện','synthetic-story');await fill(editor,'Phiên bản nguồn','v1');await fill(editor,'Hash nguồn đã đăng ký','a'.repeat(64));
 for(const [kind,id,label] of [['worldCover','art-cover-forms','Căn nhà nhận thư'],['sceneBackground','art-room-forms','Phòng phía Đông']]){
  await click(editor,'+ Thêm tham chiếu ảnh');const row=editor.locator('.vg-card').last();
  await fill(row,'Mã asset',id);await select(row,'Loại hình ảnh',kind);await fill(row,'Phiên bản asset','v1');
  await fill(row,'Hash nội dung ảnh','b'.repeat(64));await fill(row,'Mô tả ngắn, tránh lộ bí mật',label);
 }
 await tab('Thông tin');await tab('Nguồn & ảnh');await select(editor,'Ảnh bìa world','art-cover-forms');
 await tab('Địa điểm & cảnh');await select(editor,'Ảnh nền tham chiếu','art-room-forms');
 await click(editor,'+ Thêm góc nhìn');await fill(records('view').first(),'Mô tả góc nhìn','Bàn nhận thư');
 await tab('Nhân vật & NPC');await click(editor,'+ Thêm nhân vật');
 const character=records('character').first();await fill(character,'Tên nhân vật','Người giữ thư');
 await character.getByLabel('Cho phép nhập vào nhân vật này',{exact:true}).check();
 await click(editor,'+ Thêm NPC');const npc=records('npc').first();
 await fill(npc,'Tên NPC','Người đưa thư');await fill(npc,'Vai trò NPC','Nhân chứng việc giao thư');
 await fill(npc,'Tính cách NPC','Thận trọng');await fill(npc,'Tri thức NPC · mỗi dòng một điều được biết','Chỉ thấy người giao thư.');
 await select(npc,'Cảnh giới thiệu NPC',{label:'Một lá thư trên bàn.'});
 await npc.getByLabel('Có thể kết bạn theo kịch bản',{exact:true}).check();
 await click(npc,'+ Thêm lời thoại');await fill(records('dialogue').first(),'Lời thoại NPC','Tôi chỉ thấy thư được giao.');
 await click(npc,'+ Thêm lời thoại');await fill(records('dialogue').nth(1),'Lời thoại NPC','Con dấu thuộc bưu cục phía Đông.');
 await click(records('dialogue').first(),'+ Thêm lựa chọn hội thoại');
 await fill(records('dialogue-choice').first(),'Lựa chọn hội thoại','Hỏi về con dấu');
 await select(records('dialogue-choice').first(),'Nút hội thoại tiếp theo',{label:'Con dấu thuộc bưu cục phía Đông.'});
 await fill(records('dialogue-choice').first(),'Cờ sau lựa chọn','heard-seal');
 // A referenced dialogue node cannot be silently deleted.
 await click(records('dialogue').nth(1),'Xóa lời thoại');assert.equal(await records('dialogue').count(),2);
 await tab('Vai nhập');await select(editor,'Cảnh vào world',{label:'Một lá thư trên bàn.'});
 const modes=[['cast_possession','Người giữ thư'],['system_cover','Khách có giấy giới thiệu'],['native_extra','Người hàng xóm']];
 for(const [mode,name] of modes){
  await click(editor,'+ Thêm vai nhập');const row=records('entry').last();await fill(row,'Tên vai nhập',name);await select(row,'Kiểu nhập vai',mode);
  await select(row,'Cảnh bắt đầu của vai',{label:'Một lá thư trên bàn.'});
  if(mode==='cast_possession')await select(row,'Nhân vật được nhập vai',{label:'Người giữ thư'});
  if(mode==='system_cover'){await fill(row,'Tên thân phận chuẩn bị','Người đại diện bưu cục');await select(row,'Tính xác thực trong truyện','verified');}
  if(mode==='native_extra')await fill(row,'Lịch sử và quan hệ bản địa','Sống cạnh nhà người giữ thư nhiều năm.');
  await fill(row,'Thông tin vai đã biết · mỗi dòng một ý','Biết đường đến bưu cục.');await fill(row,'Cờ ban đầu · mỗi dòng một cờ','arrived');
 }
 await select(editor,'Cách chọn vai','fixed');await select(editor,'Vai cố định',{label:'Người giữ thư'});
 await click(records('entry').first(),'Xóa vai nhập');assert.equal(await records('entry').count(),3);
 await tab('Vật phẩm');await click(editor,'+ Thêm vật phẩm');const item=records('item').first();
 await fill(item,'Tên vật phẩm','Lá thư');await fill(item,'Mô tả vật phẩm','Một lá thư còn niêm phong.');await select(item,'Loại vật phẩm','evidence');await fill(item,'Giới hạn cộng dồn','5');
 await click(item,'+ Thêm cách nhận');
 await tab('Địa điểm & cảnh');await click(records('view').first(),'+ Thêm tương tác');
 const hotspot=records('hotspot').first();await fill(hotspot,'Nhãn tương tác','Nhặt lá thư');await select(hotspot,'Hành động','pickup');
 await select(hotspot,'Đối tượng tương tác',{label:'Lá thư'});
 await tab('Vật phẩm');await select(records('acquisition').first(),'Cách nhận','pickup');
 await select(records('acquisition').first(),'Tương tác nhặt vật phẩm',{label:'Nhặt lá thư'});
 await tab('Sự kiện & kết cục');await click(editor,'+ Thêm sự kiện');
 await fill(records('event').first(),'Điều kiện sự kiện','storm_passes');await fill(records('event').first(),'Cờ sau sự kiện','survived');
 const ending=records('ending').first();await select(ending,'Kết quả kết cục','success');await fill(ending,'Cờ cần có để đến kết cục','heard-seal');
 await click(editor,'+ Thêm kết cục');await fill(records('ending').last(),'Tên kết cục','Không tìm được người gửi');
 await select(records('ending').last(),'Kết quả kết cục','failure');await fill(records('ending').last(),'Cờ cần có để đến kết cục','failed-search');
 await tab('Nhiệm vụ');await click(editor,'+ Thêm nhiệm vụ chính');const mission=records('mission').first();
 await fill(mission,'Tên nhiệm vụ','Tìm người gửi');await fill(mission,'Tóm tắt nhiệm vụ','Đọc thư và hỏi người đưa thư.');
 await select(mission,'Cảnh bắt đầu',{label:'Một lá thư trên bàn.'});await click(mission,'+ Thêm mục tiêu');
 for(const [verb,label] of [['talk','Người đưa thư'],['collect','Lá thư'],['inspect','Lá thư'],['purchase','Lá thư'],['deliver','Lá thư'],['choose','Nhặt lá thư'],['survive','storm_passes'],['reach','Một lá thư trên bàn.']]){
  await select(records('objective').first(),'Hành động mục tiêu',verb);
  assert.equal(await records('objective').first().getByLabel('Đích mục tiêu',{exact:true}).inputValue(),'');
  await select(records('objective').first(),'Đích mục tiêu',{label});
 }
 for(const [verb,target] of [['talk','Người đưa thư'],['collect','Lá thư']]){
  await click(mission,'+ Thêm mục tiêu');const row=records('objective').last();await select(row,'Hành động mục tiêu',verb);await select(row,'Đích mục tiêu',{label:target});
 }
 await fill(mission,'EXP đề nghị','123');await click(mission,'+ Đề nghị vật phẩm thưởng');
 await select(records('reward').first(),'Vật phẩm thưởng đề nghị',{label:'Lá thư'});await fill(records('reward').first(),'Số vật phẩm đề nghị','2');
 // Side missions must not become required main-story gates.
 await click(editor,'+ Thêm nhiệm vụ chính');const side=records('mission').last();await fill(side,'Tên nhiệm vụ','Ghé thăm bưu cục');
 await fill(side,'Tóm tắt nhiệm vụ','Một cuộc ghé thăm tùy chọn.');await select(side,'Loại nhiệm vụ','side');
 assert.equal(await side.getByLabel('Bắt buộc để hoàn thành world',{exact:true}).isChecked(),false);
 await select(side,'Cảnh bắt đầu',{label:'Một lá thư trên bàn.'});await click(side,'+ Thêm mục tiêu');
 await select(records('objective').last(),'Hành động mục tiêu','reach');await select(records('objective').last(),'Đích mục tiêu',{label:'Một lá thư trên bàn.'});
 await side.getByLabel('Bắt buộc để hoàn thành world',{exact:true}).click();assert.equal(await records('mission').last().getByLabel('Bắt buộc để hoàn thành world',{exact:true}).isChecked(),false);
 // The AI request is only content. It must have a scripted fallback and declare intent.
 await tab('Nhân vật & NPC');await select(records('npc').first(),'Chế độ NPC','ai_candidate');
 await click(editor,'Kiểm tra hồ sơ');assert.match(await editor.locator('#vg-report').innerText(),/Đề nghị NPC AI chưa được khai báo/);
 await editor.getByLabel('Đề nghị xét NPC AI',{exact:true}).check();await fill(records('npc').first(),'Lý do đề nghị AI','Cần biến thể câu trả lời trong phạm vi tri thức.');
 await click(editor,'Kiểm tra hồ sơ');assert.match(await editor.locator('#vg-report').innerText(),/Cấu trúc đủ/);
 assert.equal((await editor.locator('#vg-report').innerText()).includes(secret),false);
 // References prevent accidental removal of a cast target or quest item.
 await click(records('character').first(),'Xóa nhân vật');assert.equal(await records('character').count(),1);
 await tab('Vật phẩm');await click(records('item').first(),'Xóa vật phẩm');assert.equal(await records('item').count(),1);
 await tab('Địa điểm & cảnh');await click(records('hotspot').first(),'Xóa tương tác');assert.equal(await records('hotspot').count(),1);
 await click(editor,'Xóa cảnh');assert.equal(await records('view').count(),1);assert.equal(await editor.getByLabel('Mô tả cảnh',{exact:true}).count(),1);
 await tab('Nhân vật & NPC');
 for(const width of [320,375,390,430,1280]){await page.setViewportSize({width,height:900});assert.equal(await editor.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'Structured form overflow at '+width);}
 if(process.env.CREATOR_QA_DIR){
  const path=require('node:path');fs.mkdirSync(process.env.CREATOR_QA_DIR,{recursive:true});
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:900});await records('npc').first().evaluate(n=>n.scrollIntoView({block:'start'}));
   assert.equal(await editor.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
   await page.locator('#vg-creator-dialog').screenshot({path:path.join(process.env.CREATOR_QA_DIR,'structured-npc-'+width+'.png')});
  }
 }
 await tab('Vật phẩm');await fill(records('item').first(),'Giới hạn cộng dồn','0');
 await click(editor,'Lưu trên thiết bị');assert.match(await editor.locator('#vg-message').innerText(),/sai định dạng/);
 await fill(records('item').first(),'Giới hạn cộng dồn','5');
 await click(editor,'Lưu trên thiết bị');await page.waitForFunction(()=>document.getElementById('vg-save-state')?.textContent.includes('Đã lưu'));
 if(!await editor.locator('.vg-files').evaluate(n=>n.open))await editor.locator('.vg-files summary').click();
 const waiting=page.waitForEvent('download');await click(editor,'Xuất JSON');const download=await waiting;
 const draft=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
 assert.deepEqual(draft.playerEntryProfiles.map(x=>x.mode),modes.map(x=>x[0]));
 assert.equal(draft.entryPolicy.forcedEntryId,draft.playerEntryProfiles[0].entryId);
 assert.equal(draft.cast[0].playableAsCast,true);assert.equal(draft.npcs[0].friendable,true);
 assert.equal(draft.npcs[0].dialogueNodes[0].choices[0].nextNodeId,draft.npcs[0].dialogueNodes[1].nodeId);
 assert.equal(draft.missions[0].rewardRequest.exp,123);assert.equal(typeof draft.missions[0].rewardRequest.exp,'number');
 assert.equal(draft.missions[0].rewardRequest.items[0].quantity,2);assert.equal(draft.missions[1].requiredForCompletion,false);
 assert.equal(draft.missions[0].objectives[0].targetId,draft.scenes[0].sceneId);
 assert.equal(draft.missions[0].objectives[1].targetId,draft.npcs[0].npcId);
 assert.equal(draft.missions[0].objectives[2].targetId,draft.items[0].itemId);
 assert.equal(draft.items[0].acquisitionMethods[0].uniquePickupId,draft.views[0].hotspots[0].uniquePickupId);
 assert.equal(draft.items[0].acquisitionMethods[0].placeId,draft.places[0].placeId);
 assert.equal(draft.aiPolicy.aiNpcRequested,true);assert.equal(draft.aiPolicy.allowAiRewards,false);assert.equal(draft.aiPolicy.allowAiWorldMutation,false);
 assert.equal(draft.story.secretTruth,secret);assert.equal('officialWorldRank' in draft,false);assert.equal('status' in draft,false);
 // Save/reopen preserves IDs and richer data instead of regenerating entities.
 await click(editor,'‹ Vạn Giới');await page.locator('#d60-world-creator-launch').click();
 await tab('Vai nhập');assert.equal(await records('entry').count(),3);
 await tab('Nhân vật & NPC');assert.equal(await records('dialogue').count(),2);
 await tab('Thông tin');assert.equal(await editor.getByLabel('Sự thật ẩn · chỉ dành cho tác giả',{exact:true}).inputValue(),secret);
 console.log('PASS G1H structured forms: three entry modes, NPC fallback/knowledge, pickup identity, eight target types, requested rewards, endings and guarded deletion');
};
