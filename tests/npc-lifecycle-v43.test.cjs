const {test}=require('node:test');
const assert=require('node:assert/strict');
const life=require('../js/npc-lifecycle-v43.js');
function storage(){
 const map=new Map();
 return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),
   removeItem:k=>map.delete(k),keys:()=>[...map.keys()]};
}
test('renaming NPC updates only author-owned fields by stable ID',()=>{
 const reader={collectedCharacters:{npc_1:{name:'Tên cũ',role:'Cũ',
  affinity:91,relationshipV2:{trust:44},gifts:[1,2],lastGiftAt:1222},
  npc_2:{name:'Nhân vật khác',affinity:40}}};
 const story={id:'world-a',title:'Truyện mới',characters:[{id:'npc_1',
  name:'Tên mới',role:'Người giữ lời hứa',note:'Tính cách mới',
  portraitPresetId:'portrait-f-25',archived:false}]};
 const prev=structuredClone(reader.collectedCharacters.npc_2);
 assert.equal(life.updateLinked(story,reader),1);
 assert.deepEqual(reader.collectedCharacters.npc_1.relationshipV2,{trust:44});
 assert.equal(reader.collectedCharacters.npc_1.affinity,91);
 assert.deepEqual(reader.collectedCharacters.npc_1.gifts,[1,2]);
 assert.equal(reader.collectedCharacters.npc_1.name,'Tên mới');
 assert.equal(reader.collectedCharacters.npc_1.portraitPresetId,'portrait-f-25');
 assert.equal(reader.collectedCharacters.npc_1.note,'Tính cách mới');
 assert.deepEqual(reader.collectedCharacters.npc_2,prev);
 assert.equal(life.updateLinked(story,reader),0,'Must not churn account saves');
});
test('removing author portrait and archiving keep existing reader link intact',()=>{
 const reader={collectedCharacters:{id:{name:'Cũ',portraitPresetId:'preset-old',
  affinity:80,relationshipV2:{trust:28},linkedVia:'sandbox-soul-v43'}}};
 const story={id:'a',title:'A',characters:[{id:'id',name:'Mới',archived:true}]};
 life.updateLinked(story,reader);
 assert.equal(reader.collectedCharacters.id.portraitPresetId,undefined);
 assert.equal(reader.collectedCharacters.id.archived,true);
 assert.equal(reader.collectedCharacters.id.affinity,80);
 assert.equal(reader.collectedCharacters.id.linkedVia,'sandbox-soul-v43');
 story.characters[0].archived=false;
 life.updateLinked(story,reader);
 assert.equal(reader.collectedCharacters.id.archived,false);
});
test('reader hidden contacts scoped to account/story and separated from Sandbox/live',()=>{
 const disk=storage();
 assert.equal(life.toggleHidden(disk,'reader-a','story-a','npc-a',true,true),true);
 assert.deepEqual(life.readHidden(disk,'reader-a','story-a',true),['npc-a']);
 for(const [uid,story,sandbox] of [
  ['reader-b','story-a',true],['reader-a','story-b',true],['reader-a','story-a',false]])
  assert.deepEqual(life.readHidden(disk,uid,story,sandbox),[]);
 assert.equal(life.visibleContact({id:'npc-a'},['npc-a'],'all'),false);
 assert.equal(life.visibleContact({id:'npc-a'},['npc-a'],'hidden'),true);
 assert.equal(life.visibleContact({id:'npc-old',archived:true},[],'all'),false);
 assert.equal(life.visibleContact({id:'npc-old',archived:true},[],'hidden'),true);
 assert.equal(life.toggleHidden(disk,'reader-a','story-a','npc-a',true,false),true);
 assert.deepEqual(life.readHidden(disk,'reader-a','story-a',true),[]);
 assert.equal(disk.keys().length,0);
});
test('bad hidden records and invalid IDs fail closed without writes',()=>{
 const disk=storage();
 assert.equal(life.toggleHidden(disk,'','a','npc',true,true),false);
 assert.equal(life.toggleHidden(disk,'u','a','',true,true),false);
 disk.setItem(life.hiddenKey('u','a',true),'invalid');
 assert.deepEqual(life.readHidden(disk,'u','a',true),[]);
 assert.equal(life.visibleContact({id:'a'},[],'all'),true);
});
