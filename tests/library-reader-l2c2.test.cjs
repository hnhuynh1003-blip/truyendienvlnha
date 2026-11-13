const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const index=readFileSync(join(root,'index.html'),'utf8');
const readerCss=readFileSync(join(root,'css/library-reader-l2c.css'),'utf8');
const shellCss=readFileSync(join(root,'css/site-shell-v60.css'),'utf8');
const homeCss=readFileSync(join(root,'css/library-cards-l2b4.css'),'utf8');
const shellJs=readFileSync(join(root,'js/site-shell-v60.js'),'utf8');

test('L2C.2 hides a duplicated EPUB heading only in the rendered paragraphs',()=>{
  const fragment=index.slice(index.indexOf('const paragraphs = ch.content.split('),index.indexOf('const contentEl = document.getElementById',index.indexOf('const paragraphs = ch.content.split(')));
  assert.match(fragment,/if\(novel\._cloudV49 && paragraphs\.length\)/);
  assert.match(fragment,/displayHeading\(paragraphs\[0\]\)===displayHeading\(ch\.title\)/);
  assert.match(fragment,/paragraphs\.shift\(\)/);
  assert.doesNotMatch(fragment,/ch\.content\s*=|saveDB\(|\.update\(/);
});

test('L2C.2 Phone remains operable in reader without re-enabling bottom nav',()=>{
  assert.doesNotMatch(shellCss,/body\.dudu-reading-active #phone-fab\s*\{display:none!important\}/);
  assert.match(shellCss,/body\.dudu-reading-active \.d60-bottomnav \{display:none!important\}/);
  assert.match(readerCss,/body\.dudu-site-v60\.dudu-reading-active #phone-fab \{\s*display:flex/);
  assert.match(readerCss,/body\.dudu-site-v60\.dudu-reading-active #cyber-phone/);
});

test('L2C.2 mobile home uses a reachable one-row book rail',()=>{
  assert.match(homeCss,/@media\(max-width:760px\)\{/);
  assert.match(homeCss,/#d60-home \.d60-grid\{[\s\S]*?grid-auto-flow:column;[\s\S]*?overflow-x:auto/);
  assert.match(homeCss,/scroll-snap-type:x proximity/);
  assert.match(shellJs,/g\.setAttribute\('aria-label','Danh sách truyện mới cập nhật; vuốt ngang/);
});
