const {test}=require('node:test');
const assert=require('node:assert/strict');
const portraits=require('../js/npc-portrait-library-v1.js');
const persona=require('../js/npc-persona-v2-r6.js');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');

test('R10 gallery has 60 female and 12 male selectable portraits; no neutral in picker',()=>{
 assert.equal(portraits.CATALOG.length,76);
 assert.equal(portraits.search({gender:'female'}).length,64);
 assert.equal(portraits.search({gender:'male'}).length,12);
 assert.equal(portraits.GENDERS.includes('neutral'),false);
 assert.equal(portraits.search({world:'historical'}).length,24);
 assert.equal(portraits.search({gender:'female',world:'historical'}).length,20);
 assert.equal(portraits.search({query:'portrait-a-01'}).length,1);
 assert.equal(portraits.search({gender:'female',query:'LẠNH LÙNG'}).length,0);
 assert.equal(portraits.search({gender:'male',world:'fantasy'}).length,4);
 assert.equal(new Set(portraits.CATALOG.map(x=>x.id)).size,76);
 for(const p of portraits.CATALOG){
  assert.ok(['female','male'].includes(p.gender));
  if(p.kind==='anime')assert.equal(portraits.sourceFor(p.id),null);
  else assert.match(portraits.sourceFor(p.id),/^data:image\/svg\+xml;charset=utf-8,/);
  assert.equal(portraits.preset(p.id)?.id,p.id);
 }
 assert.equal(portraits.sourceFor('no-such-id'),null);
});
test('R10 retains every legacy male/neutral ID as a read-only compatible portrait',()=>{
 assert.equal(portraits.LEGACY.length,36);
 assert.equal(portraits.search({query:'portrait-n-01'}).length,0);
 for(let i=1;i<=24;i++){
  const f='portrait-f-'+String(i).padStart(2,'0');
  assert.equal(portraits.preset(f).gender,'female');
 }
 for(let i=13;i<=24;i++){
  const m='portrait-m-'+String(i).padStart(2,'0');
  assert.equal(portraits.preset(m).gender,'male');
  assert.equal(portraits.preset(m).legacy,true);
  assert.match(portraits.sourceFor(m),/^data:image\/svg\+xml/);
 }
 for(let i=1;i<=24;i++){
  const n='portrait-n-'+String(i).padStart(2,'0');
  assert.equal(portraits.preset(n).gender,'neutral');
  assert.equal(portraits.preset(n).legacy,true);
  assert.match(portraits.sourceFor(n),/^data:image\/svg\+xml/);
 }
 const ids=[...portraits.CATALOG,...portraits.LEGACY].map(x=>x.id);
 assert.equal(new Set(ids).size,112);
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
 assert.match(html,/id="npc-r9-gender"/);
 assert.match(html,/72 ảnh anime premium \(60 nữ, 12 nam\) \+ 4 ảnh bổ sung\./);
 assert.doesNotMatch(html,/<option value="neutral">Trung tính<\/option>/);
 assert.match(html,/class="dudu-v39-portrait-picker"/);
 assert.match(html,/id="npc-r9-world"/);
 assert.match(html,/id="npc-r9-search"/);
 assert.match(html,/js\/npc-portrait-v39\.js/);
 assert.match(html,/npcUploadPortrait\(event\)/);
 assert.match(html,/renderNpcPortraitPreview\(portrait,char,storyId\)/);
 assert.match(html,/renderNpcPortraitPreview\(preview,c,novel\.id\)/);
});
