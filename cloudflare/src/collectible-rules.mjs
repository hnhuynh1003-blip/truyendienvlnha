/* Server-only item release validation. Published rules are explicit admin acts,
 * not inferred by Gemini, chapter titles, the browser, or editable user profiles.
 */
export const MIN_CHAPTER_ELAPSED_MS=90_000;
const ID=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const RANKS=new Set(['F','E','D','C','B','A','S','SS','SSS']);
const METHODS=new Set(['CHAPTER_EVENT','STORY_EVENT']);
export function cleanId(s){return typeof s==='string'&&ID.test(s)?s:null;}
export function normalizedPublication(request){
  if(!request||typeof request!=='object'||Array.isArray(request))return null;
  const item=request.item;
  if(!item||typeof item!=='object'||Array.isArray(item))return null;
  const storyId=cleanId(item.storyId);
  const itemId=cleanId(item.id);
  const chapterId=item.chapterId===null?null:cleanId(item.chapterId);
  const method=item.acquisition?.method;
  const name=typeof item.name==='string'?item.name.trim():'';
  const icon=typeof item.icon==='string'?item.icon.trim():'';
  const rank=item.rank;
  if(!storyId||!itemId||!itemId.startsWith('author-item-')||
    !METHODS.has(method)||!RANKS.has(rank)||!name||name.length>70||
    !icon||icon.length>12||item.archived===true||item.published!==true)return null;
  if(method==='CHAPTER_EVENT'?!chapterId:chapterId!==null)return null;
  if(item.scope!==(chapterId?'CHAPTER':'STORY'))return null;
  // Admin must explicitly confirm that this is safe for public release.
  if(request.confirmPublicRelease!==true)return null;
  const npcId=item.npcId===null||item.npcId===undefined?null:cleanId(item.npcId);
  if(item.npcId!=null&&!npcId)return null;
  const summary=typeof item.desc==='string'?item.desc.trim():'';
  if(!summary||summary.length>240)return null;
  return Object.freeze({storyId,itemId,chapterId,npcId,name,rank,icon,
    summary,method,unique:true});
}

const DRAFT_METHODS=new Set(['COLLECTION_ONLY','STORY_EVENT','CHAPTER_EVENT']);
const ITEM_TYPES=new Set(['ITEM','FOOD','WEAPON']);
// Server-side, admin-only draft. NEVER mirror this object to public Firestore.
export function normalizedPrivateDraft(body){
  if(!body||typeof body!=='object'||Array.isArray(body))return null;
  const item=body.item;
  if(!item||typeof item!=='object'||Array.isArray(item))return null;
  const storyId=cleanId(body.storyId);
  const chapterId=body.chapterId==null?null:cleanId(body.chapterId);
  const itemId=body.itemId==null?null:cleanId(body.itemId);
  const npcId=item.npcId==null?null:cleanId(item.npcId);
  const name=typeof item.name==='string'?item.name.trim():'';
  const summary=typeof item.desc==='string'?item.desc.trim():'';
  const icon=typeof item.icon==='string'?item.icon.trim():'🎁';
  const method=item.method||'COLLECTION_ONLY';
  if(!storyId||(body.chapterId!=null&&!chapterId)||
    (body.itemId!=null&&(!itemId||!itemId.startsWith('author-item-')))||
    (item.npcId!=null&&!npcId)||
    !name||name.length>70||!summary||summary.length>240||
    !icon||icon.length>12||!RANKS.has(item.rank)||
    !ITEM_TYPES.has(item.type)||!DRAFT_METHODS.has(method)||
    (method==='CHAPTER_EVENT'&&!chapterId)||
    (method==='STORY_EVENT'&&chapterId))return null;
  return Object.freeze({
    storyId,chapterId,itemId,npcId,
    name,summary,icon,rank:item.rank,type:item.type,method
  });
}

// Publishing must reference a server-held draft at the exact previewed version.
// Full name/description NEVER come from the publish request.
export function normalizedDraftApproval(body){
  if(!body||typeof body!=='object'||Array.isArray(body))return null;
  const storyId=cleanId(body.storyId),itemId=cleanId(body.itemId);
  const version=body.expectedUpdatedAt;
  if(!storyId||!itemId||!itemId.startsWith('author-item-')||
     !Number.isSafeInteger(version)||version<=0||
     body.confirmPublicRelease!==true||body.confirmRevealToOwner!==true)return null;
  return Object.freeze({storyId,itemId,expectedUpdatedAt:version});
}

export function parseScopedIds(body,{withItem=false,withChapter=false,withUid=false}={}){
  if(!body||typeof body!=='object'||Array.isArray(body))return null;
  const storyId=cleanId(body.storyId);
  const itemId=withItem?cleanId(body.itemId):null;
  const chapterId=withChapter?cleanId(body.chapterId):null;
  const uid=withUid?cleanId(body.uid):null;
  if(!storyId||(withItem&&!itemId)||(withChapter&&!chapterId)||(withUid&&!uid))return null;
  return {storyId,itemId,chapterId,uid};
}
// A temporary staging-only award gate: never turn arbitrary released
// collectibles into mintable rewards simply by invoking the admin API.
export function isEligibleSelfTestGrant(item){
  return !!item&&(item.disabled===0||item.disabled===false)&&
    item.method==='STORY_EVENT'&&item.chapterId===null&&item.rank==='F'&&
    typeof item.name==='string'&&
    item.name.toLocaleLowerCase('vi').includes('kiểm thử');
}

export function isChapterMature(start,now){
  return Number.isFinite(start)&&Number.isFinite(now)&&now>=start+MIN_CHAPTER_ELAPSED_MS;
}
