/* V23 private only: finalized, sanitized variants MUST stay unavailable
 * to readers until a separately reviewed authorized serving endpoint exists.
 * Only a trusted server worker should call this module after inspecting
 * quarantine bytes through an independently audited image decoder.
 */
import {privateObjectKey,IMAGE_LIMITS} from './avatar-image-policy.mjs';
import {preparePrivateAvatarVariant} from './avatar-photo-normalizer-v20.mjs';

export function privateVariantKey(uid,assetId,format){
  const quarantine=privateObjectKey(uid,assetId);
  if(!quarantine||!['webp','jpeg'].includes(format))return null;
  return quarantine.replace('drafts/players/','private/players/')
    .replace(/\.bin$/,format==='webp'?'.webp':'.jpg');
}
export async function prepareAndStorePrivateVariant({
  uid,assetId,bucket,store,decodeAndTranscode,moderate,now
}={}){
  if(!bucket||!store||!Number.isSafeInteger(now))
    return {ok:false,code:'not-configured'};
  const draftKey=privateObjectKey(uid,assetId);
  if(!draftKey)return {ok:false,code:'invalid-owner-or-id'};
  const ownership=await store.ownPhotoDraft(assetId);
  if(!ownership?.owned)return {ok:false,code:'not-found'};
  if(ownership.variantFormat)return {ok:false,code:'already-processed'};
  const original=await bucket.get(draftKey);
  if(!original||!Number.isFinite(original.size)||
     original.size<30||original.size>IMAGE_LIMITS.maxBytes)
    return {ok:false,code:'invalid-original'};
  const format=original.customMetadata?.format;
  const mime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[format];
  if(!mime)return {ok:false,code:'invalid-original'};
  let bytes;
  try{bytes=new Uint8Array(await original.arrayBuffer());}
  catch(_){return {ok:false,code:'read-unavailable'};}
  if(bytes.length!==original.size)return {ok:false,code:'invalid-original'};
  const variant=await preparePrivateAvatarVariant({
    quarantinedBytes:bytes,originalMime:mime,
    decodeAndTranscode,moderate,uid,assetId
  });
  if(!variant.ok)return {ok:false,code:variant.code};
  if(variant.bytes.length>1024*1024)
    return {ok:false,code:'variant-too-large'};
  const extension=variant.mime==='image/webp'?'webp':'jpeg';
  const outputKey=privateVariantKey(uid,assetId,extension);
  try{
    await bucket.put(outputKey,variant.bytes,{
      httpMetadata:{contentType:'application/octet-stream'},
      customMetadata:{status:'PRIVATE_APPROVED',format:extension,
        width:String(variant.width),height:String(variant.height)}
    });
    // No account avatar changes. Ownership ledger stays server-side.
    const recorded=await store.markPrivateVariant(assetId,extension,now);
    if(!recorded?.ok)
      return {ok:false,code:recorded?.code||'variant-record-unavailable'};
    return {ok:true,assetId,status:'PRIVATE_APPROVED',
      publishable:false,bytes:variant.bytes.length};
  }catch(_){
    return {ok:false,code:'variant-store-unavailable'};
  }
}
