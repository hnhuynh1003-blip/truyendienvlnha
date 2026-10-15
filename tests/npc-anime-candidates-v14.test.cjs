const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const art=require('../js/npc-anime-candidates-v14.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../css/npc-anime-v14.css'),'utf8');

test('V14 includes four noncanonical female anime concept portraits',()=>{
 assert.equal(art.CANDIDATES.length,4);
 assert.equal(new Set(art.CANDIDATES.map(x=>x.id)).size,4);
 for(const candidate of art.CANDIDATES){
  assert.equal(candidate.gender,'female');
  const style=art.styleFor(candidate.id);
  assert.match(style.image,/^url\("data:image\/webp;base64,/);
  assert.equal(style.size,'400% 100%');
  assert.match(style.position,/% center$/);
  const b64=style.image.slice('url("data:image/webp;base64,'.length,-2);
  const binary=Buffer.from(b64,'base64');
  assert.ok(binary.length>10000);
  assert.equal(binary.subarray(0,4).toString(),'RIFF');
  assert.equal(binary.subarray(8,12).toString(),'WEBP');
  assert.equal(art.get(candidate.id).id,candidate.id);
 }
 assert.equal(art.get('unknown'),null);
 assert.equal(art.styleFor('evil:javascript'),null);
});

test('V14 must require explicit author selection, preserving previous visual modes',()=>{
 assert.match(html,/src="js\/npc-anime-candidates-v14.js"/);
 assert.match(html,/href="css\/npc-anime-v14.css"/);
 assert.match(html,/id="npc-v14-anime-id" type="hidden"/);
 assert.match(html,/function npcSelectAnimeCandidate\(id\)/);
 assert.match(html,/if\(!IS_SANDBOX_MODE\)return;/);
 assert.match(html,/const saved=npc\?\.portraitAnimeId/);
 assert.match(html,/if\(r7\.animeId\)edited\.portraitAnimeId=r7\.animeId/);
 assert.match(html,/else delete edited\.portraitAnimeId/);
 assert.match(html,/DuduNpcAnimeCandidatesV14\.styleFor\(npc\.portraitAnimeId\)/);
 assert.match(css,/#npc-v14-anime-gallery/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('an anime illustration cannot mutate a reader profile or grant items',()=>{
 const start=html.indexOf('function npcSelectAnimeCandidate(');
 const end=html.indexOf('function npcRenderPortraitChoices()',start);
 const selection=html.slice(start,end);
 assert.doesNotMatch(selection,/saveCurrentAccount|saveDB\(|inventory\.splice|unlockChapterCharacter|fetch\(/);
});
