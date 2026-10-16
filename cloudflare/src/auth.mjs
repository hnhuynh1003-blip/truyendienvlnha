import {createRemoteJWKSet,jwtVerify} from 'jose';

// Firebase Auth signing keys are Google's publicly published JWKS.
// Cache keys: never use user-supplied project, JWKS URL, algorithms or kid as trust sources.
const FIREBASE_JWKS=createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
  {timeoutDuration:4000,cooldownDuration:30000,cacheMaxAge:3600000}
);
export async function verifyFirebaseIdToken(request,projectId,jwks=FIREBASE_JWKS){
  if(!/^[a-z0-9-]{1,64}$/.test(projectId||''))return null;
  const match=/^Bearer ([A-Za-z0-9_\-.]+)$/.exec(request.headers.get('Authorization')||'');
  if(!match||match[1].length>12000)return null;
  try{
    const {payload}=await jwtVerify(match[1],jwks,{
      audience:projectId,
      issuer:'https://securetoken.google.com/'+projectId,
      algorithms:['RS256'],clockTolerance:30,maxTokenAge:'1h'
    });
    const now=Math.floor(Date.now()/1000);
    if(typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128 ||
       !Number.isFinite(payload.iat)||payload.iat>now+30 ||
       !Number.isFinite(payload.auth_time)||payload.auth_time>now+30) return null;
    return {uid:payload.sub,admin:payload.admin===true};
  }catch(_){
    // Signature/claim failures must not leak internal verifier details.
    return null;
  }
}
