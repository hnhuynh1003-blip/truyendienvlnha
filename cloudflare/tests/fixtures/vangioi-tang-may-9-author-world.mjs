// G5C-P5: author-first synthetic world based on an ORIGINAL 3-chapter story.
// G3C/G4A/G4B only; no client authority, AI mutation, rewards or publication.
import {hashAuthoringJson} from '../../src/vangioi-authoring.mjs';
import {G4A_ENGINE_VERSION} from '../../src/vangioi-engine-g4a.mjs';

const scene=(name,placeId,assetId,summary,edges)=>({sceneId:'scene-'+name,placeId,
 backgroundAssetId:assetId,summary,viewIds:['view-'+name],
 transitions:edges.map(([name,trigger])=>({toSceneId:'scene-'+name,trigger}))});
const page=(name,narration,dialogue,actions,entryNotes=null,endingId=null)=>({sceneId:'scene-'+name,narration,dialogue,
 ...(entryNotes?{entryNotes}:{}),...(endingId?{endingId}:{}),
 choices:actions.map(([choiceId,ruleId,label])=>({choiceId,ruleId,label}))});
const asset=(assetId,kind,contentHash,altText)=>({assetId,assetVersion:'synthetic-canon-1',kind,contentHash,altText});

export const SCI_FI_STORYBOARD=[
 ['scene-arrival','chapter-1','Đồng hồ thành phố bỏ qua mười bảy phút.'],
 ['scene-archive','chapter-1','Lam đứng trước hai cột bản ghi số 0.'],
 ['scene-broadcast','chapter-1','Bảng tin giả định an toàn che lấp tín hiệu.'],
 ['scene-tuyen','chapter-2','Ông Tuyên yêu cầu bằng chứng chứ không tin danh xưng.'],
 ['scene-record','chapter-2','Hai bản ghi: hiện trường và dự báo bị trộn nhãn.'],
 ['scene-witness','chapter-2','Nhi nhận cuộn băng và lời khai của người dân.'],
 ['scene-relay','chapter-2','Khải kiểm tra cầu dao cơ khí tầng dưới.'],
 ['scene-breaker','chapter-2','Cầu dao ngắt vòng lặp tín hiệu cứu hộ.'],
 ['scene-publish','chapter-3','Mô phỏng nếu hồ sơ được công bố giờ cao điểm.'],
 ['scene-seal','chapter-3','Mô phỏng nếu cầu dao cách ly được duy trì.'],
 ['scene-leak','chapter-3','Mô phỏng nếu chứng cứ tới các gia đình trước.']
].map(([sceneId,chapterId,authorReason])=>({sceneId,chapterId,authorReason}));

export function tangMayWorld(sourceHash,hashes){
 if(!sourceHash||!hashes)throw Error('Missing local author source or image bytes');
 const c={
  schemaVersion:'world-content-1',contentVersion:'1.0.0',
  title:'Tầng Mây 9 — Bản Ghi Số 0',genreId:'future',requestedWorldRank:'F',dangerLevel:'moderate',
  contentTags:['memory','mystery','identity','future-city'],
  storySource:{kind:'original',storyId:'dudu-original-tang-may-9',storyVersion:'author-manuscript-1',contentHash:sourceHash},
  story:{logline:'Tại Thiên Khâu năm 2187, mười bảy phút biến mất khỏi bản tin, để lại hai bản ghi về một người sống sót.',
   setting:'Thành phố Thiên Khâu năm 2187; đài lưu trữ ký ức, cầu tàu tầng chín và trạm chuyển tiếp dưới biển.',
   playerRole:'Nhập Lam, Khải, Nhi hoặc K-07, mỗi người giữ một mảnh của sự thật.',
   opening:'Một giờ mười bảy phút. Hệ thống tuyên bố an toàn; có người gọi tên My qua đường phát không có chủ.',
   secretTruth:'PRIVATE_AUTHOR_CANON: bản 0 gồm hiện trường và dự báo; ông Tuyên cắt tín hiệu chống kẹt cổng; My sống sót.',
   plotBeats:['Chương 1: Mười bảy phút không tồn tại.','Chương 2: Cánh cửa không có danh tính.',
    'Chương 3: Người đã giữ lại tiếng gọi — Arc 1 dừng trước quyết định chính thức.'],
   worldRules:['Giấy tờ cấp bởi hệ thống không thay cho chứng cứ hoặc sự chấp thuận của người quản lý.',
    'Cầu dao cơ khí cần người hiểu trạm chuyển tiếp; không có lệnh dịch chuyển hay điều khiển ký ức toàn quyền.',
    'Kết cục roleplay là giả định của bản thử, không cập nhật kết thúc Canon của truyện.']},
  worldCoverAssetId:'art-city-cover',assets:[
   asset('art-city-cover','worldCover',hashes.city,'Thiên Khâu 2187, thành phố tầng trên biển dưới mưa neon.'),
   asset('art-city','sceneBackground',hashes.city,'Cầu tàu tầng chín và đô thị nhiều tầng.'),
   asset('art-archive','sceneBackground',hashes.archive,'Kho ký ức với các cột dữ liệu và vị trí bản ghi số 0.'),
   asset('art-relay','sceneBackground',hashes.relay,'Trạm cầu dao truyền tín hiệu dưới lòng thành phố.'),
   asset('art-lam','characterPortrait',hashes.lam,'Lam, nhân vật chính, chuyên viên lưu trữ.'),
   asset('art-khai','characterPortrait',hashes.khai,'Khải, kỹ thuật viên trạm chuyển tiếp.'),
   asset('art-nhi','characterPortrait',hashes.nhi,'Nhi, người giao bưu kiện vốn sống ở Thiên Khâu.'),
   asset('art-k07','characterPortrait',hashes.k07,'K-07, thân phận thanh tra ảo.'),
   asset('art-tuyen','npcPortrait',hashes.tuyen,'Ông Tuyên, người quản thủ hồ sơ đã lớn tuổi.')],
  maps:[{mapId:'map-thien-khau',name:'Thiên Khâu tầng chín',placeIds:['place-terminal','place-archive','place-relay']}],
  places:[
   {placeId:'place-terminal',mapId:'map-thien-khau',name:'Cầu tàu tầng chín',sceneIds:['scene-arrival','scene-broadcast','scene-witness','scene-leak']},
   {placeId:'place-archive',mapId:'map-thien-khau',name:'Kho ký ức số 09',sceneIds:['scene-archive','scene-tuyen','scene-record','scene-publish']},
   {placeId:'place-relay',mapId:'map-thien-khau',name:'Trạm chuyển tiếp',sceneIds:['scene-relay','scene-breaker','scene-seal']}],
  scenes:[
   scene('arrival','place-terminal','art-city','Mười bảy phút trống và giọng nói không có người phát.',[
    ['tuyen','question_archivist'],['broadcast','read_public_signal'],['witness','meet_courier'],
    ['archive','ask_archive_entry'],['relay','descend_to_relay']]),
   scene('broadcast','place-terminal','art-city','Bảng tin công khai thiếu tín hiệu chu kỳ 408.',[
    ['tuyen','trace_to_archivist'],['relay','follow_alarm'],['arrival','leave_broadcast']]),
   scene('witness','place-terminal','art-city','Nhân chứng giữ băng từ không đưa lên mạng.',[
    ['arrival','record_testimony'],['leak','send_private_tape'],['arrival','leave_witness']]),
   scene('archive','place-archive','art-archive','Lam tìm thấy hai dòng chữ cùng mang mã 0.',[
    ['record','open_archive_record'],['tuyen','speak_tuyen'],['arrival','leave_archive'],['publish','publish_record']]),
   scene('record','place-archive','art-archive','Bản ghi hiện trường và dự báo bị trộn nhãn.',[
    ['broadcast','compare_records'],['witness','search_testimony'],['archive','close_record'],['publish','publish_with_witness']]),
   scene('tuyen','place-archive','art-archive','Ông Tuyên chỉ hợp tác khi người hỏi có bằng chứng.',[
    ['record','question_zero'],['archive','request_access'],['arrival','return_terminal']]),
   scene('relay','place-relay','art-relay','Một cầu dao cơ khí tồn tại giữa hệ thống tự động.',[
    ['breaker','inspect_relay'],['arrival','surface_terminal'],['archive','engineer_archive']]),
   scene('breaker','place-relay','art-relay','Bộ ngắt vòng lặp và niêm phong đã bong.',[
    ['seal','isolate_signal'],['broadcast','diagnose_loop'],['relay','leave_breaker'],['archive','bridge_engineer']]),
   scene('publish','place-archive','art-archive','Công khai bằng chứng có thể gây hỗn loạn giờ cao điểm.',[]),
   scene('seal','place-relay','art-relay','Giữ cổng sơ tán mở bằng cách cách ly tín hiệu thêm một đêm.',[]),
   scene('leak','place-terminal','art-city','Cuộn băng tới tay những người có quyền đặt câu hỏi.',[])],
  cast:[
   {characterId:'character-lam',displayName:'Lam',narrativeRole:'protagonist',presence:'onstage',playableAsCast:true,
    storyNotes:'Phục hồi hồ sơ số 09; có quyền vào kho nhưng chưa biết kết luận cuối.'},
   {characterId:'character-khai',displayName:'Khải',narrativeRole:'supporting',presence:'onstage',playableAsCast:true,
    storyNotes:'Kỹ thuật viên; được chạm cầu dao nhưng phải tìm hiểu nguy cơ vòng lặp.'},
   {characterId:'character-nhi',displayName:'Nhi',narrativeRole:'passerby',presence:'onstage',playableAsCast:false,
    storyNotes:'Người giao bưu kiện có quan hệ nhân chứng, không có quyền lưu trữ.'},
   {characterId:'character-tuyen',displayName:'Ông Tuyên',narrativeRole:'supporting',presence:'onstage',playableAsCast:false,
    storyNotes:'Quản thủ lưu trữ, không cung cấp quyền chỉ vì thẻ công tác giả.'}],
  characterVisuals:[['lam','art-lam'],['khai','art-khai'],['nhi','art-nhi'],['tuyen','art-tuyen']]
   .map(([short,assetId])=>({characterId:'character-'+short,visualPriority:'supporting',
    identityNotes:'Tạo hình nguyên gốc dùng riêng cho kiểm thử tác giả.',fixedTraits:['Nhất quán diện mạo qua từng chương.'],
    variants:[{variantId:'visual-'+short,assetId,format:'portrait'}]})),
  characterAppearances:[{appearanceId:'tuyen-talk',characterId:'character-tuyen',viewId:'view-tuyen',
   variantId:'visual-tuyen',displayMode:'portrait',showOn:'dialogue_start',triggerRef:'node-tuyen',
   hideOn:'dialogue_end',suppressWhenPossessed:true}],
  npcs:[{npcId:'npc-tuyen',characterId:'character-tuyen',name:'Ông Tuyên',mode:'scripted',
   interactionLevels:['scripted'],dialoguePolicy:'choice_tree',friendable:false,introSceneId:'scene-tuyen',
   role:'Người quản thủ kho lưu trữ',knowledge:['Có hai kiểu dữ liệu trong bản 0.','Cầu dao cơ khí đã được dùng đêm xảy ra sự cố.'],
   dialogueNodes:[{nodeId:'node-tuyen',text:'Tôi không hỏi cô là ai. Tôi hỏi cô có mảnh bằng chứng nào.'}]}],
  playerEntryProfiles:[
   {entryId:'entry-lam',label:'Lam · vai chính / lưu trữ',mode:'cast_possession',castTargetId:'character-lam',
    startSceneId:'scene-archive',initialKnownFacts:['Có chìa khóa kho 09, có thể đọc sổ gốc.'],initialFlags:['archivist_access']},
   {entryId:'entry-khai',label:'Khải · vai phụ / kỹ thuật',mode:'cast_possession',castTargetId:'character-khai',
    startSceneId:'scene-relay',initialKnownFacts:['Có quyền thao tác ở trạm chuyển tiếp.'],initialFlags:['engineer_access']},
   {entryId:'entry-nhi',label:'Nhi · người qua đường',mode:'native_extra',nativeSlotId:'slot-courier-nine',
    socialAnchorNotes:'Người giao bưu kiện tồn tại trong Thiên Khâu, quen người dân tại tầng chín.',
    startSceneId:'scene-arrival',initialKnownFacts:['Người bán cháo có cuộn băng gửi tận tay.'],initialFlags:['courier_contact']},
   {entryId:'entry-k07',label:'K-07 · thân phận ảo',mode:'system_cover',identityAssurance:'unknown',coverName:'Thanh tra dữ liệu K-07',
    startSceneId:'scene-arrival',initialKnownFacts:['Thẻ công tác chỉ cho phép hỏi, không cho quyền công bố.'],
    initialFlags:['synthetic_inspector']}],
  entryPolicy:{mode:'player_choice'},entry:{entrySceneId:'scene-arrival'},
  items:[],shops:[],
  missions:[{missionId:'mission-zero-record',name:'Mảnh ghi số 0',kind:'main',requiredForCompletion:true,
   startSceneId:'scene-arrival',summary:'Tìm hiểu bản ghi hiện trường và lời nhân chứng trong Arc 1.',
   objectives:[{objectiveId:'objective-archive',verb:'reach',targetId:'scene-archive',requiredCount:1}],
   rewardRequest:{exp:0,items:[]},replayPolicy:'repeat_no_reward'}],
  events:[
   {eventId:'event-public-trace',trigger:'read_public_signal',setFlags:['trace_found']},
   {eventId:'event-archive-proof',trigger:'trace_to_archivist',setFlags:['verified_trace']},
   {eventId:'event-archive-record',trigger:'open_archive_record',setFlags:['has_source']},
   {eventId:'event-testimony',trigger:'record_testimony',setFlags:['has_witness']},
   {eventId:'event-diagnostic',trigger:'inspect_relay',setFlags:['diagnosed_relay']},
   {eventId:'event-alarm',trigger:'follow_alarm',setFlags:['knows_alarm']},
   {eventId:'event-publish',trigger:'publish_record',setFlags:['chose_publish']},
   {eventId:'event-seal',trigger:'isolate_signal',setFlags:['chose_seal']},
   {eventId:'event-leak',trigger:'send_private_tape',setFlags:['chose_leak']}],
  endings:[
   {endingId:'ending-publish',title:'Sự thật lên màn hình',result:'partial',requiredFlags:['chose_publish']},
   {endingId:'ending-seal',title:'Đêm thứ hai không tín hiệu',result:'partial',requiredFlags:['chose_seal']},
   {endingId:'ending-leak',title:'Băng ghi âm có người nhận',result:'partial',requiredFlags:['chose_leak']}],
  playRequirements:{requiredVisitPlaceIds:[],requiredInteractNpcIds:[]},
  aiPolicy:{aiNpcRequested:false,allowAiRewards:false,allowAiWorldMutation:false}
 };
 c.views=c.scenes.map(s=>({viewId:s.viewIds[0],sceneId:s.sceneId,kind:'text_only',hotspots:[]}));
 return c;
}

const flag=flag=>({op:'flag_set',flag}),unset=flag=>({op:'flag_unset',flag});
const any=(...conditions)=>({op:'any',conditions}),all=(...conditions)=>({op:'all',conditions});
const r=(ruleId,fromSceneId,transitionIndex,condition,toSceneId,set=[])=>({ruleId,fromSceneId,
 transitionIndex,condition,actions:[...set.map(flag=>({op:'set_flag',flag})),{op:'enter_scene',sceneId:toSceneId}]});
export async function tangMayManifest(world){return {version:G4A_ENGINE_VERSION,contentVersion:world.contentVersion,
 contentHash:await hashAuthoringJson(world),rules:[
  r('talk-to-tuyen','scene-arrival',0,unset('chose_publish'),'scene-tuyen'),
  r('scan-public','scene-arrival',1,unset('chose_publish'),'scene-broadcast',['trace_found']),
  r('visit-witness','scene-arrival',2,unset('chose_publish'),'scene-witness'),
  r('enter-archive','scene-arrival',3,any(flag('archivist_access'),flag('engineer_access'),flag('verified_trace')),'scene-archive'),
  r('enter-relay','scene-arrival',4,any(flag('engineer_access'),flag('trace_found')),'scene-relay'),
  r('trace-to-tuyen','scene-broadcast',0,flag('trace_found'),'scene-tuyen',['verified_trace']),
  r('follow-signal','scene-broadcast',1,flag('trace_found'),'scene-relay',['knows_alarm']),
  r('leave-broadcast','scene-broadcast',2,unset('chose_publish'),'scene-arrival'),
  r('record-witness','scene-witness',0,unset('chose_publish'),'scene-arrival',['has_witness']),
  r('leak-tape','scene-witness',1,flag('courier_contact'),'scene-leak',['chose_leak']),
  r('leave-witness','scene-witness',2,unset('chose_publish'),'scene-arrival'),
  r('open-record','scene-archive',0,unset('chose_publish'),'scene-record',['has_source']),
  r('summon-tuyen','scene-archive',1,unset('chose_publish'),'scene-tuyen'),
  r('leave-archive','scene-archive',2,unset('chose_publish'),'scene-arrival'),
  r('publish-proof','scene-archive',3,all(flag('has_source'),flag('has_witness')),'scene-publish',['chose_publish']),
  r('compare-zero','scene-record',0,flag('has_source'),'scene-broadcast'),
  r('find-witness','scene-record',1,flag('has_source'),'scene-witness'),
  r('close-record','scene-record',2,flag('has_source'),'scene-archive'),
  r('publish-witness','scene-record',3,all(flag('has_source'),flag('has_witness')),'scene-publish',['chose_publish']),
  r('question-zero','scene-tuyen',0,any(flag('archivist_access'),flag('engineer_access'),flag('verified_trace')),'scene-record',['has_source']),
  r('request-archive','scene-tuyen',1,any(flag('archivist_access'),flag('engineer_access'),flag('verified_trace')),'scene-archive'),
  r('leave-tuyen','scene-tuyen',2,unset('chose_publish'),'scene-arrival'),
  r('inspect-breaker','scene-relay',0,unset('chose_seal'),'scene-breaker',['diagnosed_relay']),
  r('leave-relay','scene-relay',1,unset('chose_seal'),'scene-arrival'),
  r('engineer-archive','scene-relay',2,flag('engineer_access'),'scene-archive'),
  r('seal-system','scene-breaker',0,all(flag('diagnosed_relay'),flag('knows_alarm')),'scene-seal',['chose_seal']),
  r('diagnose-loop','scene-breaker',1,flag('diagnosed_relay'),'scene-broadcast',['knows_alarm','trace_found']),
  r('leave-breaker','scene-breaker',2,unset('chose_seal'),'scene-relay'),
  r('bridge-engineer','scene-breaker',3,flag('engineer_access'),'scene-archive')
 ]};}

export async function tangMayScript(world){return {version:'g5c-author-demo-script-1',contentHash:await hashAuthoringJson(world),pages:[
 page('arrival',
  '1:17. Những toa tàu treo đứng im đúng một nhịp tim. Bảng tin phủ màu xanh an toàn, nhưng dưới chân cầu tầng chín, một giọng thiếu nữ phát qua loa không có người gửi: “Ai còn giữ tên tôi?”',
  'Một người giao hàng gọi vọng: “Các anh có nghe không? Mười bảy phút vừa rồi biến đi đâu?”',[
   ['ask-tuyen','talk-to-tuyen','Tìm ông Tuyên, hỏi về mã hồ sơ 0.'],
   ['scan-public','scan-public','Đọc báo cáo phát thanh của chu kỳ 408.'],
   ['find-witness','visit-witness','Gặp Nhi và người giữ băng ghi âm.'],
   ['enter-archive','enter-archive','Yêu cầu mở cửa kho ký ức 09.'],
   ['go-relay','enter-relay','Xuống trạm chuyển tiếp kiểm tra nguồn tín hiệu.']],{
   'entry-lam':'Lam nhìn thấy tên mình trong danh sách nhân viên trực và một khoảng thời gian chưa ký.',
   'entry-khai':'Khải nhận ra khoảng mất tín hiệu trùng lúc cầu dao dưới trạm ngắt.',
   'entry-nhi':'Nhi nghe người bán cháo gọi: “Đừng đưa cuộn băng cho màn hình.”',
   'entry-k07':'Thẻ K-07 nhận được thông báo: quyền đọc bảng tin công khai, không có quyền mở kho hoặc ra lệnh.'}),
 page('broadcast',
  'Bản tin ghi “sơ tán hoàn tất” từ 1:00 đến 1:34, nhưng đường sóng chỉ còn dữ liệu từ 1:17 trở đi. Mép biểu đồ bị ghép ngay vị trí công tắc cơ khí tầng dưới.',
  'Loa thông báo: “Thông tin chưa đủ kiểm chứng. Vui lòng không suy diễn từ bảng tin.”',[
   ['trace-tuyen','trace-to-tuyen','Mang dấu vết phát sóng đến ông Tuyên.'],
   ['follow-alarm','follow-signal','Lần theo chu kỳ báo động xuống trạm cầu dao.'],
   ['back-arrival','leave-broadcast','Quay lại quảng trường tầng chín.']],{
   'entry-k07':'K-07 lần đầu có dữ liệu thực để chứng minh mình đã điều tra, thay vì chỉ đưa thẻ công tác.',
   'entry-nhi':'Nhi biết chiếc băng ghi âm không thể tự động trở thành hồ sơ công cộng.'}),
 page('witness',
  'Mùi cháo nóng len qua mưa điện. Người bán cháo đặt một cuộn băng từ cũ vào tay bạn. Trên băng, giữa tiếng kim loại, có một người trẻ nói: “Tên em là My. Em vẫn ở đây.”',
  'Người bán cháo: “Tôi tin băng này được thu đêm ấy. Nhưng đừng gọi nó là bằng chứng duy nhất về người phát tiếng hôm nay.”',[
   ['record-testimony','record-witness','Ghi nhận lời nhân chứng, không tự xác nhận người phát.'],
   ['send-tape','leak-tape','Nhi giao bản sao cho những gia đình còn chờ tin.'],
   ['leave-witness','leave-witness','Cất lời khai, quay lại quảng trường.']],{
   'entry-nhi':'Người bán cháo gọi đúng tên Nhi; giao cuộn băng là trách nhiệm, không phải quyền quyết định sự thật.',
   'entry-lam':'Lam nghe nhắc tên My — cô bạn từng biến mất khỏi danh sách cư trú.',
   'entry-khai':'Khải nghe tiếng một cầu dao cũ ở đoạn cuối băng và nhớ công việc dưới trạm.',
   'entry-k07':'Người bán cháo hỏi người lạ: “Ai bảo đảm một thanh tra ảo sẽ đưa băng tới đúng người?”'}),
 page('archive',
  'Căn phòng ký ức mờ ánh lam. Hai màn hình cùng ghi mã 0 nhưng số liệu khác nhau: một bản không có ai bị kẹt, bản kia có một cửa hành lang đóng giữa tiếng gọi.',
  'Ông Tuyên từ xa: “Nếu định đem gì ra khỏi đây, hãy chắc đó là điều đã xảy ra, không phải điều hệ thống dự đoán.”',[
   ['read-record','open-record','Mở hai bản ghi gốc và so đối chứng.'],
   ['ask-tuyen-archive','summon-tuyen','Nhờ ông Tuyên giải thích nguồn hồ sơ.'],
   ['leave-archive','leave-archive','Rời kho, tìm lời người chứng kiến.'],
   ['publish-file','publish-proof','Công bố bản ghi đã có lời nhân chứng đối chiếu.']],{
   'entry-lam':'Kho mở bằng chìa Lam được giao. Quyền truy cập không có nghĩa được tự ý thay Canon.',
   'entry-khai':'Khải được vào để đối chiếu mạch phát; mọi chỉnh sửa hồ sơ vẫn ngoài quyền của anh.',
   'entry-nhi':'Nhi được mở cửa nhờ dấu vết kiểm chứng, không phải nhờ danh phận giao hàng.',
   'entry-k07':'Người quản thủ cho K-07 xem hồ sơ sau khi có dấu vết; thẻ ảo vẫn không trở thành quyền phát lệnh.'}),
 page('record',
  'Dòng thứ nhất được đóng dấu HIỆN TRƯỜNG. Dòng thứ hai có ký hiệu DỰ BÁO đã bị mài mất. Hai hồ sơ không thuộc hai dòng thời gian: chúng mô tả sự thật và một khả năng chưa xảy ra.',
  'Lời ghi chú của ca trước: “Đừng biến dự báo thành sự kiện chỉ vì thành phố thích câu chuyện đẹp hơn.”',[
   ['compare-report','compare-zero','Đối chiếu cột thời gian với bảng phát sóng.'],
   ['seek-voice','find-witness','Đi hỏi nhân chứng có giọng nói trên băng.'],
   ['close-record','close-record','Đóng hồ sơ, trở lại bàn lưu trữ.'],
   ['publish-record','publish-witness','Công bố khi đã có cả lời chứng và dữ liệu.']],{
   'entry-lam':'Lam nhận ra chữ ký của chính mình ở trang làm việc, nhưng trang kết luận không mang tên cô.',
   'entry-khai':'Khải nhìn thấy mốc cầu dao cơ khí khớp với bản hiện trường.',
   'entry-nhi':'Nhi không thể xác minh kỹ thuật, nhưng biết ai đã giữ cuộn băng suốt mười bốn năm.',
   'entry-k07':'K-07 chỉ được ghi nhận mâu thuẫn; không có lệnh tự xóa hay sửa lại các bản ghi.'}),
 page('tuyen',
  'Ông Tuyên đứng cạnh chiếc chìa khóa đồng. Những nếp nhăn trên tay ông hằn sâu hơn những ký hiệu trên màn hình. Ông không chối có một lệnh cách ly, nhưng đòi người hỏi chỉ rõ bằng chứng.',
  'Ông Tuyên: “Tên trên thẻ chẳng trả lời được điều gì. Hãy nói cho tôi một chi tiết mà người ngoài quảng trường có thể kiểm chứng.”',[
   ['question-zero','question-zero','Hỏi về sự khác nhau của hai bản ghi.'],
   ['permission-archive','request-archive','Trình bằng chứng, xin mở kho 09.'],
   ['leave-tuyen','leave-tuyen','Tạm rời ông Tuyên để tìm chứng cứ khác.']],{
   'entry-lam':'Ông Tuyên gọi Lam bằng tên nhỏ: “Cô đã được dạy phân biệt điều thấy và điều đoán.”',
   'entry-khai':'Ông Tuyên nhìn áo kỹ thuật: “Cậu có chìa trạm, không có quyền xóa dấu vết.”',
   'entry-nhi':'Ông Tuyên nhận ra người giao bưu kiện: “Cô mang tiếng nói của người dân, phải giữ nguyên lời họ.”',
   'entry-k07':'Ông Tuyên nhìn thẻ trắng: “Hệ thống cấp cho anh một vai. Tôi cần bằng chứng, không cần vai diễn.”'}),
 page('relay',
  'Trạm chuyển tiếp nằm bên dưới mực nước biển. Hàng trăm sợi quang tỏa sáng quanh một cầu dao cơ khí bị niêm phong từ mười bốn năm trước. Dòng điện đang chạy, nhưng lịch sử không ghi người đã bật công tắc.',
  'Hệ thống kỹ thuật: “Chỉ có kiểm tra mạch và so thời gian mới xác định được lý do cách ly.”',[
   ['inspect-relay','inspect-breaker','Mở hộp cầu dao, kiểm tra đường mạch.'],
   ['surface-relay','leave-relay','Trở lên tầng chín tìm dữ liệu phát sóng.'],
   ['engineer-vault','engineer-archive','Dùng quyền kỹ thuật để vào kho đối chiếu mạch.']],{
   'entry-khai':'Khải biết cầu dao có thể cứu các cổng thoát hiểm, nhưng cũng có thể khiến loa cứu hộ im lặng.',
   'entry-k07':'K-07 chỉ được nhìn số liệu, không có quyền thao tác thiết bị vật lý.'}),
 page('breaker',
  'Dưới lớp niêm phong có nét khắc tay: “Khi tín hiệu lặp quá ba lần, hãy tách kênh trước khi cổng đóng.” Trên vỏ máy, đèn vàng lóe theo chu kỳ mười bảy phút.',
  'Giọng ghi âm kỹ thuật: “Cắt phát thanh sẽ giữ cổng mở. Công bố ngay lúc đông người có thể gây chen lấn.”',[
   ['isolate-loop','seal-system','Cách ly tín hiệu thêm một đêm để bảo vệ lối thoát.'],
   ['diagnose-loop','diagnose-loop','Đọc sơ đồ vòng lặp, đối chiếu bảng tin.'],
   ['leave-breaker','leave-breaker','Đóng nắp, quay lại trạm.'],
   ['bridge-engineer','bridge-engineer','Khải mang dữ liệu kỹ thuật vào kho 09.']],{
   'entry-khai':'Khải hiểu mọi thao tác công tắc đều để lại hậu quả ngoài đời, không phải điểm kinh nghiệm.'}),
 page('publish',
  'Màn hình thành phố hiện hai bản ghi nguyên trạng và lời chứng bên cạnh, kèm cảnh báo về dữ liệu dự báo. Người đi đường ngừng lại đọc. Sự thật được nhìn thấy, nhưng các chuyến tàu giờ cao điểm rối loạn. Cuộc điều tra chính thức mới chỉ bắt đầu.',
  'Thông báo: “Dữ liệu đã công bố trong phiên giả lập. Việc phát hành Canon thực tế vẫn cần tác giả và người có quyền duyệt.”',[],null,'ending-publish'),
 page('seal',
  'Cầu dao chuyển sang chế độ cách ly. Những cổng sơ tán tiếp tục mở; dòng tàu tránh được một vòng lặp nguy hiểm. Trên bảng tin, khoảng trống mười bảy phút kéo dài thêm một đêm. Bạn đã mua thời gian bằng sự im lặng.',
  'Lời ghi tay của Khải: “An toàn là thật. Nhưng sự thật vẫn phải được trả lại đúng người.”',[],null,'ending-seal'),
 page('leak',
  'Nhi đặt băng từ lên bàn của những gia đình còn chờ tin. Không có màn hình phát lệnh, không có người hùng vô danh. Chỉ có những người quyết định cùng nghe và tự mang câu hỏi tới hội đồng. Tin đồn có thể đi xa hơn sự kiểm chứng.',
  'Người bán cháo: “Ta trao băng cho người cần biết. Không có nghĩa ta đã chứng minh mọi lời trong đó.”',[],null,'ending-leak')
]};}
