const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const epub=require('../js/epub-import-v48.js');
test('V48 rejects invalid EPUB file, traversal, unsafe schemes and oversized file',()=>{
 assert.equal(epub.validFile({name:'sample.epub',size:1024}),true);
 assert.equal(epub.validFile({name:'sample.txt',size:1024}),false);
 assert.equal(epub.validFile({name:'book.epub',size:30*1024*1024+1}),false);
 assert.equal(epub.safePath('../../evil.xhtml','OEBPS/package.opf'),null);
 assert.equal(epub.safePath('https://attacker.test/test.xhtml'),null);
 assert.equal(epub.safePath('/etc/passwd'),null);
 assert.equal(epub.safePath('Text/ch1.xhtml','OPS/content.opf'),'OPS/Text/ch1.xhtml');
 assert.equal(epub.safePath('../Text/ch2.xhtml','OPS/book/content.opf'),'OPS/Text/ch2.xhtml');
 assert.equal(epub.safePath('..%2f..%2fevil.xhtml','OPS/book.opf'),null);
});
test('V48 builds Sandbox chapters with IDs, preserves existing novels and rejects storage overflow',()=>{
 const novels=[{id:'old',title:'Existing',chapters:[{id:'chapter-old',content:'Old',title:'Old chapter'}]}];
 const parsed={title:'Một Cuốn EPUB',author:'Tác giả',chapters:[
  {title:'Chương một',content:'Xin chào'}, {title:'Chương hai',content:'Văn bản mới'}
 ]};
 const added=epub.prepareSandboxImport(parsed,{novels,id:'test-import'});
 assert.equal(added.length,2);assert.equal(added[0].chapters.length,2);
 assert.equal(added[0].chapters[0].id,'ch-epub-test-import-0');
 assert.equal(novels.length,1);
 const appended=epub.prepareSandboxImport(parsed,{novels,targetId:'old',id:'test-import'});
 assert.equal(appended.length,1);
 assert.equal(appended[0].chapters.length,3);
 assert.equal(novels[0].chapters.length,1);
 assert.throws(()=>epub.prepareSandboxImport(parsed,{novels,targetId:'unknown'}),/Không tìm thấy/);
 assert.throws(()=>epub.prepareSandboxImport({...parsed,chapters:[{title:'Huge',content:'x'.repeat(3e6)}]},{novels,id:'a'}),/3 MB/);
});
test('L2B.4 Sandbox import carries real genre and synopsis without an EPUB category',()=>{
 const added=epub.prepareSandboxImport({title:'Bí mật cửa số',author:'Một tác giả',
  genre:'Kinh dị, Huyền bí',publicationState:'Hoàn thành',
  desc:'Một văn án thật, có thể tìm qua từ khóa.',
  chapters:[{title:'Một',content:'Nội dung'}]}, {novels:[],id:'epub-metadata'});
 assert.equal(added[0].genre,'Kinh dị, Huyền bí');
 assert.equal(added[0].desc,'Một văn án thật, có thể tìm qua từ khóa.');
 assert.equal(added[0].status,'Hoàn thành');
 assert.equal(added[0].introData.text,added[0].desc);
 assert.equal(added[0].chapters[0].id,'ch-epub-epub-metadata-0');
});
test('L2B.4 reads OPF subject and description when the EPUB provides them',async()=>{
 const makeNode=(localName,props={},children=[])=>({localName,
  textContent:props.text||'',getAttribute:key=>props[key]||null,
  getElementsByTagName:key=>key==='*'?children:children.filter(x=>x.localName===key)});
 const title=makeNode('title',{text:'Đêm trong thư viện'});
 const creator=makeNode('creator',{text:'Tác giả X'});
 const subject=makeNode('subject',{text:'Kinh dị'});
 const subject2=makeNode('subject',{text:'Bí ẩn'});
 const description=makeNode('description',{text:'Mọi cánh cửa đều biết nói.'});
 const metadata=makeNode('metadata',{},[title,creator,subject,subject2,description]);
 const item=makeNode('item',{id:'ch1',href:'chapter.xhtml','media-type':'application/xhtml+xml'});
 const itemref=makeNode('itemref',{idref:'ch1'});
 const spine=makeNode('spine',{},[itemref]);
 const rootfile=makeNode('rootfile',{'full-path':'OPS/package.opf'});
 class Parser {parseFromString(raw){
  if(raw==='container')return {getElementsByTagName:key=>key==='rootfile'?[rootfile]:[]};
  if(raw==='opf')return {getElementsByTagName:key=>key==='metadata'?[metadata]:key==='spine'?[spine]:
   key==='*'?[metadata,item,spine]:[]};
  const chapterNode={textContent:'Một chương hợp lệ.',parentElement:null};
  return {getElementsByTagName:()=>[],querySelector:()=>null,querySelectorAll:()=>[],
   body:{querySelector:()=>null,querySelectorAll:key=>key==='h1,h2,h3,h4,p,li,blockquote,pre'?[chapterNode]:[],
    textContent:'Một chương hợp lệ.'}};
 }}
 const texts={'META-INF/container.xml':'container','OPS/package.opf':'opf',
  'OPS/chapter.xhtml':'<p>Một chương hợp lệ.</p>'};
 const zipLib={loadAsync:async()=>({files:Object.fromEntries(Object.keys(texts).map(k=>[k,{_data:{uncompressedSize:60}}])),
  file:key=>texts[key]===undefined?null:{async:async()=>texts[key]}})};
 const parsed=await epub.parse({name:'book.epub',size:1234},{zipLib,Parser});
 assert.equal(parsed.title,'Đêm trong thư viện');
 assert.equal(parsed.genre,'Kinh dị, Bí ẩn');
 assert.equal(parsed.desc,'Mọi cánh cửa đều biết nói.');
 assert.equal(parsed.chapters.length,1);
});
test('V48 author-only modal and Firebase Storage upload never modify public Firestore',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../js/epub-import-v48.js'),'utf8');
 const rules=fs.readFileSync(path.join(__dirname,'../security/storage.rules.review'),'utf8');
 assert.match(html,/openEpubImportV48\(\)/);
 assert.match(html,/canEdit:\(\)=>canEditStories\(\)/);
 assert.match(html,/firebase-storage-compat\.js/);
 assert.match(html,/js\/epub-import-v48\.js\?v=l2b-4/);
 assert.match(html,/js\/epub-production-v49\.js\?v=c421-1/);
 assert.match(js,/getIdTokenResult\(true\)/);
 assert.match(js,/claims\?\.admin!==true/);
 assert.match(js,/author_epub_drafts\//);
 assert.doesNotMatch(js,/firebase\.firestore\(|db\.collection\(|getDownloadURL\(/);
 assert.match(rules,/request\.auth\.token\.admin == true/);
 assert.doesNotMatch(rules,/allow write: if true/);
});
