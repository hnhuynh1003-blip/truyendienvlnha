const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/reader-paragraph-model-r1.js');
test('split and merge preserve Vietnamese and original source',()=>{
 const text='Trần An bước tới. Nàng nói: “Xin chào!”\nDòng hai.';
 const cut=text.indexOf('Nàng'),original=text;
 assert.deepEqual(M.parts(text,[cut]),['Trần An bước tới.','Nàng nói: “Xin chào!” Dòng hai.']);
 assert.equal(text,original);assert.deepEqual(M.parts(text,[]),[text.replace('\n',' ')]);
 assert.equal(M.parts(text,M.boundaries(text)).length,2);
});
test('reject cutting emoji, combining Vietnamese, malformed/duplicate/out-of-range offsets',()=>{
 const t='A😀e\u0301Z';for(const c of [[2],[4],[-1],[0],[6],[1,1],[3,1],[1.2]])assert.equal(M.valid(t,c),false);
 assert.equal(M.valid(t,[1,3,5]),true);
});
test('backup is positions only; account, device, chapter, fingerprint exact matching',()=>{
 const s={uid:'alice',book:'web:b',chapter:'c',fingerprint:'hash'},r=M.record(s,[[2]]);
 assert.equal(M.validate(JSON.parse(JSON.stringify(r)),s,['abcd']),true);
 for(const k of ['uid','book','chapter','fingerprint'])assert.equal(M.validate(r,{...s,[k]:'changed'},['abcd']),false);
 assert.equal(JSON.stringify(r).includes('abcd'),false);assert.notEqual(M.key('alice','b','c','f'),M.key('bob','b','c','f'));
});
test('long chapter and offset budget',()=>{const t='Tiếng Việt 😀. '.repeat(30000);assert.equal(M.valid(t,[20,100]),true);assert.equal(M.valid(t,Array.from({length:10001},(_,i)=>i+1)),false);});
test('Reader adapter does not re-enter chapter, mutate content or call network',()=>{
 const fs=require('fs'),ui=fs.readFileSync(require.resolve('../js/reader-paragraph-ui-r1.js'),'utf8');
 assert.doesNotMatch(ui.replace(/\/\*[\s\S]*?\*\//g,''),/\bfetch\s*\(|\.content\s*=|readChapter\s*\(|firestore\s*\(/);
});
