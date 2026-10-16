const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../js/story-market-v43.js');
const story={id:'story-a',title:'Bối cảnh phép thuật',chapters:[
  {id:'c1',title:'Mở đầu',storyItemIds:['story-secret']},
  {id:'c2',title:'Bí ẩn',storyItemIds:[]}
 ],specialItems:[
  {id:'story-free',name:'Huy Hiệu Công Khai',rank:'C',type:'ITEM',scope:'STORY',
   storyId:'story-a',chapterId:null,acquisition:{method:'COLLECTION_ONLY'},published:true},
  {id:'story-secret',name:'Điều Bí Mật',rank:'SSS',type:'ITEM',scope:'STORY',
   storyId:'story-a',chapterId:null,acquisition:{method:'STORY_EVENT'},published:true},
  {id:'ch-secret',name:'Vật phẩm chương 2',rank:'S',type:'ITEM',scope:'CHAPTER',
   storyId:'story-a',chapterId:'c2',acquisition:{method:'CHAPTER_EVENT'},published:true},
  {id:'arch',name:'Đã lưu trữ',rank:'B',type:'ITEM',scope:'STORY',
   storyId:'story-a',chapterId:null,acquisition:{method:'STORY_EVENT'},published:true,archived:true},
  {id:'wrong',name:'Sai truyện',rank:'F',type:'ITEM',scope:'STORY',
   storyId:'other',chapterId:null,acquisition:{method:'COLLECTION_ONLY'},published:true}
]};
test('public story preview shows only safe metadata and hides unreached chapters',()=>{
 const input=structuredClone(story);
 const first=core.index({stories:[input],storyId:'story-a',readRewards:{}});
 assert.deepEqual(first.items.map(i=>i.id),['story-free']);
 assert.equal(first.hidden,2);
 assert.equal(first.items[0].forSale,false);
 assert.equal(first.items[0].claimable,false);
 assert.equal(first.items[0].verified,false);
 assert.deepEqual(input,story,'read-only index never rewrites library');
 const seen=core.index({stories:[story],storyId:'story-a',readRewards:{'story-a_c1':true}});
 assert.deepEqual(seen.items.map(i=>i.id),['story-free','story-secret']);
 assert.equal(seen.hidden,1);
 const all=core.index({stories:[story],storyId:'story-a',
   readRewards:{'story-a_c1':true,'story-a_c2':true}});
 assert.equal(all.hidden,0);
 assert.equal(all.items[2].chapterTitle,'Bí ẩn');
 assert.deepEqual(core.index({stories:[story],storyId:'other'}).items,[]);
});
test('do not use unrelated read keys, invalid authors or archivables to leak catalog',()=>{
 const s=structuredClone(story);
 s.specialItems.push({...s.specialItems[0],id:'never',published:false});
 s.specialItems.push({...s.specialItems[0],id:'rng',acquisition:{method:'RANDOM'}});
 s.specialItems.push({...s.specialItems[0],id:'story-free',name:'Duplicate'});
 assert.equal(core.index({stories:[s],storyId:'story-a',readRewards:{other_c2:true}}).items.length,1);
 assert.equal(core.options([s,s,{id:'story-b',title:'Khác'}]).length,2);
 assert.equal(core.index({stories:[],storyId:'story-a'}).story,null);
});
