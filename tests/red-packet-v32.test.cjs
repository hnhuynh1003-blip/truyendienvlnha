const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const rules=require('../js/red-packet-v32.js');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const social=fs.readFileSync(path.resolve(__dirname,'../js/chat-social-v32.js'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../css/phone-social-v32.css'),'utf8');
const NOW=Date.UTC(2026,9,16,8,0);

test('V32 denominations are limited to virtual game Xu, never real money',()=>{
 assert.deepEqual(rules.DENOMINATIONS,[10,50,100,520,1314]);
 for(const amount of [0,-10,11,10.1,NaN,Infinity,'50']){
   assert.equal(rules.evaluate({amount,balance:100000,record:null,unlocked:true,now:NOW}).ok,false);
 }
 assert.equal(rules.evaluate({amount:50,balance:49,record:null,unlocked:true,now:NOW}).reason,'insufficient');
 assert.equal(rules.evaluate({amount:50,balance:100,record:null,unlocked:false,now:NOW}).reason,'locked');
});
test('V32 rate limits are per NPC, UTC day count and five-minute cooldown',()=>{
 const first=rules.evaluate({amount:10,balance:100,record:null,unlocked:true,now:NOW});
 assert.equal(first.ok,true);assert.equal(first.balanceAfter,90);
 const ledger=rules.nextRecord(null,first,{id:'rp-test-001',at:NOW,note:'thương'});
 assert.equal(ledger.events.length,1);assert.equal(ledger.count,1);
 assert.equal(rules.evaluate({amount:10,balance:90,record:ledger,unlocked:true,now:NOW+1000}).reason,'cooldown');
 const second=rules.evaluate({amount:10,balance:90,record:ledger,unlocked:true,now:NOW+300001});
 assert.equal(second.ok,true);
 const next=rules.nextRecord(ledger,second,{id:'rp-test-002',at:NOW+300001,note:'mừng'});
 const third=rules.evaluate({amount:10,balance:80,record:next,unlocked:true,now:NOW+600002});
 const exhausted=rules.nextRecord(next,third,{id:'rp-test-003',at:NOW+600002,note:''});
 assert.equal(rules.evaluate({amount:10,balance:70,record:exhausted,unlocked:true,now:NOW+900003}).reason,'daily-limit');
 assert.equal(rules.evaluate({amount:10,balance:70,record:exhausted,unlocked:true,now:NOW+86400000}).ok,true);
 assert.equal(rules.nextRecord(ledger,first,{id:'rp-test-001',at:NOW,note:'dup'}),null);
});
test('V32 note sanitizer limits text and ledger is scope-preserving pure data',()=>{
 assert.equal(rules.sanitizeNote(' a '.repeat(60)).length,60);
 const raw={day:'test',count:6,lastAt:1,events:[{id:'bad',amount:999,at:12}]};
 assert.deepEqual(rules.normalizeRecord(raw).events,[]);
 assert.equal(raw.count,6);
});
test('V32 messenger has direct gift and red-envelope actions; existing gift logic kept',()=>{
 const chat=html.slice(html.indexOf('<!-- APP: TRÒ CHUYỆN'),html.indexOf('<!-- APP: CỬA HÀNG -->'));
 for(const name of ['dudu-v32-gift-button','dudu-v32-envelope-button','dudu-v32-mini-affinity',
 'dudu-v32-envelope-overlay','dudu-v32-envelope-note','dudu-v32-envelope-confirm']){
   assert.match(chat,new RegExp('id="'+name+'"'));
 }
 assert.match(html,/function openGiftModalFromChat\(\)/);
 assert.match(html,/function executeGiftItem\(charId, itemIdx\)/);
 assert.match(html,/renderRedPacketEventsV32\(/);
 assert.match(social,/userProfile\.currency=plan\.balanceAfter/);
 assert.match(social,/saveCurrentAccount\(\)/);
 assert.doesNotMatch(social,/\.affinity\s*=|\.trust\s*=|addExp\(|fetch\(|firestore|callGeminiAIChat/);
 assert.match(social,/if\(!IS_SANDBOX_MODE\|\|!currentUsername\)return null/);
 assert.match(css,/dudu-v32-envelope-sheet/);
});
test('V32 live contact disables only the unavailable red packet, never gifts or Xu',()=>{
 const elements=new Map([
  ['dudu-v32-envelope-button',{disabled:false,textContent:'🧧 Phong bao',
    title:'',setAttribute(name,value){this[name]=value;}}],
  ['dudu-v32-gift-button',{disabled:false,title:'',textContent:'🎁 Quà'}],
  ['dudu-v32-contact-feedback',{textContent:''}]
 ]);
 const document={readyState:'complete',getElementById:id=>elements.get(id)||null,
  addEventListener(){}};
 const win={document,DuduRedPacketV32:rules};
 vm.runInNewContext(social,{window:win,document,IS_SANDBOX_MODE:false},{timeout:1500});
 const packet=elements.get('dudu-v32-envelope-button');
 const gift=elements.get('dudu-v32-gift-button');
 assert.equal(packet.disabled,true);
 assert.match(packet.textContent,/🔒/);
 assert.equal(gift.disabled,false,'Existing live gift action must not be changed');
 assert.equal(gift.textContent,'🎁 Quà');
 assert.doesNotThrow(()=>win.openRedPacketV32());
 assert.match(elements.get('dudu-v32-contact-feedback').textContent,/chờ Rules/);
 assert.equal(packet.disabled,true);
});
