const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const reset=require('../js/player-reset-v54.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function mem(values){
 const m=new Map(Object.entries(values));
 return {get length(){return m.size},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null};
}
test('V54 starts fresh with canonical LV1, EXP0, Xu50, no inventory or NPC access',()=>{
 const p=reset.freshProfile('uid-123','Tác giả',true,[{id:'q1',current:4,claimed:true,target:5}]);
 assert.equal(p.username,'uid-123');
 assert.equal(p.role,'admin');assert.equal(p.level,1);
 assert.equal(p.exp,0);assert.equal(p.currency,50);
 assert.deepEqual(p.inventory,[]);assert.deepEqual(p.storyStates,{});
 assert.deepEqual(p.collectedCharacters,{});
 assert.deepEqual(p.quests,[{id:'q1',current:0,claimed:false,target:5}]);
 assert.deepEqual(p.lootedChapters,{});
 assert.deepEqual(p.readRewards,{});
 assert.deepEqual(p.dailyReadLog,{day:'',chapters:[]});
 assert.ok(!Object.hasOwn(p,'novels')&&!Object.hasOwn(p,'chapters'));
});
test('V54 deletes only production-owned browser player keys, not stories or sandbox',()=>{
 const values={
  'profile_A':'old-profile',
  'dudu-v2:A:global:chats':'old-chats',
  'dudu-v2:A:story:bookmark':'old-mark',
  'dudu-v3:npc-memory:A:s1:n1':'old-npc',
  'dudu-fun:practice:v51:A':'old-game',
  'dudu:companion:local:v51:A':'old-message',
  'dudu-v2:B:global:chats':'another-user',
  'dudu-sandbox-v2:A:global:chats':'sandbox',
  'my_novels_library_db':'story-preserve',
  'dudu-sandbox-library':'sandbox-stories',
  'my_chat_roleplay_histories':'unscoped-legacy-chat'
 };
 const keys=reset.ownedKeys(mem(values),'A');
 for(const key of ['profile_A','dudu-v2:A:global:chats',
  'dudu-v3:npc-memory:A:s1:n1','dudu:companion:local:v51:A',
  'dudu-fun:practice:v51:A','my_chat_roleplay_histories'])assert.ok(keys.includes(key),key);
 for(const key of ['my_novels_library_db','dudu-sandbox-library',
  'dudu-sandbox-v2:A:global:chats','dudu-v2:B:global:chats'])assert.ok(!keys.includes(key),key);
});
test('V54 reset backs up remote profile, then requires typed confirmation before atomic replace',()=>{
 const begin=html.indexOf('async function duduResetPlayerV54()');
 const end=html.indexOf('function openAuthModal()',begin);
 assert.ok(begin>0&&end>begin);
 const section=html.slice(begin,end);
 assert.match(section,/DuduAuth\.isReady\(\)/);
 assert.match(section,/const snap=await ref\.get\(\{source:'server'\}\)/);
 assert.match(section,/DuduPersonalResetV54\.backup\(uid,snap\.exists\?snap\.data\(\):null,localStorage\)/);
 assert.match(section,/a\.download='DUDU-progress-backup-'/);
 assert.match(section,/if\(phrase!=='DAT LAI'\)return/);
 const guard=section.indexOf("if(phrase!=='DAT LAI')return");
 const replace=section.indexOf('await ref.set(fresh)');
 assert.ok(replace>guard,'remote profile must not reset before explicit confirmation');
 assert.match(section,/DuduPersonalResetV54\.ownedKeys\(localStorage,uid\)/);
 assert.doesNotMatch(section,/studio_data|my_novels_library_db|epub_stories_v49|delete\(\)/);
 assert.match(html,/if \(window\.DUDU_RESET_IN_PROGRESS\) return;/);
});
test('V54 Firebase identity guard never uses a cached profile or guessed UID',()=>{
 assert.throws(()=>reset.safetyCheck('A',{currentUser:{uid:'B'}}),/Phiên Firebase/);
 assert.throws(()=>reset.safetyCheck('A',null),/Phiên Firebase/);
 assert.doesNotThrow(()=>reset.safetyCheck('A',{currentUser:{uid:'A'}}));
});
test('V54 all live NPC replies route through server AI and do not silently substitute scripts',()=>{
 const start=html.indexOf('async function sendChatMessage()');
 const end=html.indexOf('// ==========================================',start);
 assert.ok(start>=0&&end>start);
 const chat=html.slice(start,end);
 assert.match(chat,/if \(scripted && !DUDU_NPC_AI_MODE\)/);
 assert.match(chat,/if\(DUDU_SPARK_PERSONAL_MODE && !DUDU_NPC_AI_MODE\)/);
 assert.match(chat,/await deliverNpcReply\(char,storyId,requestUser,requestChatKey,requestRole\)/);
 assert.match(html,/const DUDU_NPC_AI_MODE = !IS_SANDBOX_MODE/);
});
