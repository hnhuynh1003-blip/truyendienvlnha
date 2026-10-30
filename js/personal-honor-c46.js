/* DUDU C4.6 — cosmetic Honor Hall. Reuses existing progression only.
 * No Xu/EXP/item grant, Arcade conversion, Firebase Rules or season reset.
 * Arcade milestones originate from owner-local simulation (honest-play), not
 * an attested server achievement. Server stores the cosmetic ledger only.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalHonorC46=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION=1,MAX_EARNED=100,MAX_PINNED=3;
 const TITLES=Object.freeze([
  {id:'entity',name:'Thực Thể Ký Tự',icon:'✦',rarity:'common',source:'DUDU'},
  {id:'reader',name:'Lữ Khách Trang Sách',icon:'📖',rarity:'rare',source:'Thư viện'},
  {id:'reader-master',name:'Người Giữ Ngàn Trang',icon:'✧',rarity:'epic',source:'Thư viện'},
  {id:'neon-owner',name:'Chủ Tiệm Neon',icon:'▣',rarity:'rare',source:'Trạm Neon'},
  {id:'neon-contractor',name:'Người Giữ Hợp Đồng',icon:'✍',rarity:'epic',source:'Trạm Neon'},
  {id:'neon-tycoon',name:'Ông Trùm Neon',icon:'⚡',rarity:'epic',source:'Trạm Neon'},
  {id:'neon-emperor',name:'Vương Giả Phố Đêm',icon:'♛',rarity:'mythic',source:'Trạm Neon'},
  {id:'mine-explorer',name:'Thợ Đào Mạch',icon:'⛏',rarity:'rare',source:'Địa Tầng 07'},
  {id:'mine-collector',name:'Kẻ Săn Tinh Thạch',icon:'◈',rarity:'epic',source:'Địa Tầng 07'},
  {id:'mine-lord',name:'Chưởng Mạch Địa Tầng',icon:'✧',rarity:'mythic',source:'Địa Tầng 07'},
  {id:'garden-angler',name:'Ngư Nhân Sương Sớm',icon:'🐟',rarity:'rare',source:'Vườn Sương'},
  {id:'garden-keeper',name:'Người Giữ Vườn Sương',icon:'❀',rarity:'epic',source:'Vườn Sương'},
  {id:'garden-legend',name:'Huyền Thoại Hồ Sương',icon:'🐉',rarity:'mythic',source:'Vườn Sương'},
  {id:'jade-appraiser',name:'Tập Sự Thẩm Ngọc',icon:'玉',rarity:'rare',source:'Ngọc Phường'},
  {id:'jade-curator',name:'Thiên Nhãn Thẩm Ngọc',icon:'❖',rarity:'epic',source:'Ngọc Phường'},
  {id:'jade-artisan',name:'Đại Sư Trác Ngọc',icon:'◉',rarity:'epic',source:'Ngọc Phường'},
  {id:'jade-king',name:'Ngọc Vương',icon:'👑',rarity:'mythic',source:'Ngọc Phường'},
  {id:'npc-friend',name:'Người Kết Duyên',icon:'♡',rarity:'rare',source:'Liên lạc'},
  {id:'quest-hunter',name:'Người Săn Nhiệm Vụ',icon:'✪',rarity:'rare',source:'Nhiệm vụ'},
  {id:'fun-visitor',name:'Khách Vạn Bảo',icon:'🎁',rarity:'rare',source:'DUDU FUN'}
 ].map(Object.freeze));
 const TITLES_BY_ID=new Map(TITLES.map(x=>[x.id,x]));
 const num=v=>Number.isSafeInteger(v)&&v>=0?v:0;
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
 const count=x=>Object.values(object(x)).filter(v=>v===true).length;
 const distinctFound=x=>Object.values(object(x)).filter(v=>num(v)>0).length;
 const countChecks=checks=>checks.filter(Boolean).length;
 const countJadeAlbum=(a,predicate)=>Object.entries(object(a)).filter(([k,v])=>num(v)>0&&predicate(k)).length;
 const CATALOG=Object.freeze([
  {id:'read-one',name:'Lật Trang Đầu Tiên',description:'Đọc chương truyện đầu tiên.',source:'Thư viện',icon:'📜',rarity:'common',target:1,titleId:'reader',progress:p=>count(p?.readRewards)},
  {id:'read-six',name:'Hành Trình Sáu Chương',description:'Khám phá 6 chương khác nhau.',source:'Thư viện',icon:'📚',rarity:'epic',target:6,titleId:'reader-master',progress:p=>count(p?.readRewards)},
  {id:'neon-first-contract',name:'Hợp Đồng Đầu Tay',description:'Hoàn tất hợp đồng đầu tiên tại Trạm Neon.',source:'Trạm Neon',icon:'✍',rarity:'common',target:1,progress:(p,a)=>a?.neon?.contracts?.length||0},
  {id:'neon-all-contracts',name:'Ba Bản Hợp Đồng',description:'Hoàn tất cả ba hợp đồng Trạm Neon.',source:'Trạm Neon',icon:'🖋',rarity:'epic',target:3,titleId:'neon-contractor',progress:(p,a)=>a?.neon?.contracts?.length||0},
  {id:'neon-25',name:'Khách Quen Phố Đêm',description:'Phục vụ 25 lượt khách ở Trạm Neon.',source:'Trạm Neon',icon:'▣',rarity:'rare',target:25,titleId:'neon-owner',progress:(p,a)=>num(a?.neon?.guestsServed)},
  {id:'neon-100',name:'Ông Trùm Neon',description:'Phục vụ 100 lượt khách tại phòng net.',source:'Trạm Neon',icon:'⚡',rarity:'epic',target:100,titleId:'neon-tycoon',progress:(p,a)=>num(a?.neon?.guestsServed)},
  {id:'neon-second-room',name:'Ánh Đèn Tầng Hai',description:'Nâng phòng net lên tầng 2.',source:'Trạm Neon',icon:'🏢',rarity:'rare',target:2,progress:(p,a)=>num(a?.neon?.roomTier)},
  {id:'neon-third-room',name:'Đế Chế Ba Tầng',description:'Nâng phòng net lên tầng 3.',source:'Trạm Neon',icon:'🏙',rarity:'epic',target:3,progress:(p,a)=>num(a?.neon?.roomTier)},
  {id:'neon-milestones',name:'Bậc Thầy Điều Hành',description:'Nhận đủ bốn thành tựu Trạm Neon.',source:'Trạm Neon',icon:'🏅',rarity:'mythic',target:4,progress:(p,a)=>a?.neon?.milestones?.length||0},
  {id:'neon-250',name:'Phố Đêm Không Ngủ',description:'Phục vụ 250 lượt khách tại Trạm Neon.',source:'Trạm Neon',icon:'🌃',rarity:'epic',target:250,progress:(p,a)=>num(a?.neon?.guestsServed)},
  {id:'neon-revenue-500',name:'Dòng Tiền Phố Đêm',description:'Đạt tổng doanh thu phục vụ 500 Xu Arcade (không tính lãi máy).',source:'Trạm Neon',icon:'◫',rarity:'rare',target:500,progress:(p,a)=>Math.floor(num(a?.neon?.serviceRevenue)/10)},
  {id:'neon-pro-setup',name:'Dàn Máy Chuyên Nghiệp',description:'Đạt CPU cấp 5, mạng cấp 3 và tản nhiệt cấp 3.',source:'Trạm Neon',icon:'▤',rarity:'epic',target:3,progress:(p,a)=>countChecks([a?.neon?.cpu>=5,a?.neon?.router>=3,a?.neon?.cooling>=3])},
  {id:'neon-crown',name:'Đế Chế Không Ngủ',description:'Phục vụ 250 khách, xong 3 hợp đồng, mở phòng cấp 3 và nhận đủ 4 mốc nhà điều hành.',source:'Trạm Neon',icon:'♛',rarity:'mythic',target:4,titleId:'neon-emperor',progress:(p,a)=>countChecks([a?.neon?.guestsServed>=250,a?.neon?.contracts?.length>=3,a?.neon?.roomTier>=3,a?.neon?.milestones?.length>=4])},
  {id:'mine-40',name:'Cửa Ngõ Địa Tầng',description:'Thực hiện 40 lượt đào quặng.',source:'Địa Tầng 07',icon:'⛏',rarity:'rare',target:40,titleId:'mine-explorer',progress:(p,a)=>num(a?.mine?.dug)},
  {id:'mine-160',name:'Chạm Lõi Địa Tầng',description:'Thực hiện 160 lượt đào quặng.',source:'Địa Tầng 07',icon:'◆',rarity:'epic',target:160,progress:(p,a)=>num(a?.mine?.dug)},
  {id:'mine-relic',name:'Bàn Tay Khảo Cổ',description:'Tìm thấy một cổ vật trong mỏ.',source:'Địa Tầng 07',icon:'♜',rarity:'epic',target:1,progress:(p,a)=>num(a?.mine?.found?.relic)},
  {id:'mine-burst',name:'Người Phá Mạch',description:'Phá mạch quặng thành công 10 lần.',source:'Địa Tầng 07',icon:'⚒',rarity:'rare',target:10,progress:(p,a)=>num(a?.mine?.bursts)},
  {id:'mine-collection',name:'Kẻ Săn Tinh Thạch',description:'Khám phá đủ 10 loại quặng.',source:'Địa Tầng 07',icon:'◈',rarity:'epic',target:10,titleId:'mine-collector',progress:(p,a)=>distinctFound(a?.mine?.found)},
  {id:'mine-deep-ready',name:'Cửa Hang Tinh Thạch',description:'Đào ít nhất 160 lượt và nâng đèn lên cấp 3 để mở tầng sâu.',source:'Địa Tầng 07',icon:'◇',rarity:'rare',target:2,progress:(p,a)=>countChecks([a?.mine?.dug>=160,a?.mine?.lantern>=3])},
  {id:'mine-burst-25',name:'Cuốc Vỡ Ngàn Sao',description:'Phá mạch quặng thành công 25 lần.',source:'Địa Tầng 07',icon:'⚒',rarity:'epic',target:25,progress:(p,a)=>num(a?.mine?.bursts)},
  {id:'mine-scanner-3',name:'Mắt Dò Tinh Thể',description:'Chế máy dò tinh thể lên cấp 3.',source:'Địa Tầng 07',icon:'⌕',rarity:'epic',target:3,progress:(p,a)=>num(a?.mine?.scanner)},
  {id:'mine-guardian',name:'Chưởng Mạch Địa Tầng',description:'Phát hiện đủ 10 quặng, 25 lần phá mạch, máy dò cấp 3 và ít nhất một cổ vật.',source:'Địa Tầng 07',icon:'✧',rarity:'mythic',target:4,titleId:'mine-lord',progress:(p,a)=>countChecks([distinctFound(a?.mine?.found)>=10,a?.mine?.bursts>=25,a?.mine?.scanner>=3,a?.mine?.found?.relic>=1])},
  {id:'garden-one',name:'Phao Động Trên Hồ',description:'Câu thành công con cá đầu tiên.',source:'Vườn Sương',icon:'🎣',rarity:'common',target:1,titleId:'garden-angler',progress:(p,a)=>num(a?.garden?.fish)},
  {id:'garden-ten',name:'Mười Lượt Đợi Chờ',description:'Câu được tổng cộng 10 con cá.',source:'Vườn Sương',icon:'🐟',rarity:'rare',target:10,progress:(p,a)=>num(a?.garden?.fish)},
  {id:'garden-rare',name:'Sắc Cá Hiếm',description:'Câu thành công loài cá hiếm đầu tiên.',source:'Vườn Sương',icon:'💠',rarity:'rare',target:1,progress:(p,a)=>num(a?.garden?.rareFish)},
  {id:'garden-album',name:'Bách Ngư Đồ',description:'Phát hiện đủ 8 loài cá.',source:'Vườn Sương',icon:'🫧',rarity:'epic',target:8,progress:(p,a)=>distinctFound(a?.garden?.fishAlbum)},
  {id:'garden-dragon',name:'Long Ngư Tinh Vân',description:'Câu được Long ngư tinh vân.',source:'Vườn Sương',icon:'🐉',rarity:'mythic',target:1,titleId:'garden-legend',secret:true,progress:(p,a)=>num(a?.garden?.fishAlbum?.dragon)},
  {id:'garden-harvest-10',name:'Mùa Hoa Đầu',description:'Thu hoạch thành công 10 luống cây.',source:'Vườn Sương',icon:'🌱',rarity:'rare',target:10,progress:(p,a)=>num(a?.garden?.harvests)},
  {id:'garden-harvest-30',name:'Trăng Lên Nhà Kính',description:'Thu hoạch 30 luống để mở giống Hoa nguyệt.',source:'Vườn Sương',icon:'🌙',rarity:'epic',target:30,progress:(p,a)=>num(a?.garden?.harvests)},
  {id:'garden-five-species',name:'Năm Bóng Phao',description:'Khám phá ít nhất năm loài cá trong nhật ký hồ.',source:'Vườn Sương',icon:'🐠',rarity:'rare',target:5,progress:(p,a)=>distinctFound(a?.garden?.fishAlbum)},
  {id:'garden-sanctuary',name:'Người Giữ Vườn Sương',description:'Thu hoạch 30 luống, nâng hồ lên cấp 3 và khám phá năm loài cá.',source:'Vườn Sương',icon:'❀',rarity:'epic',target:3,titleId:'garden-keeper',progress:(p,a)=>countChecks([a?.garden?.harvests>=30,a?.garden?.pondTier>=3,distinctFound(a?.garden?.fishAlbum)>=5])},
  {id:'jade-first',name:'Một Đao Khai Ngọc',description:'Bán thành công viên đá đầu tiên.',source:'Ngọc Phường',icon:'玉',rarity:'common',target:1,titleId:'jade-appraiser',progress:(p,a)=>num(a?.jade?.sold)},
  {id:'jade-twelve',name:'Thương Nhân Ngọc',description:'Bán 12 viên đá tại Ngọc Phường.',source:'Ngọc Phường',icon:'◉',rarity:'rare',target:12,progress:(p,a)=>num(a?.jade?.sold)},
  {id:'jade-exhibits',name:'Tủ Ngọc Rực Sáng',description:'Trưng bày 3 tác phẩm ngọc.',source:'Ngọc Phường',icon:'❖',rarity:'epic',target:3,titleId:'jade-curator',progress:(p,a)=>a?.jade?.exhibits?.length||0},
  {id:'jade-imperial',name:'Lục Đế Vương',description:'Khai ra một phôi ngọc có sắc Đế Vương Lục.',source:'Ngọc Phường',icon:'💎',rarity:'mythic',target:1,secret:true,progress:(p,a)=>countJadeAlbum(a?.jade?.album,k=>/^[1-7]-6$/.test(k))},
  {id:'jade-longstone',name:'Ngọc Vương',description:'Khai được một phôi Long Thạch Chủng.',source:'Ngọc Phường',icon:'👑',rarity:'mythic',target:1,titleId:'jade-king',secret:true,progress:(p,a)=>countJadeAlbum(a?.jade?.album,k=>/^7-[0-7]$/.test(k))},
  {id:'jade-cut-20',name:'Hai Mươi Đường Cưa',description:'Xẻ thành công 20 viên đá thô.',source:'Ngọc Phường',icon:'⚒',rarity:'rare',target:20,progress:(p,a)=>num(a?.jade?.cut)},
  {id:'jade-album-12',name:'Mười Hai Sắc Ngọc',description:'Khám phá 12 tổ hợp Chủng × Sắc khác nhau.',source:'Ngọc Phường',icon:'💠',rarity:'epic',target:12,progress:(p,a)=>distinctFound(a?.jade?.album)},
  {id:'jade-exhibit-10',name:'Triển Lãm Thập Bảo',description:'Trưng bày 10 tác phẩm đã chế tác trong Tủ Ngọc.',source:'Ngọc Phường',icon:'❖',rarity:'epic',target:10,progress:(p,a)=>a?.jade?.exhibits?.length||0},
  {id:'jade-ruins-access',name:'Giấy Thông Hành Tàn Tích',description:'Bán 40 viên đá và sở hữu giấy phép vào Rãnh Nứt Tàn Tích.',source:'Ngọc Phường',icon:'⟡',rarity:'mythic',target:2,progress:(p,a)=>countChecks([a?.jade?.sold>=40,a?.jade?.permit===true])},
  {id:'jade-masterwork',name:'Đại Sư Trác Ngọc',description:'Đưa thợ khắc lên cấp 3, trưng bày 5 tác phẩm và khám phá 12 tổ hợp ngọc.',source:'Ngọc Phường',icon:'◉',rarity:'epic',target:3,titleId:'jade-artisan',progress:(p,a)=>countChecks([a?.jade?.carver>=3,a?.jade?.exhibits?.length>=5,distinctFound(a?.jade?.album)>=12])},
  {id:'npc-gift',name:'Một Món Quà Nhỏ',description:'Tặng thành công món quà đầu tiên cho NPC.',source:'Liên lạc',icon:'♡',rarity:'rare',target:1,titleId:'npc-friend',progress:p=>num(p?.quests?.find?.(x=>x?.id==='q_npc_gifts')?.current)},
  {id:'quest-five',name:'Người Săn Nhiệm Vụ',description:'Nhận thưởng thành công từ 5 lượt nhiệm vụ.',source:'Nhiệm vụ',icon:'✪',rarity:'rare',target:5,titleId:'quest-hunter',progress:p=>Math.max(
   Array.isArray(p?.questV437?.history)?p.questV437.history.length:0,
   Array.isArray(p?.quests)?p.quests.filter(q=>q?.claimed===true).length:0)},
  {id:'fun-first',name:'Mở Cửa Vạn Bảo',description:'Nhận món quà đầu tiên từ Hộp Mù Vạn Bảo.',source:'DUDU FUN',icon:'🎁',rarity:'rare',target:1,titleId:'fun-visitor',progress:p=>Array.isArray(p?.storyStates?.__duduBlindBoxC29?.album)?
   p.storyStates.__duduBlindBoxC29.album.length:0}
 ].map(Object.freeze));
 const ACH_BY_ID=new Map(CATALOG.map(x=>[x.id,x]));
 // C4.8: Arcade journeys reuse immutable achievements, not a second quest
 // ledger or a new claimable currency. All progress is derived from gameplay.
 const JOURNEYS=Object.freeze([
  {id:'neon',source:'Trạm Neon',name:'Đế Chế Phố Đêm',icon:'▣',
   steps:['neon-250','neon-revenue-500','neon-pro-setup','neon-crown'],titleId:'neon-emperor'},
  {id:'mine',source:'Địa Tầng 07',name:'Chinh Phục Lõi Sâu',icon:'◈',
   steps:['mine-deep-ready','mine-burst-25','mine-scanner-3','mine-guardian'],titleId:'mine-lord'},
  {id:'garden',source:'Vườn Sương',name:'Hơi Thở Hồ Sương',icon:'❀',
   steps:['garden-harvest-10','garden-harvest-30','garden-five-species','garden-sanctuary'],titleId:'garden-keeper'},
  {id:'jade',source:'Ngọc Phường',name:'Hành Trình Thẩm Ngọc',icon:'玉',
   steps:['jade-cut-20','jade-album-12','jade-exhibit-10','jade-ruins-access','jade-masterwork'],titleId:'jade-artisan'}
 ].map(x=>Object.freeze({...x,steps:Object.freeze(x.steps)})));
 const fail=reason=>Object.assign(new Error(reason),{reason});
 const unique=(xs,max)=>[...new Set((Array.isArray(xs)?xs:[]).filter(x=>
  typeof x==='string'&&x.length<=64))].slice(0,max);
 function norm(raw){
  const r=object(raw);
  const earned=unique(r.earned,MAX_EARNED),pinned=unique(r.pinned,MAX_PINNED)
   .filter(id=>earned.includes(id));
  const equipped=TITLES_BY_ID.has(r.equipped)?r.equipped:'entity';
  return {version:VERSION,earned,equipped,pinned};
 }
 function discovered(profile,arcade){
  return CATALOG.filter(a=>num(a.progress(profile,arcade))>=a.target).map(a=>a.id);
 }
 // C4.11: describe an *actual transition*, never a previously earned or
 // unrecognized badge. A title can outrank the achievement that unlocks it.
 // This is presentation-only: no inventory, Xu, EXP or grant operation.
 function unlockMoment(beforeIds,afterIds,sources){
  const before=new Set(unique(beforeIds,MAX_EARNED));
  const after=new Set(unique(afterIds,MAX_EARNED));
  const allowed=Array.isArray(sources)?new Set(sources):null;
  const unlocked=CATALOG.filter(a=>after.has(a.id)&&!before.has(a.id)&&
   (!allowed||allowed.has(a.source)));
  if(!unlocked.length)return null;
  const rank={common:0,rare:1,epic:2,mythic:3};
  const ranked=unlocked.map(a=>{
   const title=TITLES_BY_ID.get(a.titleId);
   const rarity=title&&rank[title.rarity]>rank[a.rarity]?title.rarity:a.rarity;
   return {achievement:a,title,rarity};
  }).sort((a,b)=>rank[b.rarity]-rank[a.rarity]);
  const featured=ranked[0];
  return {ids:unlocked.map(a=>a.id),count:unlocked.length,
   id:featured.achievement.id,source:featured.achievement.source,
   name:featured.title?.name||featured.achievement.name,
   icon:featured.title?.icon||featured.achievement.icon,
   title:featured.title?.name||null,rarity:featured.rarity};
 }
 function titleUnlocked(titleId,earned){
  return titleId==='entity'||CATALOG.some(a=>a.titleId===titleId&&earned.includes(a.id));
 }
 function view(profile,arcade){
  const saved=norm(profile?.honorV1),earned=unique([
   ...saved.earned,...discovered(profile,arcade)],MAX_EARNED);
  const achievements=CATALOG.map(a=>({...a,current:Math.min(a.target,num(a.progress(profile,arcade))),
   unlocked:earned.includes(a.id)}));
  // C4.12: every collectible title points to its real, immutable unlock
  // condition. A hidden achievement never exposes its clue while locked.
  const titles=TITLES.map(t=>{
   const unlocked=titleUnlocked(t.id,earned),goal=achievements.find(a=>a.titleId===t.id);
   return {...t,unlocked,goal:goal?{
    id:goal.id,current:goal.current,target:goal.target,unlocked:goal.unlocked,
    secret:!!goal.secret&&!goal.unlocked,
    description:goal.secret&&!goal.unlocked?'Điều kiện đang được che giấu.':goal.description
   }:null};
  });
  const achievementById=new Map(achievements.map(a=>[a.id,a]));
  const journeys=JOURNEYS.map(j=>{const steps=j.steps.map(id=>achievementById.get(id));
   return {...j,done:steps.filter(a=>a.unlocked).length,total:steps.length,
    next:steps.find(a=>!a.unlocked)||null,
    title:titles.find(t=>t.id===j.titleId)};});
  const hunts=titles.filter(t=>!t.unlocked&&t.goal&&!t.goal.secret&&t.rarity!=='common');
  hunts.sort((a,b)=>{
   const aRatio=a.goal.current/a.goal.target,bRatio=b.goal.current/b.goal.target;
   if(aRatio!==bRatio)return bRatio-aRatio;
   if(a.goal.target!==b.goal.target)return a.goal.target-b.goal.target;
   return ({mythic:3,epic:2,rare:1,common:0})[b.rarity]-
    ({mythic:3,epic:2,rare:1,common:0})[a.rarity];
  });
  return {...saved,earned,titles,achievements,journeys,
   nextHunt:hunts[0]||null,unlockedCount:achievements.filter(a=>a.unlocked).length};
 }
 async function run({db,auth,uid,kind='sync',arcade=null,localProfile=null,
  titleId,achievementId,pinnedIds}={}){
  if(!db?.collection||!db?.runTransaction||!uid||auth?.currentUser?.uid!==uid||
   !['sync','equip','pin','preferences'].includes(kind))throw fail('invalid-account');
  const user=auth.currentUser,ref=db.collection('profiles_v2').doc(uid);
  const result=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
   const data=snap.data(),old=norm(data.honorV1),
    // C4.6.1: the phone displays cosmetic discoveries from the current
    // UID-scoped local profile as well as Arcade progress. Its owner may have
    // unsent reading/quest progress when a field-aware profile save conflicts.
    // Preserve only cosmetic achievement IDs here; NEVER copy local currency,
    // items, EXP, quest counters or arbitrary profile fields into Firestore.
    earned=unique([...old.earned,...discovered(data,arcade),
     ...(localProfile?discovered(localProfile,arcade):[])],MAX_EARNED);
   const updated={...old,earned,pinned:old.pinned.filter(id=>earned.includes(id))};
   const newIds=earned.filter(id=>!old.earned.includes(id));
   let title=null;
   if(kind==='equip'||kind==='preferences'){
    title=TITLES_BY_ID.get(titleId);
    if(!title||!titleUnlocked(title.id,earned))throw fail('title-locked');
    updated.equipped=title.id;
   }
   if(kind==='preferences'){
    if(!Array.isArray(pinnedIds)||pinnedIds.length>MAX_PINNED||
      new Set(pinnedIds).size!==pinnedIds.length||
      pinnedIds.some(id=>!ACH_BY_ID.has(id)||!earned.includes(id)))
     throw fail('achievement-locked');
    updated.pinned=[...pinnedIds];
   }else if(kind==='pin'){
    if(!ACH_BY_ID.has(achievementId)||!earned.includes(achievementId))
     throw fail('achievement-locked');
    updated.pinned=updated.pinned.includes(achievementId)?
     updated.pinned.filter(id=>id!==achievementId):
     [...updated.pinned,achievementId].slice(-MAX_PINNED);
   }
   const changed=!data.honorV1||JSON.stringify(old)!==JSON.stringify(updated)||
    !!title&&data.title!==title.name;
   if(changed)tx.update(ref,{honorV1:updated,...(title?{title:title.name}:{})});
   return {status:changed?'applied':'already-applied',honorV1:updated,
    title:title?.name||data.title||'Thực Thể Ký Tự',newIds};
  });
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
  return result;
 }
 return Object.freeze({VERSION,CATALOG,TITLES,JOURNEYS,norm,discovered,unlockMoment,
  titleUnlocked,view,run});
});
