import {test} from 'node:test';
import assert from 'node:assert/strict';
import {qiankunView} from '../../js/tutien-qiankun-vis-t2.mjs';
test('Bag defaults unavailable, has no owned contents, and does not derive capacity from concept',()=>{
 const v=qiankunView();assert.equal(v.preview,false);assert.equal(v.capacity,null);assert.equal(v.maximum,9);assert.equal(v.used,0);assert.equal(v.slots.length,9);assert(v.slots.every(s=>s.kind==='locked'));assert(Object.isFrozen(v.slots));
});
test('Capacity simulations are explicitly previews and never change the default view',()=>{
 for(const n of [1,4,9]){const v=qiankunView(n);assert(v.preview);assert.equal(v.slots.filter(s=>s.kind==='open').length,n);assert.equal(v.slots.filter(s=>s.kind==='upgrade').length,n===9?0:1);assert.equal(v.used,0);}
 assert.equal(qiankunView().capacity,null);
});
test('Invalid preview capacity cannot masquerade as opened bag',()=>{
 for(const n of [0,10,-1,1.5,'1',NaN])assert.throws(()=>qiankunView(n));
});
