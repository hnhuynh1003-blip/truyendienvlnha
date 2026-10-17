/* NPC relationship R1 — pure schema and explicit catalog taxonomy.
 * Definition-only: no writes, grants, gifts, AI, or inventory mutations.
 */
(function(root,factory){
  'use strict';
  const api=factory(typeof module==='object'&&module.exports?
    require('./world-items-v44-1.js'):root?.DuduWorldItemsV441);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduNpcRelationshipV2=api;
})(typeof window!=='undefined'?window:null,function(worldPack){
  'use strict';
  const VERSION=1;
  const CONFIG=Object.freeze({maxAffinityGainPerGift:8,scoredGiftsPerNpcUtcDay:3,
    giftCooldownMs:300000,refusedGiftConsumesItem:false});
  const TAGS=Object.freeze(['COMMON_ITEM','REALM_ITEM','COLLECTIBLE',
    'FOOD','PRACTICAL','DRINK_COFFEE','KEEPSAKE','DANGEROUS','BOUNDARY_VIOLATION']);
  // Explicit ID-indexed registry; neutral baseline tags intentionally do not
  // imply an NPC likes an item. Future editorial tags require review.
  const CATALOG_TAGS=Object.freeze({
    'f1': Object.freeze(['COMMON_ITEM']),
    'f2': Object.freeze(['COMMON_ITEM']),
    'common-cloth': Object.freeze(['COMMON_ITEM']),
    'common-rope': Object.freeze(['COMMON_ITEM']),
    'common-matches': Object.freeze(['COMMON_ITEM']),
    'common-gauze': Object.freeze(['COMMON_ITEM']),
    'common-weak-battery': Object.freeze(['COMMON_ITEM']),
    'common-biscuit': Object.freeze(['COMMON_ITEM']),
    'common-bottled-water': Object.freeze(['COMMON_ITEM']),
    'e2': Object.freeze(['COMMON_ITEM']),
    'e3': Object.freeze(['COMMON_ITEM']),
    'common-flashlight': Object.freeze(['COMMON_ITEM']),
    'common-raincoat': Object.freeze(['COMMON_ITEM']),
    'common-basic-medkit': Object.freeze(['COMMON_ITEM']),
    'd1': Object.freeze(['COMMON_ITEM']),
    'common-water-filter': Object.freeze(['COMMON_ITEM']),
    'common-repair-kit': Object.freeze(['COMMON_ITEM']),
    'common-compass': Object.freeze(['COMMON_ITEM']),
    'common-tent': Object.freeze(['COMMON_ITEM']),
    'c1': Object.freeze(['COMMON_ITEM']),
    'common-torn-map': Object.freeze(['COMMON_ITEM']),
    'common-health-box': Object.freeze(['COMMON_ITEM']),
    'common-signal-device': Object.freeze(['COMMON_ITEM']),
    'b1': Object.freeze(['COMMON_ITEM']),
    'b2': Object.freeze(['COMMON_ITEM']),
    'urban-oneway-ticket': Object.freeze(['REALM_ITEM']),
    'urban-coffee': Object.freeze(['REALM_ITEM']),
    'urban-keycard': Object.freeze(['REALM_ITEM']),
    'urban-old-newspaper': Object.freeze(['REALM_ITEM']),
    'urban-recorder': Object.freeze(['REALM_ITEM']),
    'apoc-mask': Object.freeze(['REALM_ITEM']),
    'apoc-ration': Object.freeze(['REALM_ITEM']),
    'apoc-battery-core': Object.freeze(['REALM_ITEM']),
    'apoc-bio-sample': Object.freeze(['REALM_ITEM']),
    'apoc-rescue-radio': Object.freeze(['REALM_ITEM']),
    'cult-spirit-fragment': Object.freeze(['REALM_ITEM']),
    'cult-dew-herb': Object.freeze(['REALM_ITEM']),
    'cult-ward-talisman': Object.freeze(['REALM_ITEM']),
    'cult-blank-jade-slip': Object.freeze(['REALM_ITEM']),
    'cult-ancient-relic-shard': Object.freeze(['REALM_ITEM']),
    'fantasy-feather': Object.freeze(['REALM_ITEM']),
    'fantasy-moon-sand': Object.freeze(['REALM_ITEM']),
    'fantasy-blood-gem': Object.freeze(['REALM_ITEM']),
    'fantasy-ancient-armor': Object.freeze(['REALM_ITEM']),
    'fantasy-ruins-seal': Object.freeze(['REALM_ITEM']),
    'scifi-data-disk': Object.freeze(['REALM_ITEM']),
    'scifi-plasma-cell': Object.freeze(['REALM_ITEM']),
    'scifi-robot-card': Object.freeze(['REALM_ITEM']),
    'scifi-quantum-chip': Object.freeze(['REALM_ITEM']),
    's1': Object.freeze(['REALM_ITEM']),
    'horror-unlit-candle': Object.freeze(['REALM_ITEM']),
    'horror-blurred-photo': Object.freeze(['REALM_ITEM']),
    'horror-cracked-bell': Object.freeze(['REALM_ITEM']),
    'horror-unnamed-key': Object.freeze(['REALM_ITEM']),
    'horror-ink-journal': Object.freeze(['REALM_ITEM']),
    'dudu-new-reader': Object.freeze(['COLLECTIBLE']),
    'dudu-first-chapter': Object.freeze(['COLLECTIBLE']),
    'dudu-first-npc': Object.freeze(['COLLECTIBLE']),
    'dudu-archive-ticket': Object.freeze(['COLLECTIBLE']),
    'dudu-realm-footprint': Object.freeze(['COLLECTIBLE']),
    'dudu-infinite-map': Object.freeze(['COLLECTIBLE']),
    'dudu-enduring-reader': Object.freeze(['COLLECTIBLE']),
    'dudu-memory-keeper': Object.freeze(['COLLECTIBLE']),
    'dudu-superfan': Object.freeze(['COLLECTIBLE']),
    'dudu-mailbox': Object.freeze(['COLLECTIBLE']),
    'dudu-meteor-data': Object.freeze(['COLLECTIBLE']),
    'dudu-multiverse-seal': Object.freeze(['COLLECTIBLE']),
    'dudu-first-season': Object.freeze(['COLLECTIBLE']),
    'dudu-founders-badge': Object.freeze(['COLLECTIBLE']),
    'sss1': Object.freeze(['COLLECTIBLE']),
    // V44.1 additions have neutral, editorial-approved realm identity.
    // Do not derive dangerous/favorite tags from an item's name.
    ...Object.fromEntries((worldPack?.items||[]).map(x=>[
      x.id,Object.freeze(['REALM_ITEM'])
    ]))
  });
  // Manually reviewed item ID mapping; never infer from names or Gemini.
  const EDITORIAL_GIFT_TAGS=Object.freeze({
    'common-gauze':['PRACTICAL'],'common-basic-medkit':['PRACTICAL'],
    'common-repair-kit':['PRACTICAL'],'common-water-filter':['PRACTICAL'],
    'common-bottled-water':['PRACTICAL'],
    'e2':['DRINK_COFFEE'],'urban-coffee':['DRINK_COFFEE'],
    'urban-oneway-ticket':['KEEPSAKE'],'urban-old-newspaper':['KEEPSAKE'],
    'urban-recorder':['KEEPSAKE'],
    'e3':['DANGEROUS'],'c1':['DANGEROUS'],
    'b1':['DANGEROUS'],'b2':['DANGEROUS'],'s1':['DANGEROUS']
  });
  const ID=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/;
  const STAGES=Object.freeze(['ACQUAINTED','FRIENDLY','TRUSTED','BONDED']);
  const STYLES=Object.freeze(['default','reserved','cheerful','gentle']);
  const asId=x=>typeof x==='string'&&ID.test(x)?x:null;
  function normalizePreferences(raw){
    if(raw==null)return Object.freeze({likedTags:[],neutralTags:[],
      dislikedTags:[],refusedTags:[],reactionStyle:'default'});
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    const seen=new Set(),out={};
    for(const field of ['likedTags','neutralTags','dislikedTags','refusedTags']){
      const arr=raw[field]??[];
      if(!Array.isArray(arr)||arr.length>TAGS.length)return null;
      const clean=[];
      for(const tag of arr){
        if(!TAGS.includes(tag)||seen.has(tag))return null;
        seen.add(tag);clean.push(tag);
      }
      out[field]=Object.freeze(clean);
    }
    out.reactionStyle=raw.reactionStyle??'default';
    if(!STYLES.includes(out.reactionStyle))return null;
    return Object.freeze(out);
  }
  function itemTags(item){
    if(!item||!asId(item.id))return null;
    const tags=CATALOG_TAGS[item.id];
    // Story items require author-assigned tags: never infer them from title.
    if(tags)return Object.freeze([...tags,...(EDITORIAL_GIFT_TAGS[item.id]||[])]);
    if(!item.id.startsWith('author-item-'))return null;
    if(!Array.isArray(item.giftTags)||item.giftTags.length>TAGS.length||
      item.giftTags.some(t=>!TAGS.includes(t))||
      new Set(item.giftTags).size!==item.giftTags.length)return null;
    return Object.freeze([...item.giftTags]);
  }
  function validScope(uid,storyId,npcId){
    return [uid,storyId,npcId].every(asId);
  }
  function previewRelationship(record,uid,storyId,npcId){
    if(!validScope(uid,storyId,npcId)||!record||typeof record!=='object')return null;
    const raw=Number(record.affinity);
    const affinity=record.affinity==null?20:
      Number.isFinite(raw)?Math.max(0,Math.min(100,raw)):20;
    const existing=record.relationshipV2;
    // NO writes and NO mutation: preserve legacy affinity, chat, and NPC fields.
    const trust=existing&&Number.isFinite(existing.trust)?
      Math.max(0,Math.min(100,existing.trust)):0;
    const stage=existing&&STAGES.includes(existing.stage)?
      existing.stage:'ACQUAINTED';
    const v2=Object.freeze({
      version:VERSION,trust,stage,
      lastGiftAt:existing&&Number.isFinite(existing.lastGiftAt)?existing.lastGiftAt:0,
      giftDayUtc:typeof existing?.giftDayUtc==='string'?existing.giftDayUtc:'',
      acceptedGiftCountUtc:Number.isSafeInteger(existing?.acceptedGiftCountUtc)&&
        existing.acceptedGiftCountUtc>=0?existing.acceptedGiftCountUtc:0,
      acceptedInstanceIds:Object.freeze(Array.isArray(existing?.acceptedInstanceIds)?
        existing.acceptedInstanceIds.filter(asId).slice(-100):[]),
      acceptedGiftEventIds:Object.freeze(Array.isArray(existing?.acceptedGiftEventIds)?
        existing.acceptedGiftEventIds.filter(asId).slice(-100):[]),
      lastCheckinUtc:typeof existing?.lastCheckinUtc==='string'?
        existing.lastCheckinUtc:'',
      trustEventIds:Object.freeze(Array.isArray(existing?.trustEventIds)?
        existing.trustEventIds.filter(asId).slice(-100):[]),
      milestones:Object.freeze(Array.isArray(existing?.milestones)?
        existing.milestones.filter(asId).slice(-100):[])
    });
    return Object.freeze({uid,storyId,npcId,affinity,relationshipV2:v2});
  }
  // Trust unlocks NEW affinity gains, never clamps historical affinity.
  function affinityCeiling(trust){
    const t=Number.isFinite(trust)?Math.max(0,trust):0;
    return t<20?40:t<50?70:100;
  }
  function canBeGifted(item){
    return !!item&&item.giftable===true&&item.unique!==true&&
      item.scope!=='DUDU'&&item.scope!=='STORY'&&item.scope!=='CHAPTER'&&
      item.archived!==true;
  }
  return Object.freeze({VERSION,CONFIG,TAGS,CATALOG_TAGS,EDITORIAL_GIFT_TAGS,STAGES,STYLES,
    normalizePreferences,itemTags,validScope,previewRelationship,affinityCeiling,canBeGifted});
});
