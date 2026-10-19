import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {NPC_MODELS,DEFAULT_MODEL,allowedModel,resolveModel} from '../src/npc-models.mjs';
import {validRequest,USER_DAILY_LIMIT,GLOBAL_DAILY_LIMIT,MIN_INTERVAL_MS} from '../src/limits.mjs';

test('V58 keeps only four Gemini 3.1+ models',()=>{
 assert.equal(DEFAULT_MODEL,'gemini-3.5-flash-lite');
 assert.equal(NPC_MODELS.length,4);
 assert.equal(new Set(NPC_MODELS.map(m=>m.id)).size,NPC_MODELS.length);
 for(const model of NPC_MODELS){
  assert.equal(allowedModel(model.id),true);
  assert.equal(resolveModel(model.id),model.id);
  assert.ok(!model.id.includes('pro')&&!model.id.includes('image')&&!model.id.includes('live'));
 }
 assert.equal(resolveModel('gemini-3.1-pro-preview'),null);
 for(const legacy of ['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-3-flash-preview']){
  assert.equal(allowedModel(legacy),false);
  assert.equal(resolveModel(legacy),null);
 }
 assert.equal(resolveModel('../foo'),null);
 assert.equal(resolveModel(undefined),DEFAULT_MODEL);
});

test('V55 model routing remains server-controlled and separate from author-only assist',()=>{
 const base={purpose:'chat',instruction:'Hãy nhập vai nhân vật',messages:[{role:'user',text:'Xin chào'}]};
 for(const model of NPC_MODELS){
  assert.equal(validRequest({...base,model:model.id})?.model,model.id);
 }
 assert.equal(validRequest({...base,model:'paid-secret-model'}),null);
 for(const legacy of ['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-3-flash-preview'])
  assert.equal(validRequest({...base,model:legacy}),null);
 assert.equal(validRequest({...base,purpose:'assist',model:'gemini-3.8-flash'},true).model,DEFAULT_MODEL);
 assert.equal(validRequest({...base,purpose:'assist',model:'gemini-3.8-flash'},false),null);
 const worker=fs.readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 assert.match(worker,/const model=payload\.model\|\|MODEL/);
 assert.match(worker,/return json\(\{\.\.\.state,enabled:true,models:\[\.\.\.NPC_MODELS,\.\.\.availableWorkersModels\(env\)\]/);
 assert.match(worker,/\bverifyFirebaseIdToken\(req,env\.PROJECT_ID\)/);
 assert.match(worker,/await bucket\.reserve\(user\.uid,Date\.now\(\)\)/);
 assert.doesNotMatch(worker,/model=parsed\?\.model|request\.data\.model/);
});

test('V55 raises personal limits while preserving one in-flight request and cooldown',()=>{
 assert.equal(USER_DAILY_LIMIT,120);
 assert.equal(GLOBAL_DAILY_LIMIT,250);
 assert.equal(MIN_INTERVAL_MS,5000);
});
