'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=require('../js/reader-names-l54.js');
const legacy=require('../js/reader-name-dictionary-l53.js');
const device=()=>{const data=new Map();return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
const name=(rows,value)=>rows.find(r=>engine.fold(r.from)===engine.fold(value));

test('L5.4b: repeated surnames require contextual evidence; semantic guesses stay unconfirmed',()=>{
 const text='tần mặc hàm nói. tần mặc hàm hỏi. tần mặc hàm cười. mặc hàm nói. tần minh nói. tần minh hỏi. tần minh cười. tần rõ ràng đến. ôn nếu hỏi.';
 const results=engine.analyze(text);
 for(const value of ['tần mặc hàm','mặc hàm','tần minh'])assert.equal(name(results,value).auto,true,value);
 for(const value of ['tần rõ ràng','ôn nếu']){assert.equal(name(results,value).auto,false);assert.equal(name(results,value).category,'suspect');}
 assert.equal(name(results,'ôn nếu hỏi'),undefined,'Do not absorb a trailing verb into a suspicious name');
 assert.equal(name(engine.analyze('tần minh đứng.'),'tần minh').auto,false,'One mention is insufficient');
 assert.equal(name(engine.analyze('tần minh. tần minh. tần minh.'),'tần minh').auto,false,'Frequency alone is insufficient');
 const ordinary='mặc dù hàn huyên. lâm vào bình thường. lý do. từ từ. tần suất. thanh niên. cao cao.';
 assert.equal(engine.analyze(ordinary).some(r=>r.auto),false);
 const store=engine.create({storage:device()});
 const rendered=store.render('epub:x',text,results);
 assert.match(rendered,/Tần Mặc Hàm nói/);assert.match(rendered,/Mặc Hàm nói/);assert.match(rendered,/tần rõ ràng/);assert.match(rendered,/ôn nếu/);
 assert.equal(store.read('epub:x').length,0,'Automatic display must not silently persist dictionary entries');
});

test('L5.4b: compound surnames, Unicode and line breaks preserve whole-word boundaries',()=>{
 const input='âu dương\nthiên nói. âu dương thiên hỏi. âu dương thiên cười.';
 const results=engine.analyze(input);
 assert.equal(name(results,'âu dương thiên').auto,true);
 const store=engine.create({storage:device()});
 assert.equal(store.render('web:x',input,results),'Âu Dương Thiên nói. Âu Dương Thiên hỏi. Âu Dương Thiên cười.');
 store.add('web:x','tần minh','Tần Minh');
 assert.equal(store.render('web:x','tần\nminh, tần minhA, tần minh.').normalize('NFC'),'Tần Minh, tần minhA, Tần Minh.');
 assert.equal(store.render('web:x','tần minh'.normalize('NFD')),'Tần Minh');
});

test('L5.4c: legacy arrays remain untouched until a confirmed write and survive reload',()=>{
 const storage=device(),key='dudu-reader-names-l53:epub%3Aold';
 const old=JSON.stringify([{from:'tần mặc hàm',to:'Tần Mặc Hàm'},{from:'sao',to:'Tinh'}]);storage.setItem(key,old);
 const store=engine.create({storage});assert.equal(store.characters('epub:old').length,2);assert.equal(storage.getItem(key),old);
 const person=store.characters('epub:old')[0];store.add('epub:old','mặc hàm','Mặc Hàm',person.id);
 assert.equal(store.characters('epub:old')[0].aliases.length,2);
 assert.equal(store.render('epub:old','mặc hàm gặp tần mặc hàm.'),'Mặc Hàm gặp Tần Mặc Hàm.');
 assert.equal(legacy.create({storage}).render('epub:old','mặc hàm'),'Mặc Hàm','L5.3 can still read extended records');
 const reloaded=engine.create({storage});assert.equal(reloaded.characters('epub:old')[0].aliases.length,2);
 assert.equal(reloaded.render('web:old','mặc hàm'),'mặc hàm');assert.equal(storage.data.size,1);
});

test('L5.4c: ambiguous short names never merge profiles or become automatic replacements',()=>{
 const store=engine.create({storage:device()});
 const a=store.add('epub:x','tần mặc hàm','Tần Mặc Hàm'),b=store.add('epub:x','lý mặc hàm','Lý Mặc Hàm');
 const results=engine.analyze('mặc hàm nói. mặc hàm hỏi. mặc hàm cười.',store.read('epub:x'));
 assert.equal(name(results,'mặc hàm').links.length,2);assert.equal(name(results,'mặc hàm').auto,false);
 assert.equal(store.characters('epub:x').length,2);
 store.add('epub:x','mặc hàm','Mặc Hàm',a.characterId);
 assert.throws(()=>store.add('epub:x','mặc hàm','Mặc Hàm',b.characterId),/nhân vật khác/);
 store.rename('epub:x',a.characterId,'Tần Mặc Hàm · nhân vật chính');
 assert.equal(store.render('epub:x','mặc hàm'),'Mặc Hàm','A profile label does not force the full name into the prose');
});

test('L5.4c: semantic suggestions need confirmation; ordinary shortened names are never inferred',()=>{
 const store=engine.create({storage:device()});store.add('epub:x','tần minh','Tần Minh');
 const results=engine.analyze('tần rõ ràng đến. minh nói. minh hỏi. minh cười.',store.read('epub:x'));
 assert.equal(name(results,'tần rõ ràng').links[0].name,'Tần Minh');
 assert.equal(store.render('epub:x','tần rõ ràng đến. minh nói.',results),'tần rõ ràng đến. minh nói.');
 assert.equal(engine.analyze('Mặc Hàm nói.',store.read('epub:x')).some(r=>r.links.length),false);
});

test('L5.4b: confirmed display names capitalize on their first mention without another manual rule',()=>{
 const store=engine.create({storage:device()});store.add('epub:x','tần rõ ràng','Tần Minh');
 assert.equal(store.render('epub:x','tần minh nói. tần rõ ràng đến.'),'Tần Minh nói. Tần Minh đến.');
 assert.equal(name(engine.analyze('tần minh nói.',store.read('epub:x')),'tần minh').category,'confirmed');
 store.add('epub:x','tần minh','Tần Bình');
 assert.equal(store.render('epub:x','tần rõ ràng gặp tần minh.'),'Tần Minh gặp Tần Bình.','Explicit sources take precedence and never cascade');
});

test('L5.4c: longest replacement wins once; detailed offsets map edited display back to original',()=>{
 const store=engine.create({storage:device()});
 store.add('epub:x','tần mặc','Tần An');store.add('epub:x','tần mặc hàm','Tần Mặc Hàm');store.add('epub:x','Tần An','Tần Bình');
 assert.equal(store.render('epub:x','tần mặc hàm gặp tần mặc và Tần An.'),'Tần Mặc Hàm gặp Tần An và Tần Bình.');
 const detail=store.detailed('epub:x','tần mặc và Tần An.');
 const changed=detail.segments.find(s=>s.replaced);
 assert.equal(detail.text.slice(changed.start,changed.end),'Tần An');
 assert.equal(detail.source.slice(changed.sourceStart,changed.sourceEnd),'tần mặc');
});

test('L5.4c: remove restores original display, undo restores links, and another tab blocks unsafe undo',()=>{
 const storage=device(),store=engine.create({storage});const text='tần minh nói. tần minh hỏi. tần minh cười.';
 store.add('epub:x','tần minh','Tần Minh');const auto=engine.analyze(text,store.read('epub:x'));
 store.remove('epub:x','tần minh');assert.equal(store.render('epub:x',text,auto),text);assert.equal(store.characters('epub:x').length,0);
 const again=engine.create({storage});assert.equal(again.render('epub:x',text,engine.analyze(text,again.read('epub:x'))),text);
 assert.equal(store.undo('epub:x'),true);assert.match(store.render('epub:x',text),/Tần Minh/);
 engine.create({storage}).add('epub:x','lý an','Lý An');assert.throws(()=>store.undo('epub:x'),/tab khác/);
});

test('L5.4c: backups preserve identities, validate atomically, and reject conflicting or wrong-story imports',()=>{
 const source=engine.create({storage:device()}),person=source.add('epub:x','tần mặc hàm','Tần Mặc Hàm');source.add('epub:x','mặc hàm','Mặc Hàm',person.characterId);
 const storage=device(),dest=engine.create({storage});dest.restore('epub:x',source.backup('epub:x'));
 assert.deepEqual(dest.read('epub:x'),source.read('epub:x'));assert.equal(dest.undo('epub:x'),true);assert.equal(dest.read('epub:x').length,0);
 dest.restore('epub:x',source.backup('epub:x'));const before=dest.backup('epub:x');
 for(const invalid of ['{}','bad',JSON.stringify([{from:'<script>',to:'X'}]),JSON.stringify([{from:'a',to:'A'},{from:'A',to:'B'}]),JSON.stringify([{from:'mặc hàm',to:'Khác'}])]){
  assert.throws(()=>dest.restore('epub:x',invalid));assert.equal(dest.backup('epub:x'),before);
 }
 assert.throws(()=>dest.restore('web:y',before),/truyện khác/);
 assert.throws(()=>dest.restore('epub:x','x'.repeat(500001)),/quá lớn/);
 const legacyDest=engine.create({storage:device()});legacyDest.restore('epub:z',JSON.stringify([{from:'tần minh',to:'Tần Minh'}]));assert.equal(legacyDest.render('epub:z','tần minh'),'Tần Minh');
});

test('L5.4c: storage failure never pretends to save or destroys the existing dictionary',()=>{
 const storage=device(),store=engine.create({storage});store.add('web:x','tần minh','Tần Minh');const old=store.backup('web:x');
 storage.setItem=()=>{throw Error('quota');};assert.throws(()=>store.add('web:x','lý an','Lý An'),/từ chối/);assert.equal(store.backup('web:x'),old);
 assert.throws(()=>engine.create().add('web:x','tần minh','Tần Minh'),/Không thể lưu/);
 const broken=device();broken.setItem('dudu-reader-names-l53:web%3Ax','not-json');assert.throws(()=>engine.create({storage:broken}).add('web:x','tần minh','Tần Minh'),/Dữ liệu cũ/);assert.equal(broken.getItem('dudu-reader-names-l53:web%3Ax'),'not-json');
});

test('L5.4c: deleting a rule frees an active slot and all 300 live rules remain readable by L5.3',()=>{
 const storage=device(),store=engine.create({storage});
 for(let i=0;i<300;i++)store.add('epub:capacity','Tên '+i,'Nhân Vật '+i);
 assert.throws(()=>store.add('epub:capacity','Tên 301','Khác'),/300/);
 store.remove('epub:capacity','Tên 0');store.add('epub:capacity','Tên mới','Tên Mới');
 assert.equal(store.characters('epub:capacity').length,300);
 assert.equal(legacy.create({storage}).read('epub:capacity').length,300);
 assert.equal(legacy.create({storage}).render('epub:capacity','Tên mới'),'Tên Mới');
});

test('L5.4: long chapter scanning is bounded to chapter text; shared reader integration prepares before rendering',()=>{
 const text=('tần minh nói. tần minh hỏi. tần minh cười.\n').repeat(3000),start=performance.now();
 const results=engine.analyze(text);assert.equal(name(results,'tần minh').count,9000);assert.ok(performance.now()-start<3000);
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 assert.ok(html.indexOf('prepareChapter?.(paragraphs)')<html.indexOf('DuduReaderNamesL53.bindParagraph(pTag,p.trim())'));
 for(const script of ['reader-names-l54.js','reader-name-ui-l54.js'])assert.ok(html.includes(script));
});
