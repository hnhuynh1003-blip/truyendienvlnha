'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8');
const html=read('index.html');
const pager=read('css/library-catalog-l2e.css');
const detail=read('css/library-finish-l4.css');

test('L4 centers both paginator controls and Go-to-page forms',()=>{
 assert.match(pager,/#library-catalog-pager-top\{\s*flex-wrap:wrap;justify-content:center/);
 assert.match(pager,/#library-catalog-pager-top \.library-catalog-page-jump\{\s*order:5;flex-basis:100%;margin:5px auto 0/);
 assert.match(pager,/\.library-catalog-page-jump\{[\s\S]*?margin-inline:auto;/);
 assert.match(html,/css\/library-catalog-l2e\.css\?v=l4-1/);
 assert.match(html,/css\/library-finish-l4\.css\?v=l4-1/);
});

test('L4 keeps chapter editing and bookmarks while bounding huge EPUB tables',()=>{
 assert.match(html,/chapterIndexNovelIdL4!==novel\.id/);
 assert.match(html,/const visible=list\.slice\(0,chapterVisibleLimitL4\)/);
 assert.match(html,/DuduLibrarySmartFilterL3\.normalize\([\s\S]*?ch\.originalIdx\+1/);
 assert.match(html,/function onChapterSearchL4\(\)/);
 assert.match(html,/function showMoreChaptersL4\(\)/);
 assert.match(html,/isCurrent = bookmark\?\.chIdx === ch\.originalIdx/);
 assert.match(html,/onclick="openEditChapterModal\(\$\{ch\.originalIdx\}\)"/);
 assert.match(html,/onclick="deleteChapter\(\$\{ch\.originalIdx\}\)"/);
 assert.match(html,/library-finish-l4\.css\?v=l4-1/);
});

test('L4 responsive fixes are isolated to Library details',()=>{
 assert.match(detail,/body\.dudu-site-v60 #cover-view \.archive-cover-topbar/);
 assert.match(detail,/body\.dudu-site-v60 #cover-view \.archive-chapter-find/);
 assert.match(detail,/@media\(max-width:760px\)/);
 assert.doesNotMatch(detail,/#[a-z-]*arcade|#dudu-fun|#cyber-phone|\.set\(/);
});
