'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const lookupAPI=require('../js/reader-name-lookup-l55.js');
const scan=require('../js/reader-name-scan-l56a.js');
const engine=require('../js/reader-names-l54.js');
const DATA=path.join(__dirname,'../assets/reader-name-lookup-l55');
const lookup=lookupAPI.create(
 JSON.parse(fs.readFileSync(path.join(DATA,'characters.json'),'utf8')),
 JSON.parse(fs.readFileSync(path.join(DATA,'meanings.json'),'utf8'))
);
function device(){
 const values=new Map();
 return {values,getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
}
const find=(rows,name)=>rows.find(r=>scanName(r.from)===scanName(name));
const scanName=s=>s.normalize('NFC').toLocaleLowerCase('vi');

test('L5.6A: reverse-meaning candidates remain unconfirmed, with accurate occurrences and source offsets',()=>{
 const text='Cô gọi lộc biết thuyền. lộc biết thuyền nói. lộc biết thuyền hỏi. tần rõ ràng nói.';
 const results=scan.analyze(text,[],lookup),loc=find(results,'lộc biết thuyền'),tan=find(results,'tần rõ ràng');
 assert.equal(loc.count,3);assert.equal(loc.to,'Lộc Tri Chu');assert.equal(loc.category,'suspect');
 assert.equal(loc.auto,false);assert.equal(loc.inferredAutomatic,false);
 assert.match(loc.reason,/chưa xác minh/);assert.match(loc.excerpt,/Cô gọi/);
 assert.equal(tan.to,'Tần Minh');assert.equal(tan.category,'suspect');
 for(const at of loc.occurrences)assert.equal(scanName(text.slice(at.start,at.end)),scanName(loc.from));
 assert.equal(text,'Cô gọi lộc biết thuyền. lộc biết thuyền nói. lộc biết thuyền hỏi. tần rõ ràng nói.');
});

test('L5.6A: ordinary language and repetition alone produce an honest empty state',()=>{
 const ordinary='lâm vào hoàn cảnh, mặc dù đường đi xa nhưng tần suất thay đổi và thành công. '.repeat(10);
 assert.equal(lookup.detect(ordinary).length,0);
 assert.deepEqual(scan.analyze(ordinary,[],lookup),[]);
 assert.deepEqual(scan.analyze('lộc biết thuyền. '.repeat(30),[],lookup),[]);
 assert.deepEqual(scan.analyze('Trời hôm nay rất đẹp.',[],lookup),[]);
});

test('L5.6A: 2–4 words and compound surnames must have literal contextual evidence',()=>{
 const text='Âu Dương Thiên Vũ nói. Âu Dương Thiên Vũ hỏi. Tần Minh nói. Lý An hỏi.';
 const rows=scan.analyze(text,[],lookup);
 for(const value of ['âu dương thiên vũ','tần minh','lý an']){
  const row=find(rows,value);assert.ok(row,value);assert.ok(row.count>=1);
  assert.equal(row.auto,false);assert.ok(row.excerpt.includes(row.from));
 }
 assert.equal(find(rows,'dương thiên vũ'),undefined,'Cannot split Âu Dương into a false Dương surname');
 assert.equal(find(scan.analyze('Âu Dương Thiên Vũ. Tần Minh.',[],lookup),'Âu Dương Thiên Vũ'),undefined);
});

test('L5.6A: ignore per story persists, preserves confirmed rules and can be reversed',()=>{
 const storage=device(),store=engine.create({storage});
 const sample='lộc biết thuyền nói.';
 store.ignoreCandidate('web:a','lộc biết thuyền');
 assert.equal(find(scan.analyze(sample,store.read('web:a'),lookup,store.ignored('web:a')),'lộc biết thuyền'),undefined);
 assert.ok(find(scan.analyze(sample,store.read('web:b'),lookup,store.ignored('web:b')),'lộc biết thuyền'));
 assert.equal(store.read('web:a').length,0,'Ignore cannot create tombstones in the confirmed dictionary');
 const reopened=engine.create({storage});
 assert.deepEqual(reopened.ignored('web:a'),['lộc biết thuyền']);
 reopened.add('web:a','lộc biết thuyền','Lộc Tri Chu');
 assert.equal(find(scan.analyze(sample,reopened.read('web:a'),lookup,reopened.ignored('web:a')),'lộc biết thuyền').category,'confirmed');
 assert.throws(()=>reopened.ignoreCandidate('web:a','lộc biết thuyền'),/đã xác nhận/);
 assert.equal(reopened.undo('web:a'),true);
 reopened.allowCandidate('web:a','lộc biết thuyền');
 assert.ok(find(scan.analyze(sample,reopened.read('web:a'),lookup,reopened.ignored('web:a')),'lộc biết thuyền'));
});

test('L5.6A: ambiguous shortened names stay separate even with contextual evidence',()=>{
 const store=engine.create({storage:device()});
 store.add('epub:x','tần mặc hàm','Tần Mặc Hàm');
 store.add('epub:x','lý mặc hàm','Lý Mặc Hàm');
 const rows=scan.analyze('mặc hàm nói. mặc hàm hỏi.',store.read('epub:x'),lookup);
 const short=find(rows,'mặc hàm');
 assert.ok(short);assert.equal(short.count,2);assert.equal(short.links.length,2);
 assert.equal(short.category,'suspect');assert.equal(short.auto,false);
 assert.equal(store.characters('epub:x').length,2);
});

test('L5.6A: explicit rule wins even if its words are ordinary or previously ignored',()=>{
 const storage=device(),store=engine.create({storage});
 store.ignoreCandidate('web:ordinary','đường đi');
 store.add('web:ordinary','đường đi','Đường Đi');
 const row=find(scan.analyze('đường đi còn xa.',store.read('web:ordinary'),lookup,store.ignored('web:ordinary')),'đường đi');
 assert.equal(row.category,'confirmed');assert.equal(row.to,'Đường Đi');
 assert.equal(store.render('web:ordinary','đường đi còn xa.'),'Đường Đi còn xa.');
});

test('L5.6A: NFD source offsets are not silently converted to NFC offsets',()=>{
 const text='Cô gọi lộc biết thuyền nói.'.normalize('NFD');
 const row=find(scan.analyze(text,[],lookup),'lộc biết thuyền');
 assert.ok(row);
 for(const at of row.occurrences)assert.equal(text.slice(at.start,at.end),row.from);
});

test('L5.6A: large chapter stays bounded and count includes all mentions',()=>{
 const text=('lộc biết thuyền nói. lộc biết thuyền hỏi.\n').repeat(500),start=performance.now();
 const rows=scan.analyze(text,[],lookup),row=find(rows,'lộc biết thuyền');
 assert.equal(row.count,1000);assert.ok(row.occurrences.length<=12);
 assert.ok(rows.length<=80);assert.ok(performance.now()-start<10000);
});
