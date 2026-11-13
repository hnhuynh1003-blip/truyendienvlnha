const {test}=require('node:test');
const assert=require('node:assert/strict');
const policy=require('../js/loot-cadence-v42.js');
test('V42+: phone loot requires fifteen minutes; future clock cannot accelerate',()=>{
 const start=1000000;
 assert.equal(policy.PHONE_COOLDOWN_MS,900000);
 assert.equal(policy.phoneRemainingMs(start,start),900000);
 assert.equal(policy.phoneRemainingMs(start,start+899000),1000);
 assert.equal(policy.phoneRemainingMs(start,start+900000),0);
 assert.equal(policy.phoneRemainingMs(start,start+1500000),0);
 assert.equal(policy.phoneRemainingMs(0,start),0);
 assert.equal(policy.phoneRemainingMs(start,start-3600000),900000);
});
test('V42+: no chapter daily quota; only phone collection retains cooldown',()=>{
 assert.equal('CHAPTER_DAILY_LIMIT' in policy,false);
 assert.equal('chapterDailyRemaining' in policy,false);
});
test('V42.6: historic daily claim values remain readable',()=>{
 const date=new Date(2026,9,16,23,59,59,0);
 const tomorrow=new Date(2026,9,17,0,0,1,0);
 const current=policy.nextClaimValue(date.getTime());
 assert.equal(current,policy.dayKey(date.getTime()));
 assert.equal(policy.claimedToday(current,date.getTime()),true);
 assert.equal(policy.claimedToday(current,tomorrow.getTime()),false);
 assert.equal(policy.claimedToday(policy.nextClaimValue(tomorrow.getTime()),tomorrow.getTime()),true);
});
test('V42.6: legacy claims remain recognizable for migration',()=>{
 const now=Date.now();
 assert.equal(policy.claimedToday(true,now),false);
 assert.equal(policy.claimedToday(false,now),false);
 assert.equal(policy.claimedToday(null,now),false);
 assert.equal(policy.claimedToday(undefined,now),false);
 assert.equal(policy.claimedToday('nonsense',now),false);
 assert.equal(policy.claimedToday(policy.nextClaimValue(now),now),true);
});
test('V42.6: phone cadence stays pure and chapter encounters have their own gate',()=>{
 const fs=require('node:fs');
 const src=fs.readFileSync(require('node:path').join(__dirname,'../js/loot-cadence-v42.js'),'utf8');
 assert.doesNotMatch(src,/localStorage\.setItem|db\.collection|saveCurrentAccount|inventory\.push/);
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 assert.match(html,/DuduLootCadenceV42\.PHONE_COOLDOWN_MS/);
 assert.match(html,/DuduChapterLootEncounterV1\.rollSuccess\(Math\.random\(\)\)/);
 assert.match(html,/js\/loot-cadence-v42\.js\?v=wallet-loot-1/);
 assert.match(html,/if \(lootKey\) userProfile\.lootedChapters\[lootKey\] = DuduLootCadenceV42\.nextClaimValue\(now\)/);
 assert.doesNotMatch(html,/chapterDailyRemaining|reader-loot-box/);
});
