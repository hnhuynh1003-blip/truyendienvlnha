import test from 'node:test';
import assert from 'node:assert/strict';
import {entryCostView} from '../prototypes/tutien-combat-s/collection/result-view.mjs';
test('entry cost presentation hides zero and unknown without inventing a price',()=>{for(const value of [0,null,undefined,NaN,Infinity,-1])assert.deepEqual(entryCostView(value),{hidden:true,text:''});});
test('positive engine cost is displayed without conversion or mutation',()=>{assert.deepEqual(entryCostView(5),{hidden:false,text:'5 Thể Lực'});assert.deepEqual(entryCostView(2),{hidden:false,text:'2 Thể Lực'});});
