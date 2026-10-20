import {verifyFirebaseIdToken} from './auth.mjs';
const METHODS=Object.freeze({
 '/v1/system/me':'GET',
 '/v1/system/redeem':'POST',
 '/v1/system/register-name':'POST',
 '/v1/system/consent-pact':'POST',
 '/v1/system/owner/issue-test-pass':'POST'
});
export const DUDU_SYSTEM_PATHS=METHODS;
const codePattern=/^DT-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
export async function hashPass(code){
 const source=new TextEncoder().encode(code);
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',source))]
 .map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function makePass(){
 const b=crypto.getRandomValues(new Uint8Array(16));
 const h=[...b].map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join('');
 return 'DT-'+h.slice(0,8)+'-'+h.slice(8,16)+'-'+h.slice(16,24)+'-'+h.slice(24,32);
}
const reply=(response,status=200)=>({status,body:response});
export async function routeSystem(req,env,path,{verify=verifyFirebaseIdToken}={}){
 if(!Object.hasOwn(METHODS,path))return reply({error:{code:'not-found'}},404);
 if(req.method!==METHODS[path])return reply({error:{code:'method-not-allowed'}},405);
 if(env.DUDU_SYSTEM_LIVE_ENABLED!=='true'||!env.DUDU_SYSTEM_REGISTRY)
  return reply({error:{code:'system-not-configured',message:'Dịch vụ Hệ Thống chưa được triển khai.'}},503);
 const who=await verify(req,env.PROJECT_ID);
 if(!who?.uid)return reply({error:{code:'unauthenticated',message:'Đăng nhập Firebase trước khi vào Hệ Thống.'}},401);
 const registry=env.DUDU_SYSTEM_REGISTRY.getByName('dudu-system-registry-v71');
 if(path==='/v1/system/me')return reply(await registry.view(who.uid));
 if(req.headers.get('Content-Type')?.toLowerCase().split(';')[0]!=='application/json')
  return reply({error:{code:'json-required'}},415);
 let payload;
 try{
  const raw=await req.text();
  if(raw.length>1024)return reply({error:{code:'oversized'}},413);
  payload=JSON.parse(raw);
  if(!payload||typeof payload!=='object'||Array.isArray(payload))
   return reply({error:{code:'invalid-request'}},400);
 }catch(_){return reply({error:{code:'invalid-json'}},400);}
 if(path==='/v1/system/owner/issue-test-pass'){
  // AU must be a genuine Firebase custom-claim admin AND match owner-only secret.
  // Admin cannot issue tickets for another player or leak another player's UID.
  if(!who.admin||env.DUDU_SYSTEM_PILOT_CARD_ENABLED!=='true'||
     !env.DUDU_SYSTEM_PILOT_UID||who.uid!==env.DUDU_SYSTEM_PILOT_UID)
   return reply({error:{code:'owner-only'}},403);
  if(Object.keys(payload).length!==1||payload.confirm!=='ISSUE_MY_TEST_PASS')
   return reply({error:{code:'explicit-confirmation-required'}},400);
  const card=makePass();
  const issued=await registry.issuePilot(who.uid,await hashPass(card),Date.now());
  if(!issued.ok)return reply({error:{code:issued.code}},409);
  return reply({status:'issued',code:card,expiresAt:issued.expiresAt,ownerBound:true,
   reminder:'Giữ riêng mã này. Nó được gắn với UID Firebase của bạn và chỉ sử dụng một lần.'});
 }
 if(path==='/v1/system/redeem'){
  if(Object.keys(payload).length!==1||typeof payload.code!=='string')
   return reply({error:{code:'invalid-request'}},400);
  const code=payload.code.trim().toUpperCase();
  if(!codePattern.test(code))return reply({error:{code:'invalid-pass'}},400);
  const result=await registry.redeem(who.uid,await hashPass(code),Date.now());
  return result.ok?reply(result.profile):reply({error:{code:result.code}},409);
 }
 if(path==='/v1/system/register-name'){
  if(Object.keys(payload).length!==1||typeof payload.name!=='string')
   return reply({error:{code:'invalid-request'}},400);
  const r=await registry.registerHostName(who.uid,payload.name,Date.now());
  return r.ok?reply(r.profile):reply({error:{code:r.code}},409);
 }
 if(path==='/v1/system/consent-pact'){
  if(Object.keys(payload).length!==2||payload.accept!==true||
    payload.termsVersion!=='v71-pilot-1')
   return reply({error:{code:'consent-required'}},400);
  const r=await registry.acceptPact(who.uid,payload.termsVersion,Date.now());
  return r.ok?reply(r.profile):reply({error:{code:r.code}},409);
 }
 return reply({error:{code:'not-found'}},404);
}