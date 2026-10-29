const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');

const root=join(__dirname,'..');
const index=readFileSync(join(root,'index.html'),'utf8');
const css=readFileSync(join(root,'css/library-reader-l2c.css'),'utf8');
const prefs=require('../js/library-reader-preferences-l2c.js');

test('L2C reading preferences validate unsupported values without touching Phone',()=>{
  assert.deepEqual(prefs.sanitize({font:'javascript:',size:500,theme:'unknown'}),prefs.DEFAULT);
  assert.deepEqual(prefs.sanitize({font:'serif',size:24,theme:'sepia'}),{
    font:'serif',size:24,theme:'sepia'
  });
  assert.doesNotMatch(readFileSync(join(root,'js/library-reader-preferences-l2c.js'),'utf8'),
    /cyber-phone|setReadingFontSize\(|setTheme\(|phone-app-settings|v568SavePhoneAppearance\(/);
});

test('L2C reading preferences persist only to a separate device key',()=>{
  const items=new Map([['phone','preserved']]);
  const store={getItem:key=>items.get(key)||null,setItem:(key,value)=>items.set(key,value)};
  assert.equal(prefs.save(store,{font:'mono',size:20,theme:'light'}),true);
  assert.deepEqual(prefs.load(store),{font:'mono',size:20,theme:'light'});
  assert.equal(items.get('phone'),'preserved');
  store.setItem(prefs.KEY,'{invalid');
  assert.deepEqual(prefs.load(store),prefs.DEFAULT);
});

test('L2C reader top controls navigate chapters and settings target their own popover',()=>{
  assert.match(index,/id="btn-prev-ch-top" onclick="prevChapter\(\)"/);
  assert.match(index,/id="btn-next-ch-top" onclick="nextChapter\(\)"/);
  assert.match(index,/id="reader-settings-trigger" aria-expanded="false"/);
  assert.match(index,/id="reader-font-choice"/);
  assert.match(index,/id="reader-font-size"/);
  assert.match(index,/data-reader-theme="sepia"/);
  assert.doesNotMatch(index,/<button[^>]*onclick="openPhoneApp\('settings'\); togglePhone\(\);"/);
  assert.match(index,/btn-prev-ch-top'\)\.hidden = chIdx === 0/);
  assert.match(index,/btn-next-ch-top'\)\.hidden = chIdx === novel\.chapters\.length-1/);
  assert.match(css,/\.reader-body \{\s*color:var\(--reader-ink\);font-family:var\(--reader-font/);
});

test('L2C cover tags and published EPUB preview never mutate cloud stories',()=>{
  assert.match(index,/id="book-genre-tags"/);
  assert.match(index,/genreHost\.appendChild\(tag\)/);
  assert.match(index,/novel\._cloudV49&&!introText/);
  assert.match(index,/DuduLibrarySynopsisSearchL2D\.synopsisChapter\(novel\)/);
  assert.match(index,/librarySynopsisIndexL2D\.ensure\(novel\)/);
  assert.match(index,/style="display:\$\{novel\._cloudV49\?'none':'flex'\}/);
  assert.match(index,/readerEdit\.hidden=!!novel\._cloudV49/);
  assert.doesNotMatch(index,/DuduEpubProductionV49\.updatePublished|DuduEpubProductionV49\.updateChapter/);
});
