import {createRemoteJWKSet,jwtVerify} from 'jose';
import {validRequest,quotaMessage} from './limits.mjs';
export {DuduQuota} from './quota.mjs';

// JWKS is fetched only from Google's published Firebase Auth signing keys.
// DO NOT accept unsigned JWTs, browser-supplied UID, or custom API URLs.
const FIREBASE_JWKS=createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
  {timeoutDuration:4000,cooldownDuration:30000,cacheMaxAge:3600000}
);
const MODEL='gemini-2.5-flash-lite';
const MAX_BODY_BYTES=18000;

function allowOrigin(origin,env) {
  if (!origin) return false;
  if (origin===env.ALLOWED_ORIGIN)return true;
  try {
    const u=new URL(origin);
    // Browser localhost for local testing only; no wildcard external domains.
    return u.protocol==='http:'&&(u.hostname==='localhost'||u.hostname==='127.0.0.1');
  } catch(_){return false;}
}
function headers(origin,env) {
  const h=new Headers({
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store, max-age=0',
    'X-Content-Type-Options':'nosniff',
    'Vary':'Origin'
  });
  if(allowOrigin(origin,env)){
    h.set('Access-Control-Allow-Origin',origin);
    h.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
    h.set('Access-Control-Allow-Headers','Authorization, Content-Type');
    h.set('Access-Control-Max-Age','600');
  }
  return h;
}
function json(data,status,origin,env){
  return new Response(JSON.stringify(data),{status,headers:headers(origin,env)});
}
function error(code,message,status,origin,env){
  return json({error:{code,message}},status,origin,env);
}
async function verifiedFirebaseUser(req,projectId){
  if(!/^[a-z0-9-]{1,64}$/.test(projectId||''))return null;
  const match=/^Bearer ([A-Za-z0-9_\-.]+)$/.exec(req.headers.get('Authorization')||'');
  if(!match||match[1].length>12000)return null;
  try {
    const {payload}=await jwtVerify(match[1],FIREBASE_JWKS,{
      audience:projectId,issuer:'https://securetoken.google.com/'+projectId,
      algorithms:['RS256'],clockTolerance:30,maxTokenAge:'1h'
    });
    const now=Math.floor(Date.now()/1000);
    if(typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128 ||
       !Number.isFinite(payload.iat)||payload.iat>now+30 ||
       !Number.isFinite(payload.auth_time)||payload.auth_time>now+30) return null;
    return {uid:payload.sub,admin:payload.admin===true};
  } catch(err){
    // Never echo raw JWT, claims, signing keys or detailed verifier errors.
    return null;
  }
}
async function limitedJson(req){
  const declared=Number(req.headers.get('Content-Length')||0);
  if(declared>MAX_BODY_BYTES)return null;
  // Stream cap prevents excessively large/chunked requests from being buffered.
  if(!req.body)return null;
  const reader=req.body.getReader();
  const decoder=new TextDecoder();
  let total=0,text='';
  try {
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>MAX_BODY_BYTES){await reader.cancel();return null;}
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
    return JSON.parse(text);
  }catch(_){return null;}finally{reader.releaseLock();}
}
async function gemini(payload,env){
  if(!env.GEMINI_API_KEY)return {error:{code:'not-configured',message:'Máy chủ AI chưa có khóa bí mật.'},status:503};
  const model=env.MODEL===MODEL?env.MODEL:MODEL;
  const body={
    systemInstruction:payload.systemInstruction,contents:payload.contents,
    generationConfig:{
      temperature:payload.purpose==='chat'?0.8:0.65,
      maxOutputTokens:payload.purpose==='chat'?320:850
    }
  };
  let response;
  try {
    response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
      body:JSON.stringify(body),signal:AbortSignal.timeout(25000)
    });
  } catch(err) {
    console.warn('Gemini upstream connectivity:',err?.name||'unavailable');
    return {error:{code:'upstream-unavailable',message:'Tần số NPC tạm gián đoạn.'},status:502};
  }
  if(!response.ok){
    console.warn('Gemini upstream HTTP status:',response.status);
    const limit=[429,503].includes(response.status);
    return {error:{code:limit?'ai-busy':'upstream-error',
      message:limit?'Gemini đang quá tải hoặc hết hạn mức dự án.':'Không thể nhận phản hồi từ AI.'},
      status:limit?429:502};
  }
  let data;
  try{data=await response.json();}catch(_){
    return {error:{code:'invalid-response',message:'Máy chủ AI trả về dữ liệu không hợp lệ.'},status:502};
  }
  const text=data.candidates?.[0]?.content?.parts?.map(p=>typeof p.text==='string'?p.text:'').join('').trim();
  if(!text)return {error:{code:'empty-response',message:'NPC chưa thể trả lời lúc này.'},status:502};
  const usage=data.usageMetadata||{};
  return {data:{text,model,usage:{
    inputTokens:Number(usage.promptTokenCount)||0,
    outputTokens:Number(usage.candidatesTokenCount)||0,
    totalTokens:Number(usage.totalTokenCount)||0
  }},status:200};
}
export default {
  async fetch(req,env){
    const origin=req.headers.get('Origin');
    const path=new URL(req.url).pathname;
    const allowed=!origin||allowOrigin(origin,env);
    if(!allowed)return error('origin-blocked','Nguồn yêu cầu không được phép.',403,origin,env);
    if(req.method==='OPTIONS'){
      if(!origin||!allowOrigin(origin,env))return error('origin-blocked','Nguồn yêu cầu không được phép.',403,origin,env);
      if(!['/v1/generate','/v1/status'].includes(path))return error('not-found','Không tìm thấy đường dẫn.',404,origin,env);
      return new Response(null,{status:204,headers:headers(origin,env)});
    }
    if(path==='/health'&&req.method==='GET'){
      return json({service:'dudu-ai',enabled:env.AI_ENABLED==='true',model:MODEL},200,origin,env);
    }
    if(!['/v1/generate','/v1/status'].includes(path))return error('not-found','Không tìm thấy đường dẫn.',404,origin,env);
    if((path==='/v1/generate'&&req.method!=='POST')||(path==='/v1/status'&&req.method!=='GET')){
      return error('method-not-allowed','Phương thức không được hỗ trợ.',405,origin,env);
    }
    // Admin must explicitly flip kill-switch AFTER verifying billing and secret.
    if(env.AI_ENABLED!=='true')return error('ai-disabled','Kết nối NPC AI chưa được kích hoạt.',503,origin,env);
    const user=await verifiedFirebaseUser(req,env.PROJECT_ID);
    if(!user)return error('unauthenticated','Hãy đăng nhập DUDU Studio bằng Firebase.',401,origin,env);
    const bucket=env.DUDU_QUOTA.getByName('global-budget-v1');
    if(path==='/v1/status'){
      try {
        const state=await bucket.status(user.uid,Date.now());
        return json({...state,enabled:true},200,origin,env);
      }catch(_){return error('quota-unavailable','Không thể đọc hạn mức AI.',503,origin,env);}
    }
    if(!req.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')){
      return error('invalid-content','Yêu cầu phải là JSON.',415,origin,env);
    }
    const parsed=await limitedJson(req);
    const payload=validRequest(parsed,user.admin);
    if(!payload)return error('invalid-request','Nội dung quá dài hoặc không hợp lệ.',400,origin,env);
    if(!env.GEMINI_API_KEY)return error('ai-disabled','Máy chủ AI chưa được cấu hình.',503,origin,env);
    let lease;
    try{lease=await bucket.reserve(user.uid,Date.now());}
    catch(_){return error('quota-unavailable','Máy chủ giới hạn AI đang bận.',503,origin,env);}
    if(!lease?.ok){
      return error(lease?.code||'quota-error',lease?.message||quotaMessage(lease?.code),429,origin,env);
    }
    try {
      const result=await gemini(payload,env);
      if(result.error)return json({error:result.error},result.status,origin,env);
      return json(result.data,result.status,origin,env);
    } finally {
      try{await bucket.release(user.uid,lease.day,lease.id);}
      catch(_){console.error('Quota lease release unavailable; timeout will expire.');}
    }
  }
};
