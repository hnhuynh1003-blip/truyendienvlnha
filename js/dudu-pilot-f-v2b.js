/* Quan Đạo V2B: standalone branching F pilot, no real rewards. */
(function(root,factory){
 'use strict';
 const world=(typeof module==='object'&&module.exports)?require('./dudu-pilot-world-v2b.js'):root.DuduQuanDaoWorldV2B;
 const result=factory(world);
 if(typeof module==='object'&&module.exports)module.exports=result;
 if(root)root.DuduPilotFStoryV2B=result;
})(typeof window!=='undefined'?window:null,function(world){
 'use strict';
 if(!world)throw Error('World Bible V2B missing');
 const story={
  schemaVersion:1,status:'pilot_only',released:false,rewardsEnabled:false,
  scenarioId:'pilot-quan-dao-narrative-v3',scenarioVersion:3,
  missionId:'dudu-m-an-f01',worldId:world.worldId,genreId:world.genreId,
  title:'Đêm mưa ở Quan Đạo',tier:'F',world,worldCover:world.places.gate.background,
  startSceneId:'prologue',
  places:Object.fromEntries(Object.entries(world.places).map(([id,p])=>[id,{label:p.publicName,background:p.background,photo:p.photo}])),
  scenes:{
   prologue:{placeId:'gate',phase:'DẪN TRUYỆN',title:'Con đường trước cơn mưa',
    text:'Quan Đạo vốn chỉ là một cái tên trên bản đồ thương lộ. Bạn đi qua nơi này trên đường về Phủ Nam, mong kịp chuyến đò sáng. Buổi chiều, gió từ sườn núi đã lạnh khác thường; tới khi mặt trời lịm sau rặng thông, những hạt mưa đầu tiên rơi xuống đường đất.\n\nĐường qua đèo biến thành dải bùn lầy. Người đánh xe đi trước làm rơi một bó rơm, con ngựa giật mình hí vang. Qua màn mưa, bạn nhìn thấy đốm đèn lồng đỏ chao nghiêng dưới mái ngói thấp. Một tấm biển gỗ cũ ghi hai chữ Quan Đạo.\n\nBạn chẳng tìm kiếm bí mật hay muốn làm anh hùng. Lúc này, một chén trà nóng và mái hiên không dột đã là điều đáng mong đợi.',
    choices:[{id:'approach_inn_v3',label:'Đi về phía quán trọ để xin trú mưa',to:'arrival'}]},
   arrival:{placeId:'gate',phase:'MỞ ĐẦU',title:'Người dưới mái hiên',
    text:'Một cô gái đang vật lộn với tấm phên tre bị gió cuốn. Thấy bạn đến, cô vội nép vào cột rồi nở nụ cười ái ngại. “Khách quan vào trong đi. Mưa thế này qua đèo nguy hiểm lắm.” Cô tên A Liên, làm việc ở quán đã ba năm. Lời mời chỉ là thói quen tử tế với một khách lạ.\n\nĐôi tay cô lấm bùn, một thùng nước đang nghiêng sát bậc cửa. Trong đại sảnh vọng ra tiếng bát đũa, ai đó đang cằn nhằn về giá củi. Hương gừng nóng trôi theo gió. Cô giữ cánh cửa, nhường bạn vào trước.\n\nGiúp cô buộc lại tấm phên, bạn sẽ muộn bữa ăn một chút. Bước thẳng vào, A Liên cũng không trách. Đêm mưa này chưa bắt ai phải giải quyết điều gì.',
    choices:[
     {id:'help_maid_v3',label:'Giúp A Liên buộc phên tre rồi vào quán',to:'resting',addFlags:['helped_maid'],relations:{maid:1},
      reaction:'A Liên khẽ cảm ơn và đưa bạn chiếc khăn khô còn trên giá. Cô quay lại nhóm bếp trước khi mưa tạt vào cửa.'},
     {id:'enter_inn_v2b',label:'Cảm ơn cô rồi vào tìm chỗ ngồi khô ráo',to:'resting',
      reaction:'A Liên mở cửa cho bạn, sau đó quay ra giữ tấm phên dưới mưa.'}
    ]},
   resting:{placeId:'hall',phase:'YÊN BÌNH TRƯỚC BIẾN CỐ',title:'Bữa tối ở quán trọ',
    text:'Quán không đông. Hà chưởng quầy vừa tính sổ vừa mắng yêu con mèo nằm lên quyển sổ. Ông rót cho bạn chén trà nóng, bảo rằng đèo đã sạt một đoạn, sớm mai mới biết có thể đi tiếp hay không. Câu chuyện quanh bàn chỉ xoay quanh giá gạo, đường sá và nỗi nhớ nhà.\n\nMột người lính trẻ mặc áo choàng xanh sẫm ngồi cách bạn hai bàn. A Liên gọi anh là Lục Tam, người của đội áp tải dừng chân vì mưa. Anh ăn rất ít, nhiều lần nhìn về cửa sau. Có tiếng chó sủa ngoài sân, anh đứng bật dậy rồi lại ngồi xuống.\n\nKhi bữa tối gần kết thúc, từ phía kho vọng ra tiếng thùng gỗ đổ. Chưởng quầy chạy ra xem, rồi quay lại với sắc mặt tái đi: chiếc hòm thuốc đội áp tải gửi nhờ trong kho đã bị mở, còn túi thuốc thì không thấy. Một người khách lập tức nhắc tên A Liên. Những lời xì xào nổi lên trước khi có ai kịp tìm hiểu.',
    choices:[
     {id:'listen_at_hall_v3',label:'Ở lại nghe xem rốt cuộc chuyện gì xảy ra',to:'hall'},
     {id:'leave_inn_v2b',label:'Không muốn dính vào chuyện người lạ, rời quán',ending:'withdraw'}
    ]},
   hall:{placeId:'gate',phase:'MỞ ĐẦU',title:'Đêm mưa và túi thuốc mất tích',
    text:'Bạn dừng chân trước quán trọ Quan Đạo. Bên trong có người bị nghi lấy túi thuốc của đoàn áp tải. Một người bị thương ngoài trạm canh đang chờ cứu chữa, nhưng chưa ai biết hai việc có liên quan hay không.',
    choices:[
     {id:'enter_inn_v2b',label:'Bước vào quán để tìm hiểu',to:'hall',relations:{keeper:1}},
     {id:'leave_inn_v2b',label:'Tiếp tục lên đường giữa mưa',ending:'withdraw'}]},
   hall:{placeId:'hall',phase:'LỜI KHAI',title:'Những mảnh chuyện chưa khớp',
    text:'Chưởng quầy giữ sổ chìa kho. Lục Tam đứng cạnh cửa. A Liên bị người khác nhìn nghi ngờ. Bạn phải đối chiếu lời kể và vật chứng trước khi kết tội.',
    choices:[
     {id:'keeper_visit_v2b',label:'Hỏi chưởng quầy và xem sổ trực',to:'keeper'},
     {id:'guard_visit_v2b',label:'Trao đổi với Lục Tam',to:'guard'},
     {id:'maid_visit_v2b',label:'Lắng nghe A Liên',to:'maid'},
     {id:'store_visit_v2b',label:'Đến kho kiểm tra niêm phong',to:'store',requiresFlags:['store_access'],requirementHint:'Cần xin phép mở kho từ chưởng quầy.'},
     {id:'accuse_without_proof_v2b',label:'Buộc tội A Liên ngay',ending:'wrong'},
     {id:'report_guard_v2b',label:'Yêu cầu Lục Tam chịu trách nhiệm với bằng chứng',ending:'accountability',
      requires:['key_log','broken_seal','care_receipt'],requiresFlags:['guard_confessed'],
      requirementHint:'Cần sổ chìa, niêm phong, biên nhận và lời thú nhận.'},
     {id:'seek_mediation_v2b',label:'Đối thoại với ba nhân chứng và ghi biên bản',ending:'reconcile',
      requires:['key_log','guard_statement','maid_statement','care_receipt'],requiresFlags:['guard_confessed'],
      requirementHint:'Cần ba lời khai và biên nhận đã kiểm chứng.'}
    ]},
   keeper:{placeId:'hall',phase:'SỔ TRỰC',title:'Chìa kho đổi chủ lúc canh hai',npcId:'keeper',
    text:'Hà chưởng quầy biết người mượn chìa, nhưng không rõ người ấy có lấy thuốc không. Muốn vào kho, bạn cần ông cho phép.',
    choices:[
     {id:'copy_key_log_v2b',label:'Ghi sổ mượn chìa và xin vào kho',to:'hall',gainEvidence:['key_log'],addFlags:['store_access'],once:true,relations:{keeper:1}},
     {id:'back_from_keeper_v2b',label:'Trở lại đại sảnh',to:'hall'}]},
   guard:{placeId:'hall',phase:'LỜI KHAI',title:'Lục Tam chưa nói hết',npcId:'guard',
    text:'Lục Tam thừa nhận rời trạm gác khi nghe tiếng kêu cứu. Chỉ riêng điều này chưa đủ chứng minh anh lấy thuốc.',
    choices:[
     {id:'write_guard_testimony_v2b',label:'Ghi lời khai ban đầu',to:'hall',gainEvidence:['guard_statement'],once:true,relations:{guard:1}},
     {id:'confront_seal_v2b',label:'Đưa niêm phong ra đối chất',to:'guard_confession',requires:['broken_seal','guard_statement'],addFlags:['guard_confronted'],requirementHint:'Cần lời khai và dấu niêm phong.'},
     {id:'back_from_guard_v2b',label:'Tạm dừng hỏi',to:'hall'}]},
   maid:{placeId:'hall',phase:'NHÂN CHỨNG',title:'Bóng người dưới ánh đèn',npcId:'maid',
    text:'A Liên thấy bóng áo lính đi qua hành lang, nhưng không nhìn rõ người vào kho. Cô lo suy đoán sẽ làm người khác bị oan.',
    choices:[
     {id:'write_maid_testimony_v2b',label:'Ghi đúng điều A Liên nhìn thấy',to:'hall',gainEvidence:['maid_statement'],once:true,relations:{maid:1}},
     {id:'back_from_maid_v2b',label:'Quay về đại sảnh',to:'hall'}]},
   store:{placeId:'store',phase:'HIỆN TRƯỜNG',title:'Gian kho phía sau quán',
    text:'Bạn đi theo lối nhỏ từ đại sảnh. Trên hòm thuốc, lớp sáp đỏ đã vỡ. Phải ghi nhận dấu vết trước khi kết luận.',
    choices:[
     {id:'check_seal_v2b',label:'Xem kỹ mép hòm',to:'store_detail'},
     {id:'return_from_store_v2b',label:'Trở lại đại sảnh',to:'hall'}]},
   store_detail:{placeId:'store',phase:'VẬT CHỨNG',title:'Mẩu sáp còn mới',
    text:'Niêm phong bị mở, nhưng mẩu sáp không tự chỉ ra thủ phạm. Nó có thể dùng để đối chiếu một lời khai khác.',
    choices:[
     {id:'collect_seal_v2b',label:'Ghi dấu niêm phong vào sổ chứng cứ',to:'store',gainEvidence:['broken_seal'],once:true},
     {id:'step_back_store_v2b',label:'Quan sát thêm',to:'store'}]},
   guard_confession:{placeId:'hall',phase:'ĐỐI CHẤT',title:'Một lời thú nhận',npcId:'guard',
    text:'Khi nhìn dấu sáp, Lục Tam nhận đã lấy thuốc cứu một người bị thương ở trạm canh. Anh sợ bị kỷ luật nên không lập giấy. Cần ghi nhận và kiểm tra biên nhận.',
    choices:[
     {id:'record_care_receipt_v2b',label:'Đối chiếu biên nhận và ghi lời thú nhận',to:'hall',
      gainEvidence:['care_receipt'],addFlags:['guard_confessed'],once:true,relations:{guard:1,maid:1}},
     {id:'pause_confrontation_v2b',label:'Tạm dừng đối chất',to:'hall'}]}
  },
  endings:{
   withdraw:{status:'failure',title:'Bão qua nhưng chuyện còn đó',text:'Bạn rời đi an toàn. Túi thuốc chưa được giải quyết và A Liên vẫn mang tiếng oan.'},
   wrong:{status:'failure',title:'Buộc tội thiếu chứng cứ',text:'A Liên chịu oan, còn người lấy thuốc thực sự im lặng. Một lựa chọn vội vã gây thêm tổn thương.'},
   accountability:{status:'success',title:'Trách nhiệm và lòng trắc ẩn',text:'Bạn trình sổ chìa, niêm phong và biên nhận. Lục Tam nhận trách nhiệm tự lấy thuốc, người bệnh được chữa trị và sổ bàn giao được lập.'},
   reconcile:{status:'success',title:'Một đêm mưa không ai chịu oan',text:'Ba lời khai được đối chiếu. Lục Tam nhận lỗi và ký biên bản, người bệnh được cứu, A Liên được minh oan.'}
  }
 };
 function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 return freeze(story);
});