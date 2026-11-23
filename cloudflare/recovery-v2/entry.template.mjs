// Private build imports are generated only from the SHA-pinned production bundle.
import legacy,{OWNER,verifyFirebaseIdToken,createAutomaticServiceOAuth,createCatalogServiceFetch,parseCatalog,expectedItems,auditPromotedBook,publishVerifiedStagedBook} from './production-patched.mjs';
import {createRecoveryHandler,isRecoveryPath,boundedJson} from '../recovery-handler.mjs';
const states=new WeakMap();
function service(env){
 if(env.LIBRARY_R2_SERVICE_AUTH_MODE!=='service-account-jwt')throw Error('SERVICE_MODE');
 const values=[env.LIBRARY_R2_FIRESTORE_SERVICE_EMAIL,env.LIBRARY_R2_FIRESTORE_SERVICE_KEY_ID,env.LIBRARY_R2_FIRESTORE_SERVICE_PRIVATE_KEY];let state=states.get(env);
 if(!state||state.values.some((v,i)=>v!==values[i])){const provider=createAutomaticServiceOAuth({clientEmail:values[0],keyId:values[1],privateKeyPem:values[2]});state={values,provider,fetch:createCatalogServiceFetch({provider,projectId:env.PROJECT_ID})};states.set(env,state);}return state;
}
const recovery=createRecoveryHandler({ownerUid:OWNER,verifyIdentity:verifyFirebaseIdToken,parseCatalog,expectedItems,audit:auditPromotedBook,
 readCatalog:async(env,book)=>{const s=service(env),token=await s.provider.getAccessToken(),response=await s.fetch(`https://firestore.googleapis.com/v1/projects/${env.PROJECT_ID}/databases/(default)/documents/epub_catalog_r2_v1/${book}`,{method:'GET',headers:{Authorization:'Bearer '+token},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)});if(response.status!==200){await response.body?.cancel();return {http:response.status};}return {http:200,doc:await boundedJson(response)};},
 publish:({env,bookId,identity,expectedRevision})=>{const s=service(env);return publishVerifiedStagedBook({projectId:env.PROJECT_ID,bookId,identity,expectedRevision,bucket:env.DUDU_LIBRARY_EPUB_BUCKET,getAccessToken:()=>s.provider.getAccessToken(),fetchFn:s.fetch,parseCatalogFn:parseCatalog});}
});
export default {fetch(request,env,ctx){return isRecoveryPath(new URL(request.url).pathname)?recovery(request,env):legacy.fetch(request,env,ctx);}};
