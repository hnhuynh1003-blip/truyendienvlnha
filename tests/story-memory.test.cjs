const {test}=require('node:test');
const assert=require('node:assert/strict');
const memory=require('../js/story-memory.js');

const irrelevant=[
  {role:'user',text:'Hôm nay trời có đẹp không?'},
  {role:'model',text:'Tôi không biết hôm nay bầu trời ra sao.'}
];
function withRecent(everyOld) {
  return [...everyOld,...Array.from({length:4},()=>irrelevant).flat()];
}
test('recall connects relevant actual older NPC dialogue without fabricating facts',()=>{
  const old=[
    {role:'user',text:'Tôi đã nhặt một chiếc chìa khóa vàng dưới giếng đá.'},
    {role:'model',text:'Tôi thấy bạn giữ chìa khóa vàng; đừng làm mất nó.'}
  ];
  const history=withRecent(old);
  const result=memory.recall(history,'Bạn còn nhớ chiếc chìa khóa vàng không?');
  assert.equal(result.length,2);
  assert.match(result[0].text,/chìa khóa vàng/);
  assert.match(result[1].text,/đừng làm mất/);
  assert.deepEqual(history.slice(0,2),old,'Original chat must remain unchanged');
});

test('no match or casual greeting gives zero historical excerpts',()=>{
  const history=withRecent([
    {role:'user',text:'Chìa khóa vàng nằm dưới giếng đá.'},
    {role:'model',text:'Tôi đã nhìn thấy chiếc chìa khóa.'}
  ]);
  assert.deepEqual(memory.recall(history,'Chào nhé'),[]);
  assert.deepEqual(memory.recall(history,'Bạn thích uống nước dừa không?'),[]);
});

test('scripted fluff and error/system bubbles are not promoted into NPC memory',()=>{
  const history=withRecent([
    {role:'user',text:'Tôi chào bạn lúc tìm chìa khóa vàng'},
    {role:'model',text:'Chào nhé! Bạn có chuyện gì?',source:'script'},
    {role:'system',text:'Lỗi hệ thống'},
    {role:'user',text:'Tôi tìm thấy chìa khóa vàng ở hang'},
    {role:'model',text:'Tôi nhìn thấy chiếc chìa khóa ấy.'}
  ]);
  const recalled=memory.recall(history,'Bạn có nhớ chìa khóa vàng không?');
  assert.equal(recalled.length,2);
  assert.match(recalled[0].text,/ở hang/);
  assert.equal(recalled.some(m=>m.text.includes('Chào nhé')),false);
});

test('retrieval is bounded and preserves chronological order',()=>{
  const pair=(place)=>[
    {role:'user',text:'Chìa khóa vàng '+place+' '+'x'.repeat(1000)},
    {role:'model',text:'Tôi thấy chìa khóa vàng '+place+' '+'x'.repeat(900)}
  ];
  const history=withRecent([...pair('cửa hang'),...pair('giếng đá'),...pair('trong tủ')]);
  const result=memory.recall(history,'Những chìa khóa vàng trước đây');
  assert.ok(result.length<=4);
  assert.ok(result.every(m=>m.text.length<=220));
  assert.equal(result[0].role,'user');
  assert.equal(result[1].role,'model');
});
