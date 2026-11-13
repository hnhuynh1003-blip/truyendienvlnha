'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const engine=require('../js/chapter-ai-chunk-l5.js');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');

test('2,000+ Vietnamese words are divided below the 5,000-character Worker message limit',async()=>{
 const chapter=Array(2300).fill('Đường Oanh Ngữ bước qua hành lang.').join(' ');
 const plan=engine.plan(chapter);
 assert.ok(plan.requests>3);
 assert.ok(plan.parts.every(part=>part.raw.length<=2800&&part.core.length<=2800));
 assert.equal(plan.parts.map(p=>p.raw).join(''),chapter,'Splitting is lossless');
 const {validRequest}=await import('../cloudflare/src/limits.mjs');
 const prompt='Hãy biên tập nhưng giữ nguyên nhân vật, bối cảnh và xuống dòng.';
 for(const part of plan.parts)if(part.core){
  assert.ok(validRequest({purpose:'assist',instruction:prompt,
   messages:[{role:'user',text:part.core}]},true));
 }
});

test('The planner preserves paragraphs, punctuation and whitespace after no-op AI edits',()=>{
 const paragraph='Kỳ An gặp Tiêu Khinh ở Thượng Hải. '.repeat(100);
 const chapter='\n\n'+paragraph+'\n\n'+paragraph+'\n\n';
 const plan=engine.plan(chapter);
 const restored=engine.assemble(plan,plan.parts.map(p=>p.core));
 assert.equal(restored,chapter);
 assert.ok(plan.requests>1);
 assert.equal(engine.plan('  Tên riêng  ').parts[0].leading,'  ');
 assert.equal(engine.plan('  Tên riêng  ').parts[0].trailing,'  ');
});

test('There is no silent truncation for huge unbroken paragraphs or more than 48 parts',()=>{
 assert.throws(()=>engine.plan('x'.repeat(5000)),/liền mạch quá dài/);
 assert.throws(()=>engine.plan(('Một câu có dấu chấm. ').repeat(10000)),/hơn 48 lượt AI/);
});

test('Partial, blank or oversized AI responses cannot be assembled or overwrite the source',()=>{
 const plan=engine.plan(('Lời thoại nhân vật. ').repeat(800));
 const original=plan.source;
 assert.throws(()=>engine.assemble(plan,[]),/Chưa đủ/);
 assert.throws(()=>engine.assemble(plan,plan.parts.map((p,i)=>i?'':p.core)),/không hợp lệ/);
 assert.throws(()=>engine.assemble(plan,plan.parts.map(p=>'y'.repeat(12001))),/không hợp lệ/);
 assert.equal(plan.source,original);
});

test('Continue and plot requests send bounded beginning/end context, never the full chapter',()=>{
 const chapter='Mở đầu: giấc mộng đầu tiên. '+('Đoạn giữa khá dài. '.repeat(1400))+'Kết thúc: cánh cửa bí mật.';
 for(const mode of ['continue','ideas']){
  const prompt=engine.context(chapter,mode);
  assert.ok(prompt.length<3000);
  assert.match(prompt,/Mở đầu/);
  assert.match(prompt,/Kết thúc/);
  assert.ok(!prompt.includes('Đoạn giữa khá dài. '.repeat(200)));
 }
});

test('L5.1 exposes review/stop/resume/undo and never silently writes a chapter',()=>{
 const inline=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match=>match[1]).find(text=>text.includes('function handleAIAssist(type)'));
 assert.ok(inline,'The chapter editor must be in an executable inline script');
 assert.doesNotThrow(()=>new Function(inline),'Inline script must parse');
 assert.match(source,/js\/chapter-ai-chunk-l5\.js\?v=l5-1/);
 assert.match(source,/css\/chapter-ai-l5\.css\?v=l5-1/);
 for(const id of ['chapter-ai-review-l5','chapter-ai-original-l5',
  'chapter-ai-proposed-l5','chapter-ai-stop-l5','chapter-ai-resume-l5',
  'chapter-ai-apply-l5','chapter-ai-undo-l5']){
  assert.ok(source.includes('id="'+id+'"'),id);
 }
 assert.match(source,/function chapterAISourceMatchesL5\(job\)/);
 assert.match(source,/chapterAIElL5\('chapter-modal-content'\)\?\.value === job\.source/);
 assert.match(source,/if \(!chapterAISourceMatchesL5\(job\)\)/);
 assert.match(source,/confirm\('Áp dụng đề xuất AI vào bản thảo/);
 assert.ok(source.includes('chapterAIJobL5.stop = true'),'stop controls pending AI work');
 assert.match(source,/function closeModals\(\) \{\s*closeChapterAIReviewL5\(\);/);
 assert.match(source,/closeChapterAIReviewL5\(\);\s*editingChapterIndex = chIdx/);
 assert.doesNotMatch(source,/contentArea\.value = result\.trim\(\)/);
});
