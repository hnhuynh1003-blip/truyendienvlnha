// Local preview validation only. No grant, art approval, storage or network.
import {inspectPngBytes} from '../cloudflare/src/vangioi-png.mjs';
export async function verifyLocalPngRaster(bytes){
 const image=inspectPngBytes(bytes),{width,height}=image;
 // Preview memory bounds, not world-rank quotas or production art limits.
 if(width*height>16000000)throw Error('preview-limit');
 const bitDepth=bytes[24],color=bytes[25],interlaced=bytes[28]===1;
 const channels={0:1,2:3,3:1,4:2,6:4}[color],groups=[];
 const passes=interlaced?[[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]]:[[0,0,1,1]];
 for(const [x,y,dx,dy] of passes){
  const w=Math.max(0,Math.ceil((width-x)/dx)),h=Math.max(0,Math.ceil((height-y)/dy));
  if(w&&h)groups.push({rowBytes:Math.ceil(w*channels*bitDepth/8),rows:h});
 }
 const expected=groups.reduce((sum,g)=>sum+(g.rowBytes+1)*g.rows,0);
 if(expected>64*1024*1024)throw Error('preview-limit');
 if(typeof DecompressionStream!=='function')throw Error('preview-unavailable');
 const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),parts=[];
 for(let pos=8;pos<bytes.length;){
  const size=data.getUint32(pos),type=String.fromCharCode(...bytes.subarray(pos+4,pos+8));
  if(type==='IDAT')parts.push(bytes.subarray(pos+8,pos+8+size));pos+=size+12;
 }
 const reader=new Blob(parts).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
 let total=0,nextFilter=0,group=0,row=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   if(total+value.length>expected)throw Error('invalid-raster');
   while(nextFilter<total+value.length){
    if(group>=groups.length||value[nextFilter-total]>4)throw Error('invalid-raster');
    nextFilter+=groups[group].rowBytes+1;
    if(++row===groups[group].rows){row=0;group++;}
   }
   total+=value.length;
  }
  if(total!==expected||nextFilter!==expected||group!==groups.length)throw Error('invalid-raster');
 }catch(error){await reader.cancel().catch(()=>{});throw error;}
 return image;
}
