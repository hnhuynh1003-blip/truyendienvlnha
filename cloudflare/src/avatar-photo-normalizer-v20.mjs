/* V20: private avatar normalization contract (NOT routed/deployed).
 * A verified, trusted image processor is mandatory; header checks alone are
 * not a full decoder or EXIF scrubber. NEVER publish originals or derivatives
 * before an independent moderation decision and private owner authorization.
 */
import {inspectImageHeader,IMAGE_LIMITS} from './avatar-image-policy.mjs';
const ALLOWED_OUTPUT=new Set(['image/webp','image/jpeg']);
function validPrivateOutput(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     !ALLOWED_OUTPUT.has(value.mime)||!(value.bytes instanceof Uint8Array)||
     value.bytes.byteLength===0||value.bytes.byteLength>IMAGE_LIMITS.maxBytes||
     value.fullyDecoded!==true||value.metadataStripped!==true||
     value.animated!==false)return null;
  const checked=inspectImageHeader(value.bytes,value.mime);
  if(!checked.ok||checked.width>1024||checked.height>1024||
     checked.width!==checked.height)return null;
  return checked;
}
export async function preparePrivateAvatarVariant({
  quarantinedBytes,originalMime,decodeAndTranscode,moderate,uid,assetId
}={}){
  const source=inspectImageHeader(quarantinedBytes,originalMime);
  if(!source.ok)return {ok:false,code:'invalid-original'};
  if(typeof decodeAndTranscode!=='function'||typeof moderate!=='function')
    return {ok:false,code:'untrusted-processor'};
  // Critical: callbacks MUST be bound to an independently audited
  // server-side decoder and moderation provider, never a browser function.
  let output;
  try{
    output=await decodeAndTranscode({
      original:quarantinedBytes,mime:originalMime,
      maxSide:512,forceSquare:true,stripMetadata:true,allowAnimation:false
    });
  }catch(_){return {ok:false,code:'transcode-failed'};}
  const checked=validPrivateOutput(output);
  if(!checked)return {ok:false,code:'unsafe-output'};
  let decision;
  try{
    decision=await moderate({
      bytes:output.bytes,mime:output.mime,
      width:checked.width,height:checked.height,
      ownerUid:uid,assetId
    });
  }catch(_){return {ok:false,code:'moderation-unavailable'};}
  if(!decision||decision.approved!==true||decision.reviewerType!=='trusted-server')
    return {ok:false,code:'moderation-rejected'};
  // Intentionally no key, signed link, public URL, R2 put, or profile update.
  // A future separately reviewed service must finalize the PRIVATE variant.
  return {ok:true,state:'PRIVATE_VARIANT_READY',publishable:false,
    mime:output.mime,bytes:output.bytes,width:checked.width,
    height:checked.height};
}
