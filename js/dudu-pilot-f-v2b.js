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
    text:'Tiếng mưa ngoài cửa át đi vài câu tranh cãi, nhưng không át được cái tên A Liên vừa bị một người khách buột miệng nhắc đến. “Cô ấy thường ra vào kho.” A Liên đứng sững, hai bàn tay còn đỏ vì nước nóng. Hà chưởng quầy bảo hòm thuốc là của đội áp tải, gửi tạm trong kho chờ qua đèo. Mất thuốc, cả đội sẽ bị truy trách nhiệm; trên đường núi lại không dễ tìm được thuốc thay.\n\nLục Tam đứng dậy, định nói gì rồi im bặt. Chưởng quầy ngăn khách lục soát đồ đạc, đề nghị trước hết phải kiểm tra sổ chìa kho. Ông nói chắc nịch: nếu nghi oan người trong quán, chẳng ai muốn quay lại đây nữa.\n\nBạn vốn chỉ là khách qua đường. Không ai trao nhiệm vụ cho bạn. Nhưng bạn đã thấy A Liên giúp một người lạ lúc trời mưa, và hiểu rằng một lời buộc tội có thể theo cô rất lâu. Bạn có thể nghe từng phía, xem kho nếu được cho phép, hoặc vội vàng đưa ra một nhận định mà chính mình chưa chắc chắn.',
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
    text:'Hà chưởng quầy kéo ghế mời bạn ngồi. Khi tìm quyển sổ dưới chân con mèo, ông vô thức kể rằng quán đã qua ba đời mưa lũ, chưa từng treo biển buộc tội ai trước cửa. Mọi chuyến hàng gửi kho đều được ghi tên người nhận chìa, giờ nhận và giờ trả. Đó là cách một quán trọ nhỏ giữ lòng tin.\n\nÔng dừng ngón tay trên trang trực đêm, che một dòng mực còn mới. “Tên trong sổ không có nghĩa người ấy lấy thuốc. Nếu muốn xem kho, ta sẽ mở trước mặt mọi người, đừng để ai bảo có người lén sửa hiện trường.”\n\nÔng kiên nhẫn chờ bạn quyết định. Ghi lại thông tin là một việc; kết tội theo thông tin ấy lại là chuyện hoàn toàn khác.',
    choices:[
     {id:'copy_key_log_v2b',label:'Ghi sổ mượn chìa và xin vào kho',to:'hall',gainEvidence:['key_log'],addFlags:['store_access'],once:true,relations:{keeper:1}},
     {id:'back_from_keeper_v2b',label:'Trở lại đại sảnh',to:'hall'}]},
   guard:{placeId:'hall',phase:'LỜI KHAI',title:'Lục Tam chưa nói hết',npcId:'guard',
    text:'Lục Tam đứng cạnh cửa, giọt mưa từ áo choàng nhỏ thành vệt dài trên nền gạch. Tay áo phải của anh có một vết bùn khô, khác với bùn ngoài sân. Anh kể đêm qua nghe tiếng người kêu cứu phía trạm gác nên đã rời vị trí trong chốc lát. Khi bạn hỏi thêm, anh siết chặt quai mũ đến trắng cả tay.\n\n“Rời trạm gác là lỗi của tôi,” anh nói rồi nhìn sang gian bếp, “nhưng đừng vì vậy mà làm hại người không liên quan.” Câu nói như muốn bảo vệ A Liên, lại cũng giống một cách giấu đi điều gì đó. Bạn không thể phân biệt ngay.\n\nBạn có thể ghi lời kể đúng từng ý. Nếu muốn đối chất, một vẻ mặt đáng ngờ sẽ không đủ; cần một vật chứng và điều gì đó chính người lính đã xác nhận.',
    choices:[
     {id:'write_guard_testimony_v2b',label:'Ghi lời khai ban đầu',to:'hall',gainEvidence:['guard_statement'],once:true,relations:{guard:1}},
     {id:'confront_seal_v2b',label:'Đưa niêm phong ra đối chất',to:'guard_confession',requires:['broken_seal','guard_statement'],addFlags:['guard_confronted'],requirementHint:'Cần lời khai và dấu niêm phong.'},
     {id:'back_from_guard_v2b',label:'Tạm dừng hỏi',to:'hall'}]},
   maid:{placeId:'hall',phase:'NHÂN CHỨNG',title:'Bóng người dưới ánh đèn',npcId:'maid',
    text:'A Liên đang vắt khăn trước bếp. Khi bạn đến hỏi, cô né ánh mắt những người trọ vẫn đang dõi theo mình. Cô kể lúc canh hai có ra sân đổ nước, nhìn thấy một bóng áo lính đi qua hành lang phía kho. Trời mưa, đèn chỉ đủ soi đoạn chân tường; cô không thấy rõ khuôn mặt.\n\n“Em không muốn ai mang tiếng oan như em bây giờ,” cô nói. Cô không hề khẳng định người lính ấy lấy thuốc. Những người nghe chuyện mới là người tự điền vào khoảng trống.\n\nĐến tận lúc này, A Liên vẫn phải trở vào bếp. Nồi nước gừng trên lửa không vì một lời vu oan mà tự sôi lên. Bạn có thể ghi nhận lời cô đúng mức, hoặc để cô yên. Một nhân chứng đáng thương cũng không tự nhiên trở thành nhân chứng không thể sai.',
    choices:[
     {id:'write_maid_testimony_v2b',label:'Ghi đúng điều A Liên nhìn thấy',to:'hall',gainEvidence:['maid_statement'],once:true,relations:{maid:1}},
     {id:'back_from_maid_v2b',label:'Quay về đại sảnh',to:'hall'}]},
   store:{placeId:'store',phase:'HIỆN TRƯỜNG',title:'Gian kho phía sau quán',
    text:'Cánh cửa kho mở ra bằng tiếng kẹt khô. Hà chưởng quầy đứng ở ngưỡng cửa làm chứng. Kho nhỏ, thơm mùi thảo dược phơi lâu ngày; hơi nước từ ngoài sân len vào giữa những kẽ ván. Trên giá là những bình gốm xếp ngay ngắn, dưới sàn có một sợi dây buộc thùng bị đứt.\n\nChiếc hòm gỗ đựng túi thuốc nằm giữa phòng. Vệt sáp đỏ bên khóa không còn nguyên như những dấu niêm phong khác. Có người đã mở hòm. Dấu vết chưa thể cho bạn biết người đó là ai, càng chưa thể giải thích lý do.\n\nBạn có thể xem xét kỹ vết sáp trước khi mang chuyện này ra hỏi Lục Tam. Nếu rời kho ngay, hòm thuốc sẽ vẫn nằm ở đó, cùng phần sự thật chưa được kể.',
    choices:[
     {id:'check_seal_v2b',label:'Xem kỹ mép hòm',to:'store_detail'},
     {id:'return_from_store_v2b',label:'Trở lại đại sảnh',to:'hall'}]},
   store_detail:{placeId:'store',phase:'VẬT CHỨNG',title:'Mẩu sáp còn mới',
    text:'Bạn cúi xuống, nhìn thấy nửa mảnh sáp còn bám trong khe gỗ, nửa còn lại rơi xuống sàn, ướt nhưng chưa bị giẫm nát. Vết tách cho thấy chiếc hòm đã được mở từ phía ngoài, không phải tự bung vì độ ẩm. Bạn gọi chưởng quầy đến xem và đề nghị giữ nguyên các mảnh trước khi ghi vào sổ.\n\nÔng nhìn thật lâu rồi gật đầu. “Có dấu vết thì ghi dấu vết. Tên người mở hòm phải hỏi chính người ấy.” Câu nói khiến bạn nhớ đến bóng áo lính A Liên kể và quãng thời gian Lục Tam thú nhận đã rời trạm.\n\nHai chuyện có thể dính líu, hoặc chỉ vô tình xảy ra cùng đêm. Bạn chưa phải quyết định ngay; việc trước mắt là ghi nhận thứ mình thật sự nhìn thấy.',
    choices:[
     {id:'collect_seal_v2b',label:'Ghi dấu niêm phong vào sổ chứng cứ',to:'store',gainEvidence:['broken_seal'],once:true},
     {id:'step_back_store_v2b',label:'Quan sát thêm',to:'store'}]},
   guard_confession:{placeId:'hall',phase:'ĐỐI CHẤT',title:'Một lời thú nhận',npcId:'guard',
    text:'Bạn đem sổ chìa và dấu niêm phong đến đối chiếu với lời Lục Tam đã nói. Anh im lặng rất lâu. Tiếng củi trong bếp nổ lách tách; ở góc phòng A Liên không dám tiến tới. Cuối cùng, Lục Tam thừa nhận đã mượn chìa, mở hòm lấy túi thuốc, rồi mang đến trạm gác: một người đồng đội bị đá lở đè trúng, mất máu nhiều, mà ở đó không còn thuốc cầm máu.\n\n“Tự lấy thuốc là trái quy trình,” anh nói khàn giọng. “Tôi sợ bị phạt nên định sáng mai lén trả. Không ngờ họ lại nghi A Liên.” Anh rút trong áo một tờ giấy nhàu. Người chăm sóc thương binh ở trạm đã ghi vội số thuốc nhận và thời điểm cấp cứu. Đây là căn cứ cần được đối chiếu với sổ kho chứ không phải một lá bùa xóa sạch lỗi lầm.\n\nTrước bạn bây giờ không còn câu hỏi đơn giản ai tốt, ai xấu. Một hành động cứu người đã kéo theo sự che giấu, và sự che giấu ấy suýt làm một người vô can mất danh dự. Những người trong quán vẫn phải sống với hậu quả của đêm nay.',
    choices:[
     {id:'record_care_receipt_v2b',label:'Đối chiếu biên nhận và ghi lời thú nhận',to:'hall',
      gainEvidence:['care_receipt'],addFlags:['guard_confessed'],once:true,relations:{guard:1,maid:1}},
     {id:'pause_confrontation_v2b',label:'Tạm dừng đối chất',to:'hall'}]}
  },
  endings:{
   withdraw:{status:'failure',title:'Bão qua nhưng chuyện còn đó',text:'Bạn kéo áo choàng lên vai và rời quán khi những tiếng cãi vã còn vọng ra từ cửa. Đi chưa hết khúc quanh, bạn quay lại. Đèn lồng đỏ vẫn rung trong mưa, nhỏ dần giữa bóng đêm. Những người ở lại sẽ phải tự tìm cách giải quyết chuyện của họ.\n\nSáng hôm sau, khi đến trạm dịch, bạn nghe một người đi đường nói rằng quán Quan Đạo đã trải qua một đêm đầy lời buộc tội. Bạn không biết ai nói đúng. Con đường của bạn vẫn tiếp tục, nhưng có những chuyện bỏ lại sau lưng không có nghĩa chúng không xảy ra.\n\nKhông ai buộc một khách qua đường phải trở thành người phân xử. Lựa chọn ra đi giúp bạn tránh rắc rối, đồng thời để lại một câu chuyện chưa khép lại.'},
   wrong:{status:'failure',title:'Buộc tội thiếu chứng cứ',text:'A Liên đứng chết lặng khi bạn nói ra lời buộc tội trước mọi người. Chưởng quầy đưa cô ra sau bếp, nhưng lời xì xào đã lan khắp bàn ăn. Lục Tam cúi đầu, không nói gì. Trong một đêm mưa, sự im lặng của người biết chuyện trở nên đáng sợ hơn cả lời nói.\n\nSáng hôm sau, túi thuốc vẫn chưa được tìm thấy trong đồ của A Liên. Chưởng quầy buộc phải nhận rằng chưa có chứng cứ nào chống lại cô, nhưng vài người khách đã rời quán cùng câu chuyện họ muốn tin. Lời xin lỗi tới muộn không thể lập tức xóa được những ánh nhìn nghi ngờ.\n\nBạn đã có một kết thúc cho đêm mưa, nhưng đó không phải kết thúc của sự thật.'},
   accountability:{status:'success',title:'Trách nhiệm và lòng trắc ẩn',text:'Khi biên nhận được đưa ra, cả gian phòng im đi. Hà chưởng quầy kiểm tra số thuốc trên tờ giấy, so với quyển sổ kho, rồi ghi rõ giờ mượn, giờ sử dụng và số thuốc còn phải hoàn lại. Lục Tam tự đứng trước mọi người nhận lỗi vì đã lấy thuốc mà không xin phép và che giấu sự việc. Ông chưởng quầy không xí xóa cho anh; việc cứu người cũng không thể trở thành lý do để mặc một người khác bị nghi oan.\n\nA Liên được minh oan công khai. Cô trở về bếp, lần này không cần cúi đầu tránh ánh mắt khách. Đến sáng, tin từ trạm gác báo người bị thương đã qua cơn nguy kịch. Lục Tam vẫn phải chịu trách nhiệm với cấp trên và chuyện bồi hoàn, nhưng anh không còn đẩy hậu quả cho người khác.\n\nTrên đường rời Quan Đạo, bạn hiểu một việc tốt và một việc sai có thể xuất phát từ cùng một người. Công bằng không có nghĩa phải phủ nhận một trong hai.'},
   reconcile:{status:'success',title:'Một đêm mưa không ai chịu oan',text:'Bạn xin Hà chưởng quầy cho mọi người ngồi lại khi trời gần sáng. Thay vì bắt ai nhận tội trước, bạn đọc lần lượt nội dung sổ chìa, lời Lục Tam đã khai, điều A Liên thật sự nhìn thấy, rồi đặt biên nhận cấp cứu bên cạnh dấu niêm phong. Những mảnh chuyện tưởng đối nghịch cuối cùng tìm được vị trí của chúng.\n\nLục Tam cúi đầu xin lỗi A Liên, thừa nhận đã tự lấy thuốc để cứu một người đang nguy kịch và sợ bị kỷ luật nên giấu. A Liên nói cô không cần anh phải trở thành người xấu trong mắt mọi người, chỉ cần không có ai biến nỗi sợ của anh thành cái tội của cô. Hà chưởng quầy đồng ý ghi sổ bồi hoàn minh bạch, đồng thời gửi lời hỏi thăm người bị thương.\n\nNgoài hiên, mưa tạnh. Khi bạn bước ra con đường còn ướt, A Liên mang đến chén trà gừng cuối cùng. Không phải mọi vết nứt đều biến mất trong một đêm, nhưng những người ở lại ít nhất đã bắt đầu nói thật với nhau.'}
  }
 };
 function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 return freeze(story);
});