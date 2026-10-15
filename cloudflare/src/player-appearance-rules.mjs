/* DUDU V17: server-side-only player appearance validation.
 * No client-specified recipient UID, no client-mintable rare frames.
 */
const PRESET_IDS=new Set(['anime-moon-blue','anime-moon-violet','anime-peach-court','anime-adventurer']);
const FREE_FRAMES=new Set(['none','moon','violet','sakura','cyber','starlight']);
export const PLAYER_FRAME_IDS=Object.freeze({
  free:[...FREE_FRAMES],admin:['author'],locked:['legend','soulbond']
});
export function isApprovedPreset(id){
  if(PRESET_IDS.has(id))return true;
  if(typeof id!=='string')return false;
  const m=/^portrait-([fm])-(\d{2})$/.exec(id);
  if(!m)return false;
  const n=Number(m[2]);
  return n>=1&&n<=(m[1]==='f'?60:12);
}
export function appearanceFrames(identity){
  // Admin privilege comes solely from an authenticated JWT verified upstream.
  const allowed=[...FREE_FRAMES];
  if(identity?.admin===true)allowed.push('author');
  return Object.freeze(allowed);
}
export function normalizeAppearanceSave(body,identity){
  if(!body||typeof body!=='object'||Array.isArray(body))return null;
  if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)return null;
  // An API client cannot set an alternate UID or sneak in reward metadata.
  if(Object.keys(body).some(k=>!['expectedRevision','avatar'].includes(k)))return null;
  const data=body.avatar;
  if(!data||typeof data!=='object'||Array.isArray(data))return null;
  const keys=Object.keys(data);
  if(keys.some(k=>!['kind','presetId','frameId'].includes(k)))return null;
  const {kind,presetId,frameId='none'}=data;
  if(!appearanceFrames(identity).includes(frameId))return null;
  if(kind==='initials'){
    if(presetId!=null&&presetId!=='')return null;
    return Object.freeze({expectedRevision:body.expectedRevision,
      avatar:Object.freeze({kind:'initials',presetId:'',frameId})});
  }
  if(kind!=='anime'&&kind!=='vector')return null;
  if(typeof presetId!=='string'||!isApprovedPreset(presetId))return null;
  if(kind==='anime'&&!PRESET_IDS.has(presetId))return null;
  if(kind==='vector'&&PRESET_IDS.has(presetId))return null;
  return Object.freeze({expectedRevision:body.expectedRevision,
    avatar:Object.freeze({kind,presetId,frameId})});
}
export function displayState(snapshot,identity){
  const frames=appearanceFrames(identity);
  const stored=snapshot?.avatar;
  const safe=stored&&frames.includes(stored.frameId)&&
    ['initials','anime','vector'].includes(stored.kind)&&
    (stored.kind==='initials'||isApprovedPreset(stored.presetId))?
      stored:{kind:'initials',presetId:'',frameId:'none'};
  return Object.freeze({revision:Number(snapshot?.revision)||0,
    avatar:Object.freeze({...safe}),availableFrames:frames,
    lockedFrames:Object.freeze(['legend','soulbond',...(identity?.admin===true?[]:['author'])]),
    uploadsEnabled:false});
}
