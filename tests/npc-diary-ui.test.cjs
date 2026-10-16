const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const diary=require('../js/npc-diary-ui.js');
const memory=require('../js/npc-memory-v2.js');

function storage(){
 const map=new Map();
 return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),
  removeItem:k=>map.delete(k)};
}
test('NPC diary shows only existing, owner/story/NPC scoped memory in local sandbox',()=>{
 const disk=storage();
 const own=memory.open(disk,'tester','story-a','npc-a',true);
 own.addExchange('Tôi thích hoa đào','Tôi đã nghe lời bạn nói.','turn-a',10000);
 own.addGift('Hoa đào','D','gift-a',22000);
 for(const args of [
  ['other','story-a','npc-a',true],['tester','story-b','npc-a',true],
  ['tester','story-a','npc-b',true],['tester','story-a','npc-a',false]
 ])assert.deepEqual(diary.rows(memory.open(disk,...args)),[]);
 const view=diary.rows(own);
 assert.equal(view.length,2);
 assert.equal(view[0].kind,'gift');
 assert.equal(view[0].secondary,'Chưa xác minh trên máy chủ');
 assert.equal(view[1].primary,'Tôi thích hoa đào');
 assert.equal(view[1].secondary,'Tôi đã nghe lời bạn nói.');
});
test('NPC diary is read-only, bounded and cannot turn chat into author canon',()=>{
 const disk=storage(),m=memory.open(disk,'a','b','c',true);
 for(let i=0;i<20;i++)m.addExchange('Ghi chép '+i,'NPC trả lời '+i,'turn-'+i,i*10000+100);
 const before=JSON.stringify(m.list());
 const list=diary.rows(m);
 assert.equal(list.length,8);
 assert.equal(list[0].primary,'Ghi chép 19');
 assert.equal(JSON.stringify(m.list()),before);
 assert.equal(diary.rows(null).length,0);
 const src=fs.readFileSync(path.join(__dirname,'../js/npc-diary-ui.js'),'utf8');
 assert.match(src,/textContent=entry\.primary/);
 assert.match(src,/textContent=entry\.secondary/);
 assert.doesNotMatch(src,/innerHTML\s*=|\.set\(|\.addGift\(|\.addExchange\(|\bfetch\(/);
});
test('Diary integrates through compact plus menu without modifying existing save schema',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/js\/npc-diary-ui\.js/);
 assert.match(html,/css\/npc-diary-ui\.css/);
 const src=fs.readFileSync(path.join(__dirname,'../js/npc-diary-ui.js'),'utf8');
 assert.match(src,/\.dudu-v33-menu/);
 assert.match(src,/IS_SANDBOX_MODE/);
 assert.match(src,/isNpcUnlocked/);
 assert.match(src,/MutationObserver/);
});