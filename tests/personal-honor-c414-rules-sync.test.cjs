'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const honor=require('../js/personal-honor-c46.js');
const rules=readFileSync(join(__dirname,'../firestore.rules'),'utf8');
function idsFor(fn){
 const start=rules.indexOf('function '+fn+'()');
 assert.ok(start>=0,fn+' exists');
 const end=rules.indexOf('function ',start+12);
 const chunk=rules.slice(start,end<0?undefined:end);
 return [...chunk.matchAll(/'([a-z][a-z0-9-]+)'/g)].map(x=>x[1]);
}
test('C4.14 Firestore honor allowlist exactly mirrors current collectible catalog',()=>{
 const titles=idsFor('honorTitleIdsC463'),earned=idsFor('honorAchievementIdsC463');
 const expectedTitles=honor.TITLES.map(x=>x.id),expectedAchievements=honor.CATALOG.map(x=>x.id);
 assert.equal(new Set(titles).size,titles.length,'no duplicate title IDs');
 assert.equal(new Set(earned).size,earned.length,'no duplicate achievement IDs');
 assert.deepEqual(new Set(titles),new Set(expectedTitles));
 assert.deepEqual(new Set(earned),new Set(expectedAchievements));
 assert.equal(earned.length,44);
 assert.equal(titles.length,20);
});
test('C4.14 owner profile writes remain UID-only with previous inventory and Xu validations',()=>{
 assert.match(rules,/match \/profiles_v2\/\{uid\} \{/);
 assert.match(rules,/allow update: if self\(uid\) && validLegacyProfile\(request\.resource\.data\)/);
 assert.match(rules,/data\.get\('inventory', \[\]\)\.size\(\) <= 1000/);
 assert.match(rules,/data\.get\('currency', 0\) >= 0/);
 assert.match(rules,/honor\.earned\.hasOnly\(honorAchievementIdsC463\(\)\)/);
 assert.match(rules,/honor\.pinned\.hasOnly\(honorAchievementIdsC463\(\)\)/);
});
