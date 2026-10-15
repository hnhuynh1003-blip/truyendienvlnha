const {test}=require('node:test');
const assert=require('node:assert/strict');
const portraits=require('../js/npc-portrait-library-v1.js');
const persona=require('../js/npc-persona-v2-r6.js');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');

test('gallery contains 24 distinct selectable feminine portrait prototypes',()=>{
 assert.equal(portraits.CATALOG.length,24);
 assert.equal(new Set(portraits.CATALOG.map(x=>x.id)).size,24);
 for(const p of portraits.CATALOG){
  assert.equal(p.gender,'female');
  assert.match(portraits.sourceFor(p.id),/^data:image\/svg\+xml;charset=utf-8,/);
  assert.equal(portraits.preset(p.id)?.id,p.id);
 }
 assert.equal(portraits.sourceFor('no-such-id'),null);
});
test('all three existing sample NPCs are female, including initial seed IDs',()=>{
 const expected=[
  ['c2','Ôn Tri Hành'],['c4','Tô Thanh Lạc'],['c3','Thẩm Cẩm Thư'],
  ['c_otk','Ôn Tri Hành'],['c_ttl','Tô Thanh Lạc'],['c_tct','Thẩm Cẩm Thư']
 ];
 for(const [id,name] of expected){
  const obj=persona.previewNpc({id,name});
  assert.equal(obj.previewGender,'female',id);
  assert.ok(portraits.preset(obj.previewPortraitPresetId),id);
 }
 assert.equal(persona.previewNpc({id:'c2',name:'Người khác'}).previewGender,null);
});
test('uploads are scoped by uid, story and ID and not URLs',()=>{
 const a=portraits.keyFor('tester-a','story1','own-1');
 const b=portraits.keyFor('tester-b','story1','own-1');
 assert.notEqual(a,b);
 assert.equal(portraits.keyFor('','story1','own-1'),null);
 assert.match(portraits.makeId(),/^own-\d+-[a-z0-9]+$/);
});
test('gallery controls belong to character editor and not story editor',()=>{
 const start=html.indexOf('id="char-modal"');
 const end=html.indexOf('</div>\n  </div>',start);
 const storyEnd=html.indexOf('id="chapter-modal"');
 const gallery=html.indexOf('id="npc-r8-gallery"');
 assert.ok(gallery>start,'Gallery must appear after opening NPC editor');
 assert.ok(gallery>storyEnd,'Gallery must not appear in story modal');
 assert.match(html,/npcUploadPortrait\(event\)/);
 assert.match(html,/renderNpcPortraitPreview\(portrait,char,storyId\)/);
 assert.match(html,/renderNpcPortraitPreview\(preview,c,novel\.id\)/);
});
