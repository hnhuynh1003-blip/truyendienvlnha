/* DUDU V58 — bounded, free-only provider routing for NPC text.
 * All paths require the existing verified Firebase UID and Durable Object quota.
 * No OpenAI/Claude/paid DeepSeek API adapters or chargeable AI Gateway calls.
 * Workers AI remains physically disabled until account-free-plan verification,
 * explicit approval, binding presence and free-only flags are ALL satisfied.
 */
import {workersNpcDialogue} from './npc-dialogue-v58-3.mjs';

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
  // gemini upstream-unavailable may already mean a 25-second timeout.
  // A second provider request could outlive the browser's 32-second deadline
  // and consume quota without ever reaching the player.
  // A confirmed Google regional denial can use an independently hosted,
  // operator-approved FREE Workers AI provider. Never retry other Google
  // endpoints, spoof location, or route unknown/billing HTTP 400 errors.
  return ['gemini-rate-limit','gemini-overloaded','gemini-location-restricted',
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

// Cloudflare AI errors use internal codes. Preserve only a small allowlist;
// do not echo raw provider errors, account details or rate-limit messages.
export function classifyWorkersAiFailure(e){
  const numeric=[e?.code,e?.error?.code,e?.cause?.code]
    .map(x=>Number(x)).find(n=>Number.isInteger(n)&&n>0);
  if(numeric===3036)
    return {code:'workers-ai-free-limit',
      message:'Workers AI đã hết 10.000 Neurons miễn phí hôm nay. DUDU sẽ không tự nâng cấp hoặc tính phí.'};
  if(numeric===5035)
    return {code:'workers-ai-paid-model-blocked',
      message:'Cloudflare yêu cầu gói trả phí cho model này. DUDU đã chặn yêu cầu và không kích hoạt thanh toán.'};
  if(numeric===3040)
    return {code:'workers-ai-capacity',
      message:'Workers AI đang hết tài nguyên phục vụ. Tin nhắn vẫn được giữ để thử lại sau.'};
  if(Number(e?.status)===429)
    return {code:'workers-ai-rate-limit',
      message:'Workers AI đã đạt giới hạn tạm thời hoặc hạn mức miễn phí. Không tự chuyển sang dịch vụ trả phí.'};
  if(Number(e?.status)===403)
    return {code:'workers-ai-access-denied',
      message:'Cloudflare từ chối quyền gọi model. DUDU không tự mở quyền trả phí.'};
  return {code:'workers-ai-unavailable',
    message:'Workers AI tạm thời không thể trả lời. Tin nhắn vẫn được giữ.'};
}

export async function workersAiNpc(payload,env){
  if(!isWorkersAiModel(payload?.model))
    return {error:{code:'model-unavailable',message:'Model Workers AI không nằm trong danh sách DUDU.'},status:409};
  if(!workersAiFreeApproved(env))
    return {error:{code:'provider-not-enabled',message:'Workers AI chưa được chủ DUDU duyệt ở chế độ miễn phí. Không thực hiện yêu cầu tính phí.'},status:503};
  // Unlike Gemini, Workers AI accepts authenticated OpenAI-style turns.
  // Do not flatten prior NPC answers into the newest user question.
  const dialogue=workersNpcDialogue(payload.contents);
  const instruction=payload?.systemInstruction?.parts?.map(x=>x?.text||'').join('\n').trim();
  if(!instruction||!dialogue?.length)
    return {error:{code:'invalid-content',message:'Ngữ cảnh NPC không hợp lệ; tin nhắn đã được giữ lại.'},status:400};
  try{
    // GLM/Gemma default to reasoning; with a 640-token cap, inference can
    // finish after thinking without producing visible assistant text.
    // Cloudflare supports this input field on BOTH Free models.
    // Keep responses conversational and Vietnamese-only. Do not erase the
    // author's NPC persona / the reader's selected identity in the instruction.
    const npcReplyRule='[QUY TẮC NHẮN TIN] Chỉ trả lời bằng tiếng Việt (trừ tên riêng), không xen chữ Hán. '+ 
      'Bạn là NPC được mô tả ở trên, không nhập vai người dùng. Xưng hô đúng vai và hồ sơ, '+
      'trả lời trực tiếp tin cuối bằng 1-3 câu tự nhiên, không lặp, không viết lời dẫn truyện. '+
      'Lịch sử trước đó chỉ là các lượt người chơi/NPC thực sự từng nói, không phải câu hỏi mới. '+
      'Đọc lượt cuối của người chơi, trả lời đúng trọng tâm; nếu thiếu dữ kiện thì nói chưa biết, không suy đoán quan hệ hoặc danh tính.';
    const result=await env.AI.run(payload.model,{
      messages:[{role:'system',content:instruction+'\n'+npcReplyRule},...dialogue],
      chat_template_kwargs:{enable_thinking:false},
      max_completion_tokens:640
    },{rejectIfBusy:true});
    const answer=extractWorkersAiText(result);
    if(!answer){
      const reason=result?.choices?.[0]?.finish_reason;
      // Only the public finish category is exposed, never reasoning tokens.
      const truncated=reason==='length';
      return {error:{code:truncated?'workers-ai-output-truncated':'empty-response',
        message:truncated
          ?'Workers AI hết giới hạn tạo phản hồi nhưng chưa có lời nhắn. Hãy thử lại sau; DUDU không tự gọi nhiều model.'
          :'Workers AI chưa tạo được lời nhắn NPC. Tin nhắn vẫn được giữ để thử lại.'},status:502};
    }
    const usage=result?.usage||result?.result?.usage||{};
    return {data:{text:answer,model:payload.model,provider:'workers-ai',
      usage:{
        inputTokens:Math.max(0,Number(usage.prompt_tokens||usage.input_tokens)||0),
        outputTokens:Math.max(0,Number(usage.completion_tokens||usage.output_tokens)||0),
        totalTokens:Math.max(0,Number(usage.total_tokens)||0)
      }},status:200};
  }catch(e){
    // Never expose upstream error body, prompts or token-bearing stack traces.
    return {error:classifyWorkersAiFailure(e),status:502};
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
  if(alternate?.data)return {...alternate,data:{...alternate.data,fallbackFrom:payload.model}};
  // Never disguise a failed Workers AI fallback as only a Gemini regional
  // failure: show which provider actually produced the final error.
  if(alternate?.error)return {...alternate,error:{...alternate.error,
    model:WORKERS_AI_MODELS[0].id,fallbackFrom:payload.model}};
  return primary;
}
