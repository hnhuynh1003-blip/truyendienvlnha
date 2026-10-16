const {test}=require('node:test');
const assert=require('node:assert/strict');
const fun=require('../js/dudu-fun-rules-v43.js');
const day='2026-10-17';
test('Hộp mù 1 lượt/ngày, thưởng chốt trước khi chơi và giải mã 3 biểu tượng',()=>{
 const b=fun.begin(null,{type:'box',day,seed:51,roll:.02,theme:'moon'});
 assert.equal(b.ok,true);
 assert.equal(b.round.reward.amount,5);
 assert.equal(fun.begin(b.state,{type:'box',day,seed:2,roll:.97}).reason,'already-started');
 let state=b.state;
 for(const icon of fun.sequence(51)){
  const a=fun.advance(state,{type:'box',choice:icon,day});
  assert.equal(a.ok,true);state=a.state;
 }
 assert.equal(state.rounds.box.status,'ready');
 const reward=fun.claim(state,{type:'box',day,coins:50,inventory:[]});
 assert.equal(reward.ok,true);
 assert.equal(reward.coins,55);
 assert.equal(reward.state.rounds.box.status,'claimed');
 assert.equal(fun.claim(reward.state,{type:'box',day,coins:55}).ok,false);
 assert.equal(fun.progress(reward.state,day).done,1);
 const tomorrow=fun.norm(reward.state,'2026-10-18');
 assert.equal(tomorrow.rounds.box,null);
 assert.equal(tomorrow.history.length,1);
 assert.equal(fun.norm(reward.state,day).rounds.box.status,'claimed');
});
test('Hộp mù có minigame thật: chọn sai phải nhớ lại chuỗi, không reroll',()=>{
 const started=fun.begin(null,{type:'box',day,seed:29,roll:.89});
 const first=fun.advance(started.state,{type:'box',choice:29%4,day});
 assert.equal(first.round.step,1);
 const wrong=fun.advance(first.state,{type:'box',choice:(Math.floor(29/4)%4+1)%4,day});
 assert.equal(wrong.round.step,0);
 assert.deepEqual(wrong.state.rounds.box.reward,started.round.reward);
 assert.equal(fun.claim(wrong.state,{type:'box',day,coins:0}).ok,false);
 assert.equal(fun.advance(wrong.state,{type:'box',choice:9,day}).reason,'invalid-choice');
});
test('Vé số 9 ô, cào 3 ô khác nhau, lưu kết quả trước khi cào',()=>{
 const started=fun.begin(null,{type:'ticket',day,seed:254,roll:.995});
 assert.equal(started.round.reward.amount,40);
 const a=fun.advance(started.state,{type:'ticket',choice:0,day});
 assert.equal(a.round.cells.length,1);
 assert.equal(fun.advance(a.state,{type:'ticket',choice:0,day}).reason,'invalid-choice');
 const b=fun.advance(a.state,{type:'ticket',choice:5,day});
 const c=fun.advance(b.state,{type:'ticket',choice:8,day});
 assert.equal(c.round.status,'ready');
 const claimed=fun.claim(c.state,{type:'ticket',day,coins:10,inventory:[]});
 assert.equal(claimed.coins,50);
 assert.equal(fun.advance(claimed.state,{type:'ticket',choice:7,day}).ok,false);
 assert.equal(fun.progress(claimed.state,day).done,1);
});
test('Hộp mù rơi vật phẩm ID chuẩn, không sinh kỷ vật hệ thống hoặc rơi trùng',()=>{
 const started=fun.begin(null,{type:'box',day,seed:0,roll:.76});
 assert.equal(started.round.reward.kind,'ITEM');
 let state=started.state;
 for(const choice of fun.sequence(0))state=fun.advance(state,{type:'box',choice,day}).state;
 const receipt=fun.claim(state,{type:'box',day,coins:200,inventory:[]});
 assert.equal(receipt.ok,true);
 assert.equal(receipt.inventory.length,1);
 assert.equal(receipt.coins,200);
 assert.equal(receipt.inventory[0].id,'common-biscuit');
 assert.equal(receipt.inventory[0].obtainedFrom.kind,'EVENT');
 assert.equal(receipt.inventory[0].obtainedFrom.source,'DUDU_FUN');
 assert.equal(receipt.state.history.length,1);
 assert.equal(fun.claim(receipt.state,{type:'box',day,coins:200,inventory:[]}).ok,false);
 const duplicate=fun.claim(state,{type:'box',day,coins:200,inventory:receipt.inventory});
 assert.equal(duplicate.reason,'duplicate-instance');
 const full=Array.from({length:500},(_,i)=>({instanceId:'i-'+i}));
 assert.equal(fun.claim(state,{type:'box',day,coins:200,inventory:full}).reason,'inventory-full');
});
test('Ngày mới không cộng lại thành tích cũ; dữ liệu giả không được cấp thưởng',()=>{
 const invalid={version:1,day,rounds:{box:{type:'box',day,status:'ready',
  reward:{kind:'ITEM',itemId:'dudu-first-chapter'},seed:0,step:3}}};
 assert.equal(fun.claim(invalid,{type:'box',day,coins:50,inventory:[]}).ok,false);
 assert.equal(fun.begin(null,{type:'box',day,seed:42,roll:1}).ok,false);
 assert.equal(fun.begin(null,{type:'box',day,seed:42,roll:-.1}).ok,false);
 assert.equal(fun.begin(null,{type:'box',day,seed:42,roll:0}).ok,true);
 assert.equal(fun.norm(null,day).history.length,0);
});
