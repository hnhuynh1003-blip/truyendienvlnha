// PNG container checks only, not pixel decoding, safety/art review or publication.
// Reject malformed chunks/CRCs, APNG and unknown critical chunks. Decode/scan is
// still a required future pipeline; no content is served by this module.
export function parseRegistryPng(base64){
 if(typeof base64!=='string'||!base64.length||base64.length>1400000||
  !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))throw Error('invalid-image');
 const raw=atob(base64);if(btoa(raw)!==base64)throw Error('invalid-image');
 const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 return inspectPngBytes(bytes);
}

export function inspectPngBytes(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length>1024*1024||bytes.length<57||[137,80,78,71,13,10,26,10].some((b,i)=>bytes[i]!==b))throw Error('invalid-image');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let offset=8,width,height,idat=false,idatBytes=0,ended=false,closedData=false,palette=false,bitDepth,color;
 while(offset<bytes.length){
  if(offset+12>bytes.length)throw Error('invalid-image');
  const length=view.getUint32(offset),end=offset+12+length;if(end>bytes.length)throw Error('invalid-image');
  const type=String.fromCharCode(...bytes.slice(offset+4,offset+8));
  if(!/^[A-Za-z]{4}$/.test(type)||/[a-z]/.test(type[2]))throw Error('invalid-image');
  let crc=0xffffffff;
  for(let j=offset+4;j<end-4;j++){crc^=bytes[j];for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  if(((crc^0xffffffff)>>>0)!==view.getUint32(end-4))throw Error('invalid-image');
  if(offset===8&&type!=='IHDR')throw Error('invalid-image');
  if(type==='IHDR'){
   if(offset!==8||length!==13)throw Error('invalid-image');
   width=view.getUint32(offset+8);height=view.getUint32(offset+12);bitDepth=bytes[offset+16];color=bytes[offset+17];
   const allowed={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
   if(!width||!height||width>10000||height>10000||width*height>40000000||!allowed[color]?.includes(bitDepth)||
    bytes[offset+18]!==0||bytes[offset+19]!==0||bytes[offset+20]>1)throw Error('invalid-image');
  }else if(type==='IDAT'){
   if(closedData||(color===3&&!palette))throw Error('invalid-image');idat=true;idatBytes+=length;
  }else{
   if(idat)closedData=true;
   if(type==='PLTE'){
    if(palette||idat||color===0||color===4||!length||length%3||length>768||(color===3&&length/3>2**bitDepth))throw Error('invalid-image');palette=true;
   }else if(type==='IEND'){
    if(length!==0||!idat||end!==bytes.length)throw Error('invalid-image');ended=true;
   }else if(['acTL','fcTL','fdAT'].includes(type)||/^[A-Z]/.test(type))throw Error('invalid-image');
  }
  offset=end;
 }
 if(!ended||!idatBytes)throw Error('invalid-image');return {bytes,width,height};
}
