'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../js/epub-bulk-replace-l2d4.js');
const one={id:'chapter-0001',title:'Chương 1',editVersion:2,
 content:'kỳ an đến thượng hải.\nKỲ AN gặp Kỳ An.\nKỳ An gặp thiên an môn.'};
const two={id:'chapter-0002',title:'Chương 2',content:'Tại thượng hải, kỳ an suy nghĩ.'};
const rules=[{from:'kỳ an',to:'Kỳ An'},{from:'thượng hải',to:'Thượng Hải'}];

test('Multiple rules find lowercased proper nouns across chapters without touching correct spelling',()=>{
 const plan=engine.prepare([one,two],rules);
 assert.equal(plan.total,5);
 assert.deepEqual(plan.chapters.map(ch=>ch.hits.length),[3,2]);
 assert.equal(plan.conflictCount,0);
 assert.ok(plan.hits.every(h=>h.matched!==h.replacement));
 assert.equal(plan.hits[0].before,'');
 assert.equal(plan.hits[0].matched,'kỳ an');
 assert.equal(plan.hits[0].replacement,'Kỳ An');
});
test('Applying ONLY explicitly selected hits preserves punctuation, line breaks and original inputs',()=>{
 const plan=engine.prepare([one,two],rules);
 assert.equal(engine.selectedPatches(plan,[]).chaptersChanged,0);
 const chosen=plan.hits.filter(h=>h.chapterId==='chapter-0001'&&h.ruleIndex===0);
 const patch=engine.selectedPatches(plan,chosen.map(h=>h.id));
 assert.equal(patch.chaptersChanged,1);
 assert.equal(patch.occurrencesChanged,2);
 assert.equal(patch.patches[0].expectedContent,one.content);
 assert.equal(patch.patches[0].expectedVersion,2);
 assert.match(patch.patches[0].content,/Kỳ An đến thượng hải\.\nKỳ An gặp Kỳ An\./);
 assert.equal(one.content.startsWith('kỳ an'),true,'Source remains untouched');
});
test('Unicode whole-word matching does not corrupt longer names or URL text',()=>{
 const content='An gặp Annie và an. An-nhiên ở https://example.org/an và www.example.org/an';
 const plan=engine.prepare([{id:'chapter-0001',content}], [{from:'an',to:'An'}]);
 assert.equal(plan.total,1);
 assert.equal(plan.hits[0].matched,'an');
 assert.equal(plan.hits[0].before.endsWith('và '),true);
 const whole=engine.prepare([{id:'chapter-0001',content:'ký an ký an-nhiên'}],[{from:'an',to:'An'}]);
 assert.equal(whole.total,2);
});
test('Case-sensitive matching and literal punctuation are supported',()=>{
 const plan=engine.prepare([{id:'chapter-0001',content:'A.B a.b A_B'}],[
  {from:'a.b',to:'X',caseSensitive:true},
  {from:'A.B',to:'Tên Viết Hoa',caseSensitive:true}
 ]);
 assert.equal(plan.total,2);
 assert.deepEqual(plan.hits.map(h=>h.matched),['A.B','a.b']);
 assert.equal(engine.selectedPatches(plan,plan.hits.map(h=>h.id)).patches[0].content,
  'Tên Viết Hoa X A_B');
});
test('Overlapping rules are visible and cannot both be selected',()=>{
 const plan=engine.prepare([{id:'chapter-0001',content:'Kỳ An đến nơi'}],[
  {from:'Kỳ An',to:'Kỳ Bình'},{from:'An',to:'Anh'}
 ]);
 assert.equal(plan.total,2);
 assert.equal(plan.conflictCount,1);
 assert.equal(plan.chapters[0].conflicts[0].length,2);
 assert.throws(()=>engine.selectedPatches(plan,plan.hits.map(h=>h.id)),/chồng lên nhau/);
 assert.equal(engine.selectedPatches(plan,[plan.hits[0].id]).patches[0].content,'Kỳ Bình đến nơi');
});
test('Replacement rules use original text and never cascade within a batch',()=>{
 const plan=engine.prepare([{id:'chapter-0001',content:'An đi gặp Bình'}],[
  {from:'An',to:'Bình',caseSensitive:true},{from:'Bình',to:'Cường',caseSensitive:true}
 ]);
 const result=engine.selectedPatches(plan,plan.hits.map(h=>h.id));
 assert.equal(result.patches[0].content,'Bình đi gặp Cường');
});
test('Bad rules, duplicate chapter IDs and unknown selections are rejected without writes',()=>{
 assert.throws(()=>engine.prepare([one],[{from:'',to:'tên'}]),/thiếu từ/);
 assert.throws(()=>engine.prepare([one],[{from:'a',to:''}]),/thiếu từ/);
 assert.throws(()=>engine.prepare([one],[{from:'a',to:'a'}]),/thiếu từ/);
 assert.throws(()=>engine.prepare([one,one],rules),/trùng mã/);
 assert.throws(()=>engine.prepare([{id:'a/',content:'x'}],rules),/mã/);
 const plan=engine.prepare([one],rules);
 assert.throws(()=>engine.selectedPatches(plan,['unknown']),/không thuộc/);
 assert.throws(()=>engine.selectedPatches(plan,[plan.hits[0].id,plan.hits[0].id]),/bị trùng/);
 assert.equal(typeof engine.save,'undefined');
 assert.equal(typeof engine.apply,'undefined');
});
test('Chapter length is checked after substitution',()=>{
 const content='x'.repeat(219999)+'A';
 const plan=engine.prepare([{id:'chapter-0001',content}], [{from:'A',to:'ABC',wholeWord:false}]);
 assert.throws(()=>engine.selectedPatches(plan,plan.hits.map(h=>h.id)),/vượt giới hạn/);
});
