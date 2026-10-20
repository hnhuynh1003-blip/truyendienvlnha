const {test}=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../js/companion-rules-v43.js');
const fs=require('node:fs');
const path=require('node:path');

test('V43: companion is a system contact, not one of the 72 story NPCs',()=>{
 assert.equal(rules.ID,'dudu-system-guide');
 assert.equal(rules.MILESTONES.length,6);
 assert.ok(rules.MILESTONES.some(x=>x.name==='Bông Hồng Tình Bạn'&&x.day===7));
 assert.ok(rules.MILESTONES.some(x=>x.name==='Huy Chương Đồng Đội'&&x.day===60));
 assert.ok(!rules.MILESTONES.some(x=>/tình yêu/i.test(x.name)));
});
test('V43: daily checkin grants only once per local day with bounded coins',()=>{
 const today='2026-10-16';
 const first=rules.checkin({},today);
 assert.equal(first.ok,true);assert.equal(first.coins,3);assert.equal(first.state.login.count,1);
 const repeat=rules.checkin(first.state,today);
 assert.equal(repeat.ok,false);assert.equal(repeat.state.login.count,1);
 assert.equal(rules.checkin(first.state,'2026-10-17').state.login.count,2);
 assert.equal(rules.checkin(first.state,'2026-10-18').state.login.count,1);
 assert.equal(rules.COIN_DAYS.reduce((a,b)=>a+b,0),45);
});
test('V43: chat streak counts once per day and milestone is awarded once',()=>{
 let st=rules.empty();
 for(let i=1;i<=7;i++){
  const d='2026-10-'+String(i).padStart(2,'0');
  const plan=rules.chat(st,'Hôm nay có truyện nào hay?',d);
  assert.equal(plan.ok,true);st=plan.state;
  assert.equal(rules.chat(st,'Hôm nay có truyện nào hay?',d).ok,false);
 }
 assert.equal(st.chat.count,7);
 assert.deepEqual(st.milestones,['dudu-letter-3','dudu-rose-7']);
 assert.equal(st.login.count,0,'Chatting does not grant login coins');
 const missed=rules.chat(st,'Tớ quay lại','2026-10-09');
 assert.equal(missed.state.chat.count,1);
 assert.deepEqual(missed.state.milestones,st.milestones,'Milestones remain permanent');
});
test('V43: invalid messages and invalid dates cannot farm rewards',()=>{
 const empty=rules.empty();
 assert.equal(rules.chat(empty,'hi','2026-10-16').ok,false);
 assert.equal(rules.chat(empty,'  ','2026-10-16').ok,false);
 assert.equal(rules.distance('bad','2026-10-16'),null);
 assert.equal(rules.distance('2026-10-15','2026-10-16'),1);
 assert.equal(rules.distance('2026-10-16','2026-10-16'),0);
 assert.equal(rules.distance('2026-10-16','2026-10-14'),-2);
});
test('V43: story recommendations use supplied library names only, no invented releases',()=>{
 const reply=rules.reply('Giới thiệu truyện đi',['Một Giấc Mơ','Tàn Ảnh']);
 assert.match(reply,/Một Giấc Mơ/);
 assert.match(reply,/Tàn Ảnh/);
 assert.doesNotMatch(reply,/vừa ra mắt|mới cập nhật/i);
 assert.match(rules.reply('Nhặt đồ kiểu gì'),/2 phút/);
});
test('V43: UI is sandbox-only and does not claim server validated keepsakes',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const inbox=fs.readFileSync(path.join(__dirname,'../js/phone-inbox-v33.js'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../js/companion-ui-v43.js'),'utf8');
 assert.match(html,/companion-rules-v43\.js/);
 assert.match(html,/companion-ui-v43\.js/);
 assert.match(inbox,/dudu-v43-system-contact/);
 assert.match(inbox,/window\.DuduCompanionV43\.open\(\)/);
 assert.match(ui,/IS_SANDBOX_MODE/);
 assert.match(ui,/DUDU đồng hành/);
 assert.match(ui,/DUDU Chủ Thần/);
 assert.match(ui,/dudu-v68-agent-select/);
 assert.match(ui,/Xu thử nghiệm/);
 assert.match(ui,/chưa phải kỷ vật Bảo Tàng/);
 assert.doesNotMatch(ui,/db\.collection\(|DuduCollectiblesClient\.grant|fetch\(/);
});
