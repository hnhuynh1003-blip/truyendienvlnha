const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const art=require('../js/dudu-multiverse-art-v28-r5.js');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../css/dudu-multiverse-art-v28-r5.css'),'utf8');
const pick=fs.readFileSync(path.resolve(__dirname,'../js/dudu-multiverse-ui-v28-r5.js'),'utf8');

function storage(){
 const data=new Map();
 return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
}
test('V28 registry has six independent NPC art choices and four world backgrounds',()=>{
 assert.equal(art.NPC.length,6);
 assert.equal(new Set(art.NPC.map(n=>n.id)).size,6);
 assert.deepEqual(art.NPC.map(n=>n.id),['V01','V02','V03','V04','V05','V06']);
 assert.equal(art.WORLDS.length,4);
 for(const npc of art.NPC){
  assert.match(npc.portraitPath,/^assets\/npc\/v28-v0[1-6]-[a-z]+\.webp$/);
  assert.match(npc.avatarPath,/^assets\/npc\/v28-v0[1-6]-[a-z]+-avatar\.webp$/);
  assert.equal(art.portraitById(npc.id),npc);
 }
 assert.equal(art.portraitById('V100'),null);
});
test('V28 story world mapping explicit metadata first, genre second; never read story title',()=>{
 assert.equal(art.worldForStory({worldArtId:'gothic',genre:'học đường'}),'gothic');
 assert.equal(art.worldForStory({genre:'Tiên hiệp, Huyền huyễn'}),'xianxia');
 assert.equal(art.worldForStory({genre:'Khoa học viễn tưởng'}),'cyberpunk');
 assert.equal(art.worldForStory({tags:['tình cảm','đô thị']}),'modern');
 assert.equal(art.worldForStory({category:'Kinh dị'}),'gothic');
 assert.equal(art.worldForStory({title:'truyện tiên hiệp'}),null);
 assert.equal(art.worldForStory({genre:'chưa phân loại'}),null);
});
test('V28 personal mode remains default, auto mode isolated per owner and safely falls back',()=>{
 const s=storage();
 assert.equal(art.readMode(s,'user1'),'personal');
 assert.equal(art.writeMode(s,'user1','world'),true);
 assert.equal(art.writeMode(s,'user2','personal'),true);
 assert.equal(art.readMode(s,'user1'),'world');
 assert.equal(art.readMode(s,'user2'),'personal');
 assert.equal(art.resolve({mode:'world',personal:'jade',story:{genre:'cyberpunk'}}).wallpaperId,'world-cyberpunk');
 assert.deepEqual({...art.resolve({mode:'world',personal:'jade',story:{title:'unknown'}})},{
   mode:'world',worldId:null,wallpaperId:'jade',usedFallback:true
 });
 assert.equal(art.resolve({mode:'personal',personal:'sakura',story:{genre:'Tiên hiệp'}}).wallpaperId,'sakura');
 assert.equal(art.writeMode(s,'user1','invalid'),false);
 assert.equal(art.writeMode(s,'../../escape','world'),false);
});
test('V28 UI only allows packaged portraits after asset has loaded, with auth gate and no writes',()=>{
 assert.match(html,/id="npc-v28-npc-gallery"/);
 assert.match(html,/renderNpcArtPackV28\(\)/);
 assert.match(pick,/!IS_SANDBOX_MODE/);
 assert.match(pick,/!canEditStories\(\)/);
 assert.match(pick,/button\.disabled=true/);
 assert.match(pick,/image\.onload=/);
 assert.match(pick,/image\.onerror=/);
 assert.match(pick,/DuduNpcAuthorR7\.ALLOWED_PORTRAIT\.test\(npc\.portraitPath\)/);
 assert.match(pick,/document\.getElementById\('npc-r7-portrait'\)\.value=npc\.portraitPath/);
 assert.doesNotMatch(pick,/saveCurrentAccount\(|saveDB\(|\.addDoc\(|\.setDoc\(/);
});
test('V28 world wallpaper controls never write Firestore or alter story/character metadata',()=>{
 assert.match(html,/data-wallpaper-mode="personal"/);
 assert.match(html,/data-wallpaper-mode="world"/);
 assert.match(html,/function setPhoneWallpaperModeV28\(mode\)/);
 assert.match(html,/function activeStoryForWallpaperV28\(\)/);
 assert.match(html,/DuduMultiverseArtV28\.writeMode\(localStorage/);
 assert.match(html,/art\.readMode\(localStorage/);
 assert.match(html,/resolved\.worldId/);
 assert.doesNotMatch(art.toString(),/saveCurrentAccount\(|firebase|fetch\(/);
 assert.match(css,/data-dudu-phone-wallpaper="world-xianxia"/);
 assert.match(css,/data-dudu-phone-wallpaper="world-gothic"/);
 assert.match(css,/body\.dudu-phone-v11/);
});
