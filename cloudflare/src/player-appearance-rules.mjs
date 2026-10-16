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
// Server-only, immutable-looking award facts. The API never consumes
// client supplied "ownedFrames" or "achievement" fields. The Worker reads
// these facts from the verified user's own Durable Object.
export const SERVER_AWARD_IDS=Object.freeze(['legend','soulbond']);
export const SERVER_AWARD_SOURCES=Object.freeze({
  legend:'VERIFIED_STORY_MILESTONE',
  soulbond:'VERIFIED_NPC_BOND'
});
export function normalizeVerifiedAwards(rows){
  if(!Array.isArray(rows))return Object.freeze([]);
  const seen=new Set();
  for(const row of rows){
    if(!row||typeof row!=='object'||Array.isArray(row))continue;
    if(!Object.hasOwn(SERVER_AWARD_SOURCES,row.frameId)||
       row.source!==SERVER_AWARD_SOURCES[row.frameId]||
       typeof row.evidenceId!=='string'||
       !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(row.evidenceId)||
       !Number.isSafeInteger(row.grantedAt)||row.grantedAt<=0)continue;
    seen.add(row.frameId);
  }
  return Object.freeze(SERVER_AWARD_IDS.filter(id=>seen.has(id)));
}
export function appearanceFrames(identity,verifiedAwards=[]){
  // Admin privilege comes solely from an authenticated JWT verified upstream.
  const allowed=[...FREE_FRAMES];
  if(identity?.admin===true)allowed.push('author');
  for(const frameId of normalizeVerifiedAwards(verifiedAwards))allowed.push(frameId);
  return Object.freeze(allowed);
}
export function normalizeAppearanceSave(body,identity,verifiedAwards=[]){
  if(!body||typeof body!=='object'||Array.isArray(body))return null;
  if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)return null;
  // An API client cannot set an alternate UID or sneak in reward metadata.
  if(Object.keys(body).some(k=>!['expectedRevision','avatar'].includes(k)))return null;
  const data=body.avatar;
  if(!data||typeof data!=='object'||Array.isArray(data))return null;
  const keys=Object.keys(data);
  if(keys.some(k=>!['kind','presetId','frameId'].includes(k)))return null;
  const {kind,presetId,frameId='none'}=data;
  if(!appearanceFrames(identity,verifiedAwards).includes(frameId))return null;
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
export function displayState(snapshot,identity,verifiedAwards=[]){
  const frames=appearanceFrames(identity,verifiedAwards);
  const stored=snapshot?.avatar;
  const safe=stored&&frames.includes(stored.frameId)&&
    ['initials','anime','vector'].includes(stored.kind)&&
    (stored.kind==='initials'||isApprovedPreset(stored.presetId))?
      stored:{kind:'initials',presetId:'',frameId:'none'};
  return Object.freeze({revision:Number(snapshot?.revision)||0,
    avatar:Object.freeze({...safe}),availableFrames:frames,
    lockedFrames:Object.freeze(['legend','soulbond',...(identity?.admin===true?[]:['author'])].filter(id=>!frames.includes(id))),
    uploadsEnabled:false});
}
