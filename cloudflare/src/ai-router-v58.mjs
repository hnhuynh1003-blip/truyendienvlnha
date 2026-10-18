/* DUDU V58 — bounded, free-only provider routing for NPC text.
 * All paths require the existing verified Firebase UID and Durable Object quota.
 * No OpenAI/Claude/paid DeepSeek API adapters or chargeable AI Gateway calls.
 * Workers AI remains physically disabled until account-free-plan verification,
 * explicit approval, binding presence and free-only flags are ALL satisfied.
 */
import {textOnlyNpcContents} from './npc-chat-format-v56-11.mjs';

export const WORKERS_AI_MODELS=Object.freeze([
  Object.freeze({id:'@cf/zai-org/glm-4.7-flash',label:'Workers AI · GLM-4.7 Flash · miễn phí nếu còn hạn mức',provider:'workers-ai'}),
  Object.freeze({id:'@cf/google/gemma-4-26b-a4b-it',label:'Workers AI · Gemma 4 26B · miễn phí nếu còn hạn mức',provider:'workers-ai'})
]);
const WORKERS_IDS=new Set(WORKERS_AI_MODELS.map(x=>x.id));

export function isWorkersAiModel(model){
  return typeof model==='string'&&WORKERS_IDS.has(model);
}
export function workersAiFreeApproved(env){
  return !!env && env.DUDU_AI_FREE_ONLY==='true' &&
    env.DUDU_WORKERS_AI_APPROVED==='true' &&
    env.DUDU_WORKERS_ACCOUNT_FREE_VERIFIED==='true' &&
    env.DUDU_PAID_PROVIDERS_ENABLED!=='true' &&
    typeof env.AI?.run==='function';
}
export function availableWorkersModels(env){
  return workersAiFreeApproved(env)?WORKERS_AI_MODELS:[];
}
export function failoverAllowed(code){
  // A malformed prompt (HTTP 400), auth failure or project-budget exhaustion
  // must NOT be bypassed by trying more models/providers.
  return ['gemini-rate-limit','gemini-overloaded','upstream-unavailable',
    'model-unavailable','upstream-error'].includes(code);
}

// Cloudflare Workers AI text models can return either {response} or an
// OpenAI-compatible {choices:[{message:{content}}]}. Treat reasoning and
// tool-call output as non-display content; never echo it to the NPC chat.
export function extractWorkersAiText(result){
  const choice=result?.choices?.[0]?.message?.content;
  const legacy=result?.response??result?.result?.response??result?.output_text;
  const value=choice??legacy;
  if(typeof value==='string')return value.trim();
  if(Array.isArray(value))return value
    .filter(x=>x?.type==='text'&&typeof x?.text==='string')
    .map(x=>x.text).join('\n').trim();
  return '';
}

export async function workersAiNpc(payload,env){
  if(!isWorkersAiModel(payload?.model))
    return {error:{code:'model-unavailable',message:'Model Workers AI không nằm trong danh sách DUDU.'},status:409};
  if(!workersAiFreeApproved(env))
    return {error:{code:'provider-not-enabled',message:'Workers AI chưa được chủ DUDU duyệt ở chế độ miễn phí. Không thực hiện yêu cầu tính phí.'},status:503};
  const contents=textOnlyNpcContents(payload.contents);
  const instruction=payload?.systemInstruction?.parts?.map(x=>x?.text||'').join('\n').trim();
  const question=contents?.[0]?.parts?.[0]?.text;
  if(!instruction||!question)
    return {error:{code:'invalid-content',message:'Ngữ cảnh NPC không hợp lệ; tin nhắn đã được giữ lại.'},status:400};
  try{
    const result=await env.AI.run(payload.model,{
      messages:[{role:'system',content:instruction},{role:'user',content:question}],
      max_completion_tokens:640
    });
    const answer=extractWorkersAiText(result);
    if(!answer)
      return {error:{code:'empty-response',message:'Workers AI chưa tạo được lời nhắn NPC.'},status:502};
    const usage=result?.usage||result?.result?.usage||{};
    return {data:{text:answer,model:payload.model,provider:'workers-ai',
      usage:{
        inputTokens:Math.max(0,Number(usage.prompt_tokens||usage.input_tokens)||0),
        outputTokens:Math.max(0,Number(usage.completion_tokens||usage.output_tokens)||0),
        totalTokens:Math.max(0,Number(usage.total_tokens)||0)
      }},status:200};
  }catch(e){
    // Never expose upstream error body, prompts or token-bearing stack traces.
    const status=Number(e?.status)||0;
    return {error:{code:status===429?'workers-ai-rate-limit':'workers-ai-unavailable',
      message:status===429?'Workers AI đã tới giới hạn. Không chuyển sang dịch vụ trả phí.':
        'Workers AI tạm thời không thể trả lời. Tin nhắn vẫn được giữ.'},status:502};
  }
}

export async function routeNpcAi(payload,env,callGemini){
  if(isWorkersAiModel(payload?.model))return workersAiNpc(payload,env);
  const primary=await callGemini(payload,env);
  if(!primary?.error || !failoverAllowed(primary.error.code) ||
     env?.DUDU_AI_FALLBACK_ENABLED!=='true' || !workersAiFreeApproved(env))
    return primary;
  // One fallback at most. Do not retry 400 errors, cascade models or
  // compromise the global DUDU quota and author/reader access checks.
  const alternate=await workersAiNpc({...payload,model:WORKERS_AI_MODELS[0].id},env);
  return alternate?.data?{...alternate,data:{...alternate.data,fallbackFrom:payload.model}}:primary;
}
