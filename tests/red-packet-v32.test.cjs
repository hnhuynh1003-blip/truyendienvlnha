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
test('red envelopes stay in chronological position when new chat messages arrive',()=>{
 const at=NOW;
 const gift=rules.nextRecord(null,rules.evaluate({amount:10,balance:100,
  record:null,unlocked:true,now:at}),{id:'rp-event-one',at,note:'Chúc vui'});
 const chat=[{role:'user',text:'Trước phong bao',at:at-2000},
  {role:'model',text:'Đã đọc',at:at-1000},
  {role:'user',text:'Nhắn tiếp',at:at+2000},
  {role:'model',text:'Trả lời',at:at+3000}];
 const original=JSON.stringify({chat,gift});
 const timeline=rules.timeline(chat,gift);
 assert.deepEqual(timeline.map(x=>x.kind),
  ['message','message','packet','message','message']);
 assert.equal(timeline[2].packet.note,'Chúc vui');
 assert.equal(timeline[2].packet.status,'SENT');
 assert.equal(JSON.stringify({chat,gift}),original,'Render must not rewrite saved chat or ledger');
 const later=rules.timeline([...chat,{role:'user',text:'Nói nữa',at:at+4000}],gift);
 assert.equal(later[2].kind,'packet','Existing packet stays at the original position');
 assert.equal(later[later.length-1].message.text,'Nói nữa');
});
test('historic untimed messages remain grouped, old envelopes default to sent only',()=>{
 const old={events:[{id:'rp-old',at:NOW,amount:10,note:''}]};
 const result=rules.timeline([{role:'user',text:'Chat cũ'}],old);
 assert.equal(result.length,2);
 assert.equal(result[0].kind,'message');
 assert.equal(result[1].packet.status,'SENT');
 assert.equal(rules.nextRecord(null,rules.evaluate({amount:10,balance:100,
  record:null,unlocked:true,now:NOW}),{id:'rp-new',at:NOW,note:''}).events[0].status,'SENT');
});
test('V32 messenger has direct gift and red-envelope actions with local Sandbox path kept',()=>{
 const chat=html.slice(html.indexOf('<!-- APP: TRÒ CHUYỆN'),html.indexOf('<!-- APP: CỬA HÀNG -->'));
 for(const name of ['dudu-v32-gift-button','dudu-v32-envelope-button','dudu-v32-mini-affinity',
 'dudu-v32-envelope-overlay','dudu-v32-envelope-note','dudu-v32-envelope-confirm']){
   assert.match(chat,new RegExp('id="'+name+'"'));
 }
 assert.match(html,/function openGiftModalFromChat\(\)/);
 assert.match(html,/function executeGiftItem\(charId, itemIdx, giftStoryId=null\)/);
 assert.match(html,/renderRedPacketEventsV32\(/);
 assert.match(html,/DuduRedPacketV32\.timeline\(history,packetRecord\)/);
 assert.match(html,/renderRedPacketEventsV32\(container,storyId,charId,entry\.packet\)/);
 assert.match(html,/role:'user',text,at:Date\.now\(\)/);
 assert.match(social,/userProfile\.currency=plan\.balanceAfter/);
 assert.match(social,/saveCurrentAccount\(\)/);
 assert.doesNotMatch(social,/\.affinity\s*=|\.trust\s*=|addExp\(|fetch\(|firestore|callGeminiAIChat/);
 assert.match(social,/commitPersonalNpcExchangeV1\('rp'/);
 assert.match(css,/dudu-v32-envelope-sheet/);
});
test('V32 live contact enables both actions only after Firebase and NPC unlock',()=>{
 const elements=new Map([
  ['dudu-v32-envelope-button',{disabled:false,textContent:'🧧 Phong bao',
    title:'',setAttribute(name,value){this[name]=value;}}],
  ['dudu-v32-gift-button',{disabled:false,title:'',textContent:'🎁 Quà'}],
  ['dudu-v32-contact-feedback',{textContent:''}]
 ]);
 const document={readyState:'complete',getElementById:id=>elements.get(id)||null,
  addEventListener(){}};
 const win={document,DuduRedPacketV32:rules};
 const auth={isReady:()=>false,uid:()=> 'u1'};
 const state={currentUsername:'u1',activeChatNovelId:'story-1'};
 const sandbox={window:win,document,IS_SANDBOX_MODE:false,DuduAuth:auth,
  currentUsername:state.currentUsername,activeChatNovelId:state.activeChatNovelId,
  novels:[{id:'story-1',characters:[{id:'npc-1',name:'NPC'}]}],
  selectedNovelIndex:0,isNpcUnlocked:()=>true,
  getStoryProgress:()=>({collectedCharacters:{'npc-1':{affinity:25}}})};
 win.DuduPersonalNpcExchangeV1={run:()=>{}};
 elements.set('chat-character-selector',{value:'npc-1'});
 vm.runInNewContext(social,sandbox,{timeout:1500});
 const packet=elements.get('dudu-v32-envelope-button');
 const gift=elements.get('dudu-v32-gift-button');
 assert.equal(packet.disabled,true);
 assert.equal(gift.disabled,true);
 auth.isReady=()=>true;
 win.syncRedPacketButtonsV32();
 assert.equal(packet.disabled,false);
 assert.equal(gift.disabled,false);
 assert.equal(gift.textContent,'🎁 Quà');
 assert.equal(packet.textContent,'🧧 Phong bao');
});
test('rendered envelope carries stable event id, timestamp and honest sent status',()=>{
 const elements=new Map([
  ['chat-character-selector',{value:'npc-1'}],
  ['dudu-v32-contact-feedback',{textContent:''}]
 ]);
 const document={readyState:'complete',getElementById:id=>elements.get(id)||null,
  addEventListener(){},createElement(tag){return {tag,children:[],dataset:{},
   append(...children){this.children.push(...children);}};}};
 const root={document,DuduRedPacketV32:rules};
 const data={collectedCharacters:{'npc-1':{affinity:40}},
  redPacketsV32:{'npc-1':{events:[{id:'rp-one',at:NOW,amount:10,note:'Chúc vui'}]}}};
 vm.runInNewContext(social,{window:root,document,IS_SANDBOX_MODE:true,
  currentUsername:'test',activeChatNovelId:'story-1',selectedNovelIndex:0,
  novels:[{id:'story-1',characters:[{id:'npc-1',name:'NPC'}]}],
  isNpcUnlocked:()=>true,getStoryProgress:()=>data},{timeout:1500});
 const container={cards:[],append(card){this.cards.push(card);}};
 root.renderRedPacketEventsV32(container,'story-1','npc-1');
 assert.equal(container.cards.length,1);
 const card=container.cards[0];
 assert.equal(card.dataset.packetId,'rp-one');
 const status=card.children.find(x=>x.className==='dudu-v32-packet-status');
 assert.match(status.textContent,/Đã gửi/);
 assert.match(status.textContent,/Chưa có hồi âm/);
 const date=card.children.find(x=>x.className==='dudu-v32-packet-time');
 assert.ok(date.textContent.length>=5);
});
