'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const catalog=require('../js/item-catalog-v2.js');const museum=require('../js/museum-collection-f40.js');
const rare=catalog.funVantVat.filter(x=>['S','SS','SSS'].includes(x.rank));
test('F4.0 derives nine realm sets from canonical catalog, including zero-rare realms',()=>{
 const groups=museum.snapshot(catalog,[]);assert.equal(groups.length,9);assert.equal(groups.reduce((n,g)=>n+g.total,0),14);
 assert.deepEqual(Object.fromEntries(groups.map(g=>[g.id,g.total])),{ORIGIN:8,PALEO:2,CULTIVATION:2,CYBER:0,WASTELAND:0,ANIME:0,DREAM:0,GARDEN:0,COSMOS:2});
 assert.ok(groups.every(g=>!g.complete&&!g.explored));
});
test('F4.0 album deduplicates, ignores invalid and lower rank IDs for rare progress',()=>{
 const id=rare[0].id;const low=catalog.funVantVat.find(x=>x.rank==='E');
 const groups=museum.snapshot(catalog,[id,id,low.id,'invented-id','fun-eternal-crown']);
 assert.equal(groups.reduce((n,g)=>n+g.count,0),1);assert.ok(groups.find(g=>g.id===low.funRealm).explored);
 assert.ok(groups.flatMap(g=>g.items).every(x=>rare.includes(x)));
});
test('F4.0 completion is derived historical display, independent of physical inventory after sale',()=>{
 const album=rare.map(x=>x.id);const before=JSON.stringify({catalog,album});
 const groups=museum.snapshot(catalog,album);assert.equal(groups.filter(g=>g.complete).length,4);
 assert.ok(groups.filter(g=>!g.total).every(g=>!g.complete));
 assert.equal(JSON.stringify({catalog,album}),before);assert.equal(museum.snapshot(catalog,[]).reduce((n,g)=>n+g.count,0),0);
});
test('F4.0 malformed albums cannot create ownership',()=>{
 for(const album of [null,undefined,{},'f34-origin-dawn-goddess'])assert.equal(museum.snapshot(catalog,album).reduce((n,g)=>n+g.count,0),0);
});
