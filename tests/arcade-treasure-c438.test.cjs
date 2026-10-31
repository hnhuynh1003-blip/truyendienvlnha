'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {join}=require('node:path');
const core=require('../js/personal-arcade-core-v1.js');
const season=require('../js/personal-arcade-season-c423.js');
const book=require('../js/arcade-treasure-c438.js');
const dir=join(__dirname,'..');

test('C4.38 catalogue covers all real Arcade albums while respecting fish museum rules',()=>{
 assert.equal(book.CATALOG.length,85);
 assert.equal(new Set(book.CATALOG.map(x=>x.id)).size,85);
 const count=game=>book.CATALOG.filter(x=>x.game===game&&x.season==='evergreen').length;
 assert.equal(count('neon'),3,'only completed contracts count as Neon memories');
 assert.equal(count('mine'),10);
 assert.equal(count('garden'),11,'ordinary fish remain in Sổ Cá, not Báu Vật/Thủy Cung');
 assert.equal(count('jade'),56,'all historical Grade × Color pairs are represented');
 assert.deepEqual(book.CATALOG.filter(x=>x.season==='s01').map(x=>x.name),
  [...season.RELICS.map(x=>x.name),'Ấn Khai Nguyên']);
 for(const fish of book.CATALOG.filter(x=>x.kind==='fish')){
  assert.notEqual(core.FISH_SPECIES[fish.artId].rarity,'Thường');
 }
 const empty=book.snapshot(core.fresh(1000));
 assert.equal(empty.owned,0);assert.equal(empty.available,80);
 assert.equal(empty.preview,5);
});

test('C4.38 discovery reads durable past finds but never asserts current inventory',()=>{
 const s=core.fresh(1000);
 s.neon.contracts=[0,2];
 s.mine.found.relic=2;s.mine.found.crystal=4;s.mine.ores.relic=0;
 s.garden.fishAlbum.koi=2;s.garden.fishAlbum.dragon=1;
 s.jade.album['5-6']=1;s.jade.album['7-2']=3;s.jade.vault=[];
 const before=JSON.stringify(s),v=book.snapshot(s);
 assert.equal(JSON.stringify(s),before,'the book never changes the original gameplay state');
 assert.equal(v.owned,8);
 const status=id=>v.items.find(x=>x.id===id);
 assert.equal(status('neon-contract-2').status,'owned');
 assert.equal(status('ore-relic').count,2,'historical finds remain even when already sold');
 assert.equal(status('fish-koi').count,2);
 assert.equal(status('jade-7-2').status,'owned');
 assert.equal(status('fish-dragon').displayName,'Long ngư tinh vân');
 assert.equal(status('fish-phoenix').concealed,true);
 assert.equal(status('fish-phoenix').displayName,'Báu vật chưa hé lộ');
 assert.doesNotMatch(status('fish-phoenix').displayHint,/Phượng|phoenix/);
 const saved=core.norm(JSON.parse(before),1000);
 assert.equal(book.snapshot(saved).owned,v.owned,'old normalized saves keep the same discoveries');
});

test('C4.38 every Season 01 image is only a preview, even with tampered local marks',()=>{
 const s=core.fresh(1000);
 s.season.records.s01.relics=['neon','mine','garden','jade'];
 s.season.records.s01.completedAt=900;
 const view=book.snapshot(s);
 assert.equal(view.preview,5);
 const seasonal=book.select(view,{season:'s01'});
 assert.equal(seasonal.length,5);
 assert.ok(seasonal.every(x=>x.status==='preview'&&!x.owned&&x.count===0));
 assert.ok(book.select(view,{rarity:'legacy',status:'owned'}).length===0);
 assert.equal(book.select(view,{season:'s01',status:'preview'}).length,5);
 assert.equal(book.select(view,{game:'neon',season:'s01'}).length,1);
 assert.equal(season.PHASE,'preview');
});

test('C4.38 visual wiring is account-scoped, read-only and uses existing real art',()=>{
 const html=readFileSync(join(dir,'index.html'),'utf8');
 const css=readFileSync(join(dir,'css/arcade-treasure-c438.css'),'utf8');
 const ui=readFileSync(join(dir,'js/arcade-treasure-ui-c438.js'),'utf8');
 for(const path of ['assets/arcade-c425a/ore-atlas.webp',
  'assets/arcade-c425b/fish-bestiary.webp',
  'assets/arcade-c432-ai/finished-jade.webp',
  'assets/arcade-season/s01-relic-atlas.webp',
  'assets/arcade-season/s01-founder-crest.webp'])assert.ok(existsSync(join(dir,path)),path);
 for(const path of ['arcade-treasure-c438.js','arcade-treasure-ui-c438.js',
  'arcade-treasure-c438.css'])assert.ok(html.includes(path+'?v=c438-1'),path);
 for(const id of ['arcade-treasure-launch-c438','dudu-honor-treasure-launch-c438',
  'phone-app-treasures','dudu-treasure-content-c438'])assert.ok(html.includes(`id="${id}"`));
 assert.match(ui,/encodeURIComponent\(id\)/);
 assert.match(ui,/root\.localStorage\?\.getItem\?/);
 assert.doesNotMatch(ui,/\.setItem\(|\.removeItem\(|\.runTransaction\(|\.collection\(/);
 assert.match(ui,/if\(item\.concealed\)/);
 assert.match(css,/\[data-status="missing"\] \.dudu-c438-art/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/@media\(max-width:340px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
