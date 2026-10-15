/* V18 R2 upload PRE-FLIGHT rules only.
 * No live endpoint, R2 put(), public URL, or signed upload ticket yet.
 * Header checks are NOT a full decoder, malware scan, or EXIF remover.
 * A production pipeline must transcode decoded image pixels and moderate.
 */
export const IMAGE_LIMITS=Object.freeze({
  maxBytes:5*1024*1024,
  minSide:32,maxSide:4096,maxPixels:12_000_000,
  allowedMimes:Object.freeze(['image/jpeg','image/png','image/webp'])
});
const read16=(v,i)=>v[i]|(v[i+1]<<8);
const read24=(v,i)=>v[i]|(v[i+1]<<8)|(v[i+2]<<16);
const read32be=(v,i)=>(v[i]*2**24+v[i+1]*2**16+v[i+2]*256+v[i+3]);
const ascii=(b,i,s)=>Array.from(b.slice(i,i+s),c=>String.fromCharCode(c)).join('');
function dimsJpeg(b){
  let offset=2, scanned=0;
  while(offset+4<b.length&&scanned++<100){
    if(b[offset]!==255)return null;
    while(b[offset]===255)offset++;
    const marker=b[offset++];
    if(marker===0xd9||marker===0xda)break;
    if(offset+2>b.length)return null;
    const n=b[offset]*256+b[offset+1];
    if(n<2||offset+n>b.length)return null;
    if([0xc0,0xc1,0xc2,0xc3].includes(marker)){
      if(n<7)return null;
      return {width:b[offset+5]*256+b[offset+6],
        height:b[offset+3]*256+b[offset+4]};
    }
    offset+=n;
  }
  return null;
}
function dimsWebP(b){
  if(b.length<30||ascii(b,0,4)!=='RIFF'||ascii(b,8,4)!=='WEBP')
    return null;
  const size=(b[4]+(b[5]<<8)+(b[6]<<16)+(b[7]<<24))>>>0;
  if(size+8!==b.length)return null;
  const type=ascii(b,12,4);
  if(type==='VP8 '){
    if(b[23]!==0x9d||b[24]!==0x01||b[25]!==0x2a)return null;
    return {width:read16(b,26)&0x3fff,height:read16(b,28)&0x3fff};
  }
  if(type==='VP8L'){
    if(b.length<25||b[20]!==0x2f)return null;
    return {width:1+(((b[22]&0x3f)<<8)|b[21]),
      height:1+(((b[24]&0x0f)<<10)|(b[23]<<2)|((b[22]>>6)&3))};
  }
  if(type==='VP8X'){
    if(b.length<30)return null;
    return {width:read24(b,24)+1,height:read24(b,27)+1};
  }
  return null;
}
export function inspectImageHeader(input,mime){
  if(!IMAGE_LIMITS.allowedMimes.includes(mime)||
    !(input instanceof Uint8Array)||
    input.length<30||input.length>IMAGE_LIMITS.maxBytes)
    return Object.freeze({ok:false,code:'invalid-media'});
  const b=input;let dims=null,container=null;
  if(mime==='image/png'){
    if(b.length<33||[137,80,78,71,13,10,26,10].some((v,i)=>b[i]!==v)||
      read32be(b,8)!==13||ascii(b,12,4)!=='IHDR')return Object.freeze({ok:false,code:'invalid-signature'});
    dims={width:read32be(b,16),height:read32be(b,20)};container='png';
  }else if(mime==='image/jpeg'){
    if(b[0]!==255||b[1]!==216)return Object.freeze({ok:false,code:'invalid-signature'});
    dims=dimsJpeg(b);container='jpeg';
  }else{
    dims=dimsWebP(b);container='webp';
  }
  if(!dims||!Number.isSafeInteger(dims.width)||!Number.isSafeInteger(dims.height))
    return Object.freeze({ok:false,code:'invalid-signature'});
  if(dims.width<IMAGE_LIMITS.minSide||dims.height<IMAGE_LIMITS.minSide||
    dims.width>IMAGE_LIMITS.maxSide||dims.height>IMAGE_LIMITS.maxSide||
    dims.width*dims.height>IMAGE_LIMITS.maxPixels)
    return Object.freeze({ok:false,code:'invalid-dimensions'});
  return Object.freeze({ok:true,container,width:dims.width,height:dims.height,
    bytes:b.length,mustDecodeAndTranscode:true,mayContainMetadata:true,
    publishable:false});
}
export function privateObjectKey(verifiedUid,assetId){
  if(typeof verifiedUid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(verifiedUid)||
     typeof assetId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId))
    return null;
  return 'drafts/players/'+verifiedUid+'/'+assetId+'.bin';
}
