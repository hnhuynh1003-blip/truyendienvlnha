import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validRequest} from '../src/limits.mjs';
import {summarizeGemini400} from '../src/gemini-diagnostics-v57-3.mjs';

const req=role=>validRequest({purpose:'chat',model:'gemini-3.1-flash-lite',
  instruction:'DUDU NPC giao tiếp với '+role+'. Không gán người lạ thành vai chính.',
  messages:[{role:'user',text:'Xin chào tôi là '+role+'.'}]});

test('V57.3 AU and reader chat pass the same authorization-independent schema',()=>{
  for(const name of ['AU vai khách','Độc giả vai tự do']){
    const input={purpose:'chat',model:'gemini-3.1-flash-lite',
      instruction:'Gọi đúng tên '+name,
      messages:[{role:'user',text:'Tôi là '+name}]};
    assert.deepEqual(validRequest(input,true),validRequest(input,false));
  }
});

test('V57.3 unknown Google 400 preserves useful statuses without raw error exposure',()=>{
  const p=req('Độc giả riêng tư');
  const googleError={status:'INVALID_ARGUMENT',
    message:'Request contains an invalid argument. PRIVATE-STORY-CHAPTER',
    details:[{'@type':'type.googleapis.com/google.rpc.BadRequest',
      fieldViolations:[{field:'GenerateContentRequest.contents[0].parts[0].text',
        description:'PRIVATE-CHAPTER and token key'}]}]};
  const actual=summarizeGemini400(googleError,{
    systemInstruction:p.systemInstruction,contents:p.contents
  });
  assert.equal(actual.code,'gemini-content-format');
  assert.equal(actual.diagnostic.upstreamStatus,'INVALID_ARGUMENT');
  assert.equal(actual.diagnostic.field,'contents');
  assert.equal(actual.diagnostic.contentTurns,'single');
  assert.ok(!JSON.stringify(actual).includes('PRIVATE-'));
  assert.ok(!JSON.stringify(actual).includes('token key'));
  assert.ok(!JSON.stringify(actual).includes('Độc giả riêng tư'));
});

test('V57.3 no unsafe upstream error fields or precision leaks',()=>{
  const p=req('Bạn đọc');
  for(const status of ['FAILED_PRECONDITION','INVALID_ARGUMENT','WEIRD_SECRET_STATUS']){
    const r=summarizeGemini400({status,
      message:'Request contains an invalid argument. character secret text'},{
      systemInstruction:p.systemInstruction,contents:p.contents
    });
    assert.ok(['gemini-prerequisite','invalid-upstream-request'].includes(r.code));
    assert.ok(['FAILED_PRECONDITION','INVALID_ARGUMENT','UNSPECIFIED'].includes(r.diagnostic.upstreamStatus));
    assert.equal(r.diagnostic.field,'unknown');
    assert.deepEqual(Object.keys(r.diagnostic).sort(),
      ['contentSize','contentTurns','field','instructionSize','prerequisite','upstreamStatus'].sort());
    assert.ok(!JSON.stringify(r).includes('character secret'));
  }
  assert.equal(summarizeGemini400({},{}).diagnostic.contentSize,'empty');
});

test('V57.3 classifies unknown Google systemInstruction errors without exposing prompt',()=>{
  const r=summarizeGemini400({status:'INVALID_ARGUMENT',message:'GenerateContentRequest.systemInstruction error PRIVATE'},{
    systemInstruction:{parts:[{text:'Sensitive backstory'}]},
    contents:[{role:'user',parts:[{text:'Hello'}]}]
  });
  assert.equal(r.code,'gemini-system-instruction');
  assert.equal(r.diagnostic.field,'systemInstruction');
  assert.ok(!JSON.stringify(r).includes('Sensitive backstory'));
});

test('V57.3 production UI receives correlation reference, not token or raw error body',()=>{
  const worker=fs.readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../../js/ai-proxy.js',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  assert.match(worker,/summarizeGemini400\(upstream\?\.error,body\)/);
  assert.match(worker,/crypto\.randomUUID\(\)\.slice\(0,8\)/);
  assert.match(worker,/reference:upstream400\.reference/);
  assert.doesNotMatch(worker,/console\.(?:log|warn|error)\([^;\n]*upstream\?\.error\?\.message/);
  assert.match(browser,/reference:\/\^\[a-f0-9\]\{8\}\$\/\.test/);
  assert.match(html,/Mã kiểm tra: /);
  assert.match(html,/src="js\/ai-proxy\.js\?v=58-1-npc-output"/);
});

test('V57.4 Google FAILED_PRECONDITION location is not misreported as reader permissions',()=>{
 const p=req('Bạn đọc');
 const result=summarizeGemini400({
  status:'FAILED_PRECONDITION',
  message:'User location is not supported for the API use. PRIVATE-NPC-TEXT'
 },{systemInstruction:p.systemInstruction,contents:p.contents});
 assert.equal(result.code,'gemini-location-restricted');
 assert.equal(result.diagnostic.prerequisite,'location');
 assert.match(result.message,/khu vực/i);
 assert.ok(!JSON.stringify(result).includes('PRIVATE-NPC-TEXT'));
 assert.ok(!JSON.stringify(result).includes('Bạn đọc'));
});
test('V57.4 separates billing prerequisite without starting payments',()=>{
 const r=summarizeGemini400({status:'FAILED_PRECONDITION',
  message:'Billing is not enabled for the project. PRIVATE-API-KEY'},{
    systemInstruction:{parts:[{text:'SECRET-SYSTEM'}]},
    contents:[{role:'user',parts:[{text:'PRIVATE-CHAT'}]}]
  });
 assert.equal(r.code,'gemini-billing-prerequisite');
 assert.equal(r.diagnostic.prerequisite,'billing');
 assert.ok(!JSON.stringify(r).includes('SECRET-SYSTEM'));
 assert.ok(!JSON.stringify(r).includes('PRIVATE-CHAT'));
 assert.ok(!JSON.stringify(r).includes('PRIVATE-API-KEY'));
});
test('V57.4 ambiguous precondition remains ambiguous; do not auto-enable billing',()=>{
 const r=summarizeGemini400({status:'FAILED_PRECONDITION',
  message:'an unspecified precondition remains unmet'},{
  systemInstruction:{parts:[{text:'Do not disclose this'}]},
  contents:[{role:'user',parts:[{text:'Hi'}]}]});
 assert.equal(r.code,'gemini-prerequisite');
 assert.equal(r.diagnostic.prerequisite,'unknown');
});
