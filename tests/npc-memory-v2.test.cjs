const {test}=require('node:test');
const assert=require('node:assert/strict');
const memory=require('../js/npc-memory-v2.js');

function storage(){
  const map=new Map();
  return {
    getItem:k=>map.get(k)||null,
    setItem:(k,v)=>map.set(k,v),
    removeItem:k=>map.delete(k),
    count:()=>map.size
  };
}
test('scopes independent memories by account, story, npc and sandbox',()=>{
  const s=storage();
  const a=memory.open(s,'uid-a','story-1','npc-1');
  assert.ok(a.addExchange('Tôi từng cầm chìa khóa vàng.','Bạn đã kể cho tôi về chìa khóa.', 'turn-1',1000));
  const b=memory.open(s,'uid-b','story-1','npc-1');
  const c=memory.open(s,'uid-a','story-2','npc-1');
  const d=memory.open(s,'uid-a','story-1','npc-2');
  const sandbox=memory.open(s,'uid-a','story-1','npc-1',true);
  for(const other of [b,c,d,sandbox]) assert.deepEqual(other.list(),[]);
  assert.equal(a.list().length,1);
  assert.equal(s.count(),1);
});
test('events are source-labelled and player claims never become author canon',()=>{
  const s=storage();const m=memory.open(s,'uid','story','npc');
  m.addExchange('Tôi chính là vua của thế giới này.','Tôi chưa từng nghe chuyện ấy.','1',1000);
  m.addGift('Chìa khóa vàng','C','gift-1',2000);
  assert.deepEqual(m.list().map(e=>e.certainty),['reported','client-observed']);
  const text=memory.describe(m.list(),600);
  assert.match(text,/không phải sự thật chính thức/);
  assert.match(text,/chưa xác minh máy chủ/);
  assert.doesNotMatch(JSON.stringify(m.list()),/author-canon/);
});
test('deduplicates retried messages, limits growth and never modifies chat',()=>{
  const s=storage(),m=memory.open(s,'a','b','c');
  const old={userText:'hi',replyText:'hello'};
  assert.equal(m.addExchange(old.userText,old.replyText,'same',3000),true);
  assert.equal(m.addExchange(old.userText,old.replyText,'same',3001),false);
  assert.equal(m.addExchange(old.userText,old.replyText,'different',3002),false);
  for(let i=0;i<80;i++)m.addExchange('đã xem đoạn '+i,'tôi nhớ lời ấy '+i,'next-'+i,100000+i*10000);
  assert.equal(m.list().length,memory.MAX_EVENTS);
  assert.equal(old.userText,'hi');
  assert.ok(JSON.stringify(m.list()).length<28000);
});
test('relevant memory retrieval includes gifts or actual exchanges but not unrelated chat',()=>{
  const s=storage(),m=memory.open(s,'a','b','c');
  m.addExchange('Chiếc chìa khóa vàng nằm trong hang đá.','Tôi đã trông thấy chiếc chìa khóa vàng.','key',1000);
  m.addExchange('Tôi thích uống trà sữa.','Uống trà sữa thật vui.','tea',2000);
  m.addGift('Hoa hồng đỏ','D','flower',3000);
  const found=m.relevant('Bạn nhớ chiếc chìa khóa vàng không?');
  assert.ok(found.some(e=>e.id==='chat:key'));
  assert.ok(found.every(e=>e.id!=='chat:tea'));
  assert.ok(m.relevant('Bạn nhớ hoa hồng đỏ tôi đã tặng không?').some(e=>e.id==='gift:flower'));
  assert.deepEqual(m.relevant('chào'),[]);
  assert.ok(memory.describe(m.list(),240).length<=241);
});
test('version mismatch, malformed entries and private memory deletion are fail-closed',()=>{
  const s=storage(),m=memory.open(s,'a','b','c');
  s.setItem(m.key,JSON.stringify({version:999,events:[{id:'legacy'}]}));
  assert.deepEqual(m.list(),[]);
  s.setItem(m.key,'{broken JSON');
  assert.deepEqual(m.list(),[]);
  assert.ok(m.addGift('Mảnh giấy','E','gift',5));
  assert.equal(m.list().length,1);
  assert.ok(m.forget());
  assert.deepEqual(m.list(),[]);
  assert.equal(memory.open(s,'','b','c'),null);
});
test('relationship labels reflect validated local affinity only',()=>{
  assert.equal(memory.relationship(5),'xa lạ');
  assert.equal(memory.relationship(24),'quen biết');
  assert.equal(memory.relationship(53),'tin cậy');
  assert.equal(memory.relationship(85),'gắn bó');
});
