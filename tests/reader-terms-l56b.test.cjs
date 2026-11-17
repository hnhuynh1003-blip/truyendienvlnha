'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const terms=require('../js/reader-terms-l56b.js');
function storage(){
 const data=new Map();
 return {data,getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
}
const storyA='web:a',storyB='epub:b';
test('L5.6B detects real local phrases and counts exact chapter occurrences',()=>{
 const result=terms.analyze('Tu vi tăng. Tu vi cao, nhưng linh căn yếu. Tu vĩ không liên quan.');
 assert.equal(result.find(r=>terms.fold(r.term)==='tu vi').count,2);
 assert.equal(result.find(r=>terms.fold(r.term)==='linh căn').count,1);
 assert.ok(result.every(r=>r.kind==='termCandidate'&&r.auto===false));
});
test('L5.6B never invents terms based only on syllables or unrelated phrases',()=>{
 assert.deepEqual(terms.analyze('Đường đi xa. Mặc dù tần suất tăng. Thành công rồi.'),[]);
});
test('L5.6B preserves original offsets and highlights for Unicode NFD',()=>{
 const sample='Một cảnh giới mới.'.normalize('NFD'),r=terms.analyze(sample).find(v=>terms.fold(v.term)==='cảnh giới');
 assert.ok(r);assert.equal(sample.slice(r.occurrences[0].start,r.occurrences[0].end),r.term);
});
test('L5.6B names and confirmed aliases supersede terms in scan',()=>{
 const rules=[{from:'linh căn',to:'Linh Căn'}];
 const found=terms.analyze('Linh căn và tu vi.',[],[],rules);
 assert.ok(!found.some(v=>terms.fold(v.term)==='linh căn'));
 assert.ok(found.some(v=>terms.fold(v.term)==='tu vi'));
});
test('L5.6B explicit save remains story scoped and never changes chapter text',()=>{
 const s=storage(),g=terms.create({storage:s}),original='Tu vi tăng và linh căn phát triển.';
 g.add(storyA,'tu vi','Mức độ tu luyện');
 assert.deepEqual(g.read(storyA),[{term:'tu vi',note:'Mức độ tu luyện'}]);
 assert.deepEqual(g.read(storyB),[]);
 const r=g.scan(storyA,original);
 assert.equal(r.find(v=>terms.fold(v.term)==='tu vi').kind,'termConfirmed');
 assert.equal(original,'Tu vi tăng và linh căn phát triển.');
 assert.equal(g.scan(storyB,original).find(v=>terms.fold(v.term)==='tu vi').kind,'termCandidate');
});
test('L5.6B rejects a character name as a term',()=>{
 const g=terms.create({storage:storage()});
 assert.throws(()=>g.add(storyA,'Linh Căn','', [{from:'linh căn',to:'Linh Căn'}]),/tên nhân vật/);
});
test('L5.6B ignored candidate is hidden; restore makes it visible',()=>{
 const g=terms.create({storage:storage()});
 g.ignore(storyA,'linh căn');
 assert.ok(!g.scan(storyA,'Linh căn xuất hiện.').some(v=>terms.fold(v.term)==='linh căn'));
 assert.ok(g.scan(storyB,'Linh căn xuất hiện.').some(v=>terms.fold(v.term)==='linh căn'));
 g.allow(storyA,'linh căn');
 assert.ok(g.scan(storyA,'Linh căn xuất hiện.').some(v=>terms.fold(v.term)==='linh căn'));
});
test('L5.6B can confirm ignored term, clearing scan exclusion',()=>{
 const g=terms.create({storage:storage()});
 g.ignore(storyA,'linh căn');g.add(storyA,'linh căn','Một loại tư chất');
 assert.deepEqual(g.ignored(storyA),[]);
 assert.equal(g.scan(storyA,'Linh căn khá tốt.').find(v=>v.kind==='termConfirmed').note,'Một loại tư chất');
});
test('L5.6B deletion and safe per-story undo',()=>{
 const s=storage(),g=terms.create({storage:s});
 g.add(storyA,'tu vi','Ghi chú');
 g.remove(storyA,'tu vi');
 assert.equal(g.read(storyA).length,0);
 assert.equal(g.undo(storyA),true);assert.equal(g.read(storyA).length,1);
 assert.equal(g.undo(storyA),false);
});
test('L5.6B undo refuses overwrite after another tab updates glossary',()=>{
 const s=storage(),a=terms.create({storage:s}),b=terms.create({storage:s});
 a.add(storyA,'tu vi','1');b.add(storyA,'linh căn','2');
 assert.throws(()=>a.undo(storyA),/tab khác/);
 assert.equal(a.read(storyA).length,2);
});
test('L5.6B export/import rejects wrong story and preserves existing entries',()=>{
 const a=terms.create({storage:storage()}),b=terms.create({storage:storage()});
 a.add(storyA,'linh căn','Tư chất');
 const file=a.backup(storyA);
 assert.throws(()=>b.restore(storyB,file),/không thuộc truyện/);
 b.add(storyA,'tu vi','Độ tu luyện');
 b.restore(storyA,file);
 assert.equal(b.read(storyA).length,2);
 assert.throws(()=>b.restore(storyA,'{"bad":true}'),/không thuộc truyện/);
});
test('L5.6B imports are atomic when term annotations conflict',()=>{
 const a=terms.create({storage:storage()}),b=terms.create({storage:storage()});
 a.add(storyA,'tu vi','Ghi chú A');b.add(storyA,'tu vi','Ghi chú B');
 assert.throws(()=>b.restore(storyA,a.backup(storyA)),/Xung đột/);
 assert.deepEqual(b.read(storyA),[{term:'tu vi',note:'Ghi chú B'}]);
});
test('L5.6B errors on malformed storage without destroying it',()=>{
 const s=storage(),g=terms.create({storage:s}),key='dudu-reader-terms-l56b:'+encodeURIComponent(storyA);
 s.setItem(key,'{damaged}');
 assert.throws(()=>g.add(storyA,'tu vi','test'),/hỏng/);
 assert.equal(s.getItem(key),'{damaged}');
});
test('L5.6B rejects malformed and overlong input',()=>{
 const g=terms.create({storage:storage()});
 assert.throws(()=>g.add(storyA,'x'.repeat(91),'hi'),/2 đến 90/);
 assert.throws(()=>g.add(storyA,'tu vi','x'.repeat(241)),/240/);
 assert.throws(()=>g.add(storyA,'<script>',''),/HTML/);
});
test('L5.6B handles large chapters within limit',()=>{
 const source='Nhân vật luyện khí. '.repeat(16000);
 const r=terms.analyze(source).find(v=>terms.fold(v.term)==='luyện khí');
 assert.equal(r.count,16000);assert.equal(r.occurrences.length,12);
});
