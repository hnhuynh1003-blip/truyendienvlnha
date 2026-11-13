const {test}=require('node:test');
const assert=require('node:assert/strict');
const production=require('../js/epub-production-v49.js');

test('C4.21 paginates public and owner EPUB indexes without violating Rules limit 60',async()=>{
 const all=Array.from({length:125},(_,i)=>({
  id:'epub-'+String(i).padStart(4,'0'),
  data:()=>({title:'Truyện '+i,author:'DUDU',status:'published',ownerUid:'owner',
   chapterCount:1,chapterIndex:[{id:'chapter-0001',title:'Chương 1'}],
   importFingerprint:'fingerprint-'+i})
 }));
 let requests=0;
 const db={collection:()=>({where(field,_,value){
  const filtered=all.filter(doc=>doc.data()[field]===value);
  return {limit(n){
   assert.ok(n<=60);let after='';
   return {startAfter(doc){after=doc.id;return this},async get(){
    requests++;
    const start=after?filtered.findIndex(doc=>doc.id===after)+1:0;
    return {docs:filtered.slice(start,start+n)};
   }};
  }};
 }})};
 const auth={currentUser:{uid:'owner',getIdTokenResult:async()=>({claims:{admin:true}})}};
 const visible=await production.publicBooks(db);
 assert.equal(visible.length,125);
 assert.equal(requests,3);
 const owned=await production.ownedBooks(db,auth);
 assert.equal(owned.length,125);
 assert.equal(owned[124].importFingerprint,'fingerprint-124');
 assert.equal(requests,6);
});
