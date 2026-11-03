/* DUDU S01: review-only reset manifest. NEVER writes, clears or deletes data.
 * The real multi-account reset requires a separate, owner-approved server job.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduSeasonResetS01=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';

  const SEASON='S01';
  const ENABLE_APPLY=false;
  const STARTER_XU=50; // Current V54 starter value; owner may change at launch.
  const PRESERVE_FIELDS=Object.freeze([
    'username','name','role',
    'readingBookmarksV568','phoneAppearanceV568','playerAvatar',
    // Prevent an old Arcade exchange receipt from being credited twice.
    'arcadeLastReceiptV1'
  ]);
  const RESET_FIELDS=Object.freeze([
    'title','level','exp','currency','inventory','quests','questV437',
    'questsDayV43','lootedChapters','readRewards','dailyReadLog',
    'collectedCharacters','storyStates','honorV1'
  ]);
  const ALL_KNOWN=new Set([...PRESERVE_FIELDS,...RESET_FIELDS]);

  function validUid(uid){
    return typeof uid==='string'&&uid.length>0&&uid.length<=128;
  }
  function clone(value){
    return value===undefined?undefined:JSON.parse(JSON.stringify(value));
  }
  function emptyQuest(quest){
    if(!quest||typeof quest!=='object'||Array.isArray(quest))return null;
    return {...clone(quest),current:0,claimed:false};
  }
  function createPlan(uid,source,defaults){
    if(!validUid(uid))throw Error('UID không hợp lệ');
    if(!source||typeof source!=='object'||Array.isArray(source))
      throw Error('Chưa có dữ liệu hồ sơ để xem trước');
    if(source.username&&source.username!==uid)
      throw Error('Hồ sơ không khớp UID; không thể chuẩn bị reset');

    const unknownFields=Object.keys(source).filter(k=>!ALL_KNOWN.has(k)).sort();
    const next={username:uid};
    for(const field of PRESERVE_FIELDS){
      if(field!=='username'&&Object.prototype.hasOwnProperty.call(source,field))
        next[field]=clone(source[field]);
    }
    next.title='Thực Thể Ký Tự';
    next.level=1;next.exp=0;next.currency=STARTER_XU;next.inventory=[];
    const quests=Array.isArray(defaults)?defaults:source.quests;
    next.quests=Array.isArray(quests)?quests.map(emptyQuest).filter(Boolean):[];
    next.lootedChapters={};next.readRewards={};
    next.dailyReadLog={day:'',chapters:[]};
    next.collectedCharacters={};next.storyStates={};
    // questV437, questsDayV43 and honorV1 are intentionally omitted: they
    // are regenerated when the new season actually starts.
    return {
      version:1,season:SEASON,mode:'PREVIEW_ONLY',applyEnabled:ENABLE_APPLY,
      uid,unknownFields,
      preserveFields:PRESERVE_FIELDS.filter(k=>k in source),
      resetFields:RESET_FIELDS.filter(k=>k in source),
      nextProfile:next,
      // A clean field list alone is NOT authorization to reset live accounts.
      needsOwnerApproval:true
    };
  }

  function localGameKeys(storage,uid){
    if(!validUid(uid)||!storage)return [];
    const encoded=encodeURIComponent(uid);
    const exact=new Set([
      'dudu-personal-arcade:v1:'+encoded,
      'dudu-arcade-showcase:v1:'+encoded,
      'dudu-arcade-journey-c437:v1:'+encodeURIComponent('uid:'+uid),
      'dudu-honor-device-v1:'+encoded,
      'dudu-fun:practice:v51:'+uid,
      'dudu:companion:local:v51:'+uid,
      'dudu-v2:'+encoded+':global:chats',
      'dudu-v2:'+encoded+':global:loot-cooldown'
    ]);
    const npcPrefix='dudu-v3:npc-memory:'+encoded+':';
    const found=[];
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i);
      if(typeof key==='string'&&(exact.has(key)||key.startsWith(npcPrefix)))
        found.push(key);
    }
    return [...new Set(found)].sort();
  }

  function preview(uid,cloudProfile,storage,defaults){
    const plan=createPlan(uid,cloudProfile,defaults);
    const gameKeys=localGameKeys(storage,uid);
    const encoded=encodeURIComponent(uid);
    // These must never be cleared as part of a game reset.
    const protectedLocalKeys=[
      'profile_'+uid,
      'dudu-epub-batch-c421:'+encoded,
      'dudu-personal-arcade:exchange-settled-v1:'+encoded,
      'dudu-personal-arcade:exchange-pending-v1:'+encoded
    ].filter(k=>!!storage&&typeof storage.getItem==='function'&&storage.getItem(k)!==null);
    return {
      version:1,season:SEASON,mode:'PREVIEW_ONLY',uid,
      cloud:{
        levelBefore:cloudProfile.level??null,
        expBefore:cloudProfile.exp??null,
        xuBefore:cloudProfile.currency??null,
        starterXu:STARTER_XU,
        inventoryCount:Array.isArray(cloudProfile.inventory)?cloudProfile.inventory.length:0,
        questCount:Array.isArray(cloudProfile.quests)?cloudProfile.quests.length:0,
        bookmarkCount:Object.keys(cloudProfile.readingBookmarksV568||{}).length,
        resetFields:plan.resetFields,
        preserveFields:plan.preserveFields,
        unknownFields:plan.unknownFields
      },
      device:{gameKeys,protectedLocalKeys},
      blockers:[
        'Chưa được duyệt thực thi và chưa có bản sao lưu được xác nhận',
        'Phải kiểm tra ví máy chủ economy_accounts_v52 và biên nhận trước khi reset',
        'Phải thay phiên mùa cho dữ liệu Arcade trên mọi thiết bị',
        ...plan.unknownFields.map(key=>'Trường hồ sơ chưa phân loại: '+key)
      ]
    };
  }

  return Object.freeze({SEASON,ENABLE_APPLY,STARTER_XU,PRESERVE_FIELDS,
    RESET_FIELDS,createPlan,localGameKeys,preview});
});
