'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const diag=require('../js/library-r2-import-status-diagnostics-r1.js');
const root=path.resolve(__dirname,'..');

test('R2 pending import: read-only HTTP status messages distinguish auth, route and server failures',()=>{
 const expected={
  401:/Firebase/,403:/quyền/,404:/endpoint hoặc sách/,
  405:/không chấp nhận GET/,409:/xung đột/,429:/giới hạn/,
  500:/Worker/,503:/Worker/
 };
 for(const [value,pattern] of Object.entries(expected)){
  const state=diag.classify(Number(value));
  assert.equal(state.code,'HTTP_'+value);
  assert.match(state.message,pattern);
  assert.match(state.message,/Không lấy được trạng thái/);
 }
 assert.match(diag.classify(null).message,/Giữ nguyên phiên nhập/);
 assert.match(diag.classify(404).message,/Không suy ra truyện chưa đăng/);
});

test('R2 pending import: never disclose identifiers or credentials in diagnostics',()=>{
 const raw=fs.readFileSync(path.join(root,'js/library-r2-import-status-diagnostics-r1.js'),'utf8');
 for(const status of [0,200,401,403,404,503]){
  const msg=diag.classify(status).message;
  assert.doesNotMatch(msg,/Bearer|JWT|bookId|revisionId|UID|epub-[a-f0-9]{32}/);
 }
 assert.doesNotMatch(raw,/localStorage|sessionStorage|fetch\s*\(|setDoc\s*\(|deleteDoc\s*\(/);
});

test('R2 pending import: author panel still only clears pending on exact published book/revision',()=>{
 const ui=fs.readFileSync(path.join(root,'js/library-r2-author-ui-c13b6d.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const guard="data.code==='import-status'&&data.found===true&&data.bookId===p.bookId&&data.revision===p.revisionId&&data.status==='published'";
 assert.ok(ui.includes(guard));
 const offset=ui.indexOf(guard);
 assert.ok(offset>=0);
 assert.ok(ui.slice(offset,offset+400).includes('localStorage.removeItem(key(owner))'));
 assert.match(ui,/DuduR2ImportStatusDiagnosticR1\?\.classify\?\.\(response.status\)/);
 assert.match(ui,/response.status!==200/);
 assert.ok(html.indexOf('library-r2-import-status-diagnostics-r1.js')>=0);
 assert.ok(html.indexOf('library-r2-import-status-diagnostics-r1.js')<
   html.indexOf('library-r2-author-ui-c13b6d.js'));
 assert.match(html,/library-r2-author-ui-c13b6d\.js\?v=r2-long-split-r1&amp;diag-r1=1/);
});
