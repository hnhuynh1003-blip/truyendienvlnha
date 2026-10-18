const {test}=require('node:test');
const assert=require('node:assert/strict');
const ctx=require('../js/npc-context-v56-10.js');
function alternating(messages){
 assert.ok(messages.length>=1&&messages.length<=12);
 assert.equal(messages[0].role,'user');
 assert.equal(messages.at(-1).role,'user');
 messages.forEach((m,i)=>{
  assert.ok(m.text.trim());
  if(i)assert.notEqual(messages[i-1].role,m.role,'consecutive '+m.role+' entries');
 });
}
test('V56.10 short conversation starts with user and preserves latest request',()=>{
 const recent=[{role:'user',text:'Xin chào'}];
 const result=ctx.compose(recent);
 alternating(result);
 assert.equal(result.at(-1).text,'Xin chào');
});
test('V56.10 5+ exchanges with a dangling model at recent window start remain valid',()=>{
 const messages=[];
 for(let i=1;i<=9;i++){
  messages.push({role:'user',text:'Câu hỏi '+i});
  if(i<9)messages.push({role:'model',text:'NPC đáp '+i});
 }
 const window=messages.slice(-8); // model first, user last
 assert.equal(window[0].role,'model');
 const original=JSON.stringify(messages);
 const result=ctx.compose(window);
 alternating(result);
 assert.equal(result[0].text,'Câu hỏi 6');
 assert.equal(result.at(-1).text,'Câu hỏi 9');
 assert.equal(JSON.stringify(messages),original,'must not mutate saved V55/V56 history');
});
test('V56.10 recalled older pairs plus memory do not create consecutive user turns',()=>{
 const current=[
  {role:'model',text:'previous reply'},
  {role:'user',text:'What happened?'}
 ];
 const recalled=[{role:'user',text:'Old question'},{role:'model',text:'Old answer'}];
 const result=ctx.compose(current,recalled,'Quoted untrusted chat note',12,9500);
 alternating(result);
 assert.equal(result.length,3);
 assert.equal(result[0].text,'Old question');
 assert.match(result[2].text,/Quoted untrusted chat note/);
 assert.match(result[2].text,/What happened\?/);
});
test('V56.10 outstanding unanswered requests and role duplicates are merged, not deleted',()=>{
 const history=[
  {role:'user',text:'First pending'},
  {role:'user',text:'Second pending'},
  {role:'model',text:'One answer'},
  {role:'user',text:'Next request'}
 ];
 const result=ctx.compose(history);
 alternating(result);
 assert.match(result[0].text,/First pending/);
 assert.match(result[0].text,/Second pending/);
 assert.equal(result.at(-1).text,'Next request');
});
test('V56.10 too many messages discard older context, keeping latest question',()=>{
 const all=[];
 for(let i=0;i<12;i++)all.push({role:i%2===0?'user':'model',text:'short '+i});
 all.push({role:'user',text:'Newest question'});
 const result=ctx.compose(all,[], '',8,9500);
 alternating(result);
 assert.ok(result.length<=8);
 assert.equal(result.at(-1).text,'Newest question');
});
test('V56.10 oversized context is shortened by dropping older pairs, never truncating live question',()=>{
 const all=[];
 for(let i=0;i<5;i++)all.push({role:'user',text:'ask '+i+' '+'x'.repeat(800)},
  {role:'model',text:'answer '+i+' '+'y'.repeat(800)});
 all.push({role:'user',text:'Final request'});
 const result=ctx.compose(all,[],'',12,2000);
 alternating(result);
 assert.equal(result.at(-1).text,'Final request');
 assert.ok(result.reduce((n,m)=>n+m.text.length,0)<=2000);
});
test('V56.10 no latest user yields empty request, does not call AI',()=>{
 assert.deepEqual(ctx.compose([{role:'model',text:'reply'}]),[]);
 assert.deepEqual(ctx.compose([{role:'system',text:'untrusted'}]),[]);
});
