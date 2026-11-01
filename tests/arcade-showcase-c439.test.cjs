'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const core=require('../js/personal-arcade-core-v1.js');
const book=require('../js/arcade-treasure-c438.js');
const display=require('../js/arcade-showcase-c439.js');

const discovered=()=>{
 const s=core.fresh(1000);
 s.neon.contracts=[0];
 s.mine.found.stone=1;s.mine.found.gold=1;s.mine.found.crystal=1;
 s.garden.fishAlbum.koi=1;
 s.jade.album['5-1']=1;
 return book.snapshot(s);
};

test('C4.39 four slots accept only discovered, non-season Arcade memories',()=>{
 const view=discovered();
 let pins=[];
 for(const id of ['neon-contract-0','ore-stone','ore-gold','jade-5-1']){
  const step=display.toggle(pins,id,view);
  assert.equal(step.ok,true);pins=step.selected;
 }
 assert.equal(pins.length,4);
 assert.deepEqual(display.visible({version:1,selected:pins},view),pins);
 assert.equal(display.toggle(pins,'fish-koi',view).reason,'not-owned',
  'All fish belong in the Aquarium, including the fish already discovered');
 assert.equal(display.toggle(pins,'ore-crystal',view).reason,'full');
 const removed=display.toggle(pins,'ore-gold',view);
 assert.equal(removed.ok,true);assert.equal(removed.removed,true);
 assert.equal(display.toggle(removed.selected,'ore-gold',view).selected.length,4);
 assert.equal(display.toggle(pins,'s01-founder',view).reason,'not-owned');
 assert.equal(display.toggle(pins,'s01-neon',view).reason,'not-owned');
 assert.equal(display.toggle(pins,'fish-phoenix',view).reason,'not-owned');
});

test('C4.39 manual or corrupted display preferences never create ownership',()=>{
 const view=discovered(),before=JSON.stringify(view);
 const forged={version:1,selected:['s01-founder','jade-7-6','ore-stone',
  'ore-stone','fish-koi','neon-contract-0','jade-5-1','ore-gold']};
 assert.deepEqual(display.normalize(forged),['jade-7-6','ore-stone','fish-koi','neon-contract-0']);
 assert.deepEqual(display.visible(forged,view),['ore-stone','neon-contract-0']);
 assert.equal(JSON.stringify(view),before,'never writes to the source game snapshot');
 assert.deepEqual(display.visible(forged,book.snapshot(core.fresh(1000))),[]);
 assert.equal(display.toggle(forged,'jade-7-6',view).reason,'not-owned');
 assert.deepEqual(display.normalize('{invalid-json'),[]);
 assert.deepEqual(display.normalize({selected:['<img src=x onerror=alert(1)>']}),[]);
});

test('C4.39 old saves work and selecting a display never writes a gameplay reward',()=>{
 const original=core.fresh(1000);
 original.mine.found.crystal=4;
 const text=JSON.stringify(original),view=book.snapshot(core.norm(JSON.parse(text),1000));
 assert.equal(display.toggle([], 'ore-crystal',view).ok,true);
 assert.equal(JSON.stringify(original),text);
 const yearOne=view.items.filter(x=>x.season==='s01');
 assert.ok(yearOne.every(x=>x.status==='preview'));
});

test('C4.39 gallery wiring shares real AI art, keeps verified museum separate and fits mobile',()=>{
 const index=readFileSync(join(root,'index.html'),'utf8');
 const vault=readFileSync(join(root,'js/museum-vault-c426.js'),'utf8');
 const ui=readFileSync(join(root,'js/arcade-showcase-ui-c439.js'),'utf8');
 const treasureUi=readFileSync(join(root,'js/arcade-treasure-ui-c438.js'),'utf8');
 const css=readFileSync(join(root,'css/arcade-showcase-c439.css'),'utf8');
 for(const name of ['arcade-showcase-c439.js','arcade-showcase-ui-c439.js',
  'arcade-showcase-c439.css'])assert.match(index,new RegExp(name.replace(/\./g,'\\.')+'\\?v=c439-1'));
 assert.match(index,/museum-vault-c426\.js\?v=c426-3&amp;gallery=c429-2&amp;display=c439-2/);
 assert.match(index,/arcade-treasure-ui-c438\.js\?v=c438-1&amp;display=c439-2/);
 assert.match(index,/arcade-showcase-c439\.css\?v=c439-1&amp;layout=c439-3/);
 assert.match(index,/museum-stage-c439r2\.css\?v=c439r2-3/);
 assert.match(vault,/museum-c426-panel-display/);
 assert.match(vault,/\['gallery','display','preview','owned','memories'\]/);
 assert.match(vault,/DuduArcadeShowcaseUIV439\?\.mount/);
 assert.match(vault,/DuduArcadeShowcaseUIV439\?\.render/);
 assert.match(treasureUi,/item\.status==='owned'/);
 assert.match(treasureUi,/item\.kind!=='fish'/);
 assert.match(treasureUi,/DuduArcadeShowcaseUIV439\?\.toggle/);
 assert.match(ui,/dudu-arcade-showcase:v1:/);
 assert.match(ui,/encodeURIComponent\(id\)/);
 assert.match(ui,/root\.localStorage\.setItem\(saveKey/);
 assert.doesNotMatch(ui,/runTransaction|firebase|collectibles-client|wallet|\.removeItem\(/i);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/#phone-app-museum #museum-items\{\s*flex:0 0 auto!important/);
 assert.match(css,/container-type:inline-size/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 const repair=readFileSync(join(root,'css/museum-stage-c439r2.css'),'utf8');
 assert.match(repair,/museum-c429-feature-art/);
 assert.match(repair,/s01-relic-atlas\.webp/);
 assert.match(repair,/s01-founder-crest\.webp/);
 assert.match(repair,/\.museum-c426-collection\{\s*display:grid;grid-template-columns:repeat\(5/);
 assert.match(repair,/filter:saturate\(\.82\) brightness\(\.86\)/,
  'Preview must retain the authentic Season 01 art palette');
 assert.doesNotMatch(ui,/scene\.append\(light,el\('div','dudu-c439-plinth'/);
 for(const name of ['assets/museum-c426/hall-night.webp',
  'assets/arcade-c425a/ore-atlas.webp','assets/arcade-c425b/fish-bestiary.webp',
  'assets/arcade-c432-ai/finished-jade.webp'])assert.ok(existsSync(join(root,name)),name);
});
