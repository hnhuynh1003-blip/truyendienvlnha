const {test}=require('node:test');
const assert=require('node:assert/strict');
const Editor=require('../js/npc-editor-v1.js');
function story(){
  return {id:'story-x',characters:[
    {id:'c-old',name:'Người cũ',aliases:['Cố nhân']},
    {id:'c-new',name:'Bạn mới'},
    {id:'c-typo',name:'Sai tên'}],
    chapters:[{id:'ch1',characterIds:['c-old']},
      {id:'ch2',characterIds:['c-old','c-new']}],
    specialItems:[{id:'relic-1',npcId:'c-old',archived:false}]};
}
test('collapsed editor shows only chosen NPC and expanded shows only active NPC',()=>{
  const s=story();
  assert.deepEqual(Editor.visible(s,[],false).map(n=>n.id),[]);
  assert.deepEqual(Editor.visible(s,['c-old'],false).map(n=>n.id),['c-old']);
  assert.deepEqual(Editor.visible(s,['c-old'],true).map(n=>n.id),['c-old','c-new','c-typo']);
  assert.deepEqual(Editor.visible(s,[],true,'cố nhân').map(n=>n.id),['c-old']);
});
test('archival preserves NPC ID, chapter links and special item bindings',()=>{
  const s=story();
  const before=structuredClone(s);
  const refs=Editor.usage(s,'c-old');
  assert.deepEqual(refs.chapterIds,['ch1','ch2']);
  assert.equal(refs.chapterCount,2);
  assert.equal(refs.itemCount,1);
  Editor.archive(s,'c-old');
  assert.equal(s.characters[0].archived,true);
  assert.deepEqual(s.chapters,before.chapters);
  assert.deepEqual(s.specialItems,before.specialItems);
  assert.equal(s.characters[0].id,'c-old');
  assert.deepEqual(Editor.visible(s,[],true).map(n=>n.id),['c-new','c-typo']);
  assert.deepEqual(Editor.visible(s,['c-old'],false).map(n=>n.id),['c-old']);
  Editor.restore(s,'c-old');
  assert.equal(s.characters[0].archived,false);
  assert.equal(Editor.activeCount(s),3);
});
test('a typo character can be archived without deleting other characters',()=>{
  const s=story();
  assert.deepEqual(Editor.usage(s,'c-typo').chapterIds,[]);
  Editor.archive(s,'c-typo');
  assert.equal(s.characters.length,3);
  assert.deepEqual(Editor.visible(s,[],true).map(n=>n.id),['c-old','c-new']);
});
