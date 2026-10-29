'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const find=require('../js/chapter-loot-encounter-v1.js');
const main=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');

test('only about a quarter of unique account/chapter pairs show an encounter',()=>{
 const opportunities=Array.from({length:400},(_,i)=>find.encounter({
  accountId:'reader-a',storyId:'story-1',chapterId:'chapter-'+i,paragraphCount:20
 }));
 const shown=opportunities.filter(x=>x.visible);
 assert.ok(shown.length>=70&&shown.length<=130,`Expected about 25%, got ${shown.length}`);
 assert.ok(shown.every(x=>x.afterParagraph>=3&&x.afterParagraph<=14));
 assert.ok(opportunities.some(x=>!x.visible));
});

test('same account/chapter always has the same position and cannot reroll on reload',()=>{
 const details={accountId:'reader-a',storyId:'novel-7',chapterId:'ch-9',paragraphCount:18};
 const first=find.encounter(details);
 assert.deepEqual(find.encounter(details),first);
 for(const claim of [true,'2026-10-28','miss:1793210000000','claim:1793210000000']){
  const after=find.encounter({...details,claim});
  assert.equal(after.visible,false);
  assert.equal(after.attempted,true);
 }
 assert.equal(find.encounter({...details,claim:false}).attempted,false);
 assert.equal(find.encounter({...details,paragraphCount:0}).visible,false);
 assert.notEqual(find.hash('reader-a'),find.hash('reader-b'));
});

test('the roll may miss; marker is permanent even when no item is received',()=>{
 assert.equal(find.rollSuccess(0),true);
 assert.equal(find.rollSuccess(0.44999),true);
 assert.equal(find.rollSuccess(0.45),false);
 assert.equal(find.rollSuccess(0.99),false);
 for(const invalid of [-1,1,NaN,'0.1',Infinity])assert.equal(find.rollSuccess(invalid),false);
 assert.equal(find.missMarker(1793210000000),'miss:1793210000000');
 assert.equal(find.attempted(find.missMarker(1793210000000)),true);
 assert.throws(()=>find.missMarker(0));
});

test('reader consumes immediately and no longer displays a guaranteed end-of-chapter box',()=>{
 assert.match(main,/paragraphs\[opportunity\.afterParagraph\]\?\.after\(slot\)/);
 assert.match(main,/document\.querySelector\('#reader-content \.reader-loot-encounter'\)\?\.remove\(\)/);
 assert.match(main,/userProfile\.lootedChapters\[opportunity\.key\]=DuduChapterLootEncounterV1\.missMarker\(now\)/);
 assert.match(main,/if\(chapterLootGrantReadyKey!==lootKey \|\|/);
 assert.match(main,/saveCurrentAccount\(\);\s*showSystemAlert\('✦ DẤU VẾT TAN BIẾN'/);
 assert.doesNotMatch(main,/id="btn-chapter-loot-claim"|chapterDailyRemaining/);
});
