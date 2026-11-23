/* R2 author reimport protection: local fixtures only; no Firebase credentials,
 * R2/Firestore I/O, production writes or grant actions. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const q=require('../js/library-r2-personal-queue.js');
const root=path.resolve(__dirname,'..');
const B=(n,title,author,chapterCount=2)=>({id:'epub-'+n.repeat(32),title,author,chapterCount});
const F=(name,author='Tác giả',chapters=2,id=1)=>({
  name:name+'.epub',size:100,meta:{title:name,author},chapterCount:chapters,id,
  arrayBuffer:async()=>Uint8Array.of(id).buffer
});
function make(){
 const updates=[];
 const queue=q.create({
  prepare:async file=>({metadata:{title:file.meta.title,author:file.meta.author,
   description:'',genre:'',publicationState:'Đang ra'},chapters:file.chapterCount,hasCover:false}),
  validateMetadata:m=>!!(m&&m.title&&m.author),
  cryptoApi:{subtle:{digest:async(_,buffer)=>Uint8Array.of(new Uint8Array(buffer)[0]).buffer}},
  onChange:()=>updates.push('change')
 });
 return {queue,updates};
}
test('R2: old published works get deselected without a new backend write',async()=>{
 const {queue}=make();
 await queue.add([F('Truyện cũ','Tác giả',5,1),F('Truyện mới','Tác giả',3,2)]);
 const prior=queue.entries();
 assert.deepEqual(prior.map(x=>x.selected),[true,true]);
 const r=queue.reviewCatalog([B('a','Truyện cũ','Tác giả',5)]);
 assert.deepEqual(r,{ok:true,possible:1});
 const [old,fresh]=queue.entries();
 assert.equal(old.state,'POSSIBLE_DUPLICATE');
 assert.equal(old.selected,false);
 assert.equal(old.matchId,'epub-'+'a'.repeat(32));
 assert.match(old.message,/chưa đối chiếu SHA-256/);
 assert.equal(fresh.state,'READY');
 assert.equal(fresh.selected,true);
 assert.equal(old.sha256,prior[0].sha256);
});
test('R2: normalized Vietnamese work title + author match, chapter count only a hint',async()=>{
 const {queue}=make();await queue.add([F('  TÂN   HÀN  ','  HOÀNG  ',5,1)]);
 const r=queue.reviewCatalog([B('a','tân hàn','hoàng',6)]);
 assert.equal(r.possible,1);
 assert.match(queue.entries()[0].message,/số chương khác/);
 assert.equal(queue.entries()[0].selected,false);
});
test('R2: same title different author must not be auto-deselected',async()=>{
 const {queue}=make();await queue.add([F('Cùng tên','Tác giả B',2,3)]);
 assert.equal(queue.reviewCatalog([B('b','Cùng tên','Tác giả A',2)]).possible,0);
 assert.equal(queue.entries()[0].selected,true);
});
test('R2: possible duplicates never become selected through bulk select',async()=>{
 const {queue}=make();await queue.add([F('Tác phẩm cũ','A',2,4),F('Tác phẩm mới','A',2,5)]);
 queue.reviewCatalog([B('a','Tác phẩm cũ','A',2)]);
 queue.selectAll(true);
 assert.deepEqual(queue.entries().map(x=>x.selected),[false,true]);
 assert.equal(queue.select(queue.entries()[0].id,true),false);
 let dispatched=0;
 await queue.run(async()=>{dispatched++;return {kind:'published'};});
 assert.equal(dispatched,1);
 assert.equal(queue.entries()[0].state,'POSSIBLE_DUPLICATE');
 assert.equal(queue.entries()[1].state,'PUBLISHED');
});
test('R2: explicit confirmation can publish different content; denial stays blocked',async()=>{
 const {queue}=make();await queue.add([F('Truyện cùng tên','A',2,7)]);
 queue.reviewCatalog([B('a','Truyện cùng tên','A',2)]);
 assert.equal(queue.selectAll(true),undefined);
 assert.equal(queue.entries()[0].selected,false);
 assert.equal(queue.confirmDifferentBook(999),false);
 assert.equal(queue.confirmDifferentBook(queue.entries()[0].id),true);
 assert.equal(queue.entries()[0].selected,true);
 assert.equal(queue.reviewCatalog([B('a','Truyện cùng tên','A',2)]).possible,0);
 assert.equal(queue.entries()[0].state,'READY');
});
test('R2: changing metadata revokes override, then re-review protects again',async()=>{
 const {queue}=make();await queue.add([F('Truyện X','A',2,8)]);
 const known=[B('a','Truyện X','A',2)];
 queue.reviewCatalog(known);
 const e=queue.entries()[0];
 queue.confirmDifferentBook(e.id);
 queue.edit(e.id,{...e.metadata,title:'Truyện khác'});
 assert.equal(e.reviewConfirmed,false);
 assert.equal(queue.reviewCatalog(known).possible,0);
 queue.edit(e.id,{...e.metadata,title:'Truyện X'});
 assert.equal(queue.reviewCatalog(known).possible,1);
 assert.equal(e.selected,false);
});
test('R2: incomplete/invalid catalog cannot be misrepresented as checked',async()=>{
 const {queue}=make();await queue.add([F('Cần đối chiếu','A',2,9)]);
 assert.equal(queue.reviewCatalog(null).ok,false);
 assert.equal(queue.reviewCatalog([{}]).ok,false);
 assert.equal(queue.reviewCatalog([{...B('a','A','B',1),chapterCount:0}]).ok,false);
 assert.equal(queue.entries()[0].selected,true);
});
test('R2: previously confirmed published queue rows remain immutable to review',async()=>{
 const {queue}=make();await queue.add([F('Đã xong','A',2,10)]);
 await queue.run(async()=>({kind:'published'}));
 assert.equal(queue.entries()[0].state,'PUBLISHED');
 queue.reviewCatalog([B('a','Đã xong','A',2)]);
 assert.equal(queue.entries()[0].state,'PUBLISHED');
});
test('R2: queue holds 170 candidates; review skips 72 probable duplicates',async()=>{
 const {queue}=make();
 const files=Array.from({length:170},(_,i)=>F('Truyện '+i,'Tác giả',2,i+1));
 await queue.add(files);
 const catalog=Array.from({length:72},(_,i)=>B(i.toString(16).padStart(32,'0').slice(-1),'Truyện '+i,'Tác giả',2));
 // Use separate syntactically valid book IDs, one repeated ID is fine for this read-only fixture.
 const r=queue.reviewCatalog(catalog);
 assert.equal(r.possible,72);
 assert.equal(queue.entries().filter(x=>x.selected).length,98);
 assert.equal(queue.entries().filter(x=>x.state==='POSSIBLE_DUPLICATE').length,72);
});
test('R2: source wiring requires completed matching-owner catalog and preflight before any ticket',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const ui=fs.readFileSync(path.join(root,'js/library-r2-author-ui-c13b6d.js'),'utf8');
 const qsrc=fs.readFileSync(path.join(root,'js/library-r2-personal-queue.js'),'utf8');
 assert.match(html,/DuduR2AuthorCatalogReviewR1/);
 assert.match(html,/states\?\.r2/);
 assert.match(html,/status!=='success'/);
 assert.match(html,/uid!==l6R2PreviewConfig\?\.pilotOwnerUid/);
 assert.match(ui,/data\.uid===sessionUid/);
 assert.match(ui,/!catalogSnapshot\(\)/);
 assert.match(ui,/await refreshEpubCloudBooksV49\(\{fresh:true\}\)/);
 assert.ok(ui.indexOf('const review=reviewLoadedCatalog();renderQueue();')<
   ui.indexOf('await current.run(async entry=>'));
 assert.match(ui,/!review\.ok\)return render/);
 assert.match(ui,/confirmDifferentBook/);
 assert.match(ui,/Nghi đã đăng/);
 assert.match(ui,/chưa so SHA-256/);
 assert.match(html,/js\/library-r2-personal-queue\.js\?v=r2-compare-r1/);
 assert.match(html,/js\/library-r2-author-ui-c13b6d\.js\?v=server-recovery-r1/);
 assert.match(html,/js\/library-epub-r2-client-l6p2c5c3\.js\?v=device-catalog-r1/);
 assert.match(html,/js\/epub-catalog-perf-r1\.js\?v=device-catalog-r1/);
 assert.ok(html.indexOf('js/epub-catalog-device-cache-r1.js')<html.indexOf('js/epub-catalog-perf-r1.js'));
 assert.doesNotMatch(qsrc,/\b(?:fetch|localStorage|firebase|Firestore|setDoc|deleteDoc)\s*\(/);
});
