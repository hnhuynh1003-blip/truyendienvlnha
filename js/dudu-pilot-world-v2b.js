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
   borrowed_medicine:{truth:'Lục Tam lấy thuốc cứu người trạm gác, mang túi còn lại về giấu ở thùng than sau bếp vì sợ bị phạt.'},
   maid_witness:{truth:'A Liên trông thấy bóng áo sẫm, nhưng không thấy người lấy thuốc.'},
   stock_for_convoy:{truth:'Túi thuốc gồm sáu cuộn băng ép và hai lọ cầm máu, được ký gửi cho đoàn xe chở người bị thương tới lúc bình minh.'},
   stock_used_at_post:{truth:'Tại trạm gác đã dùng hai cuộn băng ép và một lọ cầm máu; phần còn lại có thể thu hồi.'},
   ridge_safe_path:{truth:'Cầu thấp ngập nước, đường men sườn đá còn có thể qua được.'},
   hidden_return:{truth:'Túi thuốc đã được mang về và giấu trong thùng than sau bếp; dây buộc thuộc đội áp tải.'}
  },
  npcs:{
   keeper:{npcId:'keeper',name:'Hà chưởng quầy',role:'Chủ quán',homePlaceId:'hall',
    intro:'“Chuyện gửi hàng không thể chỉ nghe qua lời đồn, khách quan ạ.”',
    motive:'Tìm lại thuốc và giữ sự an toàn của người trọ.',
    knows:['last_guard_key','sealed_box','stock_for_convoy'],
    beliefs:['Nghi có người tự ý mở kho, chưa thể buộc tội.'],
    lines:[
     {requiresEvidence:['key_log'],factId:'last_guard_key',text:'“Sổ ghi Lục Tam mượn chìa lúc canh hai, nhưng tôi không biết vì sao.”'},
     {requiresEvidence:['care_receipt'],text:'“Nếu có người bị thương, ta cứu trước rồi lập biên bản bàn giao.”'}
    ]},
   guard:{npcId:'guard',name:'Lục Tam',role:'Lính áp tải',homePlaceId:'hall',
    intro:'“Tôi chỉ là lính áp tải. Chuyện tối qua... có vài điều khó nói.”',
    motive:'Giữ bí mật việc vi phạm quy trình để cứu người.',
    knows:['borrowed_medicine','last_guard_key','stock_used_at_post'],
    beliefs:['Cứu người là đúng, nhưng tự lấy thuốc là sai.'],
    lines:[
     {requiresEvidence:['guard_statement'],text:'“Tôi có rời trạm gác. Chuyện ấy tôi sẽ chịu trách nhiệm.”'},
     {requiresEvidence:['broken_seal','guard_statement'],requiresFlags:['guard_confronted'],factId:'borrowed_medicine',text:'“Đúng, tôi đã mở hòm. Tôi lấy thuốc cứu người bị thương ở trạm gác.”'},
     {requiresEvidence:['care_receipt'],text:'“Tôi đã ghi rõ nơi dùng thuốc. Tôi sẽ nhận trách nhiệm trước chưởng quầy.”'}
    ]},
   porter:{npcId:'porter',name:'Đinh Nhị',role:'Người khuân hàng kiêm dẫn đường',homePlaceId:'hall',
    intro:'“Đường thấp ngập rồi. Muốn qua đèo phải biết lối sườn đá.”',
    motive:'Đưa thuốc trở về an toàn trước khi đoàn xe lên đường.',
    knows:['ridge_safe_path'],beliefs:['Cầu thấp đã ngập; đường sườn đá vẫn còn lối đi.'],
    lines:[{factId:'ridge_safe_path',text:'“Cầu thấp ngập rồi, tôi dẫn người theo sườn đá.”'}]},
   maid:{npcId:'maid',name:'A Liên',role:'Người hầu quán',homePlaceId:'hall',
    intro:'“Khách quan cho em một chút thời gian. Em không muốn bị kết tội chỉ vì một lời đồn.”',
    motive:'Minh oan và bảo vệ người trọ.',
    knows:['maid_witness','sealed_box'],
    beliefs:['Một bóng áo lính đi qua hành lang, không xác định được ai.'],
    lines:[
     {requiresFlags:['helped_maid'],text:'“Em nhớ khách quan đã giúp em ngoài hiên. Cảm ơn vì lại đến hỏi em.”'},
     {requiresEvidence:['maid_statement'],factId:'maid_witness',text:'“Tôi thấy bóng áo lính dưới đèn. Không thể vì vậy nói chắc ai đã lấy thuốc.”'},
     {requiresEvidence:['broken_seal'],text:'“Vết sáp còn mới. Nhưng em chỉ nhìn thấy bóng người, không thấy ai tự tay mở hòm.”'}
    ]}
  },
  clues:{
   key_log:{id:'key_log',label:'Sổ mượn chìa kho',placeId:'hall',sourceNpcId:'keeper'},
   guard_statement:{id:'guard_statement',label:'Lời khai về tiếng kêu cứu',placeId:'hall',sourceNpcId:'guard'},
   maid_statement:{id:'maid_statement',label:'Lời chứng hành lang',placeId:'hall',sourceNpcId:'maid'},
   broken_seal:{id:'broken_seal',label:'Mẩu niêm phong vỡ',placeId:'store',sourceNpcId:'maid'},
   care_receipt:{id:'care_receipt',label:'Phiếu cấp cứu giấu trong túi',placeId:'hall',sourceNpcId:'guard'},
   wax_cuff:{id:'wax_cuff',label:'Sáp đỏ trên tay áo A Liên',placeId:'hall',sourceNpcId:'maid'},
   changed_ledger:{id:'changed_ledger',label:'Nét mực sửa trong sổ chủ quán',placeId:'hall',sourceNpcId:'keeper'},
   coal_trace:{id:'coal_trace',label:'Vệt than dẫn tới khu bếp',placeId:'store',sourceNpcId:'keeper'},
   medicine_bundle:{id:'medicine_bundle',label:'Túi thuốc tìm thấy trong thùng than',placeId:'hall',sourceNpcId:'keeper'},
   military_knot:{id:'military_knot',label:'Dây buộc túi kiểu quân nhu',placeId:'hall',sourceNpcId:'guard'},
   guard_cord:{id:'guard_cord',label:'Nút dây lam trên tay áo Lục Tam',placeId:'hall',sourceNpcId:'guard'}
  }
 };
 function freezeDeep(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freezeDeep);Object.freeze(v);}return v;}
 return freezeDeep(world);
});
