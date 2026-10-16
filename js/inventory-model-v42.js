/* DUDU V42.1 — additive, read-only inventory domain model.
 * Does NOT mutate owned items, grant loot, consume gifts, write a profile,
 * or infer privileges from user-authored metadata.
 * Existing 70 catalog IDs, legacy e1 and shop/author IDs are preserved.
 */
(function(root,factory){
  'use strict';
  const api=factory(typeof module==='object'&&module.exports?
    require('./item-catalog-v2.js'):root?.DuduItemCatalog);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduInventoryV42=api;
})(typeof window!=='undefined'?window:null,function(catalog){
  'use strict';
  const VERSION=42;
  const CATEGORIES=Object.freeze({
    ALL:'Tất cả',CONSUMABLE:'Tiêu hao',EQUIPMENT:'Trang bị',
    MATERIAL:'Nguyên liệu',TOOL:'Công cụ',STORY_PROP:'Đạo cụ truyện',
    COLLECTIBLE:'Kỷ vật',OTHER:'Khác'
  });
  const REALMS=Object.freeze({
    URBAN:'Hiện đại',APOCALYPSE:'Tận thế',CULTIVATION:'Tu tiên',
    FANTASY:'Huyền huyễn',SCIFI:'Viễn tưởng',HORROR:'Kinh dị'
  });
  const RANKS=Object.freeze(['F','E','D','C','B','A','S','SS','SSS']);
  // Explicit classification by approved ID only, NOT derived from name/AI.
  const ROLE_IDS=Object.freeze({
    MATERIAL:Object.freeze([
      'common-cloth','common-rope','common-weak-battery',
      'apoc-battery-core','apoc-bio-sample','cult-spirit-fragment',
      'cult-dew-herb','cult-ancient-relic-shard','fantasy-feather',
      'fantasy-moon-sand','fantasy-blood-gem','fantasy-ancient-armor',
      'scifi-plasma-cell','scifi-quantum-chip'
    ]),
    TOOL:Object.freeze([
      'common-matches','common-gauze','common-flashlight','common-raincoat',
      'common-basic-medkit','common-water-filter','common-repair-kit',
      'common-compass','common-tent','common-health-box','common-signal-device',
      'urban-recorder','apoc-mask','apoc-rescue-radio','cult-ward-talisman',
      'scifi-data-disk','scifi-robot-card','horror-unlit-candle','horror-cracked-bell'
    ]),
    STORY_PROP:Object.freeze([
      'common-torn-map','urban-oneway-ticket','urban-keycard',
      'urban-old-newspaper','cult-blank-jade-slip','fantasy-ruins-seal',
      'horror-blurred-photo','horror-unnamed-key','horror-ink-journal'
    ])
  });
  const byRole=new Map();
  for(const [role,ids] of Object.entries(ROLE_IDS)){
    for(const id of ids){
      if(byRole.has(id))throw Error('V42 duplicate item role: '+id);
      byRole.set(id,role);
    }
  }
  // Legacy starter IDs map to canonical metadata only in memory and display.
  // Original stored item records are deliberately NEVER rewritten.
  const STARTER_ALIASES=Object.freeze({
    'init-1':Object.freeze({canonical:'f1',name:'Mẩu Bánh Mì Mốc',
      rank:'F',type:'FOOD',icon:'🍞',desc:'Khô khốc, chống đói lúc tuyệt vọng.'}),
    'init-2':Object.freeze({canonical:'e3',name:'Dao Gọt Trái Cây Cũ',
      rank:'E',type:'WEAPON',icon:'🔪',desc:'Vũ khí thô sơ nhất để tự vệ.'})
  });
  const STARTER_ALLOWED_FIELDS=new Set(['id','itemId','name','rank','type',
    'icon','desc','instanceId','obtainedFrom']);
  const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
  function starterAlias(record){
    if(!plain(record))return null;
    const known=STARTER_ALIASES[record.id];
    if(!known||Object.keys(record).some(key=>!STARTER_ALLOWED_FIELDS.has(key)))
      return null;
    for(const key of ['name','rank','type','icon','desc'])
      if(record[key]!==known[key])return null;
    if(record.itemId!==undefined&&record.itemId!==record.id)return null;
    return known.canonical;
  }
  function canonicalFor(record){
    return catalog?.byId(starterAlias(record)||idOf(record))||null;
  }
  function idOf(record){
    const id=record?.id||record?.itemId;
    return typeof id==='string'?id:'';
  }
  function categoryFor(record){
    if(!plain(record))return 'OTHER';
    if(record.scope==='DUDU')return 'COLLECTIBLE';
    if(record.type==='FOOD')return 'CONSUMABLE';
    if(record.type==='WEAPON')return 'EQUIPMENT';
    return byRole.get(idOf(record))||
      (record.scope==='STORY'||record.scope==='CHAPTER'?'STORY_PROP':'OTHER');
  }
  function inspect(record){
    if(!plain(record))return null;
    const id=idOf(record);
    const alias=starterAlias(record);
    const approved=catalog?.byId(alias||id)||null;
    const source=approved||record;
    const rank=RANKS.includes(source.rank)?source.rank:
      RANKS.includes(record.rank)?record.rank:'F';
    const type=['FOOD','WEAPON','ITEM'].includes(source.type)?source.type:
      ['FOOD','WEAPON','ITEM'].includes(record.type)?record.type:'ITEM';
    const functional=(id==='dudu-tool-frequency-cell-v43'&&
      record.scope==='FUNCTIONAL'&&record.obtainedFrom?.kind==='SHOP'&&
      record.obtainedFrom?.source==='DUDU_MARKET');
    const scope=approved?.scope||(functional?'FUNCTIONAL':
      ['STORY','CHAPTER'].includes(record.scope)?record.scope:'UNKNOWN');
    const unique=approved?.unique===true||record.unique===true;
    const protectedItem=unique||approved?.discardable===false||
      record.discardable===false||scope==='DUDU';
    const realm=typeof approved?.realmTag==='string'&&REALMS[approved.realmTag]?
      approved.realmTag:null;
    const origin=plain(record.obtainedFrom)?record.obtainedFrom:{};
    const acquisitionKind=['SHOP','CHAPTER','GLOBAL','STARTER','EVENT'].includes(origin.kind)?
      origin.kind:null;
    const storyId=typeof origin.storyId==='string'&&origin.storyId?
      origin.storyId:typeof record.storyId==='string'&&record.storyId?record.storyId:null;
    const chapterId=typeof origin.chapterId==='string'&&origin.chapterId?
      origin.chapterId:typeof record.chapterId==='string'&&record.chapterId?record.chapterId:null;
    const category=functional?'TOOL':categoryFor({id:alias||id,type,scope});
    const name=String(record.name||approved?.name||'Vật phẩm chưa xác định');
    const description=String(record.desc||record.description||approved?.desc||'Chưa có mô tả.');
    return Object.freeze({
      id:alias||id,originalId:id,instanceId:typeof record.instanceId==='string'?record.instanceId:null,
      name,description,rank,type,scope,realm,storyId,chapterId,
      acquisitionKind,
      category,categoryLabel:CATEGORIES[category],worldLabel:realm?REALMS[realm]:
        storyId?'Theo truyện':'Chung',
      icon:typeof record.icon==='string'?record.icon:approved?.icon||'🎒',
      protected:protectedItem,unique,
      giftable:functional?false:approved?approved.giftable===true&&!protectedItem:
        record.giftable===true&&!protectedItem,
      archive:approved?.archived===true||record.archived===true,
      verifiedCollectible:false, // Browser inventory never proves server ownership.
      usageStatus:functional?'CLEAR_PHONE_COOLDOWN':'NOT_IMPLEMENTED'
    });
  }
  function list(inventory,{category='ALL',query='',rank='ALL',realm='ALL',
    storyId='ALL',order='recent',offset=0,limit=24}={}){
    const src=Array.isArray(inventory)?inventory:[];
    const cat=Object.hasOwn(CATEGORIES,category)?category:'ALL';
    const rarity=rank==='ALL'||RANKS.includes(rank)?rank:'ALL';
    const world=realm==='ALL'||Object.hasOwn(REALMS,realm)?realm:'ALL';
    const story=typeof storyId==='string'?storyId:'ALL';
    const search=typeof query==='string'?query.trim().toLocaleLowerCase('vi'):'';
    const entries=src.map((item,index)=>({item,index,detail:inspect(item)}))
      .filter(row=>row.detail&&
        (cat==='ALL'||row.detail.category===cat)&&
        (rarity==='ALL'||row.detail.rank===rarity)&&
        (world==='ALL'||row.detail.realm===world)&&
        (story==='ALL'||(story==='GLOBAL'?!row.detail.storyId:row.detail.storyId===story))&&
        (!search||(row.detail.name+' '+row.detail.id)
          .toLocaleLowerCase('vi').includes(search)));
    if(order==='name'){
      entries.sort((a,b)=>a.detail.name.localeCompare(b.detail.name,'vi')||a.index-b.index);
    }else if(order==='rank_desc'){
      entries.sort((a,b)=>RANKS.indexOf(b.detail.rank)-RANKS.indexOf(a.detail.rank)||a.index-b.index);
    }else if(order==='rank_asc'){
      entries.sort((a,b)=>RANKS.indexOf(a.detail.rank)-RANKS.indexOf(b.detail.rank)||a.index-b.index);
    } // 'recent' preserves actual inventory order, not fabricated timestamps.
    const safeOffset=Number.isSafeInteger(offset)&&offset>0?offset:0;
    const safeLimit=Number.isSafeInteger(limit)&&limit>0?
      Math.min(limit,100):24;
    return Object.freeze({
      total:entries.length,inventoryTotal:src.length,
      entries:Object.freeze(entries.slice(safeOffset,safeOffset+safeLimit)
        .map(x=>Object.freeze(x))),
      hasMore:entries.length>safeOffset+safeLimit,
      nextOffset:Math.min(entries.length,safeOffset+safeLimit)
    });
  }

  // A stack is only a VIEW. Never rewrite / group the original owned array.
  // Ignore acquisition provenance when the canonical ID is COMMON or REALM.
  // Keep extras, custom stats, unique items and author collectibles separate.
  const STACK_SOURCE_FIELDS=new Set(['instanceId','obtainedFrom']);
  function stackKey(record){
    if(!plain(record))return null;
    const alias=starterAlias(record);
    const item=catalog?.byId(alias||idOf(record));
    if(!item||!['COMMON','REALM'].includes(item.scope)||
       // Rank B+ and story-significant rare finds remain individual slots.
       !['F','E','D','C'].includes(item.rank)||
       item.unique===true||item.discardable===false||
       record.unique===true||record.discardable===false||
       record.stackable===false)return null;
    // Old starter descriptions differ by design; exact legacy signature
    // was validated above. Other records need strict canonical equality.
    if(alias)return item.scope+':'+item.id;
    const keys=new Set([...Object.keys(item),...STACK_SOURCE_FIELDS]);
    for(const k of Object.keys(record)){
      if(!keys.has(k))return null;
      if(STACK_SOURCE_FIELDS.has(k))continue;
      // Reject variants or overwritten catalog fields; never silently drop
      // durability/enchantments/expiry and other future per-instance metadata.
      if(JSON.stringify(record[k])!==JSON.stringify(item[k]))return null;
    }
    return item.scope+':'+item.id;
  }
  function commonDetail(detail){
    if(!detail)return detail;
    if(detail.scope==='COMMON')return Object.freeze({...detail,
      storyId:null,chapterId:null,worldLabel:'Dùng chung mọi truyện'});
    if(detail.scope==='REALM')return Object.freeze({...detail,
      storyId:null,chapterId:null,worldLabel:(REALMS[detail.realm]||'Thế giới')+
      ' · Chung theo thế giới'});
    return detail;
  }
  // Group BEFORE pagination. One slot can represent 1..N original instances.
  // indices and items remain available so discard/gifting always operate
  // on EXACTLY one existing instance, never on an invented quantity record.
  function displayList(inventory,{category='ALL',query='',rank='ALL',
    realm='ALL',storyId='ALL',order='recent',offset=0,limit=24}={}){
    const src=Array.isArray(inventory)?inventory:[];
    const groups=[],seen=new Map();
    src.forEach((item,index)=>{
      const detail=inspect(item);if(!detail)return;
      const key=stackKey(item);
      if(key&&seen.has(key)){
        const group=groups[seen.get(key)];
        group.indices.push(index);group.items.push(item);return;
      }
      const group={item,index,detail:commonDetail(detail),
        indices:[index],items:[item],stackable:!!key};
      if(key)seen.set(key,groups.length);
      groups.push(group);
    });
    const cat=Object.hasOwn(CATEGORIES,category)?category:'ALL';
    const rarity=rank==='ALL'||RANKS.includes(rank)?rank:'ALL';
    const world=realm==='ALL'||Object.hasOwn(REALMS,realm)?realm:'ALL';
    const story=typeof storyId==='string'?storyId:'ALL';
    const search=typeof query==='string'?query.trim().toLocaleLowerCase('vi'):'';
    const filtered=groups.filter(({detail})=>
      (cat==='ALL'||detail.category===cat)&&
      (rarity==='ALL'||detail.rank===rarity)&&
      (world==='ALL'||detail.realm===world)&&
      (story==='ALL'||(story==='GLOBAL'?!detail.storyId:detail.storyId===story))&&
      (!search||(detail.name+' '+detail.id).toLocaleLowerCase('vi').includes(search)));
    if(order==='name')
      filtered.sort((a,b)=>a.detail.name.localeCompare(b.detail.name,'vi')||a.index-b.index);
    else if(order==='rank_desc')
      filtered.sort((a,b)=>RANKS.indexOf(b.detail.rank)-RANKS.indexOf(a.detail.rank)||a.index-b.index);
    else if(order==='rank_asc')
      filtered.sort((a,b)=>RANKS.indexOf(a.detail.rank)-RANKS.indexOf(b.detail.rank)||a.index-b.index);
    const safeOffset=Number.isSafeInteger(offset)&&offset>0?offset:0;
    const safeLimit=Number.isSafeInteger(limit)&&limit>0?Math.min(limit,100):24;
    return Object.freeze({
      total:filtered.length,inventoryTotal:src.length,
      visibleCopies:filtered.reduce((sum,g)=>sum+g.items.length,0),
      entries:Object.freeze(filtered.slice(safeOffset,safeOffset+safeLimit).map(g=>
        Object.freeze({item:g.item,index:g.index,detail:g.detail,
          count:g.items.length,stackable:g.stackable,
          indices:Object.freeze([...g.indices]),items:Object.freeze([...g.items])}))),
      hasMore:filtered.length>safeOffset+safeLimit,
      nextOffset:Math.min(filtered.length,safeOffset+safeLimit)
    });
  }

  function validateCatalog(){
    const errors=[];
    const all=catalog?.items||[];
    if(all.length!==70)errors.push('Expected 70 legacy catalog records');
    const seen=new Set();
    for(const row of all){
      const category=categoryFor(row);
      if(category==='OTHER')errors.push('Missing role: '+row.id);
      if(seen.has(row.id))errors.push('Duplicate ID: '+row.id);
      seen.add(row.id);
    }
    for(const id of byRole.keys())if(!seen.has(id))errors.push('Unknown role ID: '+id);
    return Object.freeze(errors);
  }
  return Object.freeze({VERSION,CATEGORIES,REALMS,RANKS,ROLE_IDS,idOf,
    categoryFor,inspect,list,stackKey,displayList,starterAlias,canonicalFor,validateCatalog});
});
