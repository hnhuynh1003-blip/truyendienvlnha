/* DUDU Homepage A.2.2-R3: static regression guards. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Sơn Hà assets and linked stylesheet are present',()=>{
 for(const name of ['hero-h1.webp','transition-h2.webp','gallery-h3b.webp']){
  const buf=fs.readFileSync(path.join(root,'assets/homepage-sonha-v3',name));
  assert.equal(buf.subarray(0,4).toString(),'RIFF');
  assert.equal(buf.subarray(8,12).toString(),'WEBP');
 }
 assert.match(read('index.html'),/homepage-sonha-v3\.css\?v=art-v3-1/);
});
test('Homepage binds to real catalog/bookmark instead of demo content',()=>{
 const src=read('js/site-shell-v60.js');
 assert.match(src,/const all=recent\(list\(\)\),reading=shelfItems\(\)/);
 assert.match(src,/smartReadAction\(idx\)/);
 assert.match(src,/DuduLibrarySmartFilterL3\.catalogGenres\(all\)/);
 assert.doesNotMatch(src,/SYS \/\/ STORY ARCHIVE/);
});
test('Reader and Library core scripts are unchanged by this art layer',()=>{
 const style=read('css/homepage-sonha-v3.css');
 assert.match(style,/#home-view/);
 assert.match(style,/#d60-shelf/);
 assert.doesNotMatch(style,/#reader-paper|#reader-view|#cover-view/);
});
