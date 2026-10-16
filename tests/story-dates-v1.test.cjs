const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dates=require('../js/story-dates-v1.js');
test('latest date picks newest chapter or story change (not last chapter)',()=>{
 assert.equal(dates.latest({updatedAt:'2026-10-15',chapters:[
  {updatedAt:'2026-10-09'},{updatedAt:'2026-10-10'}]}),'2026-10-15');
 assert.equal(dates.latest({updatedAt:'2026-10-09',chapters:[
  {updatedAt:'2026-10-14'},{updatedAt:'2026-10-10'}]}),'2026-10-14');
 assert.equal(dates.latest({chapters:[{createdAt:'2026-10-11'}]}),'2026-10-11');
});
test('missing dates never invent 09/10/2026 and invalid dates ignored',()=>{
 assert.equal(dates.latest({chapters:[{},{}]}),null);
 assert.equal(dates.display(dates.latest({})), 'Chưa có ngày');
 assert.equal(dates.validDate('2026-02-30'),null);
 assert.equal(dates.validDate('2026-10-09'),'2026-10-09');
 assert.equal(dates.display('2026-10-15'),'15/10/2026');
});
test('local publishing day stays correct across midnight Vietnam, even UTC yesterday',()=>{
 const d=new Date('2026-10-14T18:30:00.000Z');
 assert.equal(dates.localToday(d),'2026-10-15');
 assert.equal(dates.localToday(new Date('2026-10-15T16:45:00.000Z')),'2026-10-15');
});
test('browser wiring uses shared dates instead of hard-coded fallback',()=>{
 const s=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 assert.match(s,/function getNovelLatestDate\(novel\)\s*\{\s*return DuduStoryDates\.latest\(novel\)/);
 assert.match(s,/DuduStoryDates\.display\(latestDate\)/);
 assert.match(s,/DuduStoryDates\.localToday\(\)/);
 assert.doesNotMatch(s,/if \(!n\.updatedAt\) n\.updatedAt = "2026-10-09"/);
});
