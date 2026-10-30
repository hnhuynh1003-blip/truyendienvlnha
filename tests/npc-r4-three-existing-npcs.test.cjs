const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const rules=require('../js/npc-relationship-v2-r1.js');
const stages=require('../js/npc-relationship-v2-r3.js');
test('R4 supports existing three sample NPC identities without adding or unlocking them',()=>{
 for(const id of ['c_otk','c_ttl','c_tct'])assert.ok(html.includes('id: "'+id+'"'));
 const switcher=html.slice(html.indexOf('function switchChatCharacter()'),html.indexOf('function renderChatMessages('));
 assert.match(switcher,/getStoryProgress\(storyId\)\.collectedCharacters/);
 assert.doesNotMatch(switcher,/unlockChapterCharacter|loadSampleCharactersToCurrentNovel|saveCurrentAccount/);
});
test('three existing NPCs retain separate progress by UID, story, and ID',()=>{
 const ids=['c_otk','c_ttl','c_tct'];
 const values=[{affinity:40,relationshipV2:{trust:5}},
 {affinity:70,relationshipV2:{trust:25}},
 {affinity:99,relationshipV2:{trust:60}}];
 const original=JSON.stringify(values);
 const reads=ids.map((id,i)=>rules.previewRelationship(values[i],'sandboxUser','story1',id));
 assert.deepEqual(reads.map(x=>x.npcId),ids);
 assert.deepEqual(reads.map(x=>x.affinity),[40,70,99]);
 assert.deepEqual(reads.map(x=>x.relationshipV2.trust),[5,25,60]);
 assert.equal(JSON.stringify(values),original,'Existing data must not be mutated when switching NPC');
 assert.equal(rules.previewRelationship(values[0],'sandboxUser','story1','../invalid'),null);
 assert.equal(stages.stage({unlocked:true,affinity:99,trust:60}), 'FRIENDLY',
 'High relationship without verified lore cannot reveal private milestones');
});
test('R4 relationship help is available in live and controls remain accessible',()=>{
 assert.match(html,/id="npc-relationship-r4-help"/);
 assert.match(html,/aria-label="Giải thích quan hệ NPC"/);
 assert.match(html,/function showNpcRelationshipHelp\(\) \{\s*showSystemAlert\('QUAN HỆ NPC V2'/);
 assert.match(html,/npc-relationship-r4-values/);
 assert.match(html,/NPC nhận quà theo sở thích/);
});
