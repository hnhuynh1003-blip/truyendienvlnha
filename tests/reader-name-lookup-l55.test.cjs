'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const api=require('../js/reader-name-lookup-l55.js');
const engine=require('../js/reader-names-l54.js');
const root=path.join(__dirname,'../assets/reader-name-lookup-l55');
const characters=JSON.parse(fs.readFileSync(path.join(root,'characters.json'),'utf8'));
const meanings=JSON.parse(fs.readFileSync(path.join(root,'meanings.json'),'utf8'));
const lookup=api.create(characters,meanings);
const first=value=>lookup.suggest(value)[0];
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};

test('L5.5 real lookup data is pinned, attributable, hashed and lazy-wired',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 assert.equal(manifest.sources.length,2);assert.ok(manifest.counts.sourceEntries>120000);assert.ok(lookup.metadata().characters>13000);assert.ok(lookup.metadata().meaningRows>100000);
 for(const [file,record] of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),record.sha256);
 assert.match(fs.readFileSync(path.join(root,'LICENSE_HANVIET.txt'),'utf8'),/Permission is hereby granted/);
 assert.match(fs.readFileSync(path.join(root,'LICENSE_CVDICT.txt'),'utf8'),/Attribution-ShareAlike 4.0/);
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.ok(html.includes('reader-name-lookup-l55.js'));
 assert.ok(!html.includes('src="assets/reader-name-lookup-l55/meanings.json'),'Dictionary payload must not load with every page');
});

test('L5.5 reverse meanings offer an actual Han-Viet candidate instead of title case',()=>{
 for(const [source,target] of [['lộc biết thuyền','Lộc Tri Chu'],['tần rõ ràng','Tần Minh'],['lâm núi','Lâm Sơn'],['dương ánh sáng','Dương Quang']]){
  const candidate=first(source);assert.equal(candidate.name,target);assert.equal(candidate.kind,'inferred');assert.ok(candidate.parts.length);assert.match(candidate.reason,/chưa xác nhận tên gốc/);
 }
 const trace=first('lộc biết thuyền').parts;assert.ok(trace.some(p=>p.from==='biết'&&p.hanzi==='知'&&p.to==='Tri'));assert.ok(trace.some(p=>p.from==='thuyền'&&p.hanzi==='舟'&&p.to==='Chu'));
 assert.ok(lookup.suggest('lộc biết thuyền').length>1,'Ambiguous meanings remain alternatives');assert.equal(first('ôn nếu').automatic,false);
});

test('L5.5 proper names, diacritics and Chinese input have separate evidence',()=>{
 assert.equal(first('tần mặc hàm').name,'Tần Mặc Hàm');assert.equal(first('tần mặc hàm').kind,'capitalization');
 assert.equal(first('鹿知舟').name,'Lộc Tri Chu');assert.equal(first('鹿知舟').kind,'hanviet');
 assert.equal(first('lộc\nbiết thuyền'.normalize('NFD')).name,'Lộc Tri Chu');
 assert.equal(lookup.suggest('lộc zzznotaword').length,0);assert.equal(lookup.suggest('<img onerror=x>').length,0);assert.equal(lookup.suggest('x'.repeat(91)).length,0);
});

test('L5.5 confirmed aliases win and reverse candidates can explicitly link to a stored character',()=>{
 const store=engine.create({storage:storage()}),person=store.add('epub:x','tần minh','Tần Minh');
 const profiles=store.characters('epub:x');const suggested=lookup.suggest('tần rõ ràng',{profiles});
 assert.equal(suggested[0].name,'Tần Minh');assert.equal(suggested[0].profileId,person.characterId);
 store.add('epub:x','tần rõ ràng','Tần Hạo',person.characterId);
 assert.equal(lookup.suggest('tần rõ ràng',{profiles:store.characters('epub:x')})[0].name,'Tần Hạo');
 assert.equal(store.render('epub:x','tần rõ ràng'),'Tần Hạo');
});

test('L5.5 word order proposals and colliding short names never silently merge profiles',()=>{
 const profiles=[{id:'a',name:'Tần Mặc Hàm',aliases:[{from:'tần mặc hàm',to:'Tần Mặc Hàm'}]},{id:'b',name:'Lý Mặc Hàm',aliases:[{from:'lý mặc hàm',to:'Lý Mặc Hàm'}]}];
 const short=lookup.suggest('mặc hàm',{profiles});assert.ok(short.some(s=>s.profileId==='a'));assert.ok(short.some(s=>s.profileId==='b'));
 assert.equal(lookup.suggest('hàm mặc tần',{profiles})[0].name,'Tần Mặc Hàm');
 assert.ok(short.filter(s=>s.kind==='linked').every(s=>!s.automatic));
});

test('L5.5 chapter scan includes new mistranslated names with source excerpts and does not auto-rewrite them',()=>{
 const source='Cô nhìn lộc biết thuyền nói. lộc biết thuyền hỏi. lộc biết thuyền cười. ôn nếu hỏi. tần rõ ràng đến.';
 const result=engine.analyze(source,[],lookup),l=result.find(r=>r.from==='lộc biết thuyền');
 assert.equal(l.to,'Lộc Tri Chu');assert.equal(l.count,3);assert.match(l.excerpt,/Cô nhìn/);assert.equal(l.category,'suspect');assert.equal(l.auto,false);assert.equal(l.inferredAutomatic,false);
 const store=engine.create({storage:storage()});assert.equal(store.render('epub:x',source,result),source);
 store.add('epub:x',l.from,l.to);assert.match(store.render('epub:x',source),/Lộc Tri Chu nói/);
 store.remove('epub:x',l.from);assert.equal(store.render('epub:x',source,result),source);
 assert.equal(engine.analyze('mặc dù hàn huyên. lâm vào hoàn cảnh. tần suất bình thường.',[],lookup).some(r=>r.auto||r.inferredAutomatic),false);
 assert.equal(engine.analyze('Một hành trình tiếp tục giữa trang sách. '.repeat(8),[],lookup).length,0,'A surname-like syllable inside ordinary prose is not a detected character');
});

test('L5.5 custom Names, phonetic and VietPhrase text packs are typed, validated and override only lookup',()=>{
 const custom=api.create(characters,meanings),before=lookup.suggest('鹿知舟')[0].name;
 custom.installPack(custom.parsePack('# Names\n鹿知舟=Lộc Tri Châu\n林青=Lâm Thanh',{name:'Names',kind:'names'}));
 assert.equal(custom.suggest('鹿知舟')[0].name,'Lộc Tri Châu');assert.equal(lookup.suggest('鹿知舟')[0].name,before);
 custom.installPack(custom.parsePack('舟=châu',{name:'Phiên âm',kind:'readings'}));assert.equal(custom.suggest('舟')[0].name,'Châu');
 custom.installPack(custom.parsePack('星=đốm lấp lánh',{name:'Nghĩa riêng',kind:'meanings'}));
 const result=engine.analyze('lộc đốm lấp lánh nói. lộc đốm lấp lánh hỏi. lộc đốm lấp lánh cười.',[],custom).find(r=>r.from==='lộc đốm lấp lánh');
 assert.equal(result.to,'Lộc Tinh');assert.equal(result.inferredAutomatic,true,'Only a unique mapping plus repeated context qualifies for the opt-in mode');
 assert.equal(custom.metadata().packs.length,3);custom.clearPacks();assert.equal(custom.suggest('鹿知舟')[0].name,before);
});

test('L5.5 invalid imports are atomic; exported lookup packs are distinct from story-rule backups',()=>{
 const custom=api.create(characters,meanings);custom.installPack(custom.parsePack('知=Tri',{name:'Tên riêng',kind:'names'}));const prior=custom.exportPacks();
 for(const text of ['知=Tri\n知=Khác','plain words','<script>=x','知=<img>','{"format":"dudu-reader-names","entries":[]}', 'x'.repeat(8000001)])assert.throws(()=>custom.parsePack(text));
 assert.deepEqual(custom.exportPacks(),prior);const imported=custom.parsePack(JSON.stringify(prior[0]));assert.deepEqual(imported,prior[0]);
 assert.throws(()=>custom.parsePack('知=tri thức',{kind:'readings'}),/một từ/);
 assert.throws(()=>custom.installPack({...prior[0],entries:[{hanzi:'知',value:''}]}));assert.deepEqual(custom.exportPacks(),prior);
});

test('L5.5 repeated long chapter scan has bounded candidate and beam growth',()=>{
 const text=('lộc biết thuyền nói. lộc biết thuyền hỏi. lộc biết thuyền cười.\n').repeat(500),start=performance.now();
 const result=engine.analyze(text,[],lookup);assert.equal(result.find(r=>r.from==='lộc biết thuyền').count,1500);assert.ok(result.length<20);assert.ok(performance.now()-start<10000);
});
