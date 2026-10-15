const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const art=require('../js/npc-anime-candidates-v14.js');
const imagePath=path.resolve(__dirname,'../assets/npc/concepts/female-anime-candidates-v15.webp');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../css/npc-portrait-viewer-v15.css'),'utf8');

test('V15 atlas is real 1920x640 WebP, four 480x640 portrait panels',()=>{
 const buf=fs.readFileSync(imagePath);
 assert.ok(buf.length>100000&&buf.length<400000);
 assert.equal(buf.toString('ascii',0,4),'RIFF');
 assert.equal(buf.toString('ascii',8,12),'WEBP');
 assert.equal(buf.toString('ascii',12,16),'VP8 ');
 assert.equal(buf.toString('hex',23,26),'9d012a');
 assert.equal(buf.readUInt16LE(26)&0x3fff,1920);
 assert.equal(buf.readUInt16LE(28)&0x3fff,640);
 assert.equal(art.CANDIDATES.length,4);
});
test('V15 high-res style maps four candidates to bundled same-origin sprite',()=>{
 for(let i=0;i<4;i++){
  const item=art.CANDIDATES[i],hi=art.hiResStyleFor(item.id);
  assert.equal(hi.size,'400% 100%');
  assert.equal(hi.position, (i*100/3)+'% center');
  assert.ok(hi.image.includes('./assets/npc/concepts/female-anime-candidates-v15.webp'));
  assert.match(art.styleFor(item.id).image,/^url\("data:image\/webp;base64,/);
 }
 assert.equal(art.hiResStyleFor('unknown'),null);
});
test('V15 viewer has keyboard, close, no mutation and is sandbox-gated',()=>{
 for(const fragment of [
  'id="npc-v15-viewer"', 'aria-modal="true"','id="npc-v15-close"',
  'function openNpcPortraitViewer(npc,storyId,opener=null)',
  "if(!IS_SANDBOX_MODE||!npc||!storyId)return false;",
  "(!canEditStories()&&!isNpcUnlocked(storyId,npc.id))",
  'function closeNpcPortraitViewer()', "event.key==='Escape'",
  'function openChatNpcPortraitViewer()',
  "DuduNpcAnimeCandidatesV14.ensureHiRes().then(ok=>"
 ])assert.ok(html.includes(fragment),fragment);
 const from=html.indexOf('function openNpcPortraitViewer(');
 const to=html.indexOf('function switchChatCharacter()',from);
 const functions=html.slice(from,to);
 assert.doesNotMatch(functions,/inventory\.splice|saveDB\(|saveCurrentAccount\(|grantGift|unlockChapterCharacter/);
 assert.match(css,/body\.dudu-phone-v11 \.npc-v15-viewer/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
