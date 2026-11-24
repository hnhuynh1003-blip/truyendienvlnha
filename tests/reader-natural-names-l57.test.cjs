'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const api=require('../js/reader-natural-names-l57.js'),engine=require('../js/reader-names-l54.js');
const group=(s,items=[])=>api.groups(s,items);
test('L57 editorial whole names have no invented Chinese, gender or identity',()=>{
 for(const [from,to] of [['Khi Dã','Kỳ Dã'],['Nhưng Chân','Nhược Chân']]){
  const g=group(from);assert.equal(g.length,3);assert.equal(g[0].items.length,0);
  assert.equal(g[1].items[0].name,to);assert.match(g[1].items[0].reason,/không phải bản dịch xác thực/);
  assert.deepEqual(g[1].items[0].parts,[]);assert.equal(g[1].items[0].automatic,false);assert.equal(g[2].items[0].name,from);
 }
});
test('L57 requires real lookup traces and distinguishes reverse lookup from original Hanzi',()=>{
 const inferred={name:'Thời Dã',kind:'inferred',reason:'Tra ngược',parts:[{hanzi:'時',source:'fixture bộ tra',from:'khi',to:'Thời'}]};
 assert.match(group('Khi Dã',[inferred])[0].items[0].reason,/KHÔNG xác nhận chữ Hán gốc/);
 assert.equal(group('Khi Dã',[{...inferred,parts:[]}])[0].items.length,0);
 const direct={name:'Thời Dã',kind:'hanviet',reason:'Bộ tra',parts:[{hanzi:'時野',source:'fixture',from:'時野',to:'Thời Dã'}]};
 assert.equal(group('時野',[direct])[0].items[0].name,'Thời Dã');
});
test('L57 NFC, ordinary words and unknown full names never receive invented names',()=>{
 assert.equal(group('Khi Dã'.normalize('NFD'))[1].items[0].name,'Kỳ Dã');
 for(const word of ['khi','nhưng','Trần Khi Dã','Tên Chưa Biết'])assert.equal(group(word)[1].items.length,0);
 for(const s of ['<img>','', 'x'.repeat(91)])assert.deepEqual(group(s),[]);
});
test('L57 confirmed aliases win and colliding identities stay distinct',()=>{
 const confirmed={name:'Khi Dã',kind:'confirmed',profileId:'a',parts:[],reason:''};
 const g=group('Khi Dã',[confirmed,{...confirmed,profileId:'b'}]);
 assert.equal(g[1].items.length,2);assert.deepEqual(g[1].items.map(i=>i.profileId),['a','b']);
 assert(g[1].items.every(i=>i.kind==='confirmed'));assert.equal(g[0].items.length,0);
});
test('L57 confirmed full-name replacement is story-local, reversible and backup compatible',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const store=engine.create({storage}),text='Khi Dã nói khi trời sáng. Nhưng Chân hỏi nhưng không đáp.';
 const before=store.backup('epub:a');store.add('epub:a','Khi Dã','Kỳ Dã');store.add('epub:a','Nhưng Chân','Nhược Chân');
 assert.equal(store.render('epub:a',text),'Kỳ Dã nói khi trời sáng. Nhược Chân hỏi nhưng không đáp.');
 assert.equal(store.render('web:b',text),text);assert.match(store.backup('epub:a'),/Kỳ Dã/);
 store.undo('epub:a');store.undo('epub:a');assert.equal(store.backup('epub:a'),before);
});
