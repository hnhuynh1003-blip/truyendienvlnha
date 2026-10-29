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
 {chapterId:'chapter-6',title:'Chương 6 — Gió qua rặng bạch đàn',text:'GHI CHÚ CHUYỂN THỂ, KHÔNG PHẢI NGUYÊN VĂN. Mùa đông năm mười hai tuổi, Khương Tử Du theo xe của văn phòng Lục Thiển đến thị trấn mỏ. Hồ sơ tự lập được hiệu phó duyệt; chính cô giáo chủ nhiệm Tần Tuệ dẫn em tới lớp 7B và chỉ chỗ cạnh cửa sổ. Những ngày học sau đó mới có nửa củ khoai của Hạ Tinh Dao. Một mùa hạ về sau, cô Tần giữ Tử Du lại vì bỏ bữa, đưa sữa và bánh. Đến tuổi mười lăm, sau nhiều năm đi cạnh nhau, Tinh Dao hát ở đêm gây quỹ, ngỏ lời trước khi đi tuyển sinh thanh nhạc; Tử Du từ chối vì muốn sống một mình. Không được đặt các sự kiện cách nhau nhiều năm vào cùng một buổi chiều.'},
 {chapterId:'chapter-7',title:'Chương 7 — Khói mây qua sông',text:'GHI CHÚ CHUYỂN THỂ, KHÔNG PHẢI NGUYÊN VĂN. Sang năm mười bảy tuổi, Tử Du đã sống ở phòng VIP số 01 quán net, âm thầm kiếm sống bằng những dự án CryoTech và ủy thác Quỹ Vạn Yên. Lục Thiển đã làm đại diện pháp lý suốt năm năm. Một chiều mưa, cô tới phòng VIP mang canh gà và báo cáo quý; đây là chuyện riêng xảy ra SAU quãng đời lớp 7B và đêm văn nghệ năm mười lăm tuổi. Cuối thu, sau lễ khánh thành điểm trường thứ một trăm, hai người dừng xe bên bờ sông trong mưa; Lục Thiển ngỏ lời, Tử Du từ chối, cô giữ nguyên trách nhiệm pháp lý. Chỉ cho nhập vai cách cảm nhận và ứng xử ở khoảng trống, không thay kết cục Canon.'}
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
 ['scene-entry','chapter-6','Trạm tiếp nhận ngoài dòng thời gian: định tuyến mỗi thân phận tới đúng năm và nơi mở đầu.','HỆ THỐNG · chọn mốc nhập vai',0],
 ['scene-gate','chapter-6','Tới trường, chưa có quyền bỏ qua thủ tục nhập học.','12 tuổi · mùa đông · ngày nhập học',1],
 ['scene-admission','chapter-6','Thầy hiệu phó duyệt hồ sơ, Tần Tuệ đón học sinh.','12 tuổi · mùa đông · sau cổng trường',2],
 ['scene-classroom','chapter-6','Cô Tần dẫn tới lớp 7B, giới thiệu chỗ ngồi cạnh Tinh Dao.','12 tuổi · mùa đông · buổi học đầu',3],
 ['scene-class-talk','chapter-6','Một lời chào hoặc giúp đỡ nhỏ khiến bạn mới bớt lạc lõng.','12 tuổi · phút đầu trong lớp',3.5],
 ['scene-class-quiet','chapter-6','Sự im lặng thay đổi cách bạn cùng lớp phản ứng, nhưng không xóa tình bạn tương lai.','12 tuổi · phút đầu trong lớp',3.5],
 ['scene-meal','chapter-6','Nhiều ngày sau: củ khoai, rubik, bắt đầu tình bạn.','12 tuổi · những tuần tiếp theo',4],
 ['scene-meal-care','chapter-6','Phản ứng trước sự san sẻ: chú ý chuyện gia đình người bạn.','12 tuổi · giờ trưa',4.5],
 ['scene-meal-music','chapter-6','Phản ứng trước sự san sẻ: cùng nói chuyện tiếng hát/rubik.','12 tuổi · giờ trưa',4.5],
 ['scene-teacher','chapter-6','Sau một quãng học: cô Tần giữ lại, sữa và bánh mì.','Những năm đầu · một chiều mùa hạ',5],
 ['scene-walk','chapter-6','Thêm những năm tháng trôi qua, Tinh Dao 15 tuổi đi dọc triền đê.','15 tuổi · sau giờ học',6],
 ['scene-rehearsal','chapter-6','Đêm gây quỹ, lời mời đi tuyển sinh thanh nhạc.','15 tuổi · đêm văn nghệ',7],
 ['scene-whatif-tinhdao','chapter-6','Kết cục giả định nếu Tử Du lựa chọn đi cùng Tinh Dao; không ghi vào Canon.','15 tuổi · nhánh giả định',7.5],
 ['scene-farewell','chapter-6','Canon: Tử Du từ chối đi cùng, Tinh Dao rời đi khóc.','15 tuổi · sau sân khấu',8],
 ['scene-school-end','chapter-6','Vai bạn học rời trường ở mốc năm 15, không biết chuyện tài chính.','15 tuổi · kết nhánh học sinh',9],
 ['scene-town-walk','chapter-6','Người có thân phận chưa xác minh chỉ đi tuyến đường công khai.','12 tuổi · chiều đầu tới thị trấn',2],
 ['scene-cover-library','chapter-6','Vai ảo tìm được thông tin thư viện công cộng, không phải hồ sơ học sinh.','12 tuổi · nhánh thư viện',2.5],
 ['scene-cover-station','chapter-6','Vai ảo hỏi người bán nước về tàu quặng, chỉ biết tin công cộng.','12 tuổi · nhánh đường ray',2.5],
 ['scene-town-end','chapter-6','Đóng nhánh công cộng, không nhảy sang tương lai.','12 tuổi · kết nhánh quan sát',3],
 ['scene-netroom','chapter-7','Chuyển thời gian minh bạch từ tuổi 15 tới 17; chỉ Tử Du vào phòng riêng.','17 tuổi · năm năm sau ngày tới thị trấn',10],
 ['scene-contract','chapter-7','Lục Thiển tới phòng VIP mang canh và báo cáo quý.','17 tuổi · chiều mưa',11],
 ['scene-lawyer-care','chapter-7','Chọn chăm sóc trước: Tử Du ăn canh rồi mới xem giấy tờ.','17 tuổi · nhánh chăm sóc',11.5],
 ['scene-lawyer-report','chapter-7','Chọn trình báo cáo trước: Tử Du yêu cầu để canh trên bàn.','17 tuổi · nhánh báo cáo',11.5],
 ['scene-ceremony','chapter-7','Lễ khánh thành điểm trường thứ 100 của Vạn Yên.','17 tuổi · cuối thu',12],
 ['scene-river','chapter-7','Đêm mưa trên đường về, lời tỏ bày và Canon từ chối.','17 tuổi · đêm mưa ven sông',13],
 ['scene-quiet','chapter-7','Kết cục mô phỏng sau lời từ chối, không thay Canon.','17 tuổi · sau cuộc trò chuyện',14],
 ['scene-listen','chapter-7','Kết cục mô phỏng cách xử lý cảm xúc, không chấp thuận tình cảm.','17 tuổi · sau cuộc trò chuyện',14],
 ['scene-distance','chapter-7','Kết cục mô phỏng trở lại quán net theo Canon.','17 tuổi · trở về',14]
].map(([sceneId,chapterId,authorReason,timeLabel,sequence])=>({sceneId,chapterId,authorReason,timeLabel,sequence}));

export function erroModernWorld(notesHash,imageHash){
 const world={
  schemaVersion:'world-content-1',contentVersion:'0.1.0',
  title:'Hệ Thống ERR...O — Thị trấn mỏ / Thử chuyển thể',genreId:'modern',requestedWorldRank:'F',dangerLevel:'low',
  contentTags:['modern','identity','relationships','scripted-npc'],
  // Source is the NEW original adaptation notes, never a fake Library permit.
  storySource:{kind:'original',storyId:'dudu-offline-erro-adaptation-notes',storyVersion:'test-notes-1',contentHash:notesHash},
  story:{logline:'Từ tuổi mười hai đến mười bảy ở thị trấn mỏ, Tử Du trưởng thành trong những tình cảm không dễ đáp lại; vai nhập chỉ chạm vào những khoảng trống đời thường.',
   setting:'Thị trấn mỏ miền Trung; trường Trung học số 3, hàng bạch đàn, quán net thể thao điện tử và văn phòng luật sư.',
   playerRole:'Thử bốn thân phận: vai chính, người hỗ trợ, học sinh bản địa và người được cấp thân phận ảo.',
   opening:'Mùa đông năm mười hai tuổi. Xe của Lục Thiển đưa một học sinh mới đến trường số 3, trước khi thầy hiệu phó duyệt giấy tờ và cô Tần dẫn vào lớp.',
   secretTruth:'Bản thử không đưa truyện gốc hay các bí mật chưa công bố vào dữ liệu phát hành. Tất cả kết thúc chỉ giả định.',
   plotBeats:['Chương 3–5: chuyện gia tộc trước tuổi mười hai.','Chương 6, 12 tuổi: hồ sơ nhập học → cô Tần → lớp 7B → Tinh Dao chia khoai.','Chương 6: mùa hạ sau đó cô Tần chăm học trò; 15 tuổi Tinh Dao đi dọc triền đê, hát và ngỏ lời; Tử Du từ chối.','Chương 7, 17 tuổi: VIP01 → Lục Thiển mang canh, báo cáo → khánh thành điểm trường → mưa ven sông và lời từ chối.'],
   worldRules:['Không thay đổi việc Tử Du đã rời Khương gia và Thẩm gia.',
    'Tử Du không phân biệt người khác bằng gương mặt; các dấu nhận biết ưu tiên giọng nói và mùi hương.',
    'Thân phận do hệ thống cấp không phải giấy tờ được kiểm chứng; không quyền tài chính, y tế, đăng ký học hay sửa Canon.',
    'Kết cục chỉ mô phỏng để thử cách viết, không đổi diễn biến ở chương 8–12.']},
  worldCoverAssetId:'art-town-cover',assets:[
   {assetId:'art-town-cover',assetVersion:'p7-test-1',kind:'worldCover',contentHash:imageHash,altText:'Thị trấn mỏ lúc hoàng hôn, trường học và rặng bạch đàn.'},
   {assetId:'art-town-scene',assetVersion:'p7-test-1',kind:'sceneBackground',contentHash:imageHash,altText:'Khung cảnh thị trấn mỏ hiện đại, không có phép thuật.'}],
  maps:[{mapId:'map-system',name:'Trạm tiếp nhận nhập vai (mô phỏng)',placeIds:['place-system']},
   {mapId:'map-mine-town',name:'Thị trấn mỏ',placeIds:['place-school','place-street','place-net']},
   {mapId:'map-north-trip',name:'Chuyến công tác vùng cao và đường về',placeIds:['place-office']}],
  places:[
   {placeId:'place-system',mapId:'map-system',name:'Trạm tiếp nhận ngoài Canon',sceneIds:['scene-entry']},
   {placeId:'place-school',mapId:'map-mine-town',name:'Trường Trung học số 3',sceneIds:['scene-gate','scene-admission','scene-classroom','scene-class-talk','scene-class-quiet','scene-meal','scene-meal-care','scene-meal-music','scene-teacher','scene-walk','scene-rehearsal','scene-whatif-tinhdao','scene-farewell','scene-school-end']},
   {placeId:'place-street',mapId:'map-mine-town',name:'Đường tàu và rặng bạch đàn',sceneIds:['scene-town-walk','scene-cover-library','scene-cover-station','scene-town-end','scene-quiet','scene-listen','scene-distance']},
   {placeId:'place-net',mapId:'map-mine-town',name:'Quán net VIP số 01',sceneIds:['scene-netroom','scene-contract','scene-lawyer-care','scene-lawyer-report']},
   {placeId:'place-office',mapId:'map-north-trip',name:'Điểm trường vùng cao và bờ sông',sceneIds:['scene-ceremony','scene-river']}],
  scenes:[
   scene('entry','system',[['gate','enter-school-entry'],['classroom','enter-classmate-entry'],['contract','enter-lawyer-entry']]),
   scene('gate','school',[['admission','begin-enrolment'],['town-walk','ask-public-way']]),
   scene('admission','school',[['classroom','follow-teacher']]),
   scene('classroom','school',[['class-talk','class-engage'],['class-quiet','class-observe']]),
   scene('class-talk','school',[['meal','finish-class-talk']]),
   scene('class-quiet','school',[['meal','finish-class-quiet']]),
   scene('meal','school',[['meal-care','share-care'],['meal-music','share-music']]),
   scene('meal-care','school',[['teacher','finish-meal-care']]),
   scene('meal-music','school',[['teacher','finish-meal-music']]),
   scene('teacher','school',[['walk','grow-years']]),
   scene('walk','school',[['rehearsal','prepare-show']]),
   scene('rehearsal','school',[['farewell','listen-invitation'],['whatif-tinhdao','imagine-with-tinhdao']]),
   scene('whatif-tinhdao','school',[]),
   scene('farewell','school',[['netroom','years-to-seventeen'],['school-end','leave-as-classmate']]),
   scene('school-end','school',[]),
   scene('town-walk','street',[['cover-library','visit-public-library'],['cover-station','ask-public-station']]),
   scene('cover-library','street',[['town-end','finish-public-library']]),
   scene('cover-station','street',[['town-end','finish-public-station']]),
   scene('town-end','street',[]),
   scene('netroom','net',[['contract','hear-knock']]),
   scene('contract','net',[['lawyer-care','prioritize-meal'],['lawyer-report','review-file-first']]),
   scene('lawyer-care','net',[['ceremony','finish-lawyer-care']]),
   scene('lawyer-report','net',[['ceremony','finish-lawyer-report']]),
   scene('ceremony','office',[['river','drive-through-rain']]),
   scene('river','office',[['quiet','protect-quiet'],['listen','stay-and-listen'],['distance','leave-early']]),
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
   {entryId:'entry-tu-du',label:'Khương Tử Du · vai chính',mode:'cast_possession',castTargetId:'character-tu-du',startSceneId:'scene-entry',
    initialKnownFacts:['Biết thân thế và việc rời hai gia tộc.','Không nhận diện được gương mặt.'],initialFlags:['identity-tu-du']},
   {entryId:'entry-luc-thien',label:'Lục Thiển · vai phụ',mode:'cast_possession',castTargetId:'character-luc-thien',startSceneId:'scene-entry',
    initialKnownFacts:['Biết hồ sơ pháp lý Vạn Yên và hoàn cảnh Tử Du.'],initialFlags:['lawyer-knowledge']},
   {entryId:'entry-classmate',label:'Bạn học lớp 7B · người bản địa',mode:'native_extra',nativeSlotId:'slot-class-7b',
    socialAnchorNotes:'Một học sinh cùng lớp, biết trường lớp nhưng không biết bí mật của nhân vật chính.',
    startSceneId:'scene-entry',initialKnownFacts:['Biết Tinh Dao thường hát bên cửa sổ lớp 7B.'],initialFlags:['classmate-knowledge']},
   {entryId:'entry-cover',label:'Nhân viên tạm thời · thân phận ảo',mode:'system_cover',identityAssurance:'unknown',
    coverName:'Người phụ việc thư viện cộng đồng',startSceneId:'scene-entry',
    initialKnownFacts:['Chỉ biết tuyến đường công cộng quanh trường vào thời điểm hiện tại.'],initialFlags:['unverified-cover']}],
  entryPolicy:{mode:'player_choice'},entry:{entrySceneId:'scene-entry'},
  // Schema requires a mission record. Keep this optional, zero-reward and
  // outside roleplay completion; an enforced school quest would be impossible
  // for the lawyer and unverified cover roles.
  items:[],shops:[],missions:[{missionId:'mission-qa-placeholder',name:'Kiểm tra cấu trúc cảnh (không thưởng)',kind:'main',requiredForCompletion:true,
   startSceneId:'scene-entry',summary:'Chỉ là hợp đồng QA cho trạm tiếp nhận ngoại tuyến; engine không công nhận hoàn thành hay cấp thưởng.',
   objectives:[{objectiveId:'objective-entry',verb:'reach',targetId:'scene-entry',requiredCount:1}],
   rewardRequest:{exp:0,items:[]},replayPolicy:'repeat_no_reward'}],
  events:[],endings:[
   {endingId:'ending-whatif-tinhdao',title:'Nhánh giả định: cùng Tinh Dao rời thị trấn',result:'partial',requiredFlags:['chose-whatif-tinhdao']},
   {endingId:'ending-school',title:'Câu chuyện người bạn cùng lớp',result:'partial',requiredFlags:['saw-school-years']},
   {endingId:'ending-observer',title:'Góc nhìn người quan sát',result:'partial',requiredFlags:['kept-public-boundary']},
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
  edge('enter-school-entry','entry',0,'gate',{op:'any',conditions:[{op:'flag_set',flag:'identity-tu-du'},{op:'flag_set',flag:'unverified-cover'}]}),
  edge('enter-classmate-entry','entry',1,'classroom',{op:'flag_set',flag:'classmate-knowledge'}),
  edge('enter-lawyer-entry','entry',2,'contract',{op:'flag_set',flag:'lawyer-knowledge'}),
  edge('begin-enrolment','gate',0,'admission',{op:'flag_set',flag:'identity-tu-du'}),
  edge('ask-public-way','gate',1,'town-walk',{op:'flag_set',flag:'unverified-cover'}),
  edge('follow-teacher','admission',0,'classroom'),
  edge('class-engage','classroom',0,'class-talk'),
  edge('class-observe','classroom',1,'class-quiet'),
  edge('finish-class-talk','class-talk',0,'meal'),
  edge('finish-class-quiet','class-quiet',0,'meal'),
  edge('share-care','meal',0,'meal-care'),
  edge('share-music','meal',1,'meal-music'),
  edge('finish-meal-care','meal-care',0,'teacher'),
  edge('finish-meal-music','meal-music',0,'teacher'),
  edge('grow-years','teacher',0,'walk'),
  edge('prepare-show','walk',0,'rehearsal'),
  edge('listen-invitation','rehearsal',0,'farewell'),
  edge('imagine-with-tinhdao','rehearsal',1,'whatif-tinhdao',{op:'flag_set',flag:'identity-tu-du'},['chose-whatif-tinhdao']),
  edge('years-to-seventeen','farewell',0,'netroom',{op:'flag_set',flag:'identity-tu-du'}),
  edge('leave-as-classmate','farewell',1,'school-end',{op:'flag_set',flag:'classmate-knowledge'},['saw-school-years']),
  edge('visit-public-library','town-walk',0,'cover-library',{op:'flag_set',flag:'unverified-cover'}),
  edge('ask-public-station','town-walk',1,'cover-station',{op:'flag_set',flag:'unverified-cover'}),
  edge('finish-public-library','cover-library',0,'town-end','session-ended',['kept-public-boundary']),
  edge('finish-public-station','cover-station',0,'town-end','session-ended',['kept-public-boundary']),
  edge('hear-knock','netroom',0,'contract',{op:'flag_set',flag:'identity-tu-du'}),
  edge('prioritize-meal','contract',0,'lawyer-care'),
  edge('review-file-first','contract',1,'lawyer-report'),
  edge('finish-lawyer-care','lawyer-care',0,'ceremony'),
  edge('finish-lawyer-report','lawyer-report',0,'ceremony'),
  edge('drive-through-rain','ceremony',0,'river'),
  edge('protect-quiet','river',0,'quiet','session-ended',['chose-quiet']),
  edge('stay-and-listen','river',1,'listen','session-ended',['chose-listen']),
  edge('leave-early','river',2,'distance','session-ended',['chose-distance'])
 ];
 return {version:G4A_ENGINE_VERSION,contentVersion:world.contentVersion,contentHash:await hashAuthoringJson(world),rules};
}
export async function erroModernScript(world){
 const pages=[
  page('entry','TRẠM TIẾP NHẬN NGOÀI CANON · KHÔNG PHẢI MỘT NGÀY TRONG TRUYỆN. Mỗi thân phận bắt đầu ở một thời điểm khác: Tử Du và thân phận ảo ở cổng năm 12 tuổi, bạn học ở lớp 7B năm 12 tuổi, Lục Thiển ở phòng VIP năm Tử Du 17 tuổi.',
   'Giao diện tiếp nhận đặt các mốc lên một tuyến: 12 tuổi tới thị trấn mỏ, 15 tuổi qua đêm văn nghệ, 17 tuổi ở phòng VIP và chuyến đi ven sông. Bạn đang đứng ngoài dòng thời gian; xác nhận thân phận mới đưa bạn vào câu chuyện tại đúng mốc, không phải dịch chuyển thật trong thế giới.',
   'HỆ THỐNG: “Đã nạp ký ức phù hợp. Không thể truy cập năm tháng và bí mật của thân phận khác.”',[
    ['enter-school-entry','enter-school-entry','Bước vào cổng trường theo thân phận đã chọn.'],
    ['enter-classmate-entry','enter-classmate-entry','Vào lớp 7B từ góc nhìn học sinh bản địa.'],
    ['enter-lawyer-entry','enter-lawyer-entry','Mở hồi tuổi 17 theo ký ức Lục Thiển.']]),
  page('gate','CHƯƠNG 6 · 12 TUỔI · ĐẦU ĐÔNG. Đây là lần đầu Tử Du đến trường ở thị trấn mỏ. Sau cổng vẫn còn thủ tục nhập học; quán net và đêm văn nghệ thuộc những mốc thời gian khác.',
   'Chiều chớm đông, chiếc xe của văn phòng Lục Thiển dừng trước trường Trung học số 3. Mùi dầu máy từ đường ray lẫn với bụi than xám. Tử Du giữ chiếc ba lô cũ trong tay; em đã rời vòng tranh chấp hai gia tộc, nhưng trước mắt chỉ là một cánh cổng sắt, một tòa nhà tróc vữa và một bộ hồ sơ cần nộp.',
   'Bác bảo vệ nhìn tập giấy đóng dấu đỏ: “Học sinh chuyển tới phải trình hồ sơ ở phòng hiệu phó trước. Em tới đó rồi thầy cô sẽ dẫn lên lớp.”',[
    ['begin-enrolment','begin-enrolment','Mang hồ sơ lên gặp thầy hiệu phó.'],
    ['ask-public-way','ask-public-way','Hỏi bác bảo vệ đường tới thư viện thị trấn.']]),
  page('admission','CHƯƠNG 6 · 12 TUỔI · SAU CỔNG TRƯỜNG. Phải hoàn thành hồ sơ trước khi vào lớp 7B.',
   'Phòng hiệu phó có tủ hồ sơ kim loại và chiếc quạt kêu lạch cạch. Người thầy xem cam kết bảo lãnh, đóng dấu cho bộ hồ sơ diện độc lập. Một cô giáo trẻ tên Tần Tuệ bước tới nhận học sinh. Giọng cô thanh mảnh, hơi nghiêm nghị; mùi bồ kết nhẹ theo bước chân xuống hành lang.',
   'Cô Tần nói: “Em là Khương Tử Du? Đi cùng cô lên tầng ba. Ở đây không có ưu tiên riêng, nhưng cô sẽ chỉ cho em chỗ ngồi.”',[
    ['follow-teacher','follow-teacher','Theo cô Tần lên lớp 7B.']]),
  page('classroom','CHƯƠNG 6 · 12 TUỔI · BUỔI HỌC ĐẦU TIÊN. Lớp 7B chưa thân quen; Tinh Dao chưa đưa khoai vào phút vừa nhập học.',
   'Cô Tần gõ thước nhẹ lên lan can trước lớp 7B, giới thiệu học sinh mới rồi chỉ góc bàn gần cửa sổ nhìn ra rặng bạch đàn. Bạn cùng bàn tên Hạ Tinh Dao nhích sách vở để chừa chỗ. Tiếng tàu kéo dài ngoài đồi. Không ai trong lớp biết vì sao người mới đến đây.',
   'Tần Tuệ dặn: “Ngồi cuối lớp bên cửa sổ. Điểm số và kỷ luật của em sẽ do chính em chịu trách nhiệm.”',[
    ['class-engage','class-engage','Chào bạn cùng bàn, chủ động hỏi tên.'],
    ['class-observe','class-observe','Giữ yên lặng, lắng nghe tiếng lớp học.']]),
  page('class-talk','CHƯƠNG 6 · 12 TUỔI. Kết quả của một lời chào chủ động trong buổi đầu.',
   'Bạn cùng bàn đáp lại lời chào, nhích tập vở để có khoảng trống trên bàn. Không ai đòi hỏi chuyện gia đình của người mới. Một hành động nhỏ khiến không khí bớt ngại ngùng; hôm sau có người nhớ tên bạn.',
   'Tinh Dao cười: “Tớ là Hạ Tinh Dao. Nếu thiếu vở chép thì cứ bảo nhé.”',[
    ['finish-class-talk','finish-class-talk','Tiếp tục tới những ngày học sau lời làm quen.']]),
  page('class-quiet','CHƯƠNG 6 · 12 TUỔI. Kết quả của việc không muốn trò chuyện ngay ngày đầu.',
   'Bạn chọn im lặng và mở tập vở. Người bên cạnh không cố moi chuyện riêng, chỉ đẩy quyển sách sang cho bạn xem trang bài tập. Sau vài ngày, mọi người quen sự ít nói ấy; mối quan hệ vẫn có thể bắt đầu bằng một lần giúp nhau khác.',
   'Tinh Dao nhỏ giọng: “Không sao đâu, cậu cứ ngồi nghỉ. Khi nào cần thì hỏi tớ.”',[
    ['finish-class-quiet','finish-class-quiet','Tiếp tục những tuần học mà không bị ép kể quá khứ.']]),
  page('meal','CHƯƠNG 6 · 12 TUỔI · NHIỀU NGÀY SAU NHẬP HỌC. Việc chia nửa củ khoai là thói quen hình thành qua những giờ ra chơi, không phải sự kiện cùng phút với cô Tần dẫn vào lớp.',
   'Những tuần học đầu dần thành nếp. Giờ ra chơi, Tinh Dao hát bên cửa sổ; đến một trưa rét, cô đẩy sang một nửa củ khoai còn nóng. Mùi khoai luộc và xà phòng giản dị khiến bàn học xa lạ bỗng bớt lạnh. Bạn tò mò về khối rubik Tử Du xoay mãi, rồi nhắc rằng tiền thuốc cho mẹ vẫn là nỗi lo.',
   'Tinh Dao cười: “Sau này nếu tớ hát thật giỏi, tớ sẽ mua cho cậu cả thùng rubik mới.”',[
    ['share-care','share-care','Hỏi Tinh Dao liệu mẹ bạn ấy có khỏe hơn không.'],
    ['share-music','share-music','Gợi chuyện bài hát và chiếc rubik trên bàn.']]),
  page('meal-care','CHƯƠNG 6 · 12 TUỔI. Lựa chọn quan tâm tới nỗi lo gia đình khiến cuộc nói chuyện thành thật hơn.',
   'Khi bạn hỏi về mẹ, Tinh Dao ngừng cười trong chốc lát. Cô kể thuốc tốn nhiều tiền, rồi tự đổi chủ đề vì không muốn một bữa khoai trở nên nặng nề. Bạn biết thêm điều người khác chủ động kể, không nhận quyền đọc hồ sơ bệnh án hay trả tiền thay họ.',
   'Tinh Dao nói: “Mẹ vẫn hay ho, nhưng tớ sẽ cố học và hát tốt hơn. Cảm ơn cậu đã hỏi.”',[
    ['finish-meal-care','finish-meal-care','Ghi nhớ điều bạn ấy chia sẻ; tiếp tục những năm học.']]),
  page('meal-music','CHƯƠNG 6 · 12 TUỔI. Lựa chọn nói về tiếng hát và rubik giúp hai người thoải mái hơn mà không thay lịch sử.',
   'Bạn xoay một mặt rubik chậm lại để Tinh Dao thấy cách các ô màu đổi chỗ. Cô bật cười, thử theo nhịp rồi ngân nga một câu hát ngắn. Hết giờ nghỉ, bàn học lại như cũ nhưng sự e dè ban đầu đã ít đi.',
   'Tinh Dao nói: “Tớ tập hát giỏi, còn cậu dạy rubik. Thỏa thuận nhé?”',[
    ['finish-meal-music','finish-meal-music','Khép giờ trưa; tiếp tục những học kỳ sau.']]),
  page('teacher','CHƯƠNG 6 · MỘT CHIỀU MÙA HẠ SAU NHỮNG THÁNG HỌC. Cô Tần đã chứng kiến Tử Du ngủ gật, bỏ bữa nhưng vẫn đạt điểm cao qua nhiều kỳ kiểm tra.',
   'Ve kêu ngoài cửa sổ văn phòng giáo viên. Tần Tuệ vừa trả bài điểm tối đa, vừa nhắc học trò rằng không thể dùng điểm số thay cho sức khỏe. Cô lấy từ ngăn bàn một hộp sữa ấm và chiếc bánh mì bọc giấy bạc. Tử Du nhận ra mùi bơ, rồi sự vụng về trong cách cô che giấu lo lắng.',
   'Cô Tần thở dài: “Em có thể tự học tốt, nhưng không được tự bỏ mặc mình. Ăn xong rồi hãy về.”',[
    ['grow-years','grow-years','Cảm ơn cô, rồi trở lại với những năm tháng học trò.']]),
  page('walk','CHƯƠNG 6 · 15 TUỔI · SAU GIỜ HỌC. Đã qua nhiều mùa tàu quặng và nhiều lần Tinh Dao cùng Tử Du đi dọc triền đê.',
   'Tử Du giờ mười lăm tuổi. Tiếng hát của Tinh Dao được người ngoài trường chú ý, nhưng cô vẫn thích đi bộ cạnh bạn trên con đê hướng ra đường ray. Gió lay rặng bạch đàn, những câu chuyện vụn vặt nối tiếp nhau. Một tình cảm khác đã lớn lên bên cạnh tình bạn, dù chưa được nói rõ.',
   'Tinh Dao ngập ngừng: “Cuối tuần trường tổ chức đêm diễn gây quỹ. Tớ sẽ hát... cậu đến nghe nhé?”',[
    ['prepare-show','prepare-show','Đến đêm diễn để nghe Tinh Dao hát.']]),
  page('rehearsal','CHƯƠNG 6 · 15 TUỔI · ĐÊM VĂN NGHỆ. Đây là đêm diễn gây quỹ SAU vài năm quen biết, không phải buổi tập ngay sau ngày nhập học.',
   'Đèn vàng phủ sân khấu. Tinh Dao hát trong chiếc váy trắng giản dị; Tử Du ngồi khuất sau cánh gà, xoay khối rubik tróc sơn. Khi tiếng vỗ tay dứt, cô tìm bạn dưới rặng bạch đàn, nói chuyện đoàn nghệ thuật tỉnh sẽ tuyển sinh tuần sau và ngập ngừng hỏi liệu bạn có thể đi cùng mình.',
   'Tinh Dao nói nhỏ: “Nếu tớ lên thành phố học hát... cậu có thể đi cùng tớ không?”',[
    ['listen-invitation','listen-invitation','Khuyên Tinh Dao theo đuổi giọng hát, nhưng không đi cùng.'],
    ['imagine-with-tinhdao','imagine-with-tinhdao','Nắm tay cô ấy và nhận lời đi cùng (giả định).']]),
  page('whatif-tinhdao','NHÁNH GIẢ ĐỊNH TRONG PHIÊN THỬ · 15 TUỔI. Đây là kết cục người chơi tạo ở bản mô phỏng; Tử Du trong chương gốc vẫn từ chối Tinh Dao.',
   'Nếu lúc này bạn chọn đi cùng, Tinh Dao ngẩng lên bối rối. Hai người sẽ phải tính chuyện học, tiền tàu, nơi ở và bệnh của mẹ cô; lời đồng ý không tự giải quyết những khó khăn đó. Con đường mới mở ra trong tưởng tượng, còn chuyến đời ở tuổi mười bảy của bản Canon không tự động tiếp tục từ nhánh này.',
   'Tinh Dao hỏi lại: “Cậu nói thật chứ? Vậy chúng mình phải bàn chuyện đó với mẹ tớ trước đã.”',[],'ending-whatif-tinhdao'),
  page('farewell','CHƯƠNG 6 · 15 TUỔI · SAU ĐÊM DIỄN. CANON CỐ ĐỊNH: Tử Du khuyến khích Tinh Dao theo nghề ca hát nhưng từ chối đi cùng. Người chơi không được chuyển lời từ chối thành sự đồng ý.',
   'Dưới tán bạch đàn, Tử Du nói rằng tương lai của Tinh Dao là ở sân khấu rộng hơn, còn mình đã quen ở một mình. Cô bạn buông vạt áo, nghẹn ngào chạy vào bóng tối. Tiếng tàu quặng vọng dài; khối rubik lách cách trong tay. Những năm tháng cạnh nhau không bị xóa, nhưng đêm ấy khép lại với một lời từ chối rõ ràng.',
   'Lời đáp Canon được giữ nguyên về ý: “Cậu hãy đi theo giọng hát của mình. Tớ không thể đi cùng.”',[
    ['years-to-seventeen','years-to-seventeen','Hai năm sau — một chiều mưa ở quán net.'],
    ['leave-as-classmate','leave-as-classmate','Cùng các bạn thu dọn sân khấu rồi về nhà.']]),
  page('school-end','CHƯƠNG 6 · 15 TUỔI. Điểm dừng cho vai học sinh bản địa; các hoạt động tài chính và quan hệ riêng ở tuổi 17 không phải tri thức của bạn.',
   'Đạo cụ được thu gọn. Bạn đi về theo lối trường cùng các bạn lớp 7B, để Tinh Dao và Tử Du có khoảng riêng. Không ai kể lại nội dung đối thoại bên hàng cây, và bạn cũng không thể nhìn thấy những gì sẽ xảy ra hai năm sau.',
   'SYSTEM: KẾT THÚC NHÁNH HỌC SINH · KHÔNG SỬA CANON.',[],'ending-school'),
  page('town-walk','CHƯƠNG 6 · 12 TUỔI · CÙNG CHIỀU NGÀY NHẬP HỌC. Thân phận ảo chưa được trường xác minh, nên chỉ có thể xem thông tin công khai.',
   'Bạn rời cổng trường theo con đường cạnh bãi xỉ. Bảng chỉ đường công cộng ghi ga tàu hàng, thư viện thị trấn và chợ nhỏ. Từ đây có thể nghe trống trường nhưng không nhìn vào lớp, càng không thể xem giấy tờ học sinh. Những năm tháng sau này không tự mở ra chỉ bằng một lần hỏi đường.',
   'Người bán nước chỉ tay: “Thư viện công cộng đi theo đường ray một đoạn nữa. Trường thì phải có giấy tờ mới vào làm việc.”',[
    ['visit-public-library','visit-public-library','Ghé thư viện, xem bảng tin tìm việc.'],
    ['ask-public-station','ask-public-station','Ra ga, ngồi quán nước nghe chuyện thị trấn.']]),
  page('cover-library','CHƯƠNG 6 · 12 TUỔI. Nhánh quan sát của người không có hồ sơ thật.',
   'Ở thư viện công cộng, bạn đọc được giờ mở cửa, một bản tin tuyển tình nguyện viên và bảng giới thiệu sách mới. Không có tên học sinh, hồ sơ học bổng hay lịch riêng của trường. Bạn có thể lưu thông tin công khai để tìm hiểu về thị trấn, nhưng chưa được nhận vai nhân viên thật.',
   'Thủ thư nói: “Muốn đăng ký hỗ trợ thì cần giấy tờ tùy thân và đơn tình nguyện, chưa ai cấp quyền cho bạn cả.”',[
    ['finish-public-library','finish-public-library','Rời thư viện với thông tin công khai vừa biết.']]),
  page('cover-station','CHƯƠNG 6 · 12 TUỔI. Nhánh quan sát về đời sống đường ray, không tiếp cận lớp học.',
   'Người bán nước kể tàu quặng thường chạy sớm nên dân thị trấn quen tiếng còi. Bạn mua một cốc trà, nhìn bảng giờ tàu công cộng và ghi nhớ hướng về khu chợ. Không ai kể bạn hồ sơ Tử Du hay cho phép theo chân học sinh vào trường.',
   'Bà chủ quán nói: “Nghe còi lúc rạng sáng thì biết ca nhà máy đã bắt đầu. Còn chuyện trong trường, tôi không rõ đâu.”',[
    ['finish-public-station','finish-public-station','Cảm ơn người bán nước; kết thúc buổi tìm hiểu.']]),
  page('town-end','CHƯƠNG 6 · 12 TUỔI. Giới hạn kết thúc của thân phận ảo chưa được xác minh, không phải quyền dịch chuyển tới các mốc Canon tương lai.',
   'Bạn dừng dưới biển chỉ đường, nghe tiếng còi tàu vẳng đến. Trong bản thử này, thân phận ảo chỉ có một buổi chiều quanh trường. Không có giấy giới thiệu thật thì không có tuyến vào lớp 7B, phòng VIP riêng hay hồ sơ ủy quyền.',
   'SYSTEM: KẾT THÚC QUAN SÁT · KHÔNG TẠO QUYỀN.',[],'ending-observer'),
  page('netroom','CHƯƠNG 7 · 17 TUỔI · HAI NĂM SAU ĐÊM VĂN NGHỆ. Chuyển cảnh qua nhiều năm: đây KHÔNG PHẢI chuyến đi quán net ngay sau giờ nhập học.',
   'Tử Du năm nay mười bảy tuổi. Giữa những năm sống một mình, em đã thuê phòng VIP số 01 của quán net theo năm để khỏi phải lo căn hộ. Ba màn hình xanh đang chạy mã CryoTech; khoản thu nhập từ phần mềm được chuyển qua Quỹ Vạn Yên theo ủy quyền. Tiếng tàu khuya vẫn còn, nhưng lớp 7B đã là quãng đời phía trước.',
   'Tiếng gõ cửa ba nhịp dứt khoát vang lên trong một chiều mưa. Giọng Lục Thiển vọng vào: “Tử Du, chị mang báo cáo và đồ ăn đây.”',[
    ['hear-knock','hear-knock','Mở cửa phòng VIP số 01 để gặp Lục Thiển.']]),
  page('contract','CHƯƠNG 7 · 17 TUỔI · CHIỀU MƯA Ở PHÒNG VIP. Lục Thiển đã đại diện pháp lý suốt năm năm; cuộc gặp diễn ra trong phòng riêng, không phải từ cổng trường chuyển tới văn phòng.',
   'Lục Thiển hai mươi lăm tuổi, áo mang mùi huệ trắng. Cô đặt canh gà hầm hạt sen lên bàn, khuyên Tử Du đừng bỏ bữa, rồi mở báo cáo quý của Vạn Yên. Trên giấy là kết quả những điểm trường và học bổng đã thực hiện. Cả hai biết chuyện tài chính có người chịu trách nhiệm; không ai từ bản thử được quyền cấp thêm tiền hay ký thay.',
   'Lục Thiển nói: “Báo cáo quý ở đây. Nhưng trước hết, em ăn một ít canh đi.”',[
    ['prioritize-meal','prioritize-meal','Đặt công việc xuống, ăn canh trước.'],
    ['review-file-first','review-file-first','Mở báo cáo quý, ăn sau khi xong việc.']]),
  page('lawyer-care','CHƯƠNG 7 · 17 TUỔI. Cách đặt sức khỏe lên trước khiến cuộc gặp bớt giống buổi làm việc.',
   'Bạn để hồ sơ sang bên. Tử Du ban đầu lắc đầu nhưng cuối cùng cũng cầm thìa; canh hạt sen còn nóng. Hai người nói vài câu chuyện thường ngày trước khi quay về từng dòng số trong báo cáo. Không khoản tiền nào được chi bằng hành động ở bản thử.',
   'Tử Du khẽ nói: “Được rồi, em ăn. Chị đừng nhìn em như sắp ngất nữa.”',[
    ['finish-lawyer-care','finish-lawyer-care','Ăn xong, bàn giao hồ sơ theo lịch; chuyển tới chuyến công tác cuối thu.']]),
  page('lawyer-report','CHƯƠNG 7 · 17 TUỔI. Cách bắt đầu bằng báo cáo khiến khoảng cách nghề nghiệp rõ hơn.',
   'Bạn mở hồ sơ trước. Tử Du nghe qua các điểm trường, ký vào chỗ cần đối chiếu nhưng chưa cho phép thay đổi ủy quyền. Bát canh để nguội một chút; thấy vậy bạn dừng phần số liệu và nhắc em ăn. Một lựa chọn về trình tự chỉ thay đổi không khí buổi gặp, không tạo tiền từ hư không.',
   'Tử Du nói: “Em nghe rồi. Để canh đấy, lát em ăn. Chị kiểm nốt số liệu đi.”',[
    ['finish-lawyer-report','finish-lawyer-report','Khép báo cáo đúng quy trình; chuẩn bị chuyến khánh thành cuối thu.']]),
  page('ceremony','CHƯƠNG 7 · 17 TUỔI · CUỐI THU. Một ngày khác: lễ khánh thành điểm trường thứ một trăm tại vùng núi phía Bắc, rồi mới lên xe trở về thị trấn mỏ.',
   'Dải ruy băng ở sân điểm trường mới đã được tháo xuống. Lục Thiển hoàn tất bàn giao với địa phương, Tử Du đứng xa đám đông. Khi đoàn người giải tán, hai người lên xe về thị trấn. Mây thấp kéo dọc triền núi, mưa nặng hạt dần trên đường quốc lộ.',
   'Lục Thiển nhắc: “Đường ven sông đang mưa lớn. Chị sẽ tìm chỗ an toàn để dừng xe một lát.”',[
    ['drive-through-rain','drive-through-rain','Lên xe về thị trấn giữa cơn mưa.']]),
  page('river','CHƯƠNG 7 · 17 TUỔI · ĐÊM MƯA VEN SÔNG. CANON CỐ ĐỊNH: Lục Thiển ngỏ lời muốn chăm sóc Tử Du; em từ chối, cô đau lòng nhưng giữ cam kết pháp lý. Các lựa chọn CHỈ diễn ra sau lời từ chối.',
   'Xe dừng bên bờ sông dưới đèn đường mờ. Lục Thiển đề nghị Tử Du về ở cùng cô, muốn chia sẻ gánh nặng cuộc sống. Em nhẹ nhàng rút tay khỏi tay cô và nói rõ không muốn ràng buộc tình cảm. Cô khóc im lặng hồi lâu, sau đó lau mặt, lấy lại bình tĩnh và xác nhận sẽ tiếp tục công việc ủy quyền. Mưa vẫn đập vào kính xe.',
   'Lục Thiển khàn giọng: “Chị hiểu rồi. Chuyện riêng dừng ở đây, còn trách nhiệm với Vạn Yên, chị vẫn làm đến cùng.”',[
    ['protect-quiet','protect-quiet','Để cả hai có một khoảng lặng.'],
    ['stay-and-listen','stay-and-listen','Nghe chị nói hết những điều còn dang dở.'],
    ['leave-early','leave-early','Trở về thị trấn trước khi mưa nặng hạt.']]),
  page('quiet','CHƯƠNG 7 · 17 TUỔI. Kết thúc mô phỏng cảm giác sau lời từ chối của Canon; không có mối quan hệ mới được tạo.',
   'Tiếng mưa dần nhỏ đi. Cuộc đối thoại khép lại với ranh giới đã nói rõ; người trong xe cần một khoảng lặng. Tử Du vẫn muốn sống một mình và Lục Thiển vẫn giữ trách nhiệm. Không có bản ghi nào viết lại chương truyện.',
   'SYSTEM: KẾT THÚC BẢN THỬ · CANON KHÔNG ĐỔI.',[],'ending-quiet'),
  page('listen','CHƯƠNG 7 · 17 TUỔI. Lắng nghe sau lời từ chối không tương đương chấp thuận tình cảm; Canon và trách nhiệm pháp lý không đổi.',
   'Giọng nói của Lục Thiển lấy lại sự vững vàng khi nhắc tới lịch bàn giao dự án. Tử Du nghe hết mà không đưa ra một lời hứa tình cảm. Cả hai tiếp tục công việc đã ký từ trước, trong im lặng của con đường mưa.',
   'SYSTEM: KẾT THÚC BẢN THỬ · KHÔNG XÁC NHẬN NHIỆM VỤ.',[],'ending-listen'),
  page('distance','CHƯƠNG 7 · 17 TUỔI. Kết cục mô phỏng một khoảng nhìn khi trở về, không bẻ nhánh lịch sử đã công bố.',
   'Xe rời bờ sông và trở lại thị trấn trong đêm. Phòng VIP số 01 vẫn đợi với bản vá bảo mật chưa xong. Cuộc từ chối giữ nguyên; chỉ có cách nhân vật đối diện với sự im lặng được người nhập vai thăm dò.',
   'SYSTEM: KẾT THÚC BẢN THỬ · KHÔNG THAY ĐỔI TÁC PHẨM.',[],'ending-distance')
 ];
 const byId=id=>pages.find(p=>p.sceneId==='scene-'+id);
 byId('entry').roleScenes={
  'entry-tu-du':{narration:'HỆ THỐNG / ĐỒNG BỘ KÝ ỨC. Bạn chọn Khương Tử Du, mười hai tuổi. Chương 3–5 đã ở phía sau. Điểm đầu là cổng trường số 3; sau hiệu phó và cô Tần sẽ là lớp 7B. Đêm văn nghệ tuổi 15 và quán net tuổi 17 sẽ chỉ xuất hiện sau khi bạn đi qua những năm tháng trung gian.',choiceLabels:{'enter-school-entry':'Vào truyện ở tuổi 12: xe đưa Tử Du tới cổng trường.'}},
  'entry-luc-thien':{narration:'HỆ THỐNG / ĐỒNG BỘ KÝ ỨC. Bạn chọn Lục Thiển, hai mươi lăm tuổi, bắt đầu ở chương 7 khi Tử Du đã mười bảy. Những năm lớp 7B là chuyện xảy ra trước điểm vào của bạn. Địa điểm là phòng VIP 01 trong một chiều mưa; bạn mang canh và báo cáo pháp lý.',choiceLabels:{'enter-lawyer-entry':'Vào truyện ở tuổi Tử Du 17: đến phòng VIP với hồ sơ.'}},
  'entry-classmate':{narration:'HỆ THỐNG / ĐỒNG BỘ KÝ ỨC. Bạn là học sinh bản địa lớp 7B trong năm Tử Du mười hai tuổi. Bạn chỉ biết trường lớp, không biết ký ức chuyển sinh hay bí mật tài chính. Cô Tần sắp dẫn học sinh mới vào.',choiceLabels:{'enter-classmate-entry':'Vào truyện ở lớp 7B khi cô Tần dẫn học sinh mới tới.'}},
  'entry-cover':{narration:'HỆ THỐNG / THÂN PHẬN CHƯA XÁC MINH. Bạn ở cùng năm Tử Du mười hai tuổi, trước cổng trường. Tên “người phụ việc thư viện” không phải giấy tờ thật và không thể mở lớp học. Hệ thống chỉ cho bắt đầu lượt quan sát ở đúng ngày này.',choiceLabels:{'enter-school-entry':'Tới cổng trường trong buổi chiều hiện tại; chưa được vào lớp.'}}
 };
 byId('gate').roleScenes={
  'entry-tu-du':{narration:'Tử Du vừa bước xuống xe của văn phòng luật sư trước cổng trường. Em không phân biệt được khuôn mặt bác bảo vệ, chỉ nghe giọng khàn và mùi thuốc lá rất nhạt. Trên tay là hồ sơ tự lập mà Lục Thiển đã chuẩn bị. Không thể bỏ qua hiệu phó rồi tự vào lớp; em cần người tiếp nhận thật.',choiceLabels:{'begin-enrolment':'Đưa hồ sơ cho người phụ trách, tới gặp hiệu phó.'}},
  'entry-cover':{narration:'Bạn nhận một hồ sơ thử nghiệm “người phụ việc thư viện cộng đồng” mà hệ thống nhập vai vừa cấp. Hồ sơ không có xác minh tại địa phương, không mở được cổng trường hay tài khoản học sinh. Đây là một buổi chiều ở thời điểm Tử Du vừa tới trường, không phải vé đi trước vài năm.',dialogue:'Bác bảo vệ hỏi: “Giấy giới thiệu thật của cô đâu? Chưa có thì xin đứng bên ngoài cổng.”',choiceLabels:{'ask-public-way':'Hỏi đường đến thư viện công cộng; không xin vào lớp.'}}
 };
 byId('admission').roleScenes={
  'entry-tu-du':{narration:'Tử Du nghe tiếng con dấu ấn xuống giấy. Thầy hiệu phó xác nhận hồ sơ, rồi giới thiệu cô Tần Tuệ. Em ghi nhớ chất giọng thanh mảnh và mùi bồ kết của cô, chứ không phải đường nét khuôn mặt. Lúc cô dẫn em tới tầng ba, tiếng giày gõ lên xi măng đều đều.',dialogue:'Tần Tuệ: “Khương Tử Du, đi cùng cô. Lớp 7B đang học; đừng để các bạn đợi.”'}
 };
 byId('classroom').roleScenes={
  'entry-tu-du':{narration:'Tử Du bước theo cô Tần vào lớp, kéo ghế cạnh cửa sổ. Bên cạnh là một bạn nữ có giọng trong trẻo, mùi xà phòng sạch. Em chưa biết bạn tên Tinh Dao, chưa nghe chuyện về mẹ bạn và cũng chưa nhận củ khoai nào. Em nhận biết bạn bằng âm thanh, không bằng khuôn mặt.'},
  'entry-classmate':{narration:'Bạn đã học lớp 7B từ đầu học kỳ. Cô Tần vừa dẫn bạn mới Khương Tử Du tới bàn cạnh Hạ Tinh Dao. Bạn biết lịch học và tiếng hát của Tinh Dao, nhưng không biết chuyện xét nghiệm huyết thống hay các gia tộc ở phương Bắc. Hôm nay chỉ mới là ngày nhập học của người bạn ấy.',dialogue:'Cô Tần nhắc cả lớp: “Các em để bạn mới ổn định chỗ ngồi, đừng vây lại hỏi chuyện riêng.”'}
 };
 byId('meal').roleScenes={
  'entry-tu-du':{narration:'Sau nhiều ngày Tử Du học ở 7B, Tinh Dao quen với sự ít nói của em. Củ khoai nóng được đẩy sang bàn vào một giờ trưa mùa đông. Em nhận ra Tinh Dao qua tiếng nói và mùi xà phòng, rồi cầm một miếng nhỏ; cô bạn nhìn khối rubik với vẻ thích thú.',dialogue:'Tinh Dao cười: “Tớ học hát đã khó rồi, còn khối rubik của cậu chắc tớ chịu thua!”'},
  'entry-classmate':{narration:'Bạn thấy một thói quen mới hình thành: giờ ra chơi Tinh Dao hát; trưa lạnh thì cô chia khoai cho bạn mới. Bạn có thể giúp xếp sách hoặc lắng nghe. Những điều diễn ra trong hồ sơ gia tộc của Tử Du không thuộc tri thức của bạn.'}
 };
 byId('teacher').roleScenes={
  'entry-tu-du':{narration:'Đã trải qua nhiều bài kiểm tra và nhiều lần ngủ gục trên lớp, Tử Du bị cô Tần giữ lại vào một chiều mùa hạ. Em nghe tiếng quạt trần cọt kẹt và mùi bánh mì nóng; hộp sữa được đẩy qua bàn như một lời trách yêu. Điều em nhận ra là sự lo lắng thật lòng.'},
  'entry-classmate':{narration:'Một chiều cuối năm học, bạn thấy cô Tần giữ Tử Du lại sau buổi trả bài. Bạn không nghe cuộc nói chuyện trong phòng giáo viên, chỉ biết cô vẫn chăm lo cho học sinh dù em thường xuyên bỏ bữa. Bạn tiếp tục giúp lớp trực nhật.'}
 };
 byId('walk').roleScenes={
  'entry-tu-du':{narration:'Những mùa bạch đàn đã qua. Tử Du giờ mười lăm tuổi, quen bước cùng Tinh Dao trên triền đê sau giờ học. Em nhận ra cô bằng tiếng hát cất lên giữa tiếng gió. Mối quan hệ đã lớn lên trong vài năm, không phải chỉ sau một buổi trưa chia khoai.'},
  'entry-classmate':{narration:'Đã vài năm kể từ ngày bạn mới vào lớp. Bạn chứng kiến Tinh Dao luyện hát và Tử Du lặng lẽ ngồi bên cửa sổ. Những buổi tan học, đôi bạn thường đi ra triền đê. Bạn chỉ biết những gì bạn học bình thường có thể trông thấy.'}
 };
 byId('rehearsal').roleScenes={
  'entry-tu-du':{narration:'Năm mười lăm tuổi, Tử Du ngồi khuất sau sân khấu đêm văn nghệ. Giọng Hạ Tinh Dao vừa ngừng hát và tiếng chân cô vội tìm đến dưới hàng bạch đàn. Em nhận ra tiếng thở gấp của người bạn đã quen suốt mấy năm, rồi nghe lời mời đi cùng khi cô sắp thi tuyển.'},
  'entry-classmate':{narration:'Bạn phụ dọn đạo cụ sau buổi diễn gây quỹ. Tinh Dao, giờ đã mười lăm tuổi, chạy tìm Tử Du ở rặng bạch đàn. Bạn thấy họ đứng lại nói chuyện nhưng không nghe lời tỏ bày riêng; bạn biết phải để họ tự xử lý.',dialogue:'Một bạn trong lớp thì thầm: “Đừng theo trêu, Tinh Dao đang có chuyện quan trọng.”'}
 };
 byId('farewell').roleScenes={
  'entry-tu-du':{narration:'Tử Du khuyên Tinh Dao đi theo ước mơ ca hát, nhưng đã từ chối đi cùng. Em nghe tiếng bước chân cô chạy xa, tiếng nấc và tiếng tàu quặng. Khối rubik lách cách trong tay. Đây là lựa chọn của Tử Du đã ghi trong Canon, không phải nút để người chơi thay thành đồng ý.'},
  'entry-classmate':{narration:'Bạn không đứng cạnh khi Tinh Dao và Tử Du nói chuyện. Chỉ thấy cô bạn chạy về sau sân khấu với đôi mắt đỏ, rồi mọi người giải tán. Bạn không biết chính xác câu nói nào đã diễn ra; bạn không thể tự đổi lời của hai người.',choiceLabels:{'leave-as-classmate':'Theo các bạn về nhà sau hội diễn, giữ riêng tư cho Tinh Dao.'}}
 };
 byId('town-walk').roleScenes={
  'entry-cover':{narration:'Chỉ được đứng ở đường công cộng quanh trường trong chiều đông này, bạn đi theo bảng chỉ dẫn đến thư viện thị trấn. Không có lời gọi dịch chuyển ba hay năm năm về tương lai. Hệ thống chưa xác minh giấy giới thiệu, và bác bảo vệ không cho bạn vào lớp.',choiceLabels:{'visit-public-library':'Tôi vào thư viện xem bảng tin công cộng.','ask-public-station':'Tôi hỏi người bán nước về tàu quặng.'}}
 };
 byId('netroom').roleScenes={
  'entry-tu-du':{narration:'Hai năm sau đêm văn nghệ, Tử Du đã mười bảy tuổi. Căn phòng VIP 01 thuê theo năm là nơi em làm mã CryoTech và tránh ồn ào. Không phải em vừa rời bàn học 7B để đến đây: cả quãng đường trưởng thành đã được kể, cùng lời từ chối Tinh Dao trước đó.'}
 };
 byId('contract').roleScenes={
  'entry-tu-du':{narration:'Lục Thiển mang canh gà và báo cáo quý tới VIP01 trong chiều mưa năm Tử Du mười bảy tuổi. Em nhận ra cô bằng giọng nói dứt khoát và mùi hoa huệ trắng. Bản thử không trao quyền chuyển tài sản; em chỉ nghe báo cáo và tiếp tục sinh hoạt đời thường.'},
  'entry-luc-thien':{narration:'Bạn là Lục Thiển, hai mươi lăm tuổi, đã đại diện pháp lý cho Tử Du năm năm. Một chiều mưa, bạn mang canh gà và báo cáo quý Vạn Yên đến phòng VIP 01 của em, lo em lại bỏ bữa. Bạn biết phạm vi hợp đồng ủy quyền và quý trọng em, nhưng không biết ký ức chuyển sinh của em.',dialogue:'Tử Du đáp từ bàn máy: “Em chưa đói. Chị cứ để báo cáo trên bàn.”'}
 };
 byId('ceremony').roleScenes={
  'entry-luc-thien':{narration:'Bạn vừa hoàn thành bàn giao điểm trường thứ một trăm của Vạn Yên ở miền núi phía Bắc. Tử Du đứng gần đó. Cuối thu, bạn đưa em về trên chiếc xe của mình; đường vắng dần khi mưa lớn kéo tới. Đây là một chuyến đi khác, không phải cùng buổi báo cáo ở VIP01.'}
 };
 byId('river').roleScenes={
  'entry-tu-du':{narration:'Mưa rơi dày ngoài xe. Lục Thiển vừa thổ lộ muốn Tử Du đến sống cùng cô. Em nghe giọng run rẩy và cảm nhận bàn tay cô siết lấy tay mình. Tử Du đã rút tay, nói rõ em không muốn ràng buộc tình cảm. Cô lau nước mắt, xác nhận vẫn làm công việc pháp lý. Lựa chọn còn lại chỉ là cách khép cuộc trò chuyện, không thể đảo lời từ chối.'},
  'entry-luc-thien':{narration:'Bạn là Lục Thiển. Trong xe ven sông, bạn đã bày tỏ tình cảm và đề nghị Tử Du sống cùng. Em từ chối rõ ràng; bạn đau lòng, đã khóc rồi lấy lại bình tĩnh. Bạn vẫn giữ lời hoàn thành hợp đồng pháp lý. Bây giờ bạn chỉ chọn cách tiếp tục sau câu trả lời ấy, không được coi việc nghe thêm là đồng ý.',dialogue:'Tử Du nói: “Chị xứng đáng có cuộc sống của chị. Em quen ở một mình.”',choiceLabels:{'protect-quiet':'Hít sâu, để lại một khoảng yên lặng rồi lái xe.','stay-and-listen':'Xác nhận sẽ tiếp tục ủy quyền như cũ, không nhắc chuyện tình cảm.','leave-early':'Lái xe đưa Tử Du về VIP01 trước khi trời mưa nặng hơn.'}}
 };
 // G5C-P7.2: Narrative is always told from the SELECTED character's
 // first-person perception. Canon facts remain anchors, never omniscient
 // information granted to another role.
 const pov=(sceneId,entryId,narration,choiceLabels)=>{
  const current=byId(sceneId);
  current.roleScenes??={};current.roleScenes[entryId]??={};
  current.roleScenes[entryId].narration=narration;
  if(choiceLabels)current.roleScenes[entryId].choiceLabels={
   ...current.roleScenes[entryId].choiceLabels,...choiceLabels};
 };
 const tuDuPov=[
  ['gate','Gió đầu đông quất vào cổ áo khi tôi bước xuống xe. Phía bên kia đường, đoàn tàu quặng kéo một hồi còi dài; bụi than bám lên những thanh sắt ở cổng trường số 3. Một giọng đàn ông khàn khàn gọi tôi lại. Mùi thuốc lá thoảng qua, đủ để lần sau nhận ra ông dù gương mặt vẫn chỉ là những đường nét nhòe.\n\nTập hồ sơ chị Lục đưa nằm gọn trong ba lô. Tôi siết quai túi, bước về phía phòng trực. Ngày đầu ở một nơi xa lạ, điều tôi mong nhất chỉ là được ngồi yên trong lớp.'],
  ['admission','Tôi nghe tiếng giấy lật sột soạt, rồi con dấu gõ xuống mặt bàn một tiếng khô khốc. Thầy hiệu phó đẩy hồ sơ trở lại; thủ tục cuối cùng cũng xong.\n\n“Em là Tử Du phải không?” Một giọng phụ nữ trẻ cất lên ở cửa. Mùi bồ kết rất nhẹ theo cô tới gần. Cô tự giới thiệu tên Tần Tuệ, nhận dẫn tôi lên lớp 7B. Trên cầu thang, tiếng giày cô gõ đều trên nền xi măng. Tôi lặng lẽ ghi nhớ nhịp bước ấy.'],
  ['classroom','Tôi kéo chiếc ghế cuối lớp, cạnh cửa sổ. Ngoài kia, hàng bạch đàn rung lên trong gió lạnh. Tiếng phấn của cô Tần lướt trên bảng; vài bạn phía sau vẫn thì thầm về học sinh mới.\n\nNgười ngồi cạnh nhích sách sang một bên. Mùi xà phòng sạch và giọng nói trong trẻo đến từ phía tay trái. Tôi chưa biết tên cô ấy, chỉ biết cô đã chừa cho mình một góc bàn. Chẳng hiểu sao, cử chỉ nhỏ ấy làm buổi sáng dễ thở hơn.'],
  ['class-talk','“Cậu tên gì?” Tôi hỏi người ngồi bên cạnh, mắt vẫn nhìn trang vở mới mở.\n\n“Hạ Tinh Dao.” Cô đáp ngay, giọng nhẹ như đang cố nén một nụ cười. Cô đẩy quyển sách về giữa bàn, dùng đầu bút chỉ chỗ cô Tần vừa giảng. Tôi gật đầu. Từ đầu buổi đến giờ, đây là lần đầu tôi thấy mình không hoàn toàn lạc lõng.'],
  ['class-quiet','Tôi mở vở, giả vờ chăm chú vào những dòng chữ đầu tiên. Người bên cạnh im lặng một lúc, rồi nhẹ nhàng đẩy sách về phía tôi để cùng nhìn bài. Không hỏi tên, không tò mò vì sao tôi chuyển trường.\n\nNgoài cửa sổ, tiếng gió lùa qua tán bạch đàn. Tôi khẽ đẩy quyển sách lại cho ngay ngắn; cô ấy hiểu đó là lời cảm ơn.'],
  ['meal','Vài tuần trôi qua, tôi đã quen đường từ cổng trường đến lớp 7B, quen cả tiếng cô bạn cạnh cửa sổ hát khe khẽ mỗi giờ nghỉ. Hôm ấy trời lạnh đến mức hơi thở đọng trắng trên cửa kính.\n\n“Này, ăn đi.” Tinh Dao đặt nửa củ khoai còn nóng xuống cạnh khối rubik của tôi. Mùi khoai bở ngọt quyện với mùi xà phòng quen thuộc. Tôi định từ chối, nhưng bụng lại réo đúng lúc. Cô bật cười, còn tôi đành bẻ một miếng nhỏ.'],
  ['meal-care','“Mẹ cậu dạo này đỡ ho chưa?” Câu hỏi vừa bật ra, tôi đã thấy Tinh Dao ngừng tay bóc vỏ khoai.\n\n“Vẫn phải uống thuốc. Nhưng bà đỡ hơn trước rồi.” Cô cúi xuống, gấp lớp giấy gói cho thật phẳng, rồi nhanh chóng hỏi sang bài toán hôm qua. Tôi không gặng thêm. Chỉ đặt phần khoai còn lại gần cô hơn; có những chuyện ngồi cạnh nhau cũng đã là một cách an ủi.'],
  ['meal-music','Tôi xoay một mặt rubik thật chậm. Tinh Dao chống cằm nhìn, làm thử theo rồi kêu lên khi ba ô màu vừa xếp thẳng lại rối tung. Cô phụng phịu một lúc, cuối cùng bật cười, ngân nga mấy nốt trong cổ họng.\n\nTôi trả khối rubik cho cô thử lần nữa. Tiết học sắp bắt đầu; chúng tôi vẫn chưa giải xong mặt màu đầu tiên, nhưng bàn học hôm ấy vui hơn mọi ngày.'],
  ['teacher','Tôi cứ tưởng điểm tối đa sẽ giúp mình tránh được một buổi nghe mắng. Hóa ra cô Tần gọi tôi ở lại không phải vì bài kiểm tra.\n\n“Em định lấy điểm số thay cơm à?” Tiếng quạt trần cọt kẹt phía trên đầu. Cô đặt trước mặt tôi hộp sữa ấm và ổ bánh mì bọc giấy bạc, rồi quay đi thu bài như chẳng có chuyện gì. Mùi bơ làm bụng tôi cồn cào. Tôi cầm bánh, lí nhí cảm ơn, bỗng thấy cổ họng hơi nghẹn.'],
  ['walk','Ba năm, chẳng biết bao nhiêu chuyến tàu quặng đã đi qua rặng bạch đàn ấy. Tôi giờ mười lăm tuổi. Tinh Dao đi bên cạnh, vừa bước vừa ngân nga một giai điệu chưa đặt tên.\n\n“Cuối tuần đến nghe tớ hát nhé?” Cô hỏi, rồi đá một viên sỏi xuống triền đê. Tôi đã quen với tiếng bước chân cô sau giờ học, quen cả những lúc hai đứa chẳng nói gì. Có lẽ vì thế, lời mời bình thường ấy lại khiến tôi do dự lâu hơn một nhịp.'],
  ['rehearsal','Tôi đứng dưới rặng bạch đàn, để tiếng vỗ tay trong hội trường lắng dần. Khối rubik tróc sơn nằm trong lòng bàn tay. Tinh Dao vừa hát xong; tôi vẫn nghe được hơi thở chưa đều của cô khi tiếng chân chạy đến gần.\n\n“Đoàn nghệ thuật tỉnh sắp tuyển sinh,” cô nói thật nhanh, như sợ chậm một nhịp sẽ mất hết can đảm. “Nếu tớ được nhận… cậu đi cùng tớ được không?”\n\nGió xào xạc trên đầu. Tôi nhìn những ô màu chưa xếp xong, biết cô đang đợi một câu trả lời thật.'],
  ['whatif-tinhdao','“Ừ. Chúng ta thử đi cùng nhau.”\n\nChính tôi cũng ngạc nhiên khi những lời ấy rời khỏi miệng. Tinh Dao đứng sững, rồi hỏi dồn: “Còn trường học? Còn mẹ tớ? Vé tàu nữa?” Cô vừa cười vừa lo, nắm chặt quai túi đến trắng cả đầu ngón tay.\n\nTôi không có sẵn câu trả lời nào. Chúng tôi ngồi xuống bậc thềm, lấy một tờ giấy nháp ghi những việc cần làm trước chuyến đi. Lần đầu tiên, tương lai không chỉ có một người. Và chính vì thế, nó cũng khó hơn tôi tưởng.'],
  ['farewell','“Tinh Dao, cậu nên đi. Sân khấu ngoài kia đang chờ cậu.”\n\nTôi nói chậm, nhưng không giữ cô ở lại cùng mình. Những ngón tay đang níu vạt áo tôi buông ra. Cô quay đi trước khi tôi kịp nói thêm; tiếng bước chân xa dần giữa tiếng tàu quặng hú dài.\n\nKhối rubik lách cách trong tay. Tôi đã nghĩ im lặng sẽ khiến mọi chuyện nhẹ nhàng hơn. Hóa ra có những lời không nói vẫn làm người ta đau.'],
  ['netroom','Hai năm trôi qua từ đêm diễn ấy. Năm mười bảy tuổi, tôi sống gần như cả ngày trong phòng VIP số 01 thuê dài hạn. Ba màn hình chạy mã CryoTech, quạt máy tính rì rì suốt đêm; ngoài lớp cửa cách âm là tiếng người chơi game vọng rất xa.\n\nMưa bắt đầu đập vào mái tôn từ lúc nào chẳng rõ. Tôi đang rà một dòng lỗi thì có tiếng gõ cửa ba nhịp. Không cần ngẩng đầu, tôi đã biết ai đến.'],
  ['contract','Cửa mở, mùi hoa huệ trắng theo chị Lục vào phòng. Một tay chị xách cặp tài liệu Vạn Yên, tay kia giữ cặp lồng canh cho khỏi sóng sánh.\n\n“Em đã ăn gì chưa?” Chị hỏi trước cả khi đặt hồ sơ xuống. Tôi nhìn đồng hồ, mới nhận ra mình quên bữa trưa. Đúng lúc ấy, chị đặt bát canh nóng cạnh bàn phím, còn tập báo cáo nằm ngay ngắn bên tay phải. Tôi biết nếu không chọn một thứ trước, chị sẽ đứng đó nhìn mãi.'],
  ['lawyer-care','Tôi đón bát canh từ tay chị Lục. Hạt sen mềm, nước vẫn còn nóng nên phải thổi mấy lần mới ăn được. Chị tựa lưng vào ghế, cuối cùng chịu thôi nhìn những màn hình xanh.\n\n“Ngon không?”\n\n“Chị nấu mà còn hỏi?” Tôi đáp. Chị bật cười. Tập báo cáo vẫn chờ trên bàn; nhưng trong ít phút, căn phòng không chỉ có tiếng gõ phím và những con số.'],
  ['lawyer-report','“Chị cho em xem báo cáo trước nhé.” Tôi kéo ghế lại gần màn hình phụ.\n\nChị Lục đọc qua những điểm trường và khoản học bổng đã giải ngân, dừng ở từng số liệu tôi hỏi. Bát canh bên cạnh nguội dần. Khi đóng trang cuối, chị gõ nhẹ lên thành bát: “Xong việc rồi thì ăn.” Tôi định cãi, nhưng lần này đành nghe.'],
  ['ceremony','Cuối thu, gió trên cao nguyên lạnh hơn tôi tưởng. Từ chỗ đứng bên mép sân, tôi nghe tiếng trẻ con cười trong ngôi trường mới của Quỹ Vạn Yên. Chị Lục bàn giao nốt giấy tờ, rồi tìm tôi giữa nhóm người chụp ảnh.\n\n“Về thôi em, trời sắp mưa.”\n\nĐường núi dài hun hút. Tôi tựa đầu vào cửa kính, nhìn vệt đèn xe quét qua những thân cây ướt đẫm.'],
  ['river','Chị Lục cho xe dừng ở đoạn đường an toàn bên sông. Mưa quét qua kính thành những vệt trắng. Trong ánh sáng lờ mờ của bảng đồng hồ, giọng chị nhỏ hơn mọi khi.\n\n“Hay là… em đến sống cùng chị? Có người chăm sóc cũng đỡ hơn mà.”\n\nTôi nghe hơi thở chị run. Bàn tay chạm vào tay mình rất khẽ. Tôi rút tay về, lựa lời nói rằng mình không thể đáp lại điều chị mong. Phía ghế lái im lặng thật lâu. Đến lúc lên tiếng, chị chỉ bảo vẫn sẽ lo công việc như đã hứa. Tôi nhìn ra màn mưa, không biết nói gì để nỗi buồn ấy vơi đi.'],
  ['quiet','Tôi không nói thêm. Chỉ còn tiếng cần gạt nước chạy đều và tiếng mưa trên mui xe. Một lúc sau, tôi hỏi chị Lục có đủ tỉnh táo để lái tiếp không.\n\n“Chị ổn.” Giọng chị khàn đi, nhưng chắc chắn. Tôi ngồi yên, để chị có khoảng riêng mà không bỏ mặc chị giữa đường.'],
  ['listen','Tôi để chị Lục nói hết, dù phần lớn là những chuyện đã thuộc lòng: chuyến bàn giao kế tiếp, lịch họp của Vạn Yên, tập hồ sơ còn dang dở.\n\nCó lẽ chị cần một điều gì quen thuộc để lấy lại bình tĩnh. Tôi trả lời từng câu hỏi công việc, không hứa hẹn gì ngoài điều mình thật sự có thể làm.'],
  ['distance','Tôi nhờ chị Lục đưa về phòng VIP số 01. Không ai bật nhạc. Những ngọn đèn ven đường trượt qua cửa kính, thoắt sáng rồi tắt.\n\nMàn hình ở quán net chắc vẫn còn chờ bản vá bảo mật. Nhưng tối nay, tôi biết mình sẽ khó tập trung vào nó. Tôi không thể nói một lời đồng ý chỉ vì sợ người khác buồn.']
 ];
 for(const [sceneId,narration] of tuDuPov)pov(sceneId,'entry-tu-du',narration);
 const classmatePov=[
  ['classroom','Cô Tần vừa vào lớp, cả phòng lập tức im bặt. Sau lưng cô là một bạn nam mang ba lô cũ, đứng ngay ngắn đến mức trông hơi lạc lõng. “Bạn Khương Tử Du mới chuyển đến,” cô giới thiệu.\n\nTôi nhìn sang bàn Tinh Dao. Còn một chỗ trống cạnh cửa sổ; cô ấy đã nhích sách vở sang bên. Tử Du ngồi xuống mà chẳng hề nhìn quanh như những học sinh mới khác. Tôi định hỏi chuyện, rồi thấy bạn đang cố mở vở cho kịp bài giảng.'],
  ['class-talk','Tôi đẩy quyển vở chép bài qua mép bàn. “Nãy cô giảng đến đây, cậu xem tạm nhé.”\n\nTử Du ngẩng lên theo tiếng tôi, cảm ơn rất khẽ. Tinh Dao nghiêng người, cười: “Có gì khó thì hỏi bọn mình.” Cô Tần quay lại bảng; cả ba vội cúi xuống. Tôi thấy bạn mới đã thôi nắm chặt quai ba lô.'],
  ['class-quiet','Tôi định gọi bạn mới, nhưng Tử Du đang chăm chú vào trang sách trắng. Thôi, ngày đầu chuyển trường chắc cũng mệt.\n\nTinh Dao chỉ nhẹ vào dòng cô Tần vừa giảng, còn tôi tiếp tục chép bài. Giữa tiếng phấn cọ bảng, chiếc ghế sát cửa sổ dần thôi lạ lẫm. Có lẽ mai hỏi tên cũng chưa muộn.'],
  ['meal','Mấy tuần sau, chiếc ghế mới đã thành một phần của lớp 7B. Giờ nghỉ, Tinh Dao hay ngồi bên cửa sổ hát vu vơ, còn Tử Du cứ xoay khối rubik đến lách cách.\n\nTrưa lạnh, tôi đang xếp vở thì thấy Tinh Dao bẻ đôi củ khoai, đặt một nửa cạnh tay bạn. Tử Du nhìn xuống; bụng cậu ấy kêu một tiếng rất nhỏ. Tôi suýt bật cười, đành quay mặt đi.'],
  ['meal-care','“Mẹ cậu khỏe hơn chưa, Tinh Dao?” Tôi hỏi trong lúc gấp lại hộp bút.\n\nCô ấy im vài giây, rồi đáp thuốc đã đỡ tốn hơn chút, nhưng còn phải đi khám. Tôi không biết an ủi sao cho phải, chỉ đẩy chai nước của mình về phía bạn. Tinh Dao cười, hỏi ngược lại bài kiểm tra Toán. Không khí bàn học nhẹ đi.'],
  ['meal-music','Tôi rủ Tinh Dao hát một đoạn ngắn lúc cô Tần chưa vào lớp. Cô ấy giả vờ nghiêm mặt, rồi ngân lên vài nốt. Tử Du đang xoay rubik bỗng dừng tay, chỉ cho cô cách đưa một ô màu về đúng chỗ.\n\n“Ê, đừng làm rối lại!” Tôi kêu. Cả bàn bật cười. Chẳng ai để ý tiếng chuông vào học đã reo từ lúc nào.'],
  ['teacher','Tôi trực nhật muộn hôm ấy, cây chổi còn dựng ở cửa lớp. Cô Tần gọi Tử Du ở lại. Bạn ấy mang theo bài kiểm tra điểm cao nhất, nhưng nhìn mệt mỏi như vừa thức cả đêm.\n\nTừ hành lang, tôi thấy cô đặt lên bàn một hộp sữa và bánh mì. Cửa phòng khép lại trước khi tôi nghe thêm. Tôi ôm chổi xuống cầu thang, tự nhủ mai sẽ nhắc bạn đừng bỏ bữa nữa.'],
  ['walk','Ba năm trôi qua. Lớp 7B cũ giờ mỗi người một chuyện: bài thi, câu lạc bộ, những lần bị cô Tần gọi lên bảng. Tôi vẫn nghe Tinh Dao hát trong hành lang, giọng cô ấy đã khiến cả trường phải dừng lại nghe.\n\nTan học, tôi thấy Tử Du và Tinh Dao đi về phía triền đê. Có hôm họ nói chuyện rất lâu, có hôm chỉ bước cạnh nhau. Tôi quay lại sân bóng với nhóm bạn; tuổi mười lăm của chúng tôi đâu chỉ có mỗi câu chuyện ấy.'],
  ['rehearsal','Đêm gây quỹ, tôi phụ nhóm lớp cuộn dây đèn và khiêng phông sân khấu. Tinh Dao hát xong, tiếng vỗ tay còn vang cả ngoài hành lang. Cô ấy chạy vội qua sân tìm Tử Du dưới rặng bạch đàn.\n\nMấy đứa bạn định chạy theo trêu. “Ê, thôi đi,” tôi gọi, tay vẫn giữ cuộn dây. Tôi không biết họ sắp nói gì; chỉ thấy Tinh Dao đã gom hết can đảm mới dám bước tới đó.'],
  ['farewell','Tôi gỡ nốt tấm phông cuối cùng thì thấy Tinh Dao quay về. Mắt cô ấy đỏ, môi mím chặt. Đằng xa, dưới hàng cây, Tử Du vẫn đứng một mình.\n\n“Tinh Dao, uống nước không?” Tôi đưa chai nước sang. Cô lắc đầu rồi nhận lấy, im lặng một lúc lâu. Tôi không hỏi thêm; những chuyện riêng đôi khi chẳng cần cả lớp biết.'],
  ['school-end','Đèn hội trường tắt dần. Tôi đi bộ về cùng mấy bạn lớp cũ, vừa đi vừa bàn xem tuần sau cô Tần có kiểm tra đột xuất không.\n\nTinh Dao sắp đi thử giọng ở tỉnh. Tử Du lại lặng lẽ như mọi khi. Còn tôi phải chuẩn bị bài thuyết trình sáng thứ Hai. Tiếng còi tàu vọng qua rặng bạch đàn; một đêm đáng nhớ khép lại, nhưng ngày mai cuộc sống của chúng tôi vẫn tiếp tục.']
 ];
 for(const [sceneId,narration] of classmatePov)pov(sceneId,'entry-classmate',narration);
 pov('classroom','entry-classmate',classmatePov[0][1],{
  'class-engage':'Tôi chủ động đưa vở cho bạn mới và giới thiệu mình.',
  'class-observe':'Tôi để bạn mới yên, giúp khi bạn ấy cần.'});
 pov('classroom','entry-tu-du',tuDuPov.find(p=>p[0]==='classroom')[1],{
  'class-engage':'Tôi chào cô bạn cùng bàn, hỏi tên cô ấy.',
  'class-observe':'Tôi mở vở, chưa muốn trò chuyện lúc này.'});
 pov('meal','entry-classmate',classmatePov.find(p=>p[0]==='meal')[1],{
  'share-care':'Tôi hỏi Tinh Dao về mẹ cô ấy.',
  'share-music':'Tôi rủ Tinh Dao hát một đoạn, cùng xem khối rubik.'});
 pov('meal','entry-tu-du',tuDuPov.find(p=>p[0]==='meal')[1],{
  'share-care':'Tôi hỏi Tinh Dao về sức khỏe mẹ cô.',
  'share-music':'Tôi chỉ Tinh Dao xoay một mặt rubik.'});
 pov('rehearsal','entry-classmate',classmatePov.find(p=>p[0]==='rehearsal')[1],{
  'listen-invitation':'Tôi ngăn các bạn trêu, tiếp tục dọn đạo cụ ở xa.'});
 pov('rehearsal','entry-tu-du',tuDuPov.find(p=>p[0]==='rehearsal')[1],{
  'listen-invitation':'Tôi để Tinh Dao đi theo ước mơ, còn mình ở lại.',
  'imagine-with-tinhdao':'Tôi nhận lời đi cùng Tinh Dao (nhánh giả định).'});
 const lawyerPov=[
  ['contract','Tôi gõ ba nhịp lên cánh cửa VIP01. Mãi đến nhịp cuối mới nghe tiếng “Vào đi” vọng ra sau lớp kính cách âm.\n\nTử Du vẫn ngồi trước ba màn hình. Cậu bé tôi nhận chăm lo công việc năm năm trước giờ đã cao gần bằng mình, nhưng thói quen quên ăn chẳng đổi. Tôi đặt cặp tài liệu Vạn Yên xuống, mở nắp canh hạt sen. Hương nóng bốc lên, em vẫn không rời mắt khỏi dòng mã. Tôi đứng chờ một lúc, cân nhắc có nên mở hồ sơ trước để em chịu chú ý hay cứ bắt em ăn đã.'],
  ['lawyer-care','Tôi gấp tập báo cáo, kéo ghế ngồi cạnh. “Ăn vài miếng đi, rồi chị đọc số liệu cho.”\n\nTử Du thở dài như thể vừa bị giao một việc khó nhất đời, cuối cùng vẫn cầm thìa. Hơi nóng làm kính em mờ đi; tôi bật cười, em liếc sang. Đã lâu rồi chúng tôi mới có vài phút không cần nói tới hợp đồng hay những khoản giải ngân.'],
  ['lawyer-report','Tôi mở tập báo cáo quý ở trang đã đánh dấu. Tử Du nghiêng màn hình để nhìn rõ bảng đối chiếu. Chúng tôi rà từng điểm trường, từng khoản học bổng; em hỏi ít nhưng trúng chỗ cần hỏi.\n\nĐến trang cuối, canh đã nguội bớt. Tôi đóng hồ sơ, đẩy bát đến gần em. “Phần việc xong rồi. Giờ đến phần chị giao.” Em nhìn tôi bất lực, nhưng khóe miệng hơi nhếch lên.'],
  ['ceremony','Tôi ký xong biên bản bàn giao điểm trường thứ một trăm, cẩn thận cất bản lưu vào cặp. Trẻ con chạy qua sân với những chiếc khăn quàng còn mới, tiếng cười lẫn vào gió lạnh vùng cao.\n\nTử Du đứng ở mép sân, tránh nhóm người chụp hình. Tôi gọi em ra xe khi mây đen đùn lên phía đèo. Đường trở về dài hơn dự tính, còn mưa thì chẳng có dấu hiệu ngớt.'],
  ['river','Mưa nặng hạt quá, tôi tấp xe vào chỗ dừng an toàn bên sông. Trong khoang xe kín, tiếng gạt nước nghe rõ đến khó chịu.\n\nBao lần tôi định nói rồi lại thôi. Cuối cùng, tôi quay sang Tử Du: “Em có nghĩ… đến ở cùng chị sẽ tốt hơn không?” Em im lặng, rồi nhẹ nhàng rút tay khỏi tay tôi. Câu trả lời rõ ràng và dịu dàng đến mức tôi không thể trách.\n\nTôi quay nhìn màn mưa, để nước mắt rơi một lúc. Khi đã nói được thành tiếng, điều đầu tiên tôi nhắc vẫn là công việc: “Các hồ sơ của em, chị sẽ lo như trước.”'],
  ['quiet','Tôi hít thật sâu, lau nhanh khóe mắt rồi kiểm tra gương chiếu hậu. Mưa đã nhẹ hơn. Tử Du ngồi yên bên cạnh, không cố nói một lời an ủi vụng về.\n\n“Chị lái được chứ?” em hỏi. Tôi gật đầu. Có những câu trả lời phải mất thời gian mới chấp nhận được; ít nhất, đêm nay tôi sẽ đưa em về an toàn.'],
  ['listen','Tôi lật lại lịch làm việc trên điện thoại, giọng vẫn còn hơi run. Nhắc đến những hồ sơ đang chờ, đầu óc cuối cùng cũng sáng rõ hơn.\n\nTử Du trả lời từng chuyện công việc như mọi ngày. Em không nói điều gì khiến tôi hiểu lầm. Tôi cất điện thoại, nổ máy, để chuyến xe đưa cả hai trở lại nhịp sống quen thuộc.'],
  ['distance','Tôi đưa Tử Du về phòng VIP01. Đèn đường kéo thành những vệt dài trên mặt kính ướt. Em cảm ơn khi xuống xe, giọng nhỏ và mệt.\n\nTôi ngồi lại vài phút sau khi cửa quán net khép vào. Ngày mai còn hồ sơ phải ký, chuyến công tác phải sắp xếp. Tối nay thì tôi cho phép mình buồn một chút, trước khi lái xe về nhà.']
 ];
 for(const [sceneId,narration] of lawyerPov)pov(sceneId,'entry-luc-thien',narration);
 pov('contract','entry-luc-thien',lawyerPov[0][1],{
  'prioritize-meal':'Tôi đặt bát canh lên trước, chờ em ăn rồi mới mở hồ sơ.',
  'review-file-first':'Tôi đưa báo cáo quý để em xem, nhắc ăn sau.'});
 pov('contract','entry-tu-du',tuDuPov.find(p=>p[0]==='contract')[1],{
  'prioritize-meal':'Tôi nhận bát canh trước khi nói về báo cáo.',
  'review-file-first':'Tôi đề nghị xem báo cáo quý trước, ăn canh sau.'});
 const coverPov=[
  ['gate','Tôi dừng trước cổng trường số 3. Tấm biển trường bong sơn, loa phát thanh rè rè báo giờ vào lớp. Trong đầu vẫn còn một cái tên công việc lạ lẫm — người phụ việc thư viện cộng đồng — nhưng trong túi chỉ có vài món đồ bình thường.\n\n“Có giấy giới thiệu không?” Bác bảo vệ hỏi. Tôi lục túi theo phản xạ rồi đành lắc đầu. Ông không cáu, chỉ bảo muốn xin việc thì phải tới đúng nơi làm thủ tục. Tôi đứng sang bên, nhìn con đường vòng qua bãi xỉ và tấm biển chỉ về thư viện thị trấn.'],
  ['town-walk','Tôi đi dọc bức tường trường học, nghe tiếng trống vào tiết vọng qua sân. Mặt đường còn ẩm sau cơn mưa sớm; xe chở quặng để lại những vệt bùn đen.\n\nNgã ba có hai biển chỉ: một hướng về thư viện công cộng, một hướng ra ga hàng. Tôi chẳng biết thị trấn này ngoài những gì mắt thấy tai nghe. Có lẽ bắt đầu từ một nơi người ta sẵn lòng nói chuyện với khách lạ sẽ dễ hơn.'],
  ['cover-library','Thư viện nhỏ hơn tôi tưởng. Quạt trần quay chậm trên những giá sách cũ; cạnh cửa là bảng tin có giờ mở cửa và thông báo tuyển người hỗ trợ sắp xếp sách.\n\n“Muốn đăng ký thì mang giấy tờ tới nhé,” cô thủ thư nói khi thấy tôi đọc quá lâu. Tôi cảm ơn, ghi nhớ địa chỉ liên hệ. Ít ra đây là một đầu mối thật, không phải cái tên xa lạ bất chợt xuất hiện trong trí nhớ.'],
  ['cover-station','Tôi chọn chiếc bàn nhựa dưới mái hiên quán nước gần ga. Bà chủ rót trà, vừa quạt bếp than vừa kể lịch tàu quặng thường chạy từ rạng sáng.\n\n“Có hôm nó hú còi là cả phố thức dậy,” bà cười, chỉ tay về bảng giờ tàu treo trên tường. Tôi hỏi thêm đường ra chợ, ghi nhớ mấy chỗ rẽ. Câu chuyện chẳng có gì ly kỳ, nhưng bỗng khiến thị trấn này giống một nơi có người thật đang sống.'],
  ['town-end','Đến khi bóng chiều phủ lên bãi xỉ, tôi dừng chân ở ngã ba cũ. Trong túi là vài địa chỉ và lời chỉ đường nghe được hôm nay, chẳng có tấm giấy nào chứng minh mình là người phụ việc thư viện.\n\nTôi nhìn lại cổng trường xa xa. Một ngày đầu tiên không mở ra bí mật lớn nào, nhưng ít nhất tôi biết nơi phải đến nếu muốn bắt đầu một cuộc sống ở đây.']
 ];
 for(const [sceneId,narration] of coverPov)pov(sceneId,'entry-cover',narration);
 // These lines are now spoken inside the actor's own scene prose. Do not
 // repeat the same exchange as a second, detached NPC caption below it.
 for(const [entryId,sceneIds] of Object.entries({
  'entry-tu-du':['rehearsal','whatif-tinhdao','farewell','meal-care','river'],
  'entry-classmate':['meal-care'],
  'entry-cover':['gate','cover-library','cover-station']
 }))for(const sceneId of sceneIds)byId(sceneId).roleScenes[entryId].dialogue='';
 const entryBriefings=[
  {entryId:'entry-tu-du',worldContext:'Đây là kiếp sống hiện đại ở chương 3–12 của Hệ Thống ERR...O. Bản thử đi tuần tự trong chương 6 (12→15 tuổi) rồi chương 7 (17 tuổi), không ép thành một ngày.',roleMemory:'Bạn là Khương Tử Du. Sau biến cố huyết thống năm chín tuổi và cuộc chia ly hai gia tộc năm mười hai tuổi, bạn tới thị trấn mỏ. Bạn không thể nhận biết mặt người, thường dựa vào giọng nói và mùi hương. Khối rubik nhắc về lời hứa với Phó Vãn Ninh.',incitingIncident:'Mười hai tuổi, xe của Lục Thiển đưa bạn tới cổng trường số 3. Bạn phải trình hồ sơ tự lập, rồi mới được cô Tần dẫn vào lớp 7B. Quán net và những mối quan hệ về sau thuộc các năm khác.',objective:'Sống qua những mốc học trò có thật theo thứ tự: nhập học, quen Tinh Dao, cô Tần chăm sóc, đêm văn nghệ rồi cuộc đời tuổi mười bảy.',boundaries:'Không thay lời từ chối Tinh Dao và Lục Thiển; không tự cấp tài sản CryoTech, EXP, Xu, giấy tờ hay xác minh nhiệm vụ.'},
  {entryId:'entry-luc-thien',worldContext:'Mở đầu của bạn ở năm Tử Du mười bảy tuổi, chương 7. Chương 6 đã diễn ra trước đó; vai Lục Thiển không bị đưa trở lại lớp 7B năm mười hai tuổi.',roleMemory:'Bạn là Lục Thiển, luật sư hai mươi lăm tuổi đã đại diện pháp lý cho Tử Du suốt năm năm. Bạn biết việc được giao, nhưng không biết mọi suy nghĩ hay ký ức chuyển sinh của em.',incitingIncident:'Một chiều mưa, bạn đến phòng VIP số 01 mang canh gà và báo cáo quý Vạn Yên cho Tử Du mười bảy tuổi, trước chuyến khánh thành điểm trường cuối thu.',objective:'Chăm sóc hợp lý và giữ đúng ủy quyền, đồng thời đối diện với câu trả lời của Tử Du trong Canon khi tình cảm được bày tỏ.',boundaries:'Không ký thay ngoài ủy quyền, không cấp tiền thưởng và không đổi kết quả Tử Du từ chối tình cảm trong đêm mưa.'},
  {entryId:'entry-classmate',worldContext:'Thị trấn mỏ chương 6 trải dài nhiều năm: bạn nhập tuyến ở lớp 7B khi Tử Du mười hai tuổi, trước khi tới năm mười lăm tuổi.',roleMemory:'Bạn là một học sinh đã học lớp 7B từ trước. Bạn quen lịch học và Hạ Tinh Dao, nhưng hoàn toàn không biết bí mật của Khương Tử Du.',incitingIncident:'Cô Tần dẫn một học sinh mới vào lớp. Bạn sẽ chứng kiến những năm học bình thường trước đêm văn nghệ, không biết các cuộc gặp riêng của Tử Du.',objective:'Thử cách một người bản địa có thể làm quen và giữ riêng tư cho bạn học qua những năm tháng, rồi kết thúc trước tuyến pháp lý tuổi mười bảy.',boundaries:'Không nhìn thấy ký ức Tử Du; không theo vào phòng VIP hay hồ sơ Vạn Yên, không tự tạo vật phẩm hoặc tài sản.'},
  {entryId:'entry-cover',worldContext:'Đây là thị trấn mỏ hiện đại ở buổi chiều Tử Du mười hai tuổi; chỉ màn tiếp nhận nhập vai có sắc thái hệ thống.',roleMemory:'Bạn có thân phận ảo “người phụ việc thư viện cộng đồng” do bản thử cấp. Chưa ai ngoài cơ chế mô phỏng xác minh công việc, giấy tờ hoặc quá khứ của bạn.',incitingIncident:'Bạn tới trường số 3 trong ngày nhập học của Tử Du; bác bảo vệ yêu cầu giấy giới thiệu thật. Bạn chỉ được đi tuyến đường công cộng trong ngày này, không tự nhảy ba hay năm năm tới tương lai.',objective:'Quan sát bảng chỉ đường và thư viện công cộng, tôn trọng giới hạn truy cập rồi kết thúc một buổi chiều hợp lý.',boundaries:'Không tự xưng là giáo viên, truy cập lớp hay hồ sơ học sinh, phòng VIP riêng, ra lệnh NPC, cấp thưởng hoặc đổi Canon.'}
 ];
 return {version:'g5c-author-demo-script-1',contentHash:await hashAuthoringJson(world),pages,entryBriefings};
}
