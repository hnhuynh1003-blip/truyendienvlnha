const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const art=require('../js/dudu-multiverse-art-v28-r5.js');
const wallpaper=require('../js/phone-wallpaper-v27-r4.js');

test('V29 home links to actual stories, Codex remains accessible under Liên Lạc',()=>{
 assert.match(html,/class="app-icon" onclick="openPhoneApp\('stories'\)" aria-label="Mở danh sách truyện"/);
 assert.doesNotMatch(html,/class="app-icon" onclick="openPhoneApp\('codex'\)"/);
 assert.match(html,/id="phone-app-stories"/);
 assert.match(html,/id="dudu-v29-story-grid"/);
 assert.match(html,/onclick="openPhoneApp\('codex'\)">Danh bạ NPC/);
 assert.match(html,/function renderPhoneStoryListV29\(\)/);
 assert.match(html,/function openPhoneStoryV29\(storyId\)/);
 assert.match(html,/openCover\(index\)/);
 const renderer=html.slice(html.indexOf('function renderPhoneStoryListV29()'),
  html.indexOf('async function renderMuseum()'));
 assert.match(renderer,/document\.createElement\('article'\)/);
 assert.match(renderer,/\.textContent=/);
 assert.doesNotMatch(renderer,/saveDB\(|saveCurrentAccount\(|firebase\./);
});
test('V29 four world illustrated personal choices preserve account isolation and invalid path rejection',()=>{
 assert.equal(wallpaper.PRESETS.length,8);
 const worlds=wallpaper.PRESETS.filter(x=>x.id.startsWith('world-'));
 assert.deepEqual(worlds.map(x=>x.id),['world-xianxia','world-modern','world-cyberpunk','world-gothic']);
 for(const world of worlds)assert.match(html,new RegExp('data-dudu-wallpaper-choice="'+world.id+'"'));
 assert.equal(wallpaper.normalize('world-cyberpunk'),'world-cyberpunk');
 assert.equal(wallpaper.normalize('javascript:alert(1)'),'midnight');
});
test('V29 ten illustrated WebP previews are present, structurally valid, and referenced by exact paths',()=>{
 const files=[
  ...new Set(art.NPC.map(n=>n.portraitPath)),
  ...new Set(art.NPC.map(n=>n.avatarPath)),
  ...art.WORLDS.map(w=>w.image)
 ];
 assert.equal(files.length,16);
 for(const relative of files){
   const loc=path.resolve(root,relative);
   assert.ok(loc.startsWith(root+path.sep));
   const buf=fs.readFileSync(loc);
   assert.ok(buf.length>300,relative+' is too small');
   assert.equal(buf.toString('ascii',0,4),'RIFF',relative);
   assert.equal(buf.toString('ascii',8,12),'WEBP',relative);
   assert.equal(buf.readUInt32LE(4)+8,buf.length,relative+' RIFF content-size mismatch');
 }
});
