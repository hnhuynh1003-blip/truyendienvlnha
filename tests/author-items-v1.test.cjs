const {test}=require('node:test');
const assert=require('node:assert/strict');
const author=require('../js/author-items-v1.js');
const catalog=require('../js/item-catalog-v2.js');
const makeStory=()=>({id:'story-1',characters:[{id:'c1',name:'NPC A'},{id:'c2',name:'NPC B'}],
  chapters:[{id:'ch-1',title:'Chương A'},{id:'ch-2',title:'Chương B'}]});
const data=(overrides={})=>({name:'Đồng hồ',desc:'Vật phẩm kỷ niệm',rank:'A',type:'ITEM',icon:'⌚',
  npcId:'c1',method:'COLLECTION_ONLY',unique:true,giftable:false,...overrides});
test('story collectibles keep story ID, optional NPC ID and never inherit another world',()=>{
  const story=makeStory(),item=author.addOrEdit(story,data());
  assert.match(item.id,/^author-item-/);
  assert.equal(item.id,item.itemId);
  assert.equal(item.storyId,'story-1');
  assert.equal(item.chapterId,null);
  assert.equal(item.npcId,'c1');
  assert.equal(item.scope,'STORY');
  assert.equal(item.acquisition.method,'COLLECTION_ONLY');
  assert.equal(item.published,true);
  assert.equal(item.giftable,false);
  assert.equal(item.tradeable,false);
  assert.equal(item.maxOwned,1);
  assert.deepEqual(author.validateCollection(story),[]);
  assert.equal(catalog.previewDropPool().some(r=>r.id===item.id),false);
});
test('chapter collectible requires an existing chapter and matching story NPC',()=>{
  const story=makeStory();
  assert.throws(()=>author.addOrEdit(story,data(),{chapterId:'unknown'}),/Chương/);
  assert.throws(()=>author.addOrEdit(story,data({npcId:'npc-other'}),{chapterId:'ch-1'}),/NPC/);
  assert.throws(()=>author.addOrEdit(story,data({method:'CHAPTER_EVENT'})),/chương/);
  const item=author.addOrEdit(story,data({method:'CHAPTER_EVENT'}),{chapterId:'ch-1'});
  assert.equal(item.scope,'CHAPTER');
  assert.equal(item.chapterId,'ch-1');
  assert.equal(author.list(story,{chapterId:'ch-1'}).length,1);
  assert.equal(author.list(story,{chapterId:'ch-2'}).length,0);
  assert.equal(author.list(makeStory(),{chapterId:'ch-1'}).length,0);
});
test('editing stable item keeps its original ID and rejects transfer between chapters',()=>{
  const story=makeStory(),record=author.addOrEdit(story,data({rank:'E'}),{chapterId:'ch-1'});
  const changed=author.addOrEdit(story,data({name:'Món đã sửa',rank:'S'}),{chapterId:'ch-1',itemId:record.id});
  assert.equal(changed.id,record.id);
  assert.equal(changed.name,'Món đã sửa');
  assert.equal(story.specialItems.length,1);
  assert.throws(()=>author.addOrEdit(story,data(),{chapterId:'ch-2',itemId:record.id}),/chuyển vật phẩm/);
  assert.throws(()=>author.addOrEdit(story,data(),{itemId:'missing'}),/không còn/);
});
test('invalid input cannot populate author definitions',()=>{
  const story=makeStory();
  for(const invalid of [
    {name:''},{rank:'X'},{type:'COMMAND'},{desc:''},{method:'RANDOM'},{npcId:'other'},
    {method:'CHAPTER_EVENT'}]){
    assert.throws(()=>author.addOrEdit(story,data(invalid)),Error);
  }
  assert.equal(story.specialItems,undefined);
});
test('archiving never deletes old item metadata and does not grant inventory',()=>{
  const story=makeStory(),a=author.addOrEdit(story,data());
  const b=author.addOrEdit(story,data({name:'Món thứ hai'}));
  assert.equal(author.archive(story,a.id),true);
  assert.equal(author.list(story).length,1);
  assert.equal(author.list(story,{includeArchived:true}).length,2);
  assert.equal(story.specialItems.find(x=>x.id===a.id).archived,true);
  assert.equal(author.archive(story,'missing'),false);
  assert.equal(author.list(story)[0].id,b.id);
  assert.deepEqual(author.validateCollection(story),[]);
});
test('spoiler-sensitive author-defined items cannot be assigned random acquisition method',()=>{
  const story=makeStory();
  for(const method of author.METHODS)assert.notEqual(method,'RANDOM');
  const item=author.addOrEdit(story,data({name:'Ẩn dấu',method:'STORY_EVENT'}));
  assert.equal(item.acquisition.method,'STORY_EVENT');
  assert.equal(item.published,true,'Definitions are public: UI must warn author not to enter spoilers');
});
