import {verifyFirebaseIdToken} from './auth.mjs';
import {validRequest,quotaMessage} from './limits.mjs';
export {DuduQuota} from './quota.mjs';
export {DuduCollectibles} from './collectibles.mjs';
export {DuduPlayerAppearance} from './player-appearance.mjs';
import {normalizeAppearanceSave,displayState} from './player-appearance-rules.mjs';
import {verifyAwardWebhook,EVENT_MAX_BYTES} from './avatar-award-webhook.mjs';
import {normalizedPrivateDraft,normalizedDraftApproval,parseScopedIds,cleanId} from './collectible-rules.mjs';

const MODEL='gemini-3.5-flash-lite';
const MAX_BODY_BYTES=18000;

function allowOrigin(origin,env) {
  if (!origin) return false;
  if (origin===env.ALLOWED_ORIGIN)return true;
  // Local testing is explicitly limited to the documented port 5500.
  // CORS is a browser restriction, not a substitute for signed JWT and claims.
  return origin==='http://localhost:5500'||origin==='http://127.0.0.1:5500';
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

async function boundedEventBytes(req){
  const length=Number(req.headers.get('Content-Length')||0);
  if(!Number.isFinite(length)||length>EVENT_MAX_BYTES)return null;
  if(!req.body)return null;
  const reader=req.body.getReader();
  let count=0;
  const chunks=[];
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      count+=value.byteLength;
      if(count>EVENT_MAX_BYTES){await reader.cancel();return null;}
      chunks.push(value);
    }
    const bytes=new Uint8Array(count);let offset=0;
    for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
    return bytes;
  }catch(_){return null;}
  finally{reader.releaseLock();}
}
async function handleSignedFrameEvidence(req,env,origin){
  // No browsers, no public unlock buttons, no Firebase reader/admin self-grant.
  // Must be signed by an independently deployed, trusted service.
  if(env.AVATAR_AWARD_ISSUER_ENABLED!=='true'||env.AVATAR_AWARDS_ENABLED!=='true')
    return error('frame-events-disabled','Sự kiện cấp khung chưa mở.',503,origin,env);
  if(req.method!=='POST')return error('method-not-allowed','Phương thức không hợp lệ.',405,origin,env);
  if(origin)return error('origin-forbidden','Không chấp nhận yêu cầu từ trình duyệt.',403,origin,env);
  if(!req.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))
    return error('invalid-content','Yêu cầu phải là JSON.',415,origin,env);
  const bytes=await boundedEventBytes(req);
  if(!bytes)return error('invalid-event','Sự kiện quá lớn hoặc không hợp lệ.',400,origin,env);
  const now=Date.now();
  const event=await verifyAwardWebhook({
    rawBytes:bytes,
    timestamp:req.headers.get('X-Dudu-Event-Time'),
    signature:req.headers.get('X-Dudu-Event-Signature'),
    secret:env.AVATAR_EVENT_HMAC_SECRET,now
  });
  if(!event)return error('invalid-signature','Chữ ký hoặc bằng chứng không hợp lệ.',401,origin,env);
  if(!env.DUDU_PLAYER_APPEARANCE)
    return error('avatar-sync-unavailable','Sổ lưu khung chưa sẵn sàng.',503,origin,env);
  try{
    const store=env.DUDU_PLAYER_APPEARANCE.getByName('player-avatar-'+event.uid);
    const result=await store.recordSignedAward(event,now);
    return json(result,result.ok?200:409,origin,env);
  }catch(err){
    console.warn('Frame evidence ledger unavailable:',err?.name||'unavailable');
    return error('award-unavailable','Chưa lưu được bằng chứng.',503,origin,env);
  }
}

const PLAYER_APPEARANCE_PATHS=Object.freeze({
  '/v1/player-avatar/mine':'GET',
  '/v1/player-avatar/save':'POST'
});
async function handlePlayerAppearance(req,env,path,origin){
  // Server feature gate defaults OFF. A future owner-approved deployment
  // is required to activate synchronization, never browser-only switches.
  if(env.PLAYER_AVATAR_SYNC_ENABLED!=='true')
    return error('avatar-sync-disabled','Đồng bộ avatar chưa được mở.',503,origin,env);
  const identity=await verifyFirebaseIdToken(req,env.PROJECT_ID);
  if(!identity)return error('unauthenticated','Vui lòng đăng nhập bằng Firebase.',401,origin,env);
  // Object selection uses the verified user sub, NOT UID from JSON/path.
  if(!env.DUDU_PLAYER_APPEARANCE)
    return error('avatar-sync-unavailable','Lưu trữ avatar chưa sẵn sàng.',503,origin,env);
  const store=env.DUDU_PLAYER_APPEARANCE.getByName('player-avatar-'+identity.uid);
  try{
    // These rows are from a UID-scoped, server-owned SQL ledger, never JSON.
    // This gate is OFF until a trusted achievement issuer has been audited.
    const awards=env.AVATAR_AWARDS_ENABLED==='true'?await store.verifiedAwards():[];
    if(path==='/v1/player-avatar/mine')
      return json(displayState(await store.mine(),identity,awards),200,origin,env);
    if(!req.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))
      return error('invalid-content','Yêu cầu phải là JSON.',415,origin,env);
    const body=await limitedJson(req);
    const approved=normalizeAppearanceSave(body,identity,awards);
    if(!approved)
      return error('invalid-avatar','Không thể lưu avatar hoặc khung chưa sở hữu.',400,origin,env);
    const result=await store.save(approved,Date.now());
    if(!result.ok)
      return json({error:{code:result.code,message:'Bản lưu đã thay đổi ở thiết bị khác.'},
        revision:result.revision},409,origin,env);
    return json(displayState(result,identity,awards),200,origin,env);
  }catch(err){
    console.warn('Player appearance store unavailable:',err?.name||'unavailable');
    return error('avatar-sync-unavailable','Đồng bộ avatar tạm gián đoạn.',503,origin,env);
  }
}

const COLLECTIBLE_PATHS=Object.freeze({
  '/v1/collectibles/mine':'GET',
  '/v1/collectibles/begin':'POST',
  '/v1/collectibles/claim':'POST',
  '/v1/collectibles/admin/publish':'POST',
  '/v1/collectibles/admin/draft/preview':'POST',
  '/v1/collectibles/admin/disable':'POST',
  '/v1/collectibles/admin/grant':'POST',
  '/v1/collectibles/admin/draft/save':'POST',
  '/v1/collectibles/admin/draft/list':'POST',
  '/v1/collectibles/admin/draft/archive':'POST'
});
async function handleCollectibles(req,env,path,origin){
  // Separate from AI_ENABLED; both feature gates default to OFF in staging.
  if(env.COLLECTIBLES_ENABLED!=='true')
    return error('collectibles-disabled','Bảo tàng kỷ vật chưa mở nhận thưởng.',503,origin,env);
  // A client timer is not evidence that a chapter was read.
  // Even when the admin vault is enabled, reader self-claims stay OFF.
  if((path==='/v1/collectibles/begin'||path==='/v1/collectibles/claim')&&
     env.COLLECTIBLE_SELF_CLAIM_ENABLED!=='true')
    return error('self-claim-disabled','Phần thưởng đọc chương chưa được mở.',503,origin,env);
  const user=await verifyFirebaseIdToken(req,env.PROJECT_ID);
  if(!user)return error('unauthenticated','Vui lòng đăng nhập DUDU Studio.',401,origin,env);
  if(path.startsWith('/v1/collectibles/admin/')&&!user.admin)
    return error('forbidden','Chỉ tác giả có quyền phát hành vật phẩm.',403,origin,env);
  let body=null;
  if(req.method==='POST'){
    if(!req.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))
      return error('invalid-content','Yêu cầu phải là JSON.',415,origin,env);
    body=await limitedJson(req);
    if(!body)return error('invalid-request','Dữ liệu không hợp lệ hoặc quá dài.',400,origin,env);
  }
  const bucket=env.DUDU_COLLECTIBLES.getByName('collectibles-global-v1');
  const now=Date.now();
  try{
    if(path==='/v1/collectibles/mine')
      return json({items:await bucket.mine(user.uid)},200,origin,env);
    if(path==='/v1/collectibles/admin/draft/save'){
      const rule=normalizedPrivateDraft(body);
      if(!rule)return error('invalid-draft','Thông tin bản thảo chưa hợp lệ.',400,origin,env);
      const result=await bucket.upsertDraft(rule,now);
      return json(result,result.ok?200:409,origin,env);
    }
    if(path==='/v1/collectibles/admin/draft/list'){
      const scoped=parseScopedIds(body);
      if(!scoped||(body.chapterId!=null&&!cleanId(body.chapterId)))
        return error('invalid-request','Mã truyện hoặc chương không hợp lệ.',400,origin,env);
      return json(await bucket.listPrivateDrafts(scoped.storyId,body.chapterId||null),200,origin,env);
    }
    if(path==='/v1/collectibles/admin/draft/archive'){
      const ids=parseScopedIds(body,{withItem:true});
      if(!ids)return error('invalid-request','Mã bản thảo không hợp lệ.',400,origin,env);
      const result=await bucket.archivePrivateDraft(ids.storyId,ids.itemId);
      return json(result,result.ok?200:404,origin,env);
    }
    if(path==='/v1/collectibles/admin/draft/preview'){
      const ids=parseScopedIds(body,{withItem:true});
      if(!ids||!ids.itemId.startsWith('author-item-'))
        return error('invalid-preview','Mã bản thảo không hợp lệ.',400,origin,env);
      const state=await bucket.draftPreview(ids.storyId,ids.itemId);
      return json(state,state.ok?200:404,origin,env);
    }
    if(path==='/v1/collectibles/admin/publish'){
      // Approval is bound to a server-held draft revision, not client-supplied
      // item names or story scope. Only signed Firebase admin JWT can publish.
      const approval=normalizedDraftApproval(body);
      if(!approval)return error('invalid-release','Vui lòng xem trước và xác nhận phát hành.',400,origin,env);
      const state=await bucket.publishDraft(approval,now);
      return json(state,state.ok?200:409,origin,env);
    }
    if(path==='/v1/collectibles/admin/disable'){
      const ids=parseScopedIds(body,{withItem:true});
      if(!ids)return error('invalid-request','Mã truyện hoặc vật phẩm không hợp lệ.',400,origin,env);
      const state=await bucket.disable(ids.storyId,ids.itemId);
      return json(state,state.ok?200:404,origin,env);
    }
    if(path==='/v1/collectibles/admin/grant'){
      // Staging self-test ONLY. Never accept a recipient UID from the client:
      // a verified admin may grant only to their own Firebase identity.
      const ids=parseScopedIds(body,{withItem:true});
      if(!ids)return error('invalid-request','Thông tin phát thưởng không hợp lệ.',400,origin,env);
      if(body.uid!=null&&body.uid!==user.uid)
        return error('recipient-forbidden','Không được cấp thưởng cho UID khác trong giai đoạn kiểm thử.',403,origin,env);
      const state=await bucket.grant(user.uid,ids.storyId,ids.itemId,now);
      return json(state,state.ok?200:409,origin,env);
    }
    if(path==='/v1/collectibles/begin'){
      const ids=parseScopedIds(body,{withChapter:true});
      if(!ids)return error('invalid-request','Thông tin chương không hợp lệ.',400,origin,env);
      const state=await bucket.begin(user.uid,ids.storyId,ids.chapterId,now);
      return json(state,state.ok?200:404,origin,env);
    }
    if(path==='/v1/collectibles/claim'){
      const ids=parseScopedIds(body,{withItem:true,withChapter:true});
      if(!ids)return error('invalid-request','Thông tin kỷ vật không hợp lệ.',400,origin,env);
      const state=await bucket.claim(user.uid,ids.storyId,ids.chapterId,ids.itemId,now);
      return json(state,state.ok?200:409,origin,env);
    }
  }catch(err){
    console.warn('Collectibles ledger unavailable:',err?.name||'unavailable');
    return error('ledger-unavailable','Bảo tàng kỷ vật tạm gián đoạn.',503,origin,env);
  }
  return error('not-found','Không tìm thấy đường dẫn.',404,origin,env);
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
    if(path==='/v1/internal/frame-evidence')
      return handleSignedFrameEvidence(req,env,origin);
    const allowed=!origin||allowOrigin(origin,env);
    if(!allowed)return error('origin-blocked','Nguồn yêu cầu không được phép.',403,origin,env);
    if(req.method==='OPTIONS'){
      if(!origin||!allowOrigin(origin,env))return error('origin-blocked','Nguồn yêu cầu không được phép.',403,origin,env);
      if(!['/v1/generate','/v1/status',...Object.keys(COLLECTIBLE_PATHS),...Object.keys(PLAYER_APPEARANCE_PATHS)].includes(path))
        return error('not-found','Không tìm thấy đường dẫn.',404,origin,env);
      return new Response(null,{status:204,headers:headers(origin,env)});
    }
    if(path==='/health'&&req.method==='GET'){
      return json({service:'dudu-ai',enabled:env.AI_ENABLED==='true',model:MODEL},200,origin,env);
    }
    if(path in PLAYER_APPEARANCE_PATHS){
      if(req.method!==PLAYER_APPEARANCE_PATHS[path])
        return error('method-not-allowed','Phương thức không được hỗ trợ.',405,origin,env);
      return handlePlayerAppearance(req,env,path,origin);
    }
    if(path in COLLECTIBLE_PATHS){
      if(req.method!==COLLECTIBLE_PATHS[path])
        return error('method-not-allowed','Phương thức không được hỗ trợ.',405,origin,env);
      return handleCollectibles(req,env,path,origin);
    }
    if(!['/v1/generate','/v1/status'].includes(path))
      return error('not-found','Không tìm thấy đường dẫn.',404,origin,env);
    if((path==='/v1/generate'&&req.method!=='POST')||(path==='/v1/status'&&req.method!=='GET')){
      return error('method-not-allowed','Phương thức không được hỗ trợ.',405,origin,env);
    }
    // Admin must explicitly flip kill-switch AFTER verifying billing and secret.
    if(env.AI_ENABLED!=='true')return error('ai-disabled','Kết nối NPC AI chưa được kích hoạt.',503,origin,env);
    const user=await verifyFirebaseIdToken(req,env.PROJECT_ID);
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
