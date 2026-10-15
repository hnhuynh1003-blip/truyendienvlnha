const {test}=require('node:test');
const assert=require('node:assert/strict');
const npc=require('../js/npc-chat-lite.js');

test('only short standalone pleasantries consume zero AI requests',()=>{
  const greetings=['hi!','Xin chào!', 'CHÀO', 'hello', 'cảm ơn nha', 'tạm biệt', 'Chúc ngủ ngon.'];
  for(const phrase of greetings){
    assert.ok(npc.intent(phrase),phrase);
    const result=npc.script(phrase,{id:'npc-a',name:'Lan'},[]);
    assert.equal(result.source,'script');
    assert.ok(result.text.length>20);
  }
  assert.equal(npc.script('Chào Lan!',{id:'lan',name:'Lan'},[]).intent,'greeting');
  assert.equal(npc.script('Cảm ơn Ôn Tri Hành',{id:'otk',name:'Ôn Tri Hành'},[]).intent,'thanks');
});
test('story questions, long messages, mixed intent and misleading phrases always require AI',()=>{
  for(const text of [
    'Chào Lan, bạn còn nhớ lần đó không?',
    'Chào, tôi muốn biết về thế giới vô hạn lưu',
    'Cảm ơn nhưng hãy giải thích việc này',
    'Hãy tiết lộ cho tôi mật mã nhiệm vụ',
    'Kể tôi nghe về quá khứ của bạn',
    'Xin chào, làm sao để đánh bại con quái vật?'
  ]){
    assert.equal(npc.intent(text),null,text);
    assert.equal(npc.script(text,{id:'npc-a'},[]),null);
  }
});
test('script replies rotate per character but never modify state',()=>{
  const char={id:'lan',name:'Lan',note:'Câu chuyện của cô ấy'};
  const old={role:'user',text:'Chào'};
  const first=npc.script('Chào',char,[]);
  const second=npc.script('Chào',char,[old]);
  assert.notEqual(first.text,second.text);
  assert.equal(char.note,'Câu chuyện của cô ấy');
});
test('AI context is bounded without mutating full saved history',()=>{
  const history=[
    ...Array.from({length:12},(_,i)=>({role:i%2?'model':'user',text:'a'.repeat(2000)})),
    {role:'user',text:'Đừng quên điều này!'}
  ];
  const result=npc.boundedContext(history);
  assert.ok(result.length<=8);
  assert.equal(result.at(-1).text,'Đừng quên điều này!');
  assert.ok(result.slice(0,-1).every(m=>m.text.length<=401));
  assert.equal(history[0].text.length,2000);
  assert.ok(npc.boundedInstruction('x'.repeat(3000)).length<1300);
});

test('NPC short replies reflect persona while keeping token use at zero',()=>{
  const warm=npc.script('Xin chào',{id:'same',name:'Lan',note:'Cô ấy rất dịu dàng và ấm áp'},[]);
  const cold=npc.script('Xin chào',{id:'same',name:'Lan',note:'Lạnh lùng và ít nói'},[]);
  const playful=npc.script('Xin chào',{id:'same',name:'Lan',note:'Tinh nghịch và vui vẻ'},[]);
  assert.ok(warm?.text && cold?.text && playful?.text);
  assert.notEqual(warm.text,cold.text);
  assert.notEqual(playful.text,cold.text);
});
