/* C4.38 — read-only catalogue of discoveries in the four existing Arcade saves.
 * Nothing here creates an inventory object, claim, wallet credit or season mark.
 */
(function(root,factory){
 const api=factory(
  typeof module==='object'&&module.exports?require('./personal-arcade-core-v1.js'):root?.DuduPersonalArcadeCoreV1,
  typeof module==='object'&&module.exports?require('./personal-arcade-season-c423.js'):root?.DuduPersonalArcadeSeasonC423,
  typeof module==='object'&&module.exports?require('./personal-jade-core-v1.js'):root?.DuduPersonalJadeCoreV1);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduArcadeTreasureC438=api;
})(typeof window!=='undefined'?window:null,function(core,season,jade){
 'use strict';
 const VERSION=1;
 const GAME_NAMES=Object.freeze({neon:'Trạm Neon',mine:'Địa Tầng 07',garden:'Vườn Sương',jade:'Ngọc Phường'});
 const RARITIES=Object.freeze({common:'Thường',rare:'Quý',epic:'Sử thi',mythic:'Huyền thoại',legacy:'Di sản'});
 const safeCount=n=>Number.isSafeInteger(n)&&n>0?Math.min(n,10000000):0;
 const catalog=[];
 const add=item=>catalog.push(Object.freeze(item));

 const contracts=[
  ['Bản Giao Ước Đèn Hồng','rare','Khép lại hợp đồng mở màn tại Trạm Neon.',
   'Nét mực đầu tiên trong cuốn sử phòng máy.'],
  ['Khế Ước Phố Không Ngủ','epic','Hoàn thành hợp đồng thứ hai tại Trạm Neon.',
   'Những ngọn đèn bừng sáng qua một đêm dài.'],
  ['Hợp Đồng Bạch Kim','epic','Hoàn thành hợp đồng cuối tại Trạm Neon.',
   'Một chữ ký được giữ như dấu mốc của cả đế chế.']
 ];
 contracts.forEach(([name,rarity,hint,story],i)=>add({id:'neon-contract-'+i,
  game:'neon',season:'evergreen',name,rarity,kind:'contract',artId:i,
  hint,story,source:'Hợp đồng Trạm Neon',
  count:s=>s?.neon?.contracts?.includes(i)?1:0}));

 const oreHints={stone:'Tìm trong các lượt đào đầu tiên.',coal:'Đào tại mạch quặng Địa Tầng 07.',
  iron:'Tìm trong các đường hầm thông thường.',copper:'Khám phá các mạch quặng sâu hơn.',
  silver:'Khám phá các mạch quặng sâu hơn.',gold:'Thử vận may ở tầng mỏ mới.',
  crystal:'Tìm tinh thạch trong những mạch quặng bí ẩn.',jade:'Đào được ngọc bích dưới lòng đất.',
  meteor:'Săn vệt thiên thạch trong tầng mỏ.',relic:'Khảo cổ ở những tầng mỏ sâu.'};
 const oreRarity={stone:'common',coal:'common',iron:'common',copper:'rare',
  silver:'rare',gold:'rare',crystal:'epic',jade:'epic',meteor:'mythic',relic:'mythic'};
 Object.entries(core?.ORE_NAMES||{}).forEach(([id,name])=>add({id:'ore-'+id,
  game:'mine',season:'evergreen',name:id==='relic'?'Cổ Vật Địa Tầng':name,
  rarity:oreRarity[id],kind:'ore',artId:id,
  hint:oreHints[id],story:id==='relic'?'Một mảnh lịch sử đã ngủ yên dưới đá.':
   'Mẫu vật ghi dấu chiều sâu của chuyến đào.',source:'Nhật ký phát hiện Địa Tầng 07',
  count:s=>safeCount(s?.mine?.found?.[id])}));

 // The Aquarium excludes ordinary fish. This book also highlights Quý+ only;
 // the complete common-species record stays in Vườn Sương's Sổ Cá.
 const collectibleFish=Object.entries(core?.FISH_SPECIES||{}).filter(([,fish])=>fish.rarity!=='Thường');
 collectibleFish.forEach(([id,fish])=>add({id:'fish-'+id,
  game:'garden',season:'evergreen',name:fish.name,
  rarity:fish.rarity==='Huyền thoại'?'mythic':fish.rarity==='Sử thi'?'epic':'rare',
  kind:'fish',artId:id,secret:['dragon','phoenix'].includes(id),
  hint:fish.habitat?'Thử câu tại hồ khi '+fish.habitat.toLowerCase()+'.':
   'Câu được loài cá này ở hồ Vườn Sương.',
  story:fish.rarity==='Huyền thoại'?'Một lần mặt hồ rẽ sóng, truyền thuyết hóa thành thật.':
   'Dấu vây lấp lánh trong quyển nhật ký mặt hồ.',
  source:'Sổ Cá · Vườn Sương',count:s=>safeCount(s?.garden?.fishAlbum?.[id])}));

 // All 56 existing grade×color album combinations are included, not just an
 // attractive subset. Discovery is historical, independent of selling/holding.
 for(let grade=1;grade<=7;grade++)for(let color=0;color<8;color++){
  const name=(jade?.GRADES?.[grade]||'Ngọc')+' · '+(jade?.COLORS?.[color]||'Sắc ngọc');
  const rarity=grade===7?'mythic':grade>=5?'epic':grade>=3?'rare':'common';
  add({id:`jade-${grade}-${color}`,game:'jade',season:'evergreen',name,rarity,
   kind:'jade',artId:`${grade}-${color}`,grade,color,
   secret:grade===7&&color===6,
   hint:'Khai được phôi ngọc đúng Chủng và Sắc tại Ngọc Phường.',
   story:'Một thớ ngọc, một sắc độ, một câu chuyện riêng sau đường cưa.',
   source:'Sổ Chủng × Sắc · Ngọc Phường',
   count:s=>safeCount(s?.jade?.album?.[`${grade}-${color}`])});
 }

 // Season 01's folio is public concept art, NOT inventory. In particular,
 // local `records.s01.relics` must never upgrade these to "owned".
 (season?.RELICS||[]).forEach(r=>add({id:'s01-'+r.id,
  game:r.id,season:'s01',name:r.name,rarity:'epic',kind:'season',artId:r.id,
  hint:'Kỷ vật của Mùa 1 · Sương Tinh Thạch. Mùa chưa khai mở.',
  story:'Một dấu ấn khởi nguyên đang đợi ngày mùa giải mở cửa.',
  source:'Hộ chiếu Mùa 1',count:()=>0}));
 add({id:'s01-founder',game:'all',season:'s01',name:'Ấn Khai Nguyên',
  rarity:'legacy',kind:'season',artId:'founder',
  hint:'Di sản cuối Mùa 1, chưa có cơ chế nhận chính thức.',
  story:'Phần thưởng cho một hành trình thật sự dài qua bốn thế giới.',
  source:'Di sản · Mùa 1',count:()=>0});

 const CATALOG=Object.freeze(catalog);
 const ids=new Set(CATALOG.map(item=>item.id));
 if(ids.size!==CATALOG.length)throw Error('C4.38 duplicate catalogue identity');
 function snapshot(state){
  const records=CATALOG.map(item=>{
   const preview=item.season!=='evergreen';
   const count=preview?0:safeCount(item.count(state));
   const status=preview?'preview':count?'owned':'missing';
   const secret=!!item.secret&&status!=='owned';
   return {...item,count,status,owned:status==='owned',concealed:secret,
    displayName:secret?'Báu vật chưa hé lộ':item.name,
    displayHint:secret?'Dấu vết vẫn còn ẩn trong hành trình.':item.hint,
    displayStory:secret?'Chuyện kể sẽ hiện ra sau lần tìm thấy đầu tiên.':item.story,
    discoveredAt:null};
  });
  const owned=records.filter(x=>x.status==='owned').length;
  const preview=records.filter(x=>x.status==='preview').length;
  return {version:VERSION,items:records,owned,available:records.length-preview,
   preview,total:records.length};
 }
 const rarityRank={legacy:5,mythic:4,epic:3,rare:2,common:1};
 function select(book,{game='all',season='all',rarity='all',status='all'}={}){
  if(!book?.items)return [];
  return book.items.filter(item=>(game==='all'||item.game===game)&&
   (season==='all'||item.season===season)&&
   (rarity==='all'||item.rarity===rarity)&&
   (status==='all'||item.status===status))
   .sort((a,b)=>(a.status==='owned'?0:a.status==='missing'?1:2)-
    (b.status==='owned'?0:b.status==='missing'?1:2)||
    rarityRank[b.rarity]-rarityRank[a.rarity]||a.name.localeCompare(b.name,'vi'));
 }
 return Object.freeze({VERSION,GAME_NAMES,RARITIES,CATALOG,snapshot,select});
});
