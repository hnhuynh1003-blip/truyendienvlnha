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

export async function tangMayScript(world){const pages=[
 page('arrival',
  '1:17. Những toa tàu treo đứng im đúng một nhịp tim. Bảng tin phủ màu xanh an toàn, nhưng dưới chân cầu tầng chín, một giọng thiếu nữ phát qua loa không có người gửi: “Ai còn giữ tên tôi?”',
  'Một người giao hàng gọi vọng: “Các anh có nghe không? Mười bảy phút vừa rồi biến đi đâu?”',[
   ['ask-tuyen','talk-to-tuyen','Tìm ông Tuyên, hỏi về mã hồ sơ 0.'],
   ['scan-public','scan-public','Đọc báo cáo phát thanh của chu kỳ 408.'],
   ['find-witness','visit-witness','Tới quầy cháo hỏi người giữ cuộn băng từ.'],
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
   ['send-tape','leak-tape','Giao bản sao cho những gia đình còn chờ tin.'],
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
 ];
 const sceneContexts={
  'scene-arrival':'Chu kỳ 408 vừa bị mất đúng mười bảy phút. Bảng tin khẳng định mọi người an toàn, nhưng có người nghe tiếng gọi tên My từ loa công cộng. Chưa ai biết âm thanh đến từ người thật hay một bản phát lại.',
  'scene-broadcast':'Bạn đến màn hình công cộng để đối chiếu mốc giờ với khoảng trống vừa xuất hiện. Tín hiệu cho thấy một phần dữ liệu đã bị ghép lại; đây là dấu vết, chưa phải bằng chứng đầy đủ.',
  'scene-witness':'Manh mối dẫn tới người bán cháo ở cầu tàu. Bà giữ cuộn băng từ của vụ cứu hộ mười bốn năm trước, không muốn giao nó cho màn hình vô danh.',
  'scene-archive':'Kho 09 chứa bản hiện trường và bản dự báo cùng được gắn nhãn số 0. Quyền đọc hồ sơ không đồng nghĩa với quyền công bố; cần tìm người có lời chứng độc lập.',
  'scene-record':'Bạn đang kiểm tra nguồn gốc hai bản ghi. Dòng chữ DỰ BÁO bị xóa khỏi nhãn; không thể coi một kết quả dự đoán là điều đã xảy ra.',
  'scene-tuyen':'Đây là quầy tiếp nhận bên ngoài cửa lưu trữ 09, không phải khu hồ sơ mật. Ông Tuyên chỉ mở phần dữ liệu cần thiết nếu người hỏi đưa được dấu vết hoặc có thẩm quyền chuyên môn đã có sẵn.',
  'scene-relay':'Các số liệu thời gian từ thành phố dẫn xuống trạm phát. Ở đây, cầu dao cơ khí vẫn có thể can thiệp vào một mạng được quảng cáo là hoàn toàn tự động.',
  'scene-breaker':'Lệnh cứu hộ từng phát lặp, có nguy cơ đóng cổng sơ tán. Cần đối chiếu cả dấu báo động lẫn mạch điện trước khi quyết định cách ly.',
  'scene-publish':'Đây là tương lai giả định nếu người nhập vai công bố sau khi có cả hồ sơ và lời chứng, không phải chương kết chính thức của tác giả.',
  'scene-seal':'Đây là tương lai giả định nếu người nhập vai cách ly tín hiệu sau khi kiểm chứng nguy cơ vòng lặp, không phải chương kết chính thức.',
  'scene-leak':'Đây là tương lai giả định nếu Nhi trao bản sao cho gia đình đang chờ tin. Cuộn băng là chứng cứ cần kiểm chứng, không phải lệnh xác nhận danh tính My.'
 };
 const roleScenes={
  'scene-arrival':{
   'entry-lam':{
    narration:'Lam vừa rời kho lưu trữ số 09 để tìm giọng nói trên cuộn băng. Cầu tàu tầng chín đông người; bảng tin vẫn trưng dòng “an toàn”, dù cô đã nhìn thấy bản ghi dự báo bị gắn sai nhãn. Bà bán cháo ở cuối cầu có thể biết ai giữ cuộn băng suốt mười bốn năm.',
    dialogue:'Một người bán vé nói: “Cô từ kho 09 xuống sao? Có người giao bưu kiện đang tìm người giữ hồ sơ đấy.”'},
   'entry-khai':{
    narration:'Khải rời trạm chuyển tiếp, mang theo vết mực ghi giờ mất điện trên găng tay. Phía trên, bảng tin vẫn tuyên bố sơ tán hoàn tất. Anh muốn so thông báo ấy với tín hiệu cầu dao dưới trạm trước khi chạm thêm vào mạch.',
    dialogue:'Loa trạm dặn: “Mọi can thiệp thiết bị cần đối chiếu chu kỳ báo động và đường thoát hiểm.”'},
   'entry-nhi':{
    narration:'Một giờ mười bảy phút. Nhi vừa cúi xuống kiểm tra kiện hàng thì đoàn tàu treo im bặt. Khi ngẩng lên, cô thấy đồng hồ quảng trường nhảy qua mười bảy phút mà không ai giải thích. Bà bán cháo phía đối diện vẫy tay gọi đúng tên Nhi. Trong túi áo cô còn tờ địa chỉ giao hàng: KHO LƯU TRỮ 09.',
    dialogue:'Bà bán cháo gọi: “Nhi! Sang đây. Có thứ cô phải giao tận tay, tuyệt đối đừng chuyển qua hệ thống.”',
    choiceLabels:{'find-witness':'Tới quầy cháo nơi bà đang gọi mình.','ask-tuyen':'Tìm người nhận ở quầy tiếp tân kho 09.','scan-public':'Đọc bảng tin, xem vì sao đồng hồ vừa nhảy giờ.'},
    returnNarration:'Nhi trở lại cầu tàu với cuộn băng được giữ trong túi áo. Đồng hồ vẫn chạy tiếp; mười bảy phút mất tích không hề xuất hiện trở lại. Bây giờ cô phải quyết định ai sẽ được nghe lời kể, sau những gì vừa biết từ người bán cháo.',
    returnDialogue:'Bà bán cháo gọi theo: “Con nhớ mang tận tay, đừng trao cho một màn hình không biết chịu trách nhiệm.”'},
   'entry-k07':{
    narration:'Một giờ mười bảy phút. K-07 hiện diện ở cầu tàu với thẻ thanh tra mới kích hoạt. Màn hình hệ thống báo quyền đọc dữ liệu công cộng, không có quyền khám xét hay sửa hồ sơ. Ngay khi một giọng nữ gọi tên My vang lên từ loa, bảng tin thành phố nhảy mất mười bảy phút.',
    dialogue:'Thông báo thẻ K-07: “Chỉ được ghi nhận mâu thuẫn và trình bằng chứng cho người giữ hồ sơ. Không có quyền mở kho trực tiếp.”',
    choiceLabels:{'find-witness':'Hỏi người giao hàng và bà bán cháo về cuộn băng.','ask-tuyen':'Tới quầy tiếp nhận 09 hỏi về thủ tục xác minh.'},
    returnNarration:'K-07 trở lại cầu tàu với dấu vết đã lưu từ bảng tin. Thẻ thanh tra vẫn trắng; một chuỗi dữ liệu công khai không biến thành giấy phép mở kho. Người mang thẻ phải trình từng mảnh bằng chứng cho ông Tuyên.',
    returnDialogue:'Thông báo thẻ: “Có dữ liệu phát thanh để đối chiếu. Chưa cấp quyền truy cập kho lưu trữ.”'}
  },
  'scene-witness':{
   'entry-nhi':{
    narration:'Nhi lách qua mái bạt của quán cháo. Bà chủ nhét vào tay cô một cuộn băng từ bọc dầu, góc bìa ghi địa chỉ kho số 09 bằng nét chữ run. Nhi nhận ra nhãn “My” và hồi tưởng những đơn hàng vô danh đã giao suốt nhiều năm. Cô chưa hề nghe bản này, nên không thể biết người trong băng còn sống đến hôm nay hay không.',
    dialogue:'Bà bán cháo: “Đây là lời người ta ghi lại từ đêm cửa số bốn đóng. Giao tận tay người giữ hồ sơ, Nhi. Con không cần tự đoán ai đang nói trên loa.”',
    returnNarration:'Nhi quay lại quán cháo, lần này đã ghi nguyên lời người giữ băng. Cô hiểu băng ghi âm là dấu vết quá khứ chứ chưa chứng minh được giọng vừa phát trên loa. Bà chủ đặt lên bàn tên các gia đình còn chờ tin; quyết định trao bản sao giờ có trọng lượng khác.',
    choiceLabels:{'record-testimony':'Hỏi bà về nguồn gốc băng rồi ghi lại nguyên lời.','send-tape':'Tự mang bản sao tới các gia đình chờ tin.','leave-witness':'Giữ cuộn băng, quay lại cầu tàu.'}},
   'entry-lam':{
    narration:'Lam tìm tới quầy cháo vì trong bản ghi cô vừa mở có giọng nói quen thuộc từ hành lang số bốn. Nhi, người giao bưu kiện, đặt chiếc băng từ lên bàn và nhìn Lam chờ xác nhận danh tính người nhận. Lam nhận ra tên My trên vỏ băng nhưng chưa biết người phát tín hiệu mới là ai.',
    dialogue:'Nhi nói: “Tôi chỉ được nhờ đưa tới kho 09. Nếu chị là người lưu trữ, hãy giữ nguyên tiếng nói trong băng, đừng sửa theo bảng tin.”'},
   'entry-k07':{
    narration:'K-07 đứng ngoài mái che, quan sát người giao hàng Nhi nhận cuộn băng từ từ bà bán cháo. Thẻ hệ thống không có quyền tịch thu chứng cứ. Người thanh tra ảo chỉ có thể hỏi, ghi nhận lời kể và đối chiếu với dữ liệu công khai.',
    dialogue:'Nhi giữ chặt cuộn băng: “Một thẻ trắng không nói được anh làm việc cho ai. Anh cần ghi lại lời bà trước.”'}
  },
  'scene-archive':{
   'entry-lam':{
    narration:'Lam mở kho lưu trữ bằng chìa khóa đã được ông Tuyên giao. Cô đang trực ca phục hồi dữ liệu khi hai bản ghi cùng mã 0 xuất hiện, một dòng đánh dấu HIỆN TRƯỜNG, dòng kia mất nhãn. Từ loa hành lang, cô nghe cái tên My — người bạn biến mất khỏi danh sách cư trú mười bốn năm trước. Cô phải xác minh bản gốc trước khi nói với bất kỳ ai.',
    dialogue:'Ông Tuyên đứng bên bàn hồ sơ: “Lam, trước khi tin vào màu xanh an toàn, hãy đọc xem dòng nào ghi điều đã xảy ra.”'},
   'entry-k07':{
    narration:'Sau khi trình dấu vết phát sóng ở quầy tiếp nhận, K-07 được ông Tuyên dẫn tới phần hồ sơ cần đối chiếu. Thẻ trắng vẫn không mở bất cứ quyền công bố hoặc điều khiển nào; nhiệm vụ chỉ là ghi lại sai lệch giữa hai bản số 0.'}
  },
  'scene-relay':{
   'entry-khai':{
    narration:'Khải đang trực kỹ thuật ở trạm chuyển tiếp dưới mực nước biển. Đồng hồ đo điện vừa bỏ qua mười bảy phút; không có nhân viên nào ký nhận mất tín hiệu. Anh đánh một vạch mực lên găng tay, rồi nhìn thấy niêm phong cầu dao cơ khí đã bong. Nếu mạng cứu hộ lại phát lặp lúc tàu đông, cổng sơ tán có thể đóng.',
    dialogue:'Máy đo hiện cảnh báo: “Chu kỳ 408 không có nhật ký điều khiển tương ứng.” Khải nhớ một dòng chú giải của người kỹ sư đời trước: “Cắt kênh trước khi cổng đóng.”'},
   'entry-k07':{
    narration:'K-07 theo dấu vết phát sóng xuống trạm chuyển tiếp, nhưng không được sờ vào thiết bị. Cầu dao cơ khí trước mắt có thể giải thích mười bảy phút trống; cần một kỹ thuật viên xác minh trước khi bất kỳ ai thao tác.'}
  },
  'scene-tuyen':{
   'entry-k07':{
    narration:'K-07 dừng trước quầy tiếp nhận kho 09. Cánh cửa lưu trữ phía sau ông Tuyên vẫn khóa. Thẻ thanh tra trắng chỉ đủ mở cuộc hội thoại, không phải khóa cửa. Nếu muốn xem bản ghi, K-07 phải chỉ ra sai lệch trên bảng tin.',
    dialogue:'Ông Tuyên gõ lên mép bàn: “Tôi không tin quyền do một chiếc thẻ tự khai. Cho tôi thấy dấu mốc mà người khác cũng kiểm chứng được.”'}
  }
 };
 for(const page of pages){
  page.context=sceneContexts[page.sceneId];
  if(roleScenes[page.sceneId])page.roleScenes=roleScenes[page.sceneId];
 }
 const arrival=pages.find(page=>page.sceneId==='scene-arrival');
 arrival.returnNarration='Bạn trở lại cầu tàu tầng chín. Đồng hồ đã chạy tiếp, nhưng khoảng trống mười bảy phút vẫn nằm nguyên trên bảng tin. Các dấu vết vừa thu thập giúp bạn đọc tình huống khác với lần đầu.';
 arrival.returnDialogue='Loa công cộng lặp lại thông báo an toàn. Chưa có bản điều tra chính thức nào được công bố.';
 const witness=pages.find(page=>page.sceneId==='scene-witness');
 witness.returnNarration='Bạn quay lại quầy cháo với thông tin đã ghi nhận. Cuộn băng vẫn nằm nguyên trong bọc dầu; giờ là lúc phân biệt lời người làm chứng với dữ liệu hệ thống và quyết định có nên giao bản sao.';
 const entryBriefings=[
  {entryId:'entry-lam',worldContext:'Thiên Khâu năm 2187: tất cả bảng tin vừa bỏ qua mười bảy phút chu kỳ 408. Một tín hiệu lạ gọi tên My, người từng mất khỏi sổ cư trú mười bốn năm trước.',roleMemory:'Bạn là Lam, chuyên viên phục hồi hồ sơ kho 09. Bạn nhớ My là bạn thuở nhỏ; ông Tuyên là người quản thủ đã giao chìa khóa kho cho bạn.',incitingIncident:'Trong ca trực, hai bản ghi số 0 cùng xuất hiện với dữ liệu trái nhau. Giọng My vang lên từ hệ thống phát thanh, nhưng chưa ai xác minh được người phát.',objective:'So hai bản gốc, tìm người làm chứng và quyết định có đủ căn cứ công bố hay không.',boundaries:'Bạn đọc được hồ sơ kho 09; không có quyền tự sửa Canon, xác nhận My hiện tại hay cấp thưởng.'},
  {entryId:'entry-khai',worldContext:'Thiên Khâu năm 2187: thành phố bị mất mười bảy phút phát thanh. Mạng sơ tán tự động có nguy cơ lặp lệnh khi tàu đông.',roleMemory:'Bạn là Khải, kỹ thuật viên đang trực dưới trạm chuyển tiếp. Bạn hiểu cầu dao cơ khí cũ và có quyền thao tác thiết bị trong phạm vi nghề nghiệp.',incitingIncident:'Đồng hồ kỹ thuật bỏ qua đúng mười bảy phút, còn niêm phong của một cầu dao cứu hộ đã bong.',objective:'Điều tra mạch, so tín hiệu thành phố và chỉ cách ly khi hiểu nguyên nhân vòng lặp.',boundaries:'Bạn không có quyền giả mạo số liệu kho hoặc quyết định nội dung hồ sơ công cộng.'},
  {entryId:'entry-nhi',worldContext:'Thiên Khâu năm 2187: một thành phố tầng trên biển đã bỏ qua mười bảy phút trong nhật ký công cộng. Người dân chỉ thấy màu xanh thông báo an toàn.',roleMemory:'Bạn là Nhi, người giao bưu kiện sống tại cầu tàu tầng chín. Bà bán cháo quen mặt bạn; những món hàng quan trọng thường được nhờ giao tận tay để tránh màn hình giám sát.',incitingIncident:'Khi tàu dừng, bà bán cháo gọi đúng tên bạn và muốn trao một cuộn băng gửi tới kho lưu trữ 09.',objective:'Nhận cuộn băng, tìm đúng người giữ hồ sơ, quyết định trách nhiệm với lời kể của người trong băng.',boundaries:'Bạn không biết nội dung hai bản ghi số 0 và không có quyền tự xác định ai đang phát tín hiệu My.'},
  {entryId:'entry-k07',worldContext:'Thiên Khâu năm 2187: bản tin chu kỳ 408 mất mười bảy phút. Một giọng nói vô chủ xuất hiện đồng thời với khoảng trống ấy.',roleMemory:'Bạn mang danh tính K-07 do cơ chế nhập vai cấp trong bản thử. Thẻ trắng chỉ cho quyền đọc nguồn công khai và đặt câu hỏi, không tạo ra quá khứ hoặc quyền công vụ thật.',incitingIncident:'Ngay lúc kích hoạt hồ sơ ở cầu tàu tầng chín, bạn nhìn thấy bảng tin nhảy giờ và nghe giọng nữ gọi tên My.',objective:'Tìm dấu vết công khai, ghi nhận mâu thuẫn rồi xin ông Tuyên cho đối chiếu hồ sơ.',boundaries:'Không có quyền tự mở kho, thay danh tính người khác, can thiệp trạm điện hoặc công bố thay người có thẩm quyền.'}
 ];
 return {version:'g5c-author-demo-script-1',contentHash:await hashAuthoringJson(world),pages,entryBriefings};}
