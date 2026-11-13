// G3B: deterministic, offline MOBILE PREVIEW audit. Observation metadata is
// caller-supplied; neither it nor a matching image hash is a licence, approval,
// anti-spoiler decision, visual review, or authorization to publish.
// No network, image generation, arbitrary conditions, DB writes or live route.
import {inspectContent} from './vangioi-content.mjs';
import {copyAuthoringContent,copyAuthoringJson} from './vangioi-authoring.mjs';
import {inspectPngBytes} from './vangioi-png.mjs';

export const G3B_MOBILE_ASSET_VERSION='g3b-mobile-preview-1';
export const G3B_VIEWPORTS=Object.freeze([
 Object.freeze({id:'mobile-320',width:320,height:568}),
 Object.freeze({id:'mobile-375',width:375,height:667}),
 Object.freeze({id:'mobile-390',width:390,height:693}),
 Object.freeze({id:'mobile-430',width:430,height:764}),
 Object.freeze({id:'desktop-1280',width:1280,height:720})
]);
const LIMIT_ASSETS=1600,LIMIT_OBSERVATIONS=1600,LIMIT_REGIONS=24,LIMIT_ISSUES=160;
const issue=(code,path,extra={})=>({code,path,severity:'review',...extra});
const shape=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&
 Object.keys(value).every(key=>allowed.includes(key));
const unit=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1;
const region=r=>Array.isArray(r)&&r.length===4&&r.every(unit)&&r[0]<r[2]&&r[1]<r[3];
const pin=(a,b)=>a.assetId===b.assetId&&a.assetVersion===b.assetVersion&&a.contentHash===b.contentHash;

// Exact object-fit:cover + object-position percentages used by G1I preview.
// Result coordinates are fractions of the ORIGINAL image, not CSS pixels.
export function g3bCoverCrop(imageWidth,imageHeight,viewport,focalPoint=[0.5,0.5]){
 if(!Number.isSafeInteger(imageWidth)||imageWidth<1||
  !Number.isSafeInteger(imageHeight)||imageHeight<1||
  !Number.isSafeInteger(viewport?.width)||viewport.width<1||
  !Number.isSafeInteger(viewport?.height)||viewport.height<1||
  !Array.isArray(focalPoint)||focalPoint.length!==2||!focalPoint.every(unit))
  throw Error('g3b-invalid-crop-input');
 const scale=Math.max(viewport.width/imageWidth,viewport.height/imageHeight);
 const renderWidth=imageWidth*scale,renderHeight=imageHeight*scale;
 const offsetX=(viewport.width-renderWidth)*focalPoint[0];
 const offsetY=(viewport.height-renderHeight)*focalPoint[1];
 return {bounds:[
  Math.max(0,-offsetX/renderWidth),Math.max(0,-offsetY/renderHeight),
  Math.min(1,(viewport.width-offsetX)/renderWidth),
  Math.min(1,(viewport.height-offsetY)/renderHeight)
 ],upscaled:scale>1+1e-9};
}

// Optional local PNG preview helper: derives dimensions from real bytes and
// verifies the exact asset pin. It is NOT a full pixel/visual/content scanner.
export async function g3bObservationFromPng(asset,bytes,{importantRegions=[]}={}){
 if(!asset||typeof asset.assetId!=='string'||typeof asset.assetVersion!=='string'||
  !/^[a-f0-9]{64}$/i.test(asset.contentHash||''))throw Error('g3b-invalid-pin');
 const image=inspectPngBytes(bytes);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==asset.contentHash.toLowerCase())throw Error('g3b-pin-mismatch');
 return {assetId:asset.assetId,assetVersion:asset.assetVersion,
  contentHash:asset.contentHash,width:image.width,height:image.height,
  format:'png',byteLength:bytes.byteLength,importantRegions:copyAuthoringJson(importantRegions)};
}

function validObservation(o,assets){
 if(!shape(o,['assetId','assetVersion','contentHash','width','height','format',
  'byteLength','hasAlpha','importantRegions']))return false;
 const a=assets.get(o.assetId);
 if(!a||!pin(a,o)||!Number.isSafeInteger(o.width)||o.width<1||o.width>100000||
  !Number.isSafeInteger(o.height)||o.height<1||o.height>100000||
  o.width*o.height>1000000000||
  !['png','jpeg','webp','avif'].includes(o.format)||
  (o.byteLength!==undefined&&(!Number.isSafeInteger(o.byteLength)||o.byteLength<1))||
  (o.hasAlpha!==undefined&&typeof o.hasAlpha!=='boolean'))return false;
 if(o.importantRegions!==undefined){
  if(!Array.isArray(o.importantRegions)||o.importantRegions.length>LIMIT_REGIONS)return false;
  const ids=new Set();
  for(const r of o.importantRegions){
   if(!shape(r,['regionId','bounds'])||
    typeof r.regionId!=='string'||!/^[a-z][a-z0-9-]{1,63}$/.test(r.regionId)||
    ids.has(r.regionId)||!region(r.bounds))return false;
   ids.add(r.regionId);
  }
 }
 return true;
}

export function analyzeG3BMobileAssets(value,{assetObservations=[]}={}){
 const base={analyzerVersion:G3B_MOBILE_ASSET_VERSION,canPublish:false,
  deviceVerified:false,rightsVerified:false,productionAuthorized:false,
  evidenceAuthority:'caller-supplied-preview-only',viewportIds:G3B_VIEWPORTS.map(v=>v.id),
  manualReview:['device-layout-and-tap-targets','contrast-and-readability',
   'story-context-and-visual-identity','age-and-era-consistency',
   'spoilers-and-accessibility','actual-image-decoding-and-licence']};
 const validity=inspectContent(value);
 if(!validity.valid)return {...base,inputValid:false,status:'invalid-content',
  issues:validity.errors.slice(0,LIMIT_ISSUES).map(e=>issue(e.code,e.path)),
  renderedAssetCount:0,observedAssetCount:0,unmeasuredAssetCount:0,
  truncated:validity.errors.length>LIMIT_ISSUES};
 const c=copyAuthoringContent(value);
 const assets=new Map(c.assets.map(a=>[a.assetId,a]));
 let observations;
 try{observations=copyAuthoringJson(assetObservations);}catch{
  observations=null;
 }
 if(c.assets.length>LIMIT_ASSETS||!Array.isArray(observations)||
  observations.length>LIMIT_OBSERVATIONS)return {...base,inputValid:true,
   status:'analysis-budget-or-evidence-invalid',
   issues:[issue('asset-qa-budget-or-input-invalid','/assetObservations')],
   renderedAssetCount:0,observedAssetCount:0,unmeasuredAssetCount:0,truncated:false};
 const observed=new Map();
 for(const [i,o] of observations.entries()){
  if(!validObservation(o,assets)||observed.has(o.assetId))return {...base,inputValid:true,
   status:'invalid-evidence',issues:[issue('asset-observation-invalid',`/assetObservations/${i}`)],
   renderedAssetCount:0,observedAssetCount:0,unmeasuredAssetCount:0,truncated:false};
  observed.set(o.assetId,o);
 }
 const used=new Map(),backgrounds=new Set(),sprites=new Set(),issues=[];
 let truncated=false;
 const warn=(code,path,extra={})=>{
  if(issues.length<LIMIT_ISSUES)issues.push(issue(code,path,extra));
  else truncated=true;
 };
 const use=(assetId,path,{background=false,sprite=false}={})=>{
  if(!used.has(assetId))used.set(assetId,path);
  if(background)backgrounds.add(assetId);
  if(sprite)sprites.add(assetId);
 };
 use(c.worldCoverAssetId,'/worldCoverAssetId');
 const backgroundPlaces=new Map();
 c.scenes.forEach((s,i)=>use(s.backgroundAssetId,`/scenes/${i}/backgroundAssetId`,
  {background:true}));
 c.scenes.forEach((s,i)=>{
  const places=backgroundPlaces.get(s.backgroundAssetId)||new Set();
  if(places.size&&!places.has(s.placeId))
   warn('shared-background-across-places-needs-review',
    `/scenes/${i}/backgroundAssetId`);
  places.add(s.placeId);
  backgroundPlaces.set(s.backgroundAssetId,places);
 });
 c.views.forEach((v,i)=>{
  if(v.assetId){
   use(v.assetId,`/views/${i}/assetId`,{background:true});
   if(assets.get(v.assetId)?.kind==='worldCover')
    warn('world-cover-reused-as-scene-needs-review',`/views/${i}/assetId`);
  }
  if(v.hotspots.some(h=>h.presentation==='hotspot_overlay'))
   warn('hotspot-overlay-mobile-placement-unverified',`/views/${i}/hotspots`);
 });
 const variants=new Map((c.characterVisuals||[]).flatMap(v=>(v.variants||[]).map(
  look=>[look.variantId,look])));
 (c.characterAppearances||[]).forEach((a,i)=>{
  const look=variants.get(a.variantId);
  if(look)use(look.assetId,`/characterAppearances/${i}/variantId`,
   {sprite:a.displayMode==='sprite'});
  if(a.displayMode==='sprite'&&!a.fallbackText?.trim())
   warn('sprite-fallback-text-needs-review',`/characterAppearances/${i}/fallbackText`);
 });

 for(const [assetId,path] of used){
  const o=observed.get(assetId);
  if(!o){warn('rendered-asset-unmeasured',path);continue;}
  if(sprites.has(assetId)&&o.hasAlpha===false)
   warn('sprite-no-alpha-in-observation',path);
  if(!backgrounds.has(assetId))continue;
  const focal=assets.get(assetId).focalPoint||[0.5,0.5];
  if(o.width<320||o.height<320)warn('image-small-for-mobile-preview',path);
  const crops=G3B_VIEWPORTS.map(viewport=>({
   viewport:viewport.id,...g3bCoverCrop(o.width,o.height,viewport,focal)
  }));
  const upscaled=crops.filter(x=>x.upscaled).map(x=>x.viewport);
  if(upscaled.length)warn('preview-image-upscaled',path,{affectedViewports:upscaled});
  for(const landmark of o.importantRegions||[]){
   const affected=crops.filter(x=>{
    const [x1,y1,x2,y2]=x.bounds,[l,t,r,b]=landmark.bounds;
    return l<x1-1e-7||t<y1-1e-7||r>x2+1e-7||b>y2+1e-7;
   }).map(x=>x.viewport);
   if(affected.length)warn('important-region-cropped',path,
    {regionId:landmark.regionId,affectedViewports:affected});
  }
 }
 return {...base,inputValid:true,status:'needs-device-review',issues,truncated,
  renderedAssetCount:used.size,observedAssetCount:[...used.keys()].filter(id=>observed.has(id)).length,
  unmeasuredAssetCount:[...used.keys()].filter(id=>!observed.has(id)).length,
  annotatedBackgroundCount:[...backgrounds].filter(id=>observed.get(id)?.importantRegions?.length).length};
}
