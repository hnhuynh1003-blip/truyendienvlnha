const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const index=readFileSync(join(root,'index.html'),'utf8');
const design=readFileSync(join(root,'css/library-editorial-l2c3.css'),'utf8');
const discovery=readFileSync(join(root,'css/library-discovery-l2b.css'),'utf8');

test('L2C.3 homepage entries are compact book-and-copy compositions on all screens',()=>{
  assert.match(index,/library-editorial-l2c3\.css\?v=l2c-3/);
  assert.match(design,/#d60-home \.d62-book \{\s*display:grid;grid-template-columns:91px minmax\(0,1fr\)/);
  assert.match(design,/@media\(max-width:760px\) \{[\s\S]*?#d60-home \.d60-grid \{\s*grid-template-columns:minmax\(0,1fr\);grid-auto-flow:row/);
  assert.match(design,/#d60-home \.d62-cover-action \{width:82px;height:123px/);
});

test('L2C.3 cover renders one bounded expandable synopsis regardless of import source',()=>{
  assert.match(index,/bookDesc\.hidden=true/);
  assert.match(index,/const introText = String\(intro\.text \|\| novel\.intro \|\| novel\.desc \|\|\s*librarySynopsisIndexL2D\.getSynopsis\(novel\) \|\| ''\)\.trim\(\)/);
  assert.match(index,/const maxLength=340/);
  assert.match(index,/introExpand\.setAttribute\('aria-expanded',String\(!expanded\)\)/);
  assert.match(index,/DuduLibrarySynopsisSearchL2D\.synopsisChapter\(novel\)/);
  assert.match(index,/librarySynopsisIndexL2D\.ensure\(novel\)/);
  assert.match(design,/\.intro-text \{[\s\S]*?overflow-wrap:anywhere;word-break:break-word/);
  assert.doesNotMatch(index,/DuduEpubProductionV49\.updatePublished|\.updateMetadata\(/);
});

test('L2C.3 Phone uses the same right-side anchor across routes',()=>{
  assert.doesNotMatch(discovery,/body\.dudu-phone-v11\.dudu-library-browsing #phone-fab/);
  assert.match(design,/body\.dudu-site-v60 #phone-fab \{\s*left:auto;right:12px/);
  assert.match(design,/body\.dudu-site-v60 #cyber-phone \{\s*left:auto;right:12px/);
});
