const {test}=require('node:test');
const assert=require('node:assert/strict');
const museum=require('../js/museum-memories-v43.js');
const dudu=require('../js/companion-rules-v43.js');
const bond=require('../js/npc-bond-v43.js');
test('V43.5: DUDU diary milestones derive from recorded milestones, not guessed from count',()=>{
 const empty=museum.dudu(null);
 assert.equal(empty.total,6);
 assert.equal(empty.earned,0);
 assert.equal(empty.items.every(x=>!x.verified&&!x.collectible),true);
 const preview=museum.dudu({milestones:['dudu-letter-3','dudu-letter-3','dudu-rose-7']});
 assert.equal(preview.earned,2);
 assert.equal(preview.items[0].earned,true);
 assert.equal(preview.items[1].earned,true);
 assert.equal(preview.items[2].earned,false);
 const notEarned=museum.dudu({chat:{day:'2026-10-17',count:90,best:90}});
 assert.equal(notEarned.earned,0,'Do not invent historical achievement ownership');
 assert.equal(dudu.MILESTONES.length,empty.items.length);
});
test('V43.5: story/NPC previews are derived from the correct linked record only',()=>{
 const source={version:1,lastDay:'2026-10-16',current:14,best:14,totalDays:14};
 const p=museum.npc('story-a','npc-a','Lạc',{npcBondV43:source});
 assert.equal(p.key,'npc:story-a::npc-a');
 assert.deepEqual(p.items.map(x=>x.earned),[true,true,true,false]);
 assert.equal(p.earned,3);
 assert.equal(p.record.best,14);
 assert.ok(p.items.every(x=>x.source==='sandbox-npc-bond'&&!x.verified));
 assert.equal(museum.npc('','npc-a','Lạc',{npcBondV43:source}),null);
 assert.equal(museum.npc('story-a','npc-a','Lạc',null),null);
 assert.equal(bond.MILESTONES.length,p.items.length);
});
test('V43.5: album isolates story IDs and never includes locked or removed NPCs',()=>{
 const novels=[
   {id:'a',title:'Tác phẩm 1',characters:[
     {id:'npc',name:'A'},{id:'locked',name:'B'},{id:'arch',name:'C',archived:true}]},
   {id:'b',title:'Tác phẩm 2',characters:[{id:'npc',name:'D'}]}
 ];
 const storyStates={
   a:{collectedCharacters:{npc:{npcBondV43:{version:1,best:30,lastDay:'2026-10-16',current:30}},
     arch:{npcBondV43:{version:1,best:7,lastDay:'2026-10-16',current:7}}}},
   b:{collectedCharacters:{npc:{affinity:66}}}
 };
 const saved=structuredClone(storyStates);
 const groups=museum.catalog({novels,storyStates,companionState:{milestones:['dudu-letter-3']}});
 assert.equal(groups.length,4);
 assert.equal(groups[0].type,'dudu');
 assert.equal(groups[1].earned,4);
 assert.equal(groups[2].archived,true);
 assert.equal(groups[2].earned,2);
 assert.equal(groups[3].earned,0);
 assert.notEqual(groups[1].key,groups[3].key);
 assert.equal(groups.some(x=>x.npcId==='locked'),false);
 assert.deepEqual(storyStates,saved,'Catalog must be pure and read-only');
});
test('V43.5: malformed saves are rejected without trust in local rewards',()=>{
 const catalog=museum.catalog({novels:[{id:'a',characters:[{id:'p'}]}],storyStates:{
   a:{collectedCharacters:{p:'fake'}}}});
 assert.equal(catalog.length,1);
 assert.equal(catalog[0].earned,0);
 const x=museum.npc('a','p','', {npcBondV43:{version:1,best:Infinity}});
 assert.equal(x.earned,0);
 assert.deepEqual(museum.catalog({novels:null,storyStates:null}).map(c=>c.type),['dudu']);
});
