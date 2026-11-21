'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const split=require('../js/library-r2-chapter-split-r1.js');
const epub=require('../js/epub-import-v48.js');
const textBytes=new TextEncoder();
test('R2: long Vietnamese text is split without losing characters, spacing or emoji',()=>{
 const original=('Nội dung dài có dấu, 🌸 và xuống dòng.\n\n').repeat(8500);
 const parts=split.split(original,'Chương 1 – Thần giới');
 assert.ok(parts.length>1);
 assert.equal(parts.map(x=>x.content).join(''),original);
 assert.ok(parts.every(p=>p.content.length<=155000&&textBytes.encode(p.content).length<=290000));
 assert.ok(parts.every((p,i)=>p.title.endsWith('(phần '+(i+1)+'/'+parts.length+')')));
 assert.equal(epub.extractText?typeof epub.extractText:'existing API unchanged','existing API unchanged');
});
test('R2: short chapters keep exactly their original title/content',()=>{
 const content='Thần đi qua núi. 🌙\n\nNúi hóa biển.';
 assert.deepEqual(split.split(content,'Chương 1'),[{title:'Chương 1',content}]);
});
test('R2: UTF-8 expansion alone can trigger safe splitting',()=>{
 const data='漢'.repeat(180000);
 const parts=split.split(data,'Đại chương');
 assert.ok(parts.length>1);
 assert.equal(parts.map(x=>x.content).join(''),data);
 assert.ok(parts.every(p=>textBytes.encode(p.content).length<=290000));
});
test('R2: long contiguous codepoints are never split inside a surrogate pair',()=>{
 const input='🌸'.repeat(130000);
 const parts=split.split(input,'Hoa giới');
 assert.ok(parts.length>=2);
 assert.equal(parts.map(p=>p.content).join(''),input);
 assert.ok(parts.every(p=>!/\uD800-\uDBFF$/.test(p.content)));
 for(const p of parts)assert.ok(!/[\uD800-\uDBFF]$/.test(p.content)&&!/^[\uDC00-\uDFFF]/.test(p.content));
});
test('R2: input limits remain fail-closed; no silent truncation',()=>{
 assert.throws(()=>split.split('x'.repeat(4500001),'Long'),/invalid original/);
 assert.throws(()=>split.split('\n'.repeat(260000),'Whitespace'),/invalid original|whitespace-only/);
 assert.throws(()=>split.split('valid',''),/invalid original/);
});
test('R2: source wiring only enables splitting in R2 author intake',()=>{
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const src=read('js/epub-import-v48.js'),side=read('js/library-epub-r2-sidecar-l6c11.js');
 const ui=read('js/library-r2-author-ui-c13b6d.js'),html=read('index.html');
 assert.match(src,/splitOversizedChapters=false/);
 assert.match(src,/splitOversizedChapters\?splitR2\.split/);
 assert.match(ui,/splitOversizedChapters:true/);
 assert.match(side,/chapterSplit\.split\(content,title\)/);
 assert.match(side,/record\.fromSplit/);
 assert.match(side,/long XHTML with images cannot be split/);
 assert.match(html,/library-r2-chapter-split-r1\.js/);
 assert.ok(html.indexOf('library-r2-chapter-split-r1.js')<html.indexOf('epub-import-v48.js'));
 assert.ok(html.indexOf('library-r2-chapter-split-r1.js')<html.indexOf('library-epub-r2-sidecar-l6c11.js'));
 assert.doesNotMatch(read('js/library-r2-chapter-split-r1.js'),/\b(fetch|firebase|localStorage|setDoc|runTransaction)\s*\(/);
});
