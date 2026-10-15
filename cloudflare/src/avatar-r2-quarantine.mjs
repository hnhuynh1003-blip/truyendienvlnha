/* V19: private quarantine drafts only.
 * Originals here may contain EXIF/untrusted data: NEVER expose as public URL
 * or use as an avatar until audited decode/transcode/moderation is available.
 * R2 binding remains absent and upload feature flag is OFF by default.
 */
import {inspectImageHeader,privateObjectKey} from './avatar-image-policy.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function putQuarantinedPhoto({uid,bytes,mime,bucket,store,now,uuid}){
  if(!bucket||!store||!Number.isSafeInteger(now))
    return {ok:false,code:'not-configured'};
  const scan=inspectImageHeader(bytes,mime);
  if(!scan.ok)return {ok:false,code:scan.code};
  if(typeof uuid!=='string'||!UUID.test(uuid))return {ok:false,code:'invalid-id'};
  const key=privateObjectKey(uid,uuid);
  if(!key)return {ok:false,code:'invalid-owner'};
  const reserved=await store.reservePhotoDraft(uuid,now);
  if(!reserved?.ok)return {ok:false,code:reserved?.code||'photo-quota'};
  try{
    await bucket.put(key,bytes,{
      httpMetadata:{contentType:'application/octet-stream'},
      customMetadata:{state:'QUARANTINED',format:scan.container,
        width:String(scan.width),height:String(scan.height)}
    });
    const finalized=await store.finalizePhotoDraft(uuid,now);
    if(!finalized?.ok)throw Error('finalize-failed');
    return {ok:true,assetId:uuid,status:'QUARANTINED',publishable:false};
  }catch(_){
    // Fails closed: remove any partially written object and the reservation.
    try{await bucket.delete(key);}catch(_){}
    try{await store.abandonPhotoDraft(uuid);}catch(_){}
    return {ok:false,code:'upload-unavailable'};
  }
}
export async function deleteQuarantinedPhoto({uid,assetId,bucket,store}){
  if(!bucket||!store)return {ok:false,code:'not-configured'};
  const key=privateObjectKey(uid,assetId);
  if(!key)return {ok:false,code:'invalid-id'};
  const owned=await store.ownPhotoDraft(assetId);
  if(!owned?.owned)return {ok:false,code:'not-found'};
  try{
    await bucket.delete(key);
    return await store.removePhotoDraft(assetId);
  }catch(_){return {ok:false,code:'delete-unavailable'};}
}
