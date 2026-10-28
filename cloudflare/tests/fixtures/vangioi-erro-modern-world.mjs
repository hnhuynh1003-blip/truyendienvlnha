// G5C-P7: Original, author-editable roleplay adaptation of a PUBLIC Library
// reading. The novel's chapters are not copied into this fixture. The
// verified library-source permit/attestation has NOT been issued.
import {hashAuthoringJson} from '../../src/vangioi-authoring.mjs';
import {G4A_ENGINE_VERSION} from '../../src/vangioi-engine-g4a.mjs';

const src='https://hnhuynh1003-blip.github.io/truyendienvlnha/index.html#/library';
export const ERRO_SOURCE={title:'Hệ Thống ERR...O',author:'Kẻ Lang Bạt',url:src,
 chapters:[3,4,5,6,7,8,9,10,11,12],status:'public-reader-reference-only',
 verifiedLibrarySource:false,sourcePermitVerified:false};
export const ERRO_CHAPTER_NOTES=[
 {chapterId:'chapter-6',title:'Chương 6 — Gió qua rặng bạch đàn',text:'GHI CHÚ CHUYỂN THỂ, KHÔNG PHẢI NGUYÊN VĂN. Sau khi rời vòng tranh chấp Khương–Thẩm ở tuổi mười hai, Khương Tử Du đến thị trấn mỏ miền Trung, nhập học lớp 7B tại trường Trung học số 3. Lục Thiển giúp hoàn tất giấy tờ, còn Hạ Tinh Dao đem tới một tình bạn rất đỗi bình dị. Mùi khoai lang và gió rặng bạch đàn đối lập với ký ức lạnh lẽo về những gia đình hào môn. Những lựa chọn trong bản chơi chỉ thăm dò cách cư xử ở các khoảng trống đời thường, không viết lại quyết định đã được tác giả xác lập.'},
 {chapterId:'chapter-7',title:'Chương 7 — Khói mây qua sông',text:'GHI CHÚ CHUYỂN THỂ, KHÔNG PHẢI NGUYÊN VĂN. Tử Du sống kín đáo tại phòng VIP của quán net và làm các dự án công nghệ, giao Lục Thiển xử lý công việc pháp lý cùng Quỹ Vạn Yên. Sự gần gũi giữa cô luật sư và người thiếu niên càng rõ, nhưng ranh giới do Tử Du đặt ra vẫn quyết liệt. Đêm diễn văn nghệ của Hạ Tinh Dao cho thấy một lựa chọn tình cảm khác. Bản thử chỉ mô phỏng cái nhìn của người nhập vai và các phản ứng cục bộ; hai chương nguồn tiếp tục giữ nguyên ở Thư viện.'}
];
const scene=(id,place,edges)=>({sceneId:'scene-'+id,placeId:'place-'+place,
 backgroundAssetId:'art-town-scene',summary:'Bản thử chuyển thể cảnh '+id,
 viewIds:['view-'+id],transitions:edges.map(([to,trigger])=>({toSceneId:'scene-'+to,trigger}))});
const page=(id,context,narration,dialogue,actions,endingId)=>({sceneId:'scene-'+id,context,narration,dialogue,
 ...(endingId?{endingId}:{}),choices:actions.map(([choiceId,ruleId,label])=>({choiceId,ruleId,label}))});
const edge=(id,from,index,to,condition='session-ended',set=[])=>({ruleId:id,
 fromSceneId:'scene-'+from,transitionIndex:index,
 condition:typeof condition==='string'?{op:'flag_unset',flag:condition}:condition,
 actions:[...set.map(flag=>({op:'set_flag',flag})),{op:'enter_scene',sceneId:'scene-'+to}]});
export const ERRO_STORYBOARD=[
 ['scene-gate','chapter-6','Cổng trường và thị trấn mỏ: điểm vào của Tử Du và người mới.'],
 ['scene-classroom','chapter-6','Lớp 7B: bạn học biết sự kiện ở trường, không biết hồ sơ thân thế.'],
 ['scene-meal','chapter-6','Nửa củ khoai lang và lời đề nghị kết bạn của Hạ Tinh Dao.'],
 ['scene-netroom','chapter-7','Phòng VIP số 01: chỗ ở, công việc mã nguồn và sự riêng tư.'],
 ['scene-contract','chapter-7','Lục Thiển xử lý hồ sơ Vạn Yên; không tự cấp tiền hay quyền.'],
 ['scene-rehearsal','chapter-6','Đêm diễn văn nghệ: ranh giới tình cảm là Canon, kết quả thử chỉ giả định.'],
 ['scene-quiet','chapter-7','Kết cục mô phỏng: bảo vệ khoảng lặng.'],
 ['scene-listen','chapter-7','Kết cục mô phỏng: nghe người khác thêm một lúc.'],
 ['scene-distance','chapter-7','Kết cục mô phỏng: chọn rút lui sớm.']
].map(([sceneId,chapterId,authorReason])=>({sceneId,chapterId,authorReason}));

export function erroModernWorld(notesHash,imageHash){
 const world={
  schemaVersion:'world-content-1',contentVersion:'0.1.0',
  title:'Hệ Thống ERR...O — Thị trấn mỏ / Thử chuyển thể',genreId:'modern',requestedWorldRank:'F',dangerLevel:'low',
  contentTags:['modern','identity','relationships','scripted-npc'],
  // Source is the NEW original adaptation notes, never a fake Library permit.
  storySource:{kind:'original',storyId:'dudu-offline-erro-adaptation-notes',storyVersion:'test-notes-1',contentHash:notesHash},
  story:{logline:'Sau khi rời các gia tộc, Tử Du tìm một khoảng lặng nơi thị trấn mỏ; người chơi chỉ có thể chạm vào những khoảnh khắc ở bên lề câu chuyện.',
   setting:'Thị trấn mỏ miền Trung; trường Trung học số 3, hàng bạch đàn, quán net thể thao điện tử và văn phòng luật sư.',
   playerRole:'Thử bốn thân phận: vai chính, người hỗ trợ, học sinh bản địa và người được cấp thân phận ảo.',
   opening:'Tháng đầu tại lớp 7B. Tiếng tàu chở quặng vọng qua rặng bạch đàn; một người mới vừa tới cổng trường.',
   secretTruth:'Bản thử không đưa truyện gốc hay các bí mật chưa công bố vào dữ liệu phát hành. Tất cả kết thúc chỉ giả định.',
   plotBeats:['Ký ức chuyển sinh và hai gia tộc — chương 3–5.','Bắt đầu tại thị trấn mỏ — chương 6.','Quán net, Vạn Yên và những ranh giới tình cảm — chương 7.'],
   worldRules:['Không thay đổi việc Tử Du đã rời Khương gia và Thẩm gia.',
    'Tử Du không phân biệt người khác bằng gương mặt; các dấu nhận biết ưu tiên giọng nói và mùi hương.',
    'Thân phận do hệ thống cấp không phải giấy tờ được kiểm chứng; không quyền tài chính, y tế, đăng ký học hay sửa Canon.',
    'Kết cục chỉ mô phỏng để thử cách viết, không đổi diễn biến ở chương 8–12.']},
  worldCoverAssetId:'art-town-cover',assets:[
   {assetId:'art-town-cover',assetVersion:'p7-test-1',kind:'worldCover',contentHash:imageHash,altText:'Thị trấn mỏ lúc hoàng hôn, trường học và rặng bạch đàn.'},
   {assetId:'art-town-scene',assetVersion:'p7-test-1',kind:'sceneBackground',contentHash:imageHash,altText:'Khung cảnh thị trấn mỏ hiện đại, không có phép thuật.'}],
  maps:[{mapId:'map-mine-town',name:'Thị trấn mỏ',placeIds:['place-school','place-street','place-net','place-office']}],
  places:[
   {placeId:'place-school',mapId:'map-mine-town',name:'Trường Trung học số 3',sceneIds:['scene-gate','scene-classroom','scene-meal','scene-rehearsal']},
   {placeId:'place-street',mapId:'map-mine-town',name:'Đường tàu và rặng bạch đàn',sceneIds:['scene-quiet','scene-listen','scene-distance']},
   {placeId:'place-net',mapId:'map-mine-town',name:'Quán net VIP số 01',sceneIds:['scene-netroom']},
   {placeId:'place-office',mapId:'map-mine-town',name:'Văn phòng hồ sơ Lục Thiển',sceneIds:['scene-contract']}],
  scenes:[
   scene('gate','school',[['classroom','enter-class'],['netroom','go-net'],['rehearsal','visit-public-show']]),
   scene('classroom','school',[['meal','share-lunch'],['rehearsal','follow-rehearsal']]),
   scene('meal','school',[['netroom','walk-net'],['rehearsal','join-rehearsal']]),
   scene('netroom','net',[['contract','ask-lawyer'],['gate','return-school']]),
   scene('contract','office',[['netroom','leave-office'],['rehearsal','attend-show']]),
   scene('rehearsal','school',[['quiet','protect-quiet'],['listen','stay-and-listen'],['distance','leave-early']]),
   scene('quiet','street',[]),scene('listen','street',[]),scene('distance','street',[])],
  cast:[
   {characterId:'character-tu-du',displayName:'Khương Tử Du',narrativeRole:'protagonist',presence:'onstage',playableAsCast:true,storyNotes:'Nhân vật chính chuyển sinh; khó nhận diện khuôn mặt; đã rời các gia tộc.'},
   {characterId:'character-luc-thien',displayName:'Lục Thiển',narrativeRole:'supporting',presence:'onstage',playableAsCast:true,storyNotes:'Luật sư đại diện công việc Vạn Yên, không được tự ra quyết định thay Tử Du.'},
   {characterId:'character-tinh-dao',displayName:'Hạ Tinh Dao',narrativeRole:'supporting',presence:'onstage',playableAsCast:false,storyNotes:'Bạn học có giọng hát đẹp và lòng tốt bình dị.'}],
  npcs:[{npcId:'npc-tinh-dao',characterId:'character-tinh-dao',name:'Hạ Tinh Dao',mode:'scripted',
   interactionLevels:['scripted'],dialoguePolicy:'choice_tree',friendable:false,introSceneId:'scene-meal',
   role:'Bạn học lớp 7B',knowledge:['Biết nhà mình khó khăn và có đêm diễn văn nghệ.','Không biết quá khứ hệ thống và hồ sơ tài chính của Tử Du.'],
   dialogueNodes:[{nodeId:'node-potato',text:'Tớ có nửa củ khoai nóng. Cậu ăn một chút nhé?'}]}],
  playerEntryProfiles:[
   {entryId:'entry-tu-du',label:'Khương Tử Du · vai chính',mode:'cast_possession',castTargetId:'character-tu-du',startSceneId:'scene-gate',
    initialKnownFacts:['Biết thân thế và việc rời hai gia tộc.','Không nhận diện được gương mặt.'],initialFlags:['identity-tu-du']},
   {entryId:'entry-luc-thien',label:'Lục Thiển · vai phụ',mode:'cast_possession',castTargetId:'character-luc-thien',startSceneId:'scene-contract',
    initialKnownFacts:['Biết hồ sơ pháp lý Vạn Yên và hoàn cảnh Tử Du.'],initialFlags:['lawyer-knowledge']},
   {entryId:'entry-classmate',label:'Bạn học lớp 7B · người bản địa',mode:'native_extra',nativeSlotId:'slot-class-7b',
    socialAnchorNotes:'Một học sinh cùng lớp, biết trường lớp nhưng không biết bí mật của nhân vật chính.',
    startSceneId:'scene-classroom',initialKnownFacts:['Biết Tinh Dao có tham gia diễn văn nghệ.'],initialFlags:['classmate-knowledge']},
   {entryId:'entry-cover',label:'Nhân viên tạm thời · thân phận ảo',mode:'system_cover',identityAssurance:'unknown',
    coverName:'Người phụ việc thư viện cộng đồng',startSceneId:'scene-gate',
    initialKnownFacts:['Chỉ biết tuyến đường công khai tới trường và quán net.'],initialFlags:['unverified-cover']}],
  entryPolicy:{mode:'player_choice'},entry:{entrySceneId:'scene-gate'},
  items:[],shops:[],missions:[{missionId:'mission-meet-town',name:'Một ngày ở thị trấn mỏ',kind:'main',requiredForCompletion:true,
   startSceneId:'scene-gate',summary:'Trải nghiệm giới hạn ở bên lề chương 6–7; không xác nhận thắng, thua hay cấp thưởng.',
   objectives:[{objectiveId:'objective-school',verb:'reach',targetId:'scene-classroom',requiredCount:1}],
   rewardRequest:{exp:0,items:[]},replayPolicy:'repeat_no_reward'}],
  events:[],endings:[
   {endingId:'ending-quiet',title:'Một khoảng lặng được giữ lại',result:'partial',requiredFlags:['chose-quiet']},
   {endingId:'ending-listen',title:'Một lời được nghe trọn',result:'partial',requiredFlags:['chose-listen']},
   {endingId:'ending-distance',title:'Lối về qua hàng bạch đàn',result:'partial',requiredFlags:['chose-distance']}],
  playRequirements:{requiredVisitPlaceIds:[],requiredInteractNpcIds:[]},
  aiPolicy:{aiNpcRequested:false,allowAiRewards:false,allowAiWorldMutation:false},
  views:[]
 };
 world.views=world.scenes.map(s=>({viewId:s.viewIds[0],sceneId:s.sceneId,kind:'text_only',hotspots:[]}));
 return world;
}
export async function erroModernManifest(world){
 const rules=[
  edge('enter-class','gate',0,'classroom',{op:'any',conditions:[{op:'flag_set',flag:'identity-tu-du'},{op:'flag_set',flag:'classmate-knowledge'}]}),
  edge('go-net','gate',1,'netroom'),edge('visit-public-show','gate',2,'rehearsal'),
  edge('share-lunch','classroom',0,'meal'),edge('follow-rehearsal','classroom',1,'rehearsal'),
  edge('walk-net','meal',0,'netroom'),edge('join-rehearsal','meal',1,'rehearsal'),
  edge('ask-lawyer','netroom',0,'contract',{op:'any',conditions:[{op:'flag_set',flag:'identity-tu-du'},{op:'flag_set',flag:'lawyer-knowledge'}]}),
  edge('return-school','netroom',1,'gate'),
  edge('leave-office','contract',0,'netroom'),edge('attend-show','contract',1,'rehearsal'),
  edge('protect-quiet','rehearsal',0,'quiet','session-ended',['chose-quiet']),
  edge('stay-and-listen','rehearsal',1,'listen','session-ended',['chose-listen']),
  edge('leave-early','rehearsal',2,'distance','session-ended',['chose-distance'])
 ];
 return {version:G4A_ENGINE_VERSION,contentVersion:world.contentVersion,contentHash:await hashAuthoringJson(world),rules};
}
export async function erroModernScript(world){
 const pages=[
  page('gate','Tử Du rời hai gia tộc từ chương 5; không ai ở thị trấn biết hồ sơ thân phận ấy. Đây là một ngày đầu đông trong chương 6.',
   'Đoàn tàu quặng băng qua triền đồi lúc chiều chạng vạng. Tấm biển trường Trung học số 3 hiện sau cổng sắt xám; tiếng phấn viết vang lên từ một lớp học đang mở cửa. Tử Du tìm nơi ít người để bắt đầu lại.',
   'Bác bảo vệ hỏi: “Em tìm lớp 7B à? Dãy nhà bên trái, lên một tầng là tới.”',[
    ['enter-class','enter-class','Vào lớp 7B, tìm chỗ ngồi yên tĩnh.'],
    ['go-net','go-net','Đi xem phòng VIP số 01 tại quán net.'],
    ['visit-public-show','visit-public-show','Đến khu khán giả buổi diễn mở cửa công khai.']]),
  page('classroom','Lớp 7B diễn ra bình thường: một người mới, một lớp đông, một cô bạn muốn làm quen. Chưa ai có lý do biết chuyện hai gia tộc.',
   'Từ cửa sổ lớp 7B có thể thấy những tán bạch đàn. Một cô bạn để nửa củ khoai nóng cạnh mép vở. Tiếng nói của cô rõ ràng, ấm hơn gió lùa qua hành lang.',
   'Hạ Tinh Dao hỏi khẽ: “Cậu có ăn trưa chưa? Tớ chia một nửa nhé.”',[
    ['share-lunch','share-lunch','Ngồi lại nghe Tinh Dao kể chuyện gia đình.'],
    ['follow-rehearsal','follow-rehearsal','Theo tiếng hát tới buổi tập văn nghệ.']]),
  page('meal','Câu chuyện bên bàn học bắt đầu từ nửa củ khoai. Tình bạn này không tự trao quyền hiểu hết cuộc đời Tử Du.',
   'Hơi ấm của củ khoai còn đọng lại trên đầu ngón tay. Tinh Dao kể về đợt tuyển sinh thanh nhạc sắp tới, nhưng ngập ngừng khi nhắc tới tiền thuốc của mẹ. Ngoài cửa sổ, những chuyến tàu hàng tiếp tục chạy.',
   'Tinh Dao cười: “Nếu được lên sân khấu lớn, tớ muốn mẹ cũng nghe thấy.”',[
    ['walk-net','walk-net','Ghi nhớ câu chuyện rồi đi về quán net.'],
    ['join-rehearsal','join-rehearsal','Đề nghị ngồi nghe buổi tập, không hứa điều ngoài khả năng.']]),
  page('netroom','Tử Du chọn phòng riêng quán net vì thích yên tĩnh; những dự án công nghệ không biến ai tới đây thành đồng sở hữu bí mật.',
   'VIP số 01 kín tiếng hơn con hẻm bên ngoài. Một màn hình có bản vá bảo mật chưa hoàn thành; bên cạnh là ly nước ấm và khối rubik cũ. Lục Thiển vừa nhắn rằng hồ sơ Vạn Yên cần được rà soát.',
   'Tin nhắn: “Chị có báo cáo pháp lý. Gặp khi em tiện nhé.”',[
    ['ask-lawyer','ask-lawyer','Đến bàn hồ sơ nói chuyện với Lục Thiển.'],
    ['return-school','return-school','Tạm dừng công việc, quay về phía trường.']]),
  page('contract','Lục Thiển quản lý công việc theo ủy quyền có thật. Một chữ ký ở bản thử không chuyển tài sản hoặc quyết định thay người trong Canon.',
   'Lục Thiển đặt một tập giấy mỏng trên bàn, chỉ rõ những khoản cần kiểm tra. Cô không thúc ép Tử Du, nhưng quan sát sắc mặt tái nhợt và cách em giấu cơn mệt sau câu nói “không sao”.',
   'Lục Thiển nói: “Công việc có thể đợi. Em đừng dùng sự im lặng thay câu trả lời.”',[
    ['leave-office','leave-office','Khép hồ sơ, trở lại phòng làm việc.'],
    ['attend-show','attend-show','Rời bàn giấy để tới buổi diễn của trường.']]),
  page('rehearsal','Đêm diễn của Hạ Tinh Dao là mốc trong chương 6. Mọi lựa chọn sau đây là mô phỏng cảm nhận và không thay đổi kết cục tác giả đã viết.',
   'Ánh đèn vàng phủ sân khấu. Bài hát của Tinh Dao chấm dứt giữa tràng vỗ tay, rồi cô vội đi về phía hàng bạch đàn. Bước chân dừng lại trước một người đang đứng trong bóng tối, cách xa đám đông.',
   'Một giọng nói nhỏ run lên: “Cậu có thể nghe tớ nói hết một lần không?”',[
    ['protect-quiet','protect-quiet','Nói rõ ranh giới, giữ sự tôn trọng.'],
    ['stay-and-listen','stay-and-listen','Ở lại nghe hết điều người ấy muốn nói.'],
    ['leave-early','leave-early','Tạm rời đi trước khi câu chuyện trở nên nặng nề.']]),
  page('quiet','Đây là kết cục giả định khi người chơi đặt ranh giới rõ ràng trong bản thử.',
   'Tiếng tàu chở quặng rúc lên lúc màn đêm khép lại. Một lời từ chối được nói thẳng mà không biến lòng tốt của người khác thành món nợ. Khoảng sân trở nên yên tĩnh, nhưng không ai bị xóa khỏi câu chuyện.',
   'SYSTEM: KẾT THÚC BẢN THỬ · CANON KHÔNG ĐỔI.',[],'ending-quiet'),
  page('listen','Đây là kết cục giả định về việc lắng nghe, không xác nhận quan hệ hay sửa chương nguồn.',
   'Một người chọn ở lại thêm ít phút. Những lời vừa nói không thể lập tức giải quyết tất cả; ít nhất người đối diện biết rằng mình được nghe trọn vẹn. Gió qua bạch đàn làm rung những chiếc lá tối màu.',
   'SYSTEM: KẾT THÚC BẢN THỬ · KHÔNG XÁC NHẬN NHIỆM VỤ.',[],'ending-listen'),
  page('distance','Đây là kết cục giả định khi cuộc gặp bị bỏ dở, không phải sự kiện Canon mới.',
   'Người rời sân khấu trước nghe tiếng đàn vọng xa phía sau. Cuộc trò chuyện dừng lại như một trang sổ chưa viết. Ngày hôm sau trong thị trấn vẫn bắt đầu bằng tiếng chuông trường và chuyến tàu quặng.',
   'SYSTEM: KẾT THÚC BẢN THỬ · KHÔNG THAY ĐỔI TÁC PHẨM.',[],'ending-distance')
 ];
 pages[0].returnNarration='Bạn quay lại cổng trường. Buổi chiều đã trôi qua; những điều vừa nghe vẫn còn trong trí nhớ. Lần này không phải một ngày nhập học mới.';
 pages[3].returnNarration='Bạn trở lại phòng VIP số 01 sau cuộc nói chuyện. Màn hình vẫn mở bản vá dang dở, nhưng lời của Lục Thiển khiến căn phòng yên tĩnh mang một ý nghĩa khác.';
 pages[0].roleScenes={
  'entry-tu-du':{narration:'Tử Du vừa bước xuống xe luật sư trước cổng trường. Em không phân biệt được khuôn mặt người gác cổng, chỉ nghe giọng khàn và mùi thuốc lá rất nhạt trên áo khoác. Ký ức về bàn tiệc tuyết trắng ở phương Bắc đã nằm phía sau; hôm nay em chỉ muốn tìm một chỗ học không ai tra hỏi thân thế.'},
  'entry-cover':{narration:'Bạn nhận một hồ sơ thử nghiệm “người phụ việc thư viện cộng đồng” mà hệ thống nhập vai vừa cấp. Hồ sơ không có xác minh tại địa phương, không mở được cổng trường hay tài khoản học sinh. Trước mắt là trường Trung học số 3 và một người gác cổng chưa biết bạn là ai.',dialogue:'Bác bảo vệ hỏi: “Giấy giới thiệu của cô đâu? Nếu chưa có, xin đợi ngoài cổng để tôi gọi người phụ trách.”',choiceLabels:{'go-net':'Tìm thông tin công khai về thị trấn trước.','visit-public-show':'Xin tới khu khán giả khi buổi diễn mở cửa.'}}
 };
 pages[1].roleScenes={
  'entry-tu-du':{narration:'Tử Du ngồi vào bàn học trống. Tiếng bước chân của Hạ Tinh Dao đi đến từ bên trái; em nhận ra cô bằng chất giọng trong trẻo và mùi xà phòng sạch, không phải bằng gương mặt. Một nửa củ khoai nóng được đặt bên vở.',dialogue:'Hạ Tinh Dao khẽ hỏi: “Tử Du, cậu ăn chút gì nhé?”'},
  'entry-classmate':{narration:'Bạn đã học lớp 7B từ đầu học kỳ. Hôm nay có một bạn mới tên Khương Tử Du chuyển đến; cô bạn cùng bàn Hạ Tinh Dao chủ động chia phần ăn trưa. Bạn không biết chuyện xét nghiệm huyết thống hay những tập đoàn ở phương Bắc.',dialogue:'Tinh Dao quay sang bạn: “Cậu giúp tớ hỏi xem bạn mới cần mượn vở không?”',choiceLabels:{'share-lunch':'Giúp Tinh Dao làm quen với bạn mới.','follow-rehearsal':'Tới buổi tập văn nghệ của lớp.'}}
 };
 pages[2].roleScenes={
  'entry-tu-du':{narration:'Hạ Tinh Dao vừa đưa Tử Du nửa củ khoai. Hơi nóng khiến lòng bàn tay có cảm giác rất thật, trái ngược những năm tháng chỉ còn tiếng đóng cửa nơi Khương gia. Tử Du không biết phải đáp lại thế nào cho vừa phải.',dialogue:'Tinh Dao thủ thỉ: “Tớ muốn thi hát. Cậu thấy tớ có nên thử không?”'},
  'entry-classmate':{narration:'Bạn thấy Tinh Dao đưa khoai cho người bạn mới và kể về đợt tuyển sinh thanh nhạc. Điều bạn có thể làm là lắng nghe hoặc động viên, không phải biết hết chuyện nhà người khác.'}
 };
 pages[4].roleScenes={
  'entry-luc-thien':{narration:'Lục Thiển đang kiểm các phụ lục ủy quyền của Vạn Yên. Cô đã theo sát Tử Du từ thời em rời hai gia tộc và hiểu em ghét những cuộc hỏi han liên miên. Trên bàn có hồ sơ chưa ký; cô phải tách chuyện công việc khỏi điều mình muốn nói với em.',dialogue:'Điện thoại rung. Thư ký báo: “Tử Du nói cô có thể quyết định giờ hẹn, nhưng chưa trao thêm bất cứ quyền ký thay nào.”',choiceLabels:{'leave-office':'Đóng tập hồ sơ và đến quán net theo lịch hẹn.','attend-show':'Đi kiểm tra hoạt động học bổng tại buổi diễn trường.'}}
 };
 pages[5].roleScenes={
  'entry-tu-du':{narration:'Tử Du ngồi sau sân khấu. Giọng Hạ Tinh Dao vừa ngừng hát và tiếng chân cô vội tìm đến. Em nhận ra tiếng thở gấp của bạn giữa hàng bạch đàn. Điều phải lựa chọn lúc này không phải số tiền giúp đỡ, mà là cách nói thật lòng mình.',dialogue:'Tinh Dao nhỏ giọng: “Tử Du, tớ có một điều muốn nói...”'},
  'entry-luc-thien':{narration:'Lục Thiển tới buổi diễn với tư cách người hỗ trợ chương trình. Cô nhìn Tử Du đứng ở mép sân khấu và thấy Tinh Dao tìm đến nói chuyện. Không ai ở đây yêu cầu cô xen vào; cô chỉ có thể tôn trọng giới hạn của những người trẻ.',dialogue:'Người phụ trách lớp hỏi nhỏ: “Cô có muốn nghe hết buổi tổng kết của các em không?”',choiceLabels:{'protect-quiet':'Đứng lùi lại, giữ không gian riêng cho họ.','stay-and-listen':'Ở lại nghe bài hát cuối cùng và ghi nhận chương trình.','leave-early':'Rời đi, để người trong cuộc tự nói chuyện.'}},
  'entry-classmate':{narration:'Bạn vừa phụ dọn đạo cụ sau đêm diễn, thấy Tinh Dao chạy theo Tử Du về phía hàng bạch đàn. Bạn không nghe rõ họ định nói gì và cũng không có quyền quyết định thay.',dialogue:'Một bạn cùng lớp nhắc: “Đừng trêu Tinh Dao, cậu ấy đang có chuyện nghiêm túc.”'},
  'entry-cover':{narration:'Hồ sơ tạm thời chỉ đủ để bạn đứng ở khu vực khách xem chương trình, không phải hậu trường. Qua dãy ghế, bạn thấy một học sinh tìm người khác dưới rặng bạch đàn. Đây là đời sống riêng của người bản địa, không phải nhiệm vụ cho bạn can thiệp.',dialogue:'Bảo vệ trường: “Xin ở khu khán giả. Khu sau sân khấu dành cho người có giấy mời.”',choiceLabels:{'protect-quiet':'Tôn trọng khu vực riêng tư, không tiếp cận.','stay-and-listen':'Ở lại ghế khách xem phần kết.','leave-early':'Rời trường theo lối công cộng.'}}
 };
 const entryBriefings=[
  {entryId:'entry-tu-du',worldContext:'Đây là kiếp sống hiện đại ở chương 3–12 của Hệ Thống ERR...O. Bản chơi chỉ đặt một lát cắt tại thị trấn mỏ chương 6–7.',roleMemory:'Bạn là Khương Tử Du. Sau biến cố huyết thống năm chín tuổi và cuộc chia ly hai gia tộc năm mười hai tuổi, bạn tới thị trấn mỏ. Bạn không thể nhận biết mặt người, thường dựa vào giọng nói và mùi hương. Khối rubik nhắc về lời hứa với Phó Vãn Ninh.',incitingIncident:'Xe đưa bạn đến cổng trường Trung học số 3. Một cuộc sống yên tĩnh đang bắt đầu, nhưng lớp 7B không chỉ có những người muốn để bạn một mình.',objective:'Tìm cách hòa vào đời sống bình thường và giữ ranh giới trong các mối quan hệ, không làm sai các biến cố Canon.',boundaries:'Bạn không thể khiến những người ở Khương/Thẩm gia thay đổi lịch sử. Không tự cấp tài sản CryoTech, EXP, Xu hay xác minh nhiệm vụ.'},
  {entryId:'entry-luc-thien',worldContext:'Tử Du đang sống kín đáo ở thị trấn mỏ; các công việc công nghệ và tài chính do người được ủy quyền xử lý trong phạm vi pháp lý.',roleMemory:'Bạn là Lục Thiển, luật sư có quan hệ lâu dài với Tử Du. Bạn biết những việc được giao, nhưng không biết mọi suy nghĩ hay ký ức chuyển sinh của em.',incitingIncident:'Một hồ sơ Quỹ Vạn Yên vừa tới bàn. Bạn phải hoàn tất trách nhiệm mà không để sự quan tâm riêng biến thành quyền quyết định thay Tử Du.',objective:'Giữ đúng ủy quyền, bảo vệ người được đại diện và tự lựa chọn ranh giới tình cảm phù hợp với những gì đã biết.',boundaries:'Không ký thay ngoài ủy quyền, không cấp tiền thưởng trong hệ thống và không sửa quyết định tình cảm Canon của Tử Du.'},
  {entryId:'entry-classmate',worldContext:'Thị trấn mỏ với trường số 3, tàu chở quặng và dãy bạch đàn. Đây là lát cắt đời thường chương 6.',roleMemory:'Bạn là một học sinh đã học lớp 7B từ trước. Bạn quen lịch học và Hạ Tinh Dao, nhưng hoàn toàn không biết bí mật của Khương Tử Du.',incitingIncident:'Lớp có học sinh mới. Tinh Dao đang tìm cách giúp người bạn ấy hòa nhập, còn buổi diễn văn nghệ sắp bắt đầu.',objective:'Thử cách một người bản địa có thể làm quen, giúp đỡ và giữ riêng tư cho bạn học.',boundaries:'Không nhìn thấy ký ức Tử Du; không thay kết quả tranh chấp huyết thống, không tự tạo vật phẩm hay tài sản.'},
  {entryId:'entry-cover',worldContext:'Đây là một thị trấn mỏ hiện đại, không phải đô thị tương lai. Chỉ màn tiếp nhận nhập vai có sắc thái hệ thống.',roleMemory:'Bạn có thân phận ảo “người phụ việc thư viện cộng đồng” do bản thử cấp. Chưa ai ngoài cơ chế mô phỏng xác minh công việc, giấy tờ hoặc quá khứ của bạn.',incitingIncident:'Bạn tới trường số 3 nhưng người bảo vệ yêu cầu giấy giới thiệu thật. Một tên vai trên màn hình không mở bất cứ cánh cửa nào.',objective:'Chỉ quan sát nguồn công khai, học quy tắc địa phương và tham gia đúng nơi được mời.',boundaries:'Không tự xưng là giáo viên, truy cập hồ sơ học sinh, ra lệnh cho NPC, cấp thưởng hay thay đổi Canon.'}
 ];
 return {version:'g5c-author-demo-script-1',contentHash:await hashAuthoringJson(world),pages,entryBriefings};
}
