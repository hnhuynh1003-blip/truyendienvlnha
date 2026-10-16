const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const wp=require('../js/phone-wallpaper-v27-r4.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../css/phone-wallpaper-v27-r4.css'),'utf8');

function store(){
 const values=new Map();
 return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),keys:()=>[...values.keys()]};
}
test('V27 R4 plus V29 eight safe wallpaper presets, invalid identifiers fail closed',()=>{
 assert.equal(wp.PRESETS.length,16);
 assert.deepEqual(wp.PRESETS.map(x=>x.id),['midnight','sakura','astral','jade','world-xianxia','world-modern','world-cyberpunk','world-gothic','v34-night','v34-room','v34-sakura','v34-neon','v37-sakura','v37-city-rain','v37-city-night','v36-custom']);
 assert.equal(wp.normalize('astral'),'astral');
 assert.equal(wp.normalize('../../evil.css'),wp.DEFAULT);
 assert.equal(wp.keyFor('../../another-user'),null);
 assert.equal(wp.keyFor(''),null);
 assert.ok(wp.keyFor('sandbox-guest')?.includes('sandbox'));
});
test('V27 R4 account-isolated local wallpaper settings, no storage mutation on reads',()=>{
 const storage=store();
 assert.equal(wp.read(storage,'user-a'),'midnight');
 assert.equal(wp.write(storage,'user-a','sakura'),true);
 assert.equal(wp.write(storage,'user-b','jade'),true);
 assert.equal(wp.read(storage,'user-a'),'sakura');
 assert.equal(wp.read(storage,'user-b'),'jade');
 assert.equal(wp.read(storage,'sandbox-guest'),'midnight');
 assert.equal(wp.write(storage,'user-b','javascript:alert(1)'),false);
 assert.equal(wp.read(storage,'user-b'),'jade');
 assert.equal(storage.keys().length,2);
});
test('V27 R4 safely defaults on disabled storage',()=>{
 const storage={getItem(){throw Error('disabled')},setItem(){throw Error('disabled')}};
 assert.equal(wp.read(storage,'user-a'),'midnight');
 assert.equal(wp.write(storage,'user-a','sakura'),false);
 assert.equal(wp.write(store(),'../../foo','jade'),false);
});
test('V27 R4 markup includes settings, no uploaded remote photo or story save writes',()=>{
 assert.match(html,/href="css\/phone-wallpaper-v27-r4.css"/);
 assert.match(html,/src="js\/phone-wallpaper-v27-r4.js\?v=37-1"/);
 assert.match(html,/id="dudu-v27-wallpaper-heading"/);
 assert.match(html,/function setPhoneWallpaperV27\(id\)/);
 assert.match(html,/if\(!IS_SANDBOX_MODE\|\|!window\.DuduPhoneWallpaperV27\)return/);
 // V34/V37 wallpapers are built by dedicated modules, not V27 static markup.
 for(const p of wp.PRESETS.slice(0,8)){
  assert.match(html,new RegExp('data-dudu-wallpaper-choice="'+p.id+'"'));
  assert.match(html,new RegExp("setPhoneWallpaperV27\\('"+p.id+"'\\)"));
 }
 assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../js/phone-wallpaper-v27-r4.js'),'utf8'),
   /fetch\(|firebase|FileReader|indexedDB|\bURL\(/);
});
test('V27 R4 stylesheet is scoped to Sandbox and keeps contrast overlay',()=>{
 assert.match(css,/body\.dudu-phone-v11\[data-dudu-phone-wallpaper="sakura"\]/);
 assert.match(css,/body\.dudu-phone-v11\[data-dudu-phone-wallpaper\] #cyber-phone \.phone-screen/);
 assert.match(css,/body\.dudu-phone-v11\[data-dudu-phone-wallpaper\] #cyber-phone #phone-home-screen/);
 assert.match(css,/\.dudu-v27-wallpaper-option\[aria-pressed="true"\]/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/(?:^|\n)\s*body\s*\{/);
});
