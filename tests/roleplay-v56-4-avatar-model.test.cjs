const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const role=require('../js/roleplay-identity-v56.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const catalog=fs.readFileSync(path.join(__dirname,'../cloudflare/src/npc-models.mjs'),'utf8');
const story={id:'v56-4-story',characters:[]};
test('V56.4 role portraits include 60 female and 12 male premium assets',()=>{
 assert.equal(role.AVATAR_IDS.filter(x=>/^portrait-f-/.test(x)).length,60);
 assert.equal(role.AVATAR_IDS.filter(x=>/^portrait-m-/.test(x)).length,12);
 assert.ok(role.AVATAR_IDS.includes('account'));
 assert.ok(role.AVATAR_IDS.includes('initials'));
 const state=role.upsert(role.empty(),{id:'one',mode:'traveler',name:'Độc giả',avatar:'portrait-f-60'},story).state;
 const storage=new Map();
 const adapter={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null};
 assert.equal(role.save(adapter,'user-1',story,false,state),true);
 assert.equal(role.load(adapter,'user-1',story,false).profiles[0].avatar,'portrait-f-60');
 assert.equal(role.load(adapter,'user-2',story,false).profiles.length,0);
 assert.equal(role.load(adapter,'user-1',{id:'other',characters:[]},false).profiles.length,0);
});
test('V56.4 render uses existing premium catalog and keeps V55 history keys',()=>{
 assert.match(html,/window\.DuduNpcPremiumV40\?\.styleFor\(role\.avatar\)/);
 assert.match(html,/DuduRoleplayV56\.AVATAR_IDS/);
 assert.match(html,/renderPlayerAvatarV16\(el\)/);
 assert.equal(role.legacyChatKey('story','npc'),'story::npc');
 assert.equal(role.chatKey('story','one','npc'),'story::role56:one::npc');
});
test('V56.4 retains seven V55 allowlisted model IDs without billing shortcuts',()=>{
 const ids=[...catalog.matchAll(/Object\.freeze\(\{id:'([^']+)'/g)].map(x=>x[1]);
 assert.equal(ids.length,7);
 assert.equal(new Set(ids).size,7);
 for(const id of ids)assert.ok(id.startsWith('gemini-')&&!id.includes('pro'));
});
