// Build-only entry. private-production-legacy.mjs is SHA-verified, local-only, never committed.
import legacy,{createL6Worker,verifyFirebaseIdToken,createAutomaticServiceOAuth,createCatalogServiceFetch,OWNER} from './private-production-legacy.mjs';
import {createGuard,isRecoveryPath,isLegacyWritePath,boundedJson} from './orphan-guard.mjs';
const RECOVERY_ROLLBACK=false; // Build-only rollback disables recovery, never the writer fence.
export function guardedLegacy(request,env,dispatch){
 const bucket=env.DUDU_LIBRARY_EPUB_BUCKET;
 const guardedBucket=new Proxy(bucket,{get(target,key){
  if(key==='put')return (...args)=>dispatch(()=>target.put(...args));
  if(['get','head','list'].includes(key))return target[key].bind(target);
  throw Error('UNAUDITED_BUCKET_OPERATION');
 }});
 const worker=createL6Worker({fetchFn:(url,options={})=>{
  const u=new URL(url),method=options.method||'GET';
  if(method==='POST'&&u.origin==='https://firestore.googleapis.com'&&u.pathname===`/v1/projects/${env.PROJECT_ID}/databases/(default)/documents:commit`)return dispatch(()=>fetch(url,options));
  // The pinned legacy scope validates all service operations before this transport.
  if(method!=='GET'&&!(method==='POST'&&((u.origin==='https://oauth2.googleapis.com'&&u.pathname==='/token')||(u.origin==='https://firestore.googleapis.com'&&u.pathname===`/v1/projects/${env.PROJECT_ID}/databases/(default)/documents:runQuery`))))throw Error('UNAUDITED_NETWORK_OPERATION');
  return fetch(url,options);
 }});
 return worker.fetch(request,{...env,DUDU_LIBRARY_EPUB_BUCKET:guardedBucket});
}
export class OrphanPendingGuard {
 constructor(ctx,env){
  let state;
  const service=()=>{if(env.LIBRARY_R2_SERVICE_AUTH_MODE!=='service-account-jwt')throw Error('AUTH_MODE');if(!state){const provider=createAutomaticServiceOAuth({clientEmail:env.LIBRARY_R2_FIRESTORE_SERVICE_EMAIL,keyId:env.LIBRARY_R2_FIRESTORE_SERVICE_KEY_ID,privateKeyPem:env.LIBRARY_R2_FIRESTORE_SERVICE_PRIVATE_KEY});state={provider,fetch:createCatalogServiceFetch({provider,projectId:env.PROJECT_ID})};}return state;};
  this.guard=createGuard({storage:ctx.storage,env,owner:OWNER,verifyIdentity:verifyFirebaseIdToken,legacy:guardedLegacy,bucket:env.DUDU_LIBRARY_EPUB_BUCKET,
   readCatalog:async book=>{
    const s=service(),token=await s.provider.getAccessToken();
    if(!/^[a-z][a-z0-9-]{0,63}$/.test(env.PROJECT_ID||''))throw Error('PROJECT');
    const response=await s.fetch(`https://firestore.googleapis.com/v1/projects/${env.PROJECT_ID}/databases/(default)/documents/epub_catalog_r2_v1/${book}?mask.fieldPaths=status&mask.fieldPaths=revision&mask.fieldPaths=ownerUid&mask.fieldPaths=backend`,{method:'GET',headers:{Authorization:'Bearer '+token},redirect:'manual',signal:AbortSignal.timeout(8000)});
    if(response.status===404){await response.body?.cancel();return {found:false};}if(response.status!==200){await response.body?.cancel();throw Error('FIRESTORE');}
    const data=await boundedJson(response,4096),f=data.fields;return {found:true,status:f?.status?.stringValue,revision:f?.revision?.stringValue,ownerUid:f?.ownerUid?.stringValue,backend:f?.backend?.stringValue};
   }});
 }
 fetch(request){return this.guard.fetch(request);}
}
export default {fetch(request,env){
 const recovery=isRecoveryPath(new URL(request.url).pathname);
 if(recovery&&(RECOVERY_ROLLBACK||env.LIBRARY_R2_ORPHAN_CLOSE_ENABLED!=='true'||env.LIBRARY_R2_ORPHAN_LEGACY_DRAIN_VERIFIED!=='true'))return Response.json({ok:false,code:'recovery-not-activated'},{status:503,headers:{'Cache-Control':'private, no-store','Access-Control-Allow-Origin':env.ALLOWED_ORIGIN,'Vary':'Origin'}});
 if((request.method==='POST'&&isLegacyWritePath(new URL(request.url).pathname))||recovery){
  if(!env.ORPHAN_PENDING_GUARD)return Response.json({ok:false,code:'recovery-guard-unavailable'},{status:503});
  return env.ORPHAN_PENDING_GUARD.get(env.ORPHAN_PENDING_GUARD.idFromName('library-owner-writer-v1')).fetch(request);
 }
 return legacy.fetch(request,env);
}};
