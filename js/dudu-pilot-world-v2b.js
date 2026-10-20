/* Quan Đạo World Bible: specific to this TEST world, not the entire Ancient genre.
 * World Truth is authored offline; never treat client bundle as a production secret.
 */
(function(root,factory){
 'use strict';
 const w=factory();
 if(typeof module==='object'&&module.exports)module.exports=w;
 if(root)root.DuduQuanDaoWorldV2B=w;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const world={
  schemaVersion:'world-bible-v2b',status:'pilot_only',
  worldId:'quan-dao-inn-pilot',genreId:'ancient',defaultPlaceId:'gate',
  visualIdentity:{era:'cổ đại giả tưởng',mood:'mưa đêm, hoài nghi và lòng trắc ẩn',
   landmarks:['đèn lồng đỏ','cổng quán trọ','hòm thuốc có niêm phong']},
  places:{
   gate:{placeId:'gate',publicName:'Đường vào quán Quan Đạo',atmosphere:'Mưa trùm lên con đường núi.',
    background:'assets/worlds/quan-dao-gate.svg',photo:'assets/worlds/quan-dao-gate-cinematic.webp',adjacent:['hall']},
   hall:{placeId:'hall',publicName:'Đại sảnh quán trọ',atmosphere:'Đèn dầu soi sổ trực đêm và những ánh nhìn nghi hoặc.',
    background:'assets/worlds/quan-dao-hall.svg',photo:'assets/worlds/quan-dao-hall-cinematic.webp',adjacent:['gate','store']},
   store:{placeId:'store',publicName:'Kho thuốc sau quán',atmosphere:'Hương thảo dược len qua cửa gỗ ẩm.',
    background:'assets/worlds/quan-dao-store.svg',photo:'assets/worlds/quan-dao-store-cinematic.webp',adjacent:['hall']}
  },
  // Private author-side facts. These must never be dumped into the play UI.
  facts:{
   last_guard_key:{truth:'Lục Tam nhận chìa kho sau canh hai.'},
   sealed_box:{truth:'Hòm thuốc bị mở từ phía ngoài.'},
   borrowed_medicine:{truth:'Lục Tam chuyển thuốc cứu người ở trạm canh và sợ bị kỷ luật.'},
   maid_witness:{truth:'A Liên trông thấy bóng lính canh, nhưng không thấy người lấy thuốc.'}
  },
  npcs:{
   keeper:{npcId:'keeper',name:'Hà chưởng quầy',role:'Chủ quán',homePlaceId:'hall',
    intro:'“Khách quan, sổ đêm còn ở đây. Xin đừng kết tội ai khi chưa xem kỹ.”',
    motive:'Tìm lại thuốc và giữ sự an toàn của người trọ.',
    knows:['last_guard_key','sealed_box'],
    beliefs:['Nghi có người tự ý mở kho, chưa thể buộc tội.'],
    lines:[
     {requiresEvidence:['key_log'],factId:'last_guard_key',text:'“Sổ ghi Lục Tam mượn chìa lúc canh hai, nhưng tôi không biết vì sao.”'},
     {requiresEvidence:['care_receipt'],text:'“Nếu có người bị thương, ta cứu trước rồi lập biên bản bàn giao.”'}
    ]},
   guard:{npcId:'guard',name:'Lục Tam',role:'Lính áp tải',homePlaceId:'hall',
    intro:'“Tôi đã rời chốt gác, nhưng đừng bắt A Liên chịu oan.”',
    motive:'Giữ bí mật việc vi phạm quy trình để cứu người.',
    knows:['borrowed_medicine','last_guard_key'],
    beliefs:['Cứu người là đúng, nhưng tự lấy thuốc là sai.'],
    lines:[
     {text:'“Tôi đã ra khỏi trạm gác giữa đêm. Điều đó là thật.”'},
     {requiresEvidence:['broken_seal','guard_statement'],requiresFlags:['guard_confronted'],factId:'borrowed_medicine',text:'“Dấu niêm phong ấy... tôi đã làm vỡ. Có người đang chờ thuốc ở trạm canh.”'},
     {requiresEvidence:['care_receipt'],text:'“Tôi đã ghi rõ nơi dùng thuốc. Tôi sẽ nhận trách nhiệm trước chưởng quầy.”'}
    ]},
   maid:{npcId:'maid',name:'A Liên',role:'Người hầu quán',homePlaceId:'hall',
    intro:'“Tôi có đi ngang nhà kho, nhưng tôi chưa chạm vào túi thuốc.”',
    motive:'Minh oan và bảo vệ người trọ.',
    knows:['maid_witness','sealed_box'],
    beliefs:['Một bóng áo lính đi qua hành lang, không xác định được ai.'],
    lines:[
     {requiresEvidence:['maid_statement'],factId:'maid_witness',text:'“Tôi thấy bóng áo lính dưới đèn. Không thể vì vậy nói chắc ai đã lấy thuốc.”'},
     {requiresEvidence:['broken_seal'],text:'“Vết sáp còn mới. Nhưng em chỉ nhìn thấy bóng người, không thấy ai tự tay mở hòm.”'}
    ]}
  },
  clues:{
   key_log:{id:'key_log',label:'Sổ mượn chìa kho',placeId:'hall',sourceNpcId:'keeper'},
   guard_statement:{id:'guard_statement',label:'Lời khai về tiếng kêu cứu',placeId:'hall',sourceNpcId:'guard'},
   maid_statement:{id:'maid_statement',label:'Lời chứng hành lang',placeId:'hall',sourceNpcId:'maid'},
   broken_seal:{id:'broken_seal',label:'Mẩu niêm phong vỡ',placeId:'store',sourceNpcId:'maid'},
   care_receipt:{id:'care_receipt',label:'Biên nhận cấp cứu trạm canh',placeId:'hall',sourceNpcId:'guard'}
  }
 };
 function freezeDeep(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freezeDeep);Object.freeze(v);}return v;}
 return freezeDeep(world);
});
