const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const profile=require('../js/npc-profile-v56-15.js');
const style=require('../js/npc-reply-style-v56-12.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const note=`I. Tính cách của Ôn Tri Hành
Lạnh lùng, nghiêm nghị bên ngoài (vẻ ngoài như băng tuyết).
Giọng nói sắc sảo, dứt khoát; chỉ gay gắt khi bệnh nhân không trân trọng tính mạng.
Cực kỳ nguyên tắc, trách nhiệm và tâm huyết với nghề.
Âm thầm, tinh tế và dịu dàng trong hành động.
Giàu tình cảm, nặng lòng và dễ tổn thương, đầy sự trắc ẩn.
II. Ký ức và các dấu mốc liên quan đến Ôn Tri Hành
Nhận kết quả ung thư giai đoạn cuối của Tử Du.
Đêm 8 tháng 10, cô ở bên Tử Du vào những phút cuối.`;
const identity={name:'A Du',mode:'traveler'};
const npc={name:'Ôn Tri Hành',role:'Trưởng khoa Hô hấp',note};
const novel={id:'test-story',title:'Truyện thử',chapters:[
 {id:'chap-1'},{id:'chap-2'},{id:'chap-3'}]};
const prompt=(char=npc,opts={})=>profile.compile({char,novel,role:identity,
 relation:{affinity:13},roleInstruction:
 'Tên người liên lạc: A Du. Chế độ: Người lạc giới/qua đường. Không phải nhân vật chính.',
 query:'Tôi chỉ muốn làm quen thôi mà',readRewards:{},...opts});
test('V56.15 legacy I/II prose yields balanced personality without raw spoiler injection',()=>{
 const parsed=profile.parse(note);
 assert.equal(parsed.legacy,false);
 assert.match(parsed.traits,/lạnh lùng/i);
 assert.match(parsed.traits,/trách nhiệm/i);
 assert.match(parsed.traits,/dịu dàng/i);
 assert.match(parsed.traits,/tổn thương/i);
 assert.match(parsed.memory,/ung thư/);
 assert.doesNotMatch(prompt(),/ung thư|8 tháng 10|phút cuối/i);
});
test('V56.15 legacy one-block notes remain read-only, with no automatic lore release',()=>{
 const original='Lạnh lùng, ít nói; âm thầm tốt bụng.';
 const p=profile.parse(original);
 assert.equal(p.legacy,true);
 assert.equal(p.memory,'');
 assert.match(p.traits,/Lạnh lùng/);
 const c={...npc,note:original};
 assert.equal(c.note,original,'do not modify canonical note');
 assert.match(prompt(c),/TÍNH CÁCH/);
});
test('V56.15 3-layer structured profile preserves distinctions and original note unchanged',()=>{
 const raw=`[TÍNH CÁCH]
Bác sĩ nghiêm khắc khi có nguy hiểm sức khỏe, nhưng vẫn lịch sự với người lạ.
[KÝ ỨC CỐT TRUYỆN]
- [TỪ CHƯƠNG: 3] Khương Tử Du nhận kết quả ung thư.
[CÁCH NHẮN TIN]
Thường xưng tôi; kiệm lời. Chỉ giải thích dài khi được hỏi.`;
 const parsed=profile.parse(raw);
 assert.match(parsed.traits,/vẫn lịch sự/);
 assert.match(parsed.memory,/Khương Tử Du/);
 assert.match(parsed.chat,/xưng tôi/);
 assert.doesNotMatch(parsed.traits,/ung thư/);
 assert.equal(raw.includes('[TỪ CHƯƠNG: 3]'),true);
});
test('V56.15 canon event requires exact chapter opened and relevant question',()=>{
 const memory='- [TỪ CHƯƠNG: 3] Khương Tử Du nhận kết quả ung thư.';
 assert.equal(profile.approvedMemory(memory,'Cô biết gì về Tử Du?',novel,{}),'');
 const rewards={'test-story_chap-3':true};
 assert.equal(profile.approvedMemory(memory,'Xin chào',novel,rewards),'');
 assert.match(profile.approvedMemory(memory,'Cô biết chuyện Khương Tử Du?',novel,rewards),/ung thư/);
 assert.equal(profile.approvedMemory(memory,'Mình muốn làm quen',novel,rewards),'');
});
test('V56.15 no memory on generic player resemblance or invalid chapter marker',()=>{
 const raw=`[TÍNH CÁCH]\nKiệm lời.\n[KÝ ỨC CỐT TRUYỆN]
- [TỪ CHƯƠNG: ID_CHƯƠNG_CUỐI] Tử Du mất.
- [TỪ CHƯƠNG: 100] Tử Du mất.
[CÁCH NHẮN TIN]\nTrả lời ngắn.`;
 const c={...npc,note:raw};
 const text=prompt(c,{query:'Tôi tên A Du, muốn kết bạn.',readRewards:{'test-story_chap-3':true}});
 assert.match(text,/KHÔNG gán ký ức/i);
 assert.doesNotMatch(text,/Tử Du mất/);
});
test('V56.15 final chat safeguards are never truncated even with extremely long notes',()=>{
 const raw=`[TÍNH CÁCH]\n${'nghiêm nghị và trách nhiệm, '.repeat(800)}
[KÝ ỨC CỐT TRUYỆN]\n${'bí mật tuyệt đối '.repeat(500)}
[CÁCH NHẮN TIN]\n${'trả lời ngắn '.repeat(800)}`;
 const compiled=prompt({...npc,note:raw});
 assert.ok(compiled.length<=profile.MAX_INSTRUCTION,compiled.length);
 assert.match(compiled,/KHÔNG gán ký ức/i);
 assert.match(compiled,/Không tự phát bệnh án/);
 assert.ok(compiled.endsWith('không viết văn tả cảnh.'));
});
test('V56.15 normal social exchanges must not produce long medical reprimands',()=>{
 assert.match(style.guidance('Làm quen được hong'),/không phải bệnh nhân/i);
 assert.match(style.guidance('Tôi chỉ muốn làm quen thôi mà'),/không trách móc/i);
 const answer='Tôi đang làm việc ở bệnh viện. Nhưng nếu cô chỉ muốn làm quen thì cứ nói thẳng. '.repeat(5);
 const concise=style.format(answer,'Tôi chỉ muốn làm quen thôi mà');
 assert.ok(concise.trim().split(/\s+/).length<=28);
});
test('V56.15 production sends full bounded three-layer instruction without clipping final constraints',()=>{
 assert.match(html,/js\/npc-profile-v56-15\.js\?v=56-15/);
 assert.match(html,/DuduNpcProfileV5615\?\.compile\(/);
 assert.match(html,/readRewards:userProfile\.readRewards\|\|\{\}/);
 assert.match(html,/DuduAI\.generate\('chat',instruction,context,query\)/);
 assert.doesNotMatch(html,/DuduAI\.generate\('chat',instruction\.slice\(/);
 assert.match(html,/function npcInsertProfileTemplateV5615\(/);
 assert.match(html,/if\(field\.value\.trim\(\)\)/);
 assert.match(html,/navigator\.clipboard\.writeText\(template\)/);
 assert.match(html,/id="char-input-note"/);
});
