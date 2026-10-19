import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validRequest} from '../src/limits.mjs';
import {classifyGemini400} from '../src/gemini-error-v56-10.mjs';
import {textOnlyNpcContents} from '../src/npc-chat-format-v56-11.mjs';
import {routeNpcAi,workersAiNpc,workersAiFreeApproved,
  availableWorkersModels,WORKERS_AI_MODELS,isWorkersAiModel,failoverAllowed,extractWorkersAiText,classifyWorkersAiFailure
} from '../src/ai-router-v58.mjs';

const base=(role='Khách mới',model='gemini-3.5-flash-lite')=>({
  purpose:'chat',model,
  instruction:'NPC chỉ trò chuyện với '+role+'; không gán vai người khác.',
  messages:[{role:'user',text:'Xin chào, tôi là '+role}]
});
function freeEnv(){
  const calls=[];
  return {calls,env:{
    DUDU_AI_FREE_ONLY:'true',DUDU_WORKERS_AI_APPROVED:'true',
    DUDU_WORKERS_ACCOUNT_FREE_VERIFIED:'true',DUDU_PAID_PROVIDERS_ENABLED:'false',
    DUDU_AI_FALLBACK_ENABLED:'true',
    AI:{async run(model,options){calls.push({model,options});return {response:'Chào bạn, tôi nhớ tên bạn.'};}}
  }};
}

test('V57.1 both author and reader chat pass identical server-side payload contract',()=>{
  for(const role of ['Tác giả đang thử NPC','Độc giả A']){
    const req=base(role);
    const author=validRequest(req,true),reader=validRequest(req,false);
    assert.deepEqual(author,reader);
    assert.ok(author.systemInstruction.parts[0].text.includes(role));
    assert.equal(textOnlyNpcContents(author.contents)[0].role,'user');
    assert.equal(textOnlyNpcContents(author.contents).length,1);
  }
  assert.equal(validRequest({...base(),purpose:'assist'},false),null);
  assert.ok(validRequest({...base(),purpose:'assist'},true));
});

test('V57.1 distinct HTTP 400 classifications never reveal raw Google messages',()=>{
  const table=[
    ['Invalid JSON payload: Unknown name "temperature" at generation_config','gemini-invalid-parameters'],
    ['model gemini-example does not support generateContent','gemini-model-request'],
    ['multiturn chat should alternate user and model','gemini-turn-format'],
    ['contents is empty: parts required','gemini-content-format'],
    ['too many tokens in context window','gemini-context-limit'],
    ['INVALID_ARGUMENT: unrecognized upstream policy','invalid-upstream-request']
  ];
  for(const [sample,code] of table){
    const value=classifyGemini400(sample);
    assert.equal(value.code,code);
    assert.ok(!value.message.includes(sample),'do not return Google upstream raw details');
  }
});

test('V57.1 does not re-send a synthetic assistant prefill to Gemini',()=>{
  const payload=validRequest({...base(),messages:[
    {role:'user',text:'Chào'},
    {role:'model',text:'Xin chào'},
    {role:'user',text:'Tôi là vai B'}
  ]});
  const packed=textOnlyNpcContents(payload.contents);
  assert.equal(packed.length,1);
  assert.equal(packed[0].role,'user');
  assert.match(packed[0].parts[0].text,/Tôi là vai B/);
});

test('V58 all paid providers and secondary Workers AI disabled by default',async()=>{
  let calls=0;
  const AI={run:async()=>{calls++;throw Error('must stay disabled')}};
  assert.equal(workersAiFreeApproved({AI}),false);
  assert.deepEqual(availableWorkersModels({AI}),[]);
  assert.equal(workersAiFreeApproved({...freeEnv().env,DUDU_PAID_PROVIDERS_ENABLED:'true'}),false);
  assert.equal(workersAiFreeApproved({...freeEnv().env,DUDU_WORKERS_ACCOUNT_FREE_VERIFIED:'false'}),false);
  const model=WORKERS_AI_MODELS[0].id;
  assert.ok(isWorkersAiModel(model));
  assert.equal(validRequest(base('Vai B',model))?.model,model);
  const response=await workersAiNpc(validRequest(base('Vai B',model)),{AI});
  assert.equal(response.error.code,'provider-not-enabled');
  assert.equal(calls,0);
  assert.equal(validRequest(base('Vai B','openai-paid-model')),null);
});

test('V58 HTTP 400 and DUDU budget restrictions never trigger fallback',async()=>{
  const {env,calls}=freeEnv();
  const payload=validRequest(base());
  const malformed=await routeNpcAi(payload,env,async()=>({
    error:{code:'invalid-upstream-request',message:'HTTP 400'},status:502
  }));
  assert.equal(malformed.error.code,'invalid-upstream-request');
  assert.equal(calls.length,0);
  assert.equal(failoverAllowed('daily-global'),false);
  assert.equal(failoverAllowed('upstream-unavailable'),false,'timeout must not create a late second billable request');
  assert.equal(failoverAllowed('gemini-invalid-parameters'),false);
  assert.equal(failoverAllowed('gemini-prerequisite'),false,'unknown Google prerequisite must not fan out');
  assert.equal(failoverAllowed('gemini-billing-prerequisite'),false,'never bypass required paid access');
  assert.equal(failoverAllowed('gemini-location-restricted'),true,'independent free provider can be used after explicit approval');
  const noApproval=await routeNpcAi(payload,{
    ...env,DUDU_WORKERS_AI_APPROVED:'false'
  },async()=>({error:{code:'gemini-rate-limit'},status:429}));
  assert.equal(noApproval.error.code,'gemini-rate-limit');
  assert.equal(calls.length,0);
  const timedOut=await routeNpcAi(payload,env,async()=>({
    error:{code:'upstream-unavailable'},status:502
  }));
  assert.equal(timedOut.error.code,'upstream-unavailable');
  assert.equal(calls.length,0,'do not invoke a second provider after client deadline risk');
});

test('V58 only region-classified Gemini error may fall back to a separate approved free provider',async()=>{
  const {env,calls}=freeEnv();
  const payload=validRequest(base('Khách tự do'));
  const result=await routeNpcAi(payload,env,async()=>({
    error:{code:'gemini-location-restricted',message:'Google location restricted'},status:502
  }));
  assert.equal(result.status,200);
  assert.equal(result.data.provider,'workers-ai');
  assert.equal(calls.length,1);
  assert.equal(calls[0].model,WORKERS_AI_MODELS[0].id);
  const blocked=await routeNpcAi(payload,{...env,DUDU_WORKERS_ACCOUNT_FREE_VERIFIED:'false'},
    async()=>({error:{code:'gemini-location-restricted'},status:502}));
  assert.equal(blocked.error.code,'gemini-location-restricted');
  assert.equal(calls.length,1,'no second provider call without verified free plan');
  const paid=await routeNpcAi(payload,env,async()=>({
    error:{code:'gemini-billing-prerequisite'},status:502
  }));
  assert.equal(paid.error.code,'gemini-billing-prerequisite');
  assert.equal(calls.length,1,'never bypass billing prerequisite');
});

test('V58 one configured-free Workers AI fallback on provider 429; preserve NPC identity and quota',async()=>{
  const {env,calls}=freeEnv();
  const payload=validRequest(base('Người quan sát'));
  const result=await routeNpcAi(payload,env,async()=>({error:{code:'gemini-rate-limit'},status:429}));
  assert.equal(result.status,200);
  assert.equal(result.data.provider,'workers-ai');
  assert.equal(result.data.fallbackFrom,payload.model);
  assert.equal(calls.length,1);
  assert.equal(calls[0].model,WORKERS_AI_MODELS[0].id);
  assert.match(calls[0].options.messages[0].content,/Người quan sát/);
  assert.equal(calls[0].options.messages.at(-1).role,'user');
  assert.deepEqual(calls[0].options.messages.map(m=>m.role),['system','user']);
});


test('V58 normalizes Workers AI chat completion output but never reveals reasoning',()=>{
  assert.equal(extractWorkersAiText({response:'  Chào bạn  '}),'Chào bạn');
  assert.equal(extractWorkersAiText({choices:[{message:{content:'  Tôi đang chờ bạn.  ',reasoning:'SECRET'}}]}),
    'Tôi đang chờ bạn.');
  assert.equal(extractWorkersAiText({choices:[{message:{content:[{type:'text',text:'Một'},{type:'tool_call',name:'secret'},{type:'text',text:'Hai'}]}}]}),
    'Một\nHai');
  assert.equal(extractWorkersAiText({choices:[{message:{content:null,reasoning:'hidden'}}]}),'');
  assert.equal(extractWorkersAiText({result:{response:'Trả lời cũ'}}),'Trả lời cũ');
});
test('V58 Workers AI actual choices schema yields NPC text with token counters',async()=>{
  const {env,calls}=freeEnv();
  env.AI.run=async(model,options)=>{
    calls.push({model,options});
    return {choices:[{message:{role:'assistant',content:'Xin chào, người quan sát.',reasoning:'not allowed'}}],
      usage:{prompt_tokens:55,completion_tokens:11,total_tokens:66}};
  };
  const payload=validRequest(base('Người quan sát',WORKERS_AI_MODELS[0].id));
  const result=await workersAiNpc(payload,env);
  assert.equal(result.status,200);
  assert.equal(result.data.text,'Xin chào, người quan sát.');
  assert.deepEqual(result.data.usage,{inputTokens:55,outputTokens:11,totalTokens:66});
  assert.equal(calls.length,1);
});

test('V58 Cloudflare free quota and paid model errors are fail-closed',async()=>{
  const cases=[
    [{code:3036,status:429},'workers-ai-free-limit'],
    [{code:'5035',status:403},'workers-ai-paid-model-blocked'],
    [{code:3040,status:429},'workers-ai-capacity'],
    [{status:429},'workers-ai-rate-limit'],
    [{status:403},'workers-ai-access-denied'],
    [new Error('SENSITIVE INTERNAL ERROR'), 'workers-ai-unavailable']
  ];
  for(const [failure,expected] of cases){
    const c=classifyWorkersAiFailure(failure);
    assert.equal(c.code,expected);
    assert.doesNotMatch(JSON.stringify(c),/SENSITIVE INTERNAL ERROR/);
    assert.doesNotMatch(JSON.stringify(c),/api[_-]?key/i);
    assert.doesNotMatch(JSON.stringify(c),/upgrade.+now/i);
  }
  const {env}=freeEnv();
  env.AI.run=async()=>{const e=new Error('PRIVATE-ACCOUNT-DETAIL');e.code=3036;e.status=429;throw e;};
  const payload=validRequest(base('Thử nghiệm',WORKERS_AI_MODELS[0].id));
  const result=await workersAiNpc(payload,env);
  assert.equal(result.error.code,'workers-ai-free-limit');
  assert.equal(result.status,502);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE-ACCOUNT-DETAIL/);
});

test('V58 no paid provider URL or direct chargeable AI gateway introduced',()=>{
  const router=fs.readFileSync(new URL('../src/ai-router-v58.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(router,/api\.openai\.com|api\.anthropic\.com|api\.deepseek\.com/);
  assert.doesNotMatch(router,/AI_GATEWAY_KEY|apiKey|billing\.create/i);
  const worker=fs.readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
  assert.match(worker,/await routeNpcAi\(payload,env,gemini\)/);
  assert.match(worker,/verifyFirebaseIdToken\(req,env\.PROJECT_ID\)/);
  const cfg=fs.readFileSync(new URL('../wrangler.npc-ai-v54.toml',import.meta.url),'utf8');
  for(const flag of ['DUDU_WORKERS_AI_APPROVED','DUDU_WORKERS_ACCOUNT_FREE_VERIFIED',
    'DUDU_AI_FALLBACK_ENABLED','DUDU_PAID_PROVIDERS_ENABLED'])
    assert.match(cfg,new RegExp(flag+' = "false"'));
});
