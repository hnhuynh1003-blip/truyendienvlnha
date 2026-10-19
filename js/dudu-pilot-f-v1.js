/* One authored F-tier short story. TEST ONLY: no contracts, XP, real rewards.
 * Reuses immutable missionId from V66 (Quán trọ Quan Đạo).
 */
(function(root,factory){
 'use strict';
 const data=factory();
 if(typeof module==='object'&&module.exports)module.exports=data;
 if(root)root.DuduPilotFStoryV1=data;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const data={
  schemaVersion:1,status:'pilot_only',released:false,rewardsEnabled:false,
  scenarioId:'pilot-quan-dao-v1',missionId:'dudu-m-an-f01',tier:'F',genreId:'ancient',
  title:'Đêm mưa ở Quan Đạo',worldCover:'assets/worlds/quan-dao-gate.svg',
  startSceneId:'arrival',
  places:{
   gate:{label:'Đường vào quán trọ Quan Đạo',background:'assets/worlds/quan-dao-gate.svg',photo:'assets/worlds/quan-dao-gate-cinematic.webp'},
   hall:{label:'Đại sảnh quán trọ',background:'assets/worlds/quan-dao-hall.svg',photo:'assets/worlds/quan-dao-hall-cinematic.webp'}
  },
  scenes:{
   arrival:{placeId:'gate',title:'Người lữ khách giữa cơn mưa',
    text:'Mưa dâng ngang mái quán Quan Đạo. Một túi thuốc cứu người biến mất. Người trọ trách người hầu, lính áp tải đòi khám tất cả hành lý. Bạn chỉ còn một đêm để tìm hiểu chuyện gì xảy ra.',
    npc:'Hà chưởng quầy',
    choices:[
     {id:'enter_quiet',label:'Vào quán hỏi rõ tình hình',to:'hall',relations:{keeper:1}},
     {id:'walk_away',label:'Rời đi trước khi bão lớn',ending:'withdraw'}
    ]},
   hall:{placeId:'hall',title:'Ba lời kể khác nhau',
    text:'Hà chưởng quầy giữ sổ hàng, lính áp tải Lục Tam nhìn chằm chằm cửa kho. Cô hầu A Liên nói đêm qua có người mang thuốc đi. Mỗi người chỉ biết một phần sự thật.',
    npc:'Hà chưởng quầy · Lục Tam · A Liên',
    choices:[
     {id:'meet_keeper',label:'Hỏi chưởng quầy về sổ thuốc',to:'keeper'},
     {id:'meet_guard',label:'Trò chuyện với Lục Tam',to:'guard'},
     {id:'inspect_room',label:'Quan sát nhà kho',to:'store'},
     {id:'accuse_maid',label:'Quy kết A Liên ăn cắp ngay',ending:'wrong'},
     {id:'confront',label:'Đối chiếu sổ và dấu niêm phong',ending:'exposed',
      requires:['receipt','broken_seal'],requirementHint:'Cần tìm sổ hàng và dấu niêm phong.'},
     {id:'arrange_talk',label:'Mời các bên hòa giải có chứng cứ',ending:'peace',
      requires:['receipt','guard_statement'],requirementHint:'Cần sổ hàng và lời khai Lục Tam.'}
    ]},
   keeper:{placeId:'hall',title:'Sổ trực đêm',npc:'Hà chưởng quầy',
    text:'Chưởng quầy nói túi thuốc phải còn nguyên dấu đỏ. Sổ trực đêm ghi Lục Tam nhận chìa kho lúc nửa đêm, nhưng ông không biết mục đích.',
    choices:[
     {id:'read_ledger',label:'Ghi lại mục chìa kho trong sổ',to:'hall',
      gainEvidence:['receipt'],relations:{keeper:1},once:true},
     {id:'back_keeper',label:'Trở lại đại sảnh',to:'hall'}
    ]},
   guard:{placeId:'hall',title:'Lời nói chưa trọn vẹn',npc:'Lục Tam',
    text:'Lục Tam thừa nhận đã ra khỏi trạm gác vì nghe tiếng kêu cứu. Anh tránh trả lời về túi thuốc và xin bạn đừng kết tội A Liên vội.',
    choices:[
     {id:'hear_guard',label:'Ghi nhận lời khai của Lục Tam',to:'hall',
      gainEvidence:['guard_statement'],relations:{guard:1},once:true},
     {id:'back_guard',label:'Chưa hỏi thêm, quay về',to:'hall'}
    ]},
   store:{placeId:'hall',title:'Niêm phong bị mở',npc:'A Liên',
    text:'Trên chiếc hòm cạnh nhà kho có một mẩu sáp đỏ đã vỡ. A Liên chỉ ra nơi này thường dùng để giữ thuốc, nhưng không biết ai đã mở trước cơn bão.',
    choices:[
     {id:'inspect_seal',label:'Lưu lại mẩu niêm phong',to:'hall',
      gainEvidence:['broken_seal'],relations:{maid:1},once:true},
     {id:'back_store',label:'Trở lại hỏi những người còn lại',to:'hall'}
    ]}
  },
  endings:{
   withdraw:{status:'failure',title:'Một đêm bỏ lỡ',
    text:'Bạn an toàn rời quán, nhưng túi thuốc không được tìm ra. Nhiệm vụ không hoàn thành; có thể bắt đầu lại để chọn hướng khác.'},
   wrong:{status:'failure',title:'Lời buộc tội không chứng cứ',
    text:'A Liên bị đối xử oan. Khi thuốc vẫn mất tích, chưởng quầy không còn tin kết luận của bạn. Suy đoán thay cho chứng cứ không đủ nghiệm thu.'},
   exposed:{status:'success',title:'Sự thật sau dấu sáp đỏ',
    text:'Nhờ sổ chìa kho và dấu sáp bị mở, Lục Tam thừa nhận đã đưa thuốc đi cứu một người bị thương ở trạm canh, rồi giấu vì sợ bị kỷ luật. Thuốc được đưa trở lại quản lý; hành vi che giấu vẫn có hậu quả.'},
   peace:{status:'success',title:'Một lời thú nhận được lắng nghe',
    text:'Từ sổ hàng và lời khai, bạn thuyết phục mọi người kiểm tra trạm canh. Lục Tam nhận lỗi vì tự lấy thuốc; chưởng quầy đồng ý cứu người bị thương trước và lập sổ bàn giao. Quan hệ các bên được giữ lại.'}
  }
 };
 function freezeDeep(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){
  Object.values(v).forEach(freezeDeep);Object.freeze(v);}return v;}
 return freezeDeep(data);
});
