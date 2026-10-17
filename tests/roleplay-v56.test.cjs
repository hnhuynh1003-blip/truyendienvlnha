const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const role=require('../js/roleplay-identity-v56.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function mem(){
 const m=new Map();
 return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),keys:()=>[...m.keys()]};
}
const story={id:'book-1',title:'Điên VL',characters:[
 {id:'hero',name:'Tôi',role:'Nhân vật chính'},
 {id:'friend',name:'Ôn Tri Hành',role:'Cố nhân'}
]};
const traveler=(id,name='A Nhiên')=>({id,mode:'traveler',name,pronouns:'neutral',backstory:'Người đến từ vùng đất xa lạ.'});
test('V56 only author-confirmed main characters can be possessed',()=>{
 assert.deepEqual(role.candidates(story),[{id:'hero',name:'Tôi'}]);
 assert.ok(role.upsert(role.empty(),{id:'a',mode:'main',name:'Tôi',protagonistId:'hero'},story).state);
 assert.ok(role.upsert(role.empty(),{id:'bad',mode:'main',name:'Ôn Tri Hành',protagonistId:'friend'},story).error);
 assert.ok(role.upsert(role.empty(),{id:'bad',mode:'main',name:'Người ngoài',protagonistId:'hero'},story).error);
 assert.ok(role.upsert(role.empty(),{id:'c',mode:'observer',name:'Người xem'},story).state);
 const limited={...story,roleplayPolicy:{allowedModes:['traveler'],mainCharacterIds:['hero']}};
 assert.ok(role.upsert(role.empty(),{id:'a',mode:'main',name:'Tôi',protagonistId:'hero'},limited).error);
});
test('V56 persists multiple roles separately by story, account and sandbox',()=>{
 const storage=mem();let state=role.empty();
 state=role.upsert(state,traveler('role-a'),story).state;
 state=role.upsert(state,traveler('role-b','Tiểu Du'),story).state;
 assert.equal(role.active(state).name,'Tiểu Du');
 assert.ok(role.save(storage,'uid-a',story,false,state));
 assert.deepEqual(role.load(storage,'uid-a',story,false),state);
 assert.equal(role.load(storage,'uid-b',story,false).profiles.length,0);
 assert.equal(role.load(storage,'uid-a',{...story,id:'book-2'},false).profiles.length,0);
 assert.equal(role.load(storage,'uid-a',story,true).profiles.length,0);
 assert.notEqual(role.key('uid-a','book-1'),role.key('uid-a','book-2'));
 assert.notEqual(role.chatKey('book-1','role-a','npc'),role.chatKey('book-1','role-b','npc'));
 assert.notEqual(role.memoryNpcId('role-a','npc'),role.memoryNpcId('role-b','npc'));
 assert.equal(role.legacyChatKey('book-1','npc'),'book-1::npc');
});
test('V56 relations, dates and limits are private to identity and never award economy',()=>{
 let state=role.upsert(role.empty(),traveler('role-a'),story).state;
 state=role.upsert(state,traveler('role-b','Tiểu Du'),story).state;
 const date=Date.parse('2026-10-17T09:00:00Z');
 for(let i=0;i<5;i++)state=role.recordReply(state,'role-a','npc-1',date+i*1000);
 assert.deepEqual(role.relationship(state,'role-a','npc-1'),{affinity:13,trust:1});
 assert.deepEqual(role.relationship(state,'role-b','npc-1'),{affinity:10,trust:0});
 assert.deepEqual(role.relationship(state,'role-a','npc-2'),{affinity:10,trust:0});
 state=role.recordReply(state,'role-a','npc-1',date+86400000);
 assert.deepEqual(role.relationship(state,'role-a','npc-1'),{affinity:14,trust:1});
 assert.equal(role.recordReply(state,'unknown','npc-1'),null);
 assert.equal(JSON.stringify(state).includes('inventory'),false);
});
test('V56 prompt has all three distinct contracts, no forced protagonist or cross-role memories',()=>{
 let s=role.upsert(role.empty(),{id:'main',mode:'main',name:'Tôi',protagonistId:'hero'},story).state;
 s=role.upsert(s,traveler('traveler'),story).state;
 s=role.upsert(s,{id:'observer',mode:'observer',name:'Khách quan sát'},story).state;
 for(const p of s.profiles)assert.ok(role.prompt(p,story).includes('Tên người liên lạc: '+p.name));
 assert.match(role.prompt(s.profiles[0],story),/nhân vật chính có ID hero/);
 assert.match(role.prompt(s.profiles[1],story),/không phải nhân vật chính/);
 assert.match(role.prompt(s.profiles[2],story),/không hiện diện trong cảnh truyện/);
 assert.doesNotMatch(role.prompt(s.profiles[1],story),/nhân vật chính có ID hero/);
 assert.ok(role.prompt(s.profiles[1],story).length<1000);
});
test('V56 refuses changing an existing role mode and preserves original chats unless explicit import',()=>{
 let s=role.upsert(role.empty(),traveler('role-a'),story).state;
 assert.ok(role.upsert(s,{id:'role-a',mode:'observer',name:'Người xem'},story).error);
 for(let i=0;i<5;i++)s=role.upsert(s,traveler('role-'+i,'Tên khác'),story).state;
 assert.equal(s.profiles.length,6);
 assert.ok(role.upsert(s,traveler('role-extra'),story).error);
 assert.match(html,/onclick="v56ImportLegacyChat\(\)"/);
 assert.match(html,/if\(!confirm\('Sao chép hội thoại V55 CHƯA GÁN VAI/);
 assert.match(html,/legacyChatKey\(npcId,story\.id\)/);
 assert.match(html,/DuduRoleplayV56\.chatKey\(storyId,roleId,charId\)/);
 assert.match(html,/if\(!requestRole\)\{v56OpenRoleEditor\(false\);return;\}/);
 assert.match(html,/DuduRoleplayV56\.prompt\(requestRole,novel\)/);
 assert.match(html,/requestRole\.id/);
 assert.match(html,/roleplay-identity-v56\.js\?v=56-1/);
});
