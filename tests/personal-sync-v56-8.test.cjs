const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const model=require('../js/personal-sync-v56-8.js');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const auth=fs.readFileSync(path.join(__dirname,'..','js','auth-v2.js'),'utf8');
function store(){const m=new Map();return {
 getItem:key=>m.get(key)||null,setItem:(key,value)=>m.set(key,value),m
};}
const novel={id:'book-1',chapters:[{id:'intro'},{id:'chapter-2'},{id:'chapter-3'}]};
const key=storyId=>'dudu-v2:reader-A:'+storyId+':bookmark';

test('V56.8 preserves chapter resume on fresh browser by UID and chapter ID',()=>{
 const browser1=store(),profile={};
 browser1.setItem(key(novel.id),JSON.stringify({chIdx:2,scrollTop:456}));
 assert.equal(model.hydrateBookmarks(browser1,profile,[novel],key),true);
 assert.equal(profile.readingBookmarksV568[novel.id].chIdx,2);
 const browser2=store(),synced={readingBookmarksV568:profile.readingBookmarksV568};
 assert.equal(model.hydrateBookmarks(browser2,synced,[novel],key),false);
 assert.equal(model.localBookmark(browser2,key(novel.id)).chIdx,2);
 assert.equal(model.localBookmark(browser2,key(novel.id)).scrollTop,456);
 assert.equal(model.bookmarkForNovel(synced.readingBookmarksV568[novel.id],novel).chIdx,2);
});
test('V56.8 cloud stored progress wins over fresh-device defaults, unrelated books remain untouched',()=>{
 const storage=store(),profile={readingBookmarksV568:{
 'book-1':{chIdx:1,chapterId:'chapter-2',updatedAt:10000},
 'book-2':{chIdx:0,chapterId:'first',updatedAt:11000}
 }};
 assert.equal(model.hydrateBookmarks(storage,profile,[novel],key),false);
 assert.equal(profile.readingBookmarksV568['book-2'].chapterId,'first');
 assert.equal(model.localBookmark(storage,key(novel.id)).chIdx,1);
});
test('V56.8 rejects wrong or deleted chapter ID instead of jumping to another chapter',()=>{
 assert.equal(model.bookmarkForNovel({chIdx:2,chapterId:'deleted'},novel),null);
 assert.equal(model.bookmarkForNovel({chIdx:0,chapterId:'chapter-3'},novel).chIdx,2);
 assert.equal(model.bookmarkForNovel({chIdx:-1},novel),null);
 assert.equal(model.bookmarkForNovel({chIdx:100001},novel),null);
});
test('V56.8 phone appearance whitelist never uploads custom images or arbitrary URLs',()=>{
 const safe=model.cleanAppearance({wallpaper:'v37-city-night',mode:'world',
  font:'quicksand',size:'large',theme:'oled',readerFontSize:21});
 assert.equal(safe.wallpaper,'v37-city-night');
 assert.equal(safe.font,'quicksand');
 const invalid=model.cleanAppearance({wallpaper:'v36-custom',mode:'javascript:',
  font:'unknown',size:'huge',theme:'other',readerFontSize:900});
 assert.equal(invalid.wallpaper,'midnight');
 assert.equal(invalid.mode,'personal');
 assert.equal(invalid.font,'be');
 assert.equal(invalid.size,'normal');
 assert.equal(invalid.theme,'default');
 assert.equal(invalid.readerFontSize,16);
});
test('V56.8 production wiring saves chapter separately from one-time reward and restores phone by verified UID',()=>{
 assert.match(html,/src="js\/personal-sync-v56-8\.js\?v=56-8-cp013b-r2"/);
 assert.match(auth,/window\.hydratePersonalSyncV568\(\)/);
 assert.match(html,/DuduPersonalSyncV568\.hydrateBookmarks\(localStorage,userProfile,novels/);
 assert.match(html,/DuduPersonalCloudV569\.patch\(opts\)/);
 assert.match(html,/v569SyncBookmark\(novel\.id\)/);
 assert.match(html,/v569SyncPhone\(\)/);
 assert.match(html,/v569SyncBookmark\(novel\.id\)/);
 assert.match(html,/function v568SavePhoneAppearance\(\)/);
 assert.match(html,/DuduPhoneWallpaperV27\.write|image\.write\(localStorage,owner,cloud\.wallpaper\)/);
 assert.match(html,/wallpaper==='v36-custom'/);
});

test('CP013B-R2 bookmark resume uses newest valid timestamp, server wins ties',()=>{
 const a={chIdx:0,chapterId:'intro',updatedAt:100};
 const b={chIdx:2,chapterId:'chapter-3',updatedAt:200};
 assert.equal(model.chooseBookmark(a,b,novel).chIdx,2);
 assert.equal(model.chooseBookmark(b,a,novel).chIdx,2);
 assert.equal(model.chooseBookmark({...a,updatedAt:200},b,novel).chIdx,2);
 assert.equal(model.chooseBookmark(a,{...b,chapterId:'deleted'},novel).chIdx,0);
});
test('CP013B-R2 reconciliation rejects a newer local intent including equal timestamps and clock rollback',()=>{
 const a={chIdx:0,chapterId:'intro',updatedAt:100},b={chIdx:1,chapterId:'chapter-2',updatedAt:200};
 assert.equal(model.canReconcile('bookmark',a,a,b),true);
 assert.equal(model.canReconcile('bookmark',a,null,b),true);
 for(const t of [99,100,300])assert.equal(model.canReconcile('bookmark',a,{...b,updatedAt:t},b),false);
 assert.equal(model.canReconcile('phone',{theme:'warm',updatedAt:100},{theme:'oled',updatedAt:100},{theme:'default',updatedAt:200}),false);
});
test('CP013B-R2 status tracks independent targets and fences A-B-A sessions',()=>{
 const s=model.createStatus(),a={},b={},a2={};
 const first=s.begin(a,'bookmark','one'),second=s.begin(a,'bookmark','two'),phone=s.begin(a,'phone',null);
 s.finish(phone,'saved');s.finish(first,'failed');
 assert.equal(s.summary('bookmark').failed,1);assert.equal(s.summary('bookmark').pending,1);
 assert.equal(s.summary('phone').seen,true);assert.equal(s.summary('phone').failed,0);
 const newer=s.begin(a,'bookmark','one');assert.equal(s.finish(first,'saved'),false);
 s.finish(newer,'reconciled');s.finish(second,'saved');assert.equal(s.summary('bookmark').reconciled,1);
 s.begin(b,'phone',null);s.begin(a2,'bookmark','one');
 assert.equal(s.finish(newer,'failed'),false);assert.equal(s.summary('bookmark').failed,0);
 s.reset();assert.equal(s.summary('bookmark').seen,false);
});
