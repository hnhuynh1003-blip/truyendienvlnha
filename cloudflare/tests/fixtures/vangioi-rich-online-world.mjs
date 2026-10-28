// G5C-P4: original, synthetic branching author-demo. No real author licence,
// canon publication, server authority, durable inventory, EXP or Xu.
import {lighthouseWorld} from './vangioi-author-playtest-world.mjs';
import {hashAuthoringJson} from '../../src/vangioi-authoring.mjs';
import {G4A_ENGINE_VERSION} from '../../src/vangioi-engine-g4a.mjs';

const hashes={
 quay:'e731bb2ef6c02dd35568afaed0e8726493e74d5012dc7eff36a635d09010769d',
 tower:'8ba0649a9b9b0f258463cabd755b899c3960b2f46ff19bd46d830b517d311eb6',
 shelter:'f730bdce041b4b63aa7e7ff170f0ed5e29327ee6fd41b65d1c5a1eee2dc682ba',
 an:'67d20dfa9ff059ae46c10fcee83186fd00e830e9efc12799ac9cda56b1d7e478',
 minh:'080d659457973a238a75da17f30df503c9426a87abbd4517bbe9c5058a245e60',
 hao:'94ac177be42481eef1fb1b53d1c8c95b35e31317a64c60f010267cbde43c5a01',
 cover:'28fab46e02aa54a5cd81b21f21f2d064d08b61c8de943837c9d6224e6c93a2a1',
 lan:'8c65b27b8b12334776d5723d3e72d79a9b59efeca3663ad87c6b9151925ab078'
};
const asset=(assetId,kind,contentHash,altText)=>({assetId,assetVersion:'synthetic-p4',kind,contentHash,altText});
const scene=(sceneId,placeId,backgroundAssetId,summary,edges)=>({sceneId,placeId,backgroundAssetId,summary,
 viewIds:['view-'+sceneId.slice(6)],transitions:edges.map(([toSceneId,trigger])=>({toSceneId,trigger}))});
const page=(sceneId,narration,dialogue,choices,entryNotes,endingId)=>({sceneId,narration,dialogue,
 ...(entryNotes?{entryNotes}:{}),...(endingId?{endingId}:{}),
 choices:choices.map(([choiceId,ruleId,label])=>({choiceId,ruleId,label}))});

export function richOnlineWorld(){
 const w=lighthouseWorld();
 w.contentVersion='1.1.0';
 w.story.logline='Giữa đêm bão, người giữ đèn, thủy thủ, người bốc vác và thanh tra giả danh nhìn thấy bốn mặt khác nhau của một lời cầu cứu.';
 w.story.playerRole='Bốn hồ sơ thử thuộc ba cơ chế nhập vai, với lối vào và quyền tiếp cận khác nhau.';
 w.story.opening='Bão đang khép miệng vịnh. Ai có quyền quyết định ngọn đèn sẽ soi về phía nào?';
 w.story.plotBeats=['Gặp người ở bến từ thân phận riêng.','Điều tra dây neo, nói chuyện và đọc sổ đèn.',
  'Chọn cứu một thuyền, giữ luồng sáng hoặc dìu dân vào nơi trú bão.'];
 w.worldCoverAssetId='art-cover';
 w.assets=[asset('art-cover','worldCover',hashes.quay,'Bến Sương và hải đăng dưới trời giông.'),
  asset('art-quay','sceneBackground',hashes.quay,'Cầu cảng dưới mưa, thuyền va vào dây neo.'),
  asset('art-tower','sceneBackground',hashes.tower,'Phòng đèn hải đăng và sổ trực.'),
  asset('art-shelter','sceneBackground',hashes.shelter,'Kho trú bão có dây thừng, đèn dầu và người dân.'),
  asset('art-an','characterPortrait',hashes.an,'An, nữ thủ lĩnh gác đèn.'),
  asset('art-minh','characterPortrait',hashes.minh,'Minh, thủy thủ phụ trách thuyền.'),
  asset('art-hao','characterPortrait',hashes.hao,'Hảo, người khuân vác ở bến.'),
  asset('art-inspector','characterPortrait',hashes.cover,'Người mang giấy công tác chưa được xác minh.'),
  asset('art-lan','npcPortrait',hashes.lan,'Bà Lan, người canh tháp lớn tuổi.')];
 w.maps=[{mapId:'map-ben-suong',name:'Bến Sương',placeIds:['place-quay','place-tower','place-shelter']}];
 w.places=[
  {placeId:'place-quay',mapId:'map-ben-suong',name:'Cầu cảng',sceneIds:['scene-quay','scene-lan','scene-ropes','scene-rescue']},
  {placeId:'place-tower',mapId:'map-ben-suong',name:'Hải đăng',sceneIds:['scene-tower','scene-log','scene-beacon']},
  {placeId:'place-shelter',mapId:'map-ben-suong',name:'Kho trú bão',sceneIds:['scene-shelter','scene-witness']}];
 w.scenes=[
  scene('scene-quay','place-quay','art-quay','Tiếng chuông trên cầu cảng lẫn với tiếng người gọi.',[
   ['scene-lan','speak_lan'],['scene-ropes','inspect_ropes'],['scene-tower','reach_tower'],['scene-rescue','direct_rescue']]),
  scene('scene-lan','place-quay','art-quay','Bà Lan không nói những lời giống nhau với người quen và người lạ.',[
   ['scene-tower','request_lamp_access'],['scene-ropes','hear_warning'],['scene-quay','leave_lan']]),
  scene('scene-ropes','place-quay','art-quay','Dây neo dập vào mạn thuyền. Một nút buộc đã gần đứt.',[
   ['scene-rescue','rescue_with_rope'],['scene-quay','return_quay'],['scene-tower','report_to_tower']]),
  scene('scene-tower','place-tower','art-tower','Ngọn đèn chỉ còn một bình dầu và một sổ trực.',[
   ['scene-log','read_lamp_log'],['scene-beacon','hold_beacon'],['scene-quay','descend_quay'],['scene-lan','call_lan']]),
  scene('scene-log','place-tower','art-tower','Sổ trực ghi ba chuyến thuyền chưa cập bến.',[
   ['scene-beacon','signal_from_log'],['scene-shelter','bring_log_to_villagers'],['scene-tower','close_log']]),
  scene('scene-shelter','place-shelter','art-shelter','Mọi người chờ tin ở kho trú bão.',[
   ['scene-quay','listen_to_villagers'],['scene-ropes','carry_dry_rope'],['scene-witness','warn_shelter']]),
  scene('scene-rescue','place-quay','art-quay','Một người đã về bến, nhưng đèn yếu dần.',[]),
  scene('scene-beacon','place-tower','art-tower','Ánh sáng đến được những con thuyền xa, nhưng không thể tới mọi người.',[]),
  scene('scene-witness','place-shelter','art-shelter','Dân trên bờ tìm được nơi trú, còn số phận ngoài biển chưa ngã ngũ.',[])];
 w.views=w.scenes.map(s=>({viewId:s.viewIds[0],sceneId:s.sceneId,kind:'text_only',hotspots:[]}));
 w.cast=[
  {characterId:'character-an',displayName:'An',narrativeRole:'protagonist',presence:'onstage',playableAsCast:true,
   storyNotes:'Người chịu trách nhiệm giữ đèn, biết sổ trực và có quyền vào tháp.'},
  {characterId:'character-minh',displayName:'Minh',narrativeRole:'supporting',presence:'onstage',playableAsCast:true,
   storyNotes:'Thủy thủ quen luồng nước, biết cách đưa thuyền vào bờ.'},
  {characterId:'character-hao',displayName:'Hảo',narrativeRole:'passerby',presence:'onstage',playableAsCast:false,
   storyNotes:'Người bốc vác vốn ở Bến Sương, quen dân trong kho trú bão.'},
  {characterId:'character-lan',displayName:'Bà Lan',narrativeRole:'supporting',presence:'onstage',playableAsCast:false,
   storyNotes:'Người lớn tuổi trông hải đăng, đòi bằng chứng trước khi tin người lạ.'}];
 w.characterVisuals=[['character-an','art-an'],['character-minh','art-minh'],['character-hao','art-hao'],
  ['character-lan','art-lan']].map(([characterId,assetId])=>({characterId,
   visualPriority:'supporting',identityNotes:'Minh họa gốc dùng riêng cho playtest, chưa được duyệt phát hành.',
   fixedTraits:['Giữ nhất quán ngoại hình trong các cảnh của bản thử.'],
   variants:[{variantId:'visual-'+characterId.slice(10),assetId,format:'portrait'}]}));
 w.characterAppearances=[{appearanceId:'lan-dialogue',characterId:'character-lan',viewId:'view-lan',
  variantId:'visual-lan',displayMode:'portrait',showOn:'dialogue_start',triggerRef:'node-lan',hideOn:'dialogue_end',
  suppressWhenPossessed:true}];
 w.npcs=[{npcId:'npc-lan',characterId:'character-lan',name:'Bà Lan',mode:'scripted',
  interactionLevels:['scripted'],dialoguePolicy:'choice_tree',friendable:false,
  introSceneId:'scene-lan',role:'Người canh tháp',
  knowledge:['Bình dầu chỉ đủ một lần giữ tín hiệu.','Người lạ cần chứng minh mình hiểu việc ngoài bến.'],
  dialogueNodes:[{nodeId:'node-lan',text:'Đừng hỏi ta có tin người hay không. Hãy nói xem cậu đã thấy gì ngoài bến.'}]}];
 w.playerEntryProfiles=[
  {entryId:'entry-protagonist',label:'An · nhân vật chính',mode:'cast_possession',castTargetId:'character-an',
   startSceneId:'scene-tower',initialKnownFacts:['Biết vị trí sổ trực và quyền mở tháp.'],initialFlags:['keeper_access']},
  {entryId:'entry-supporting',label:'Minh · nhân vật phụ',mode:'cast_possession',castTargetId:'character-minh',
   startSceneId:'scene-quay',initialKnownFacts:['Biết điểm dây neo có thể cứu thuyền.'],initialFlags:['crew_access']},
  {entryId:'entry-bystander',label:'Hảo · người qua đường',mode:'native_extra',nativeSlotId:'slot-dock-porter',
   socialAnchorNotes:'Người bốc vác đã sống và làm việc ở bến nhiều năm.',startSceneId:'scene-shelter',
   initialKnownFacts:['Biết kho dây khô và người cần đưa vào nơi trú.'],initialFlags:['native_local']},
  {entryId:'entry-virtual',label:'Người thanh tra · thân phận ảo',mode:'system_cover',coverName:'Thanh tra tín hiệu',
   identityAssurance:'unknown',startSceneId:'scene-quay',
   initialKnownFacts:['Giấy công tác chỉ là vỏ bọc, không phải bằng chứng được tin cậy.'],initialFlags:['inspector_cover']}];
 w.entryPolicy={mode:'player_choice'};
 w.entry={entrySceneId:'scene-quay'};
 w.missions=[{missionId:'mission-night-watch',name:'Đêm bão ở Bến Sương',kind:'main',requiredForCompletion:true,
  startSceneId:'scene-quay',summary:'Khám phá khả năng ứng phó cơn bão từ thân phận đã chọn.',
  objectives:[{objectiveId:'objective-quay',verb:'reach',targetId:'scene-quay',requiredCount:1}],
  rewardRequest:{exp:0,items:[]},replayPolicy:'repeat_no_reward'}];
 w.events=[
  {eventId:'event-ropes',trigger:'inspect_ropes',setFlags:['checked_mooring']},
  {eventId:'event-tower',trigger:'request_lamp_access',setFlags:['trusted_access']},
  {eventId:'event-warning',trigger:'hear_warning',setFlags:['heard_lan']},
  {eventId:'event-log',trigger:'read_lamp_log',setFlags:['saw_log']},
  {eventId:'event-villagers',trigger:'listen_to_villagers',setFlags:['heard_villagers']},
  {eventId:'event-rope-carry',trigger:'carry_dry_rope',setFlags:['checked_mooring']},
  {eventId:'event-rescue',trigger:'rescue_with_rope',setFlags:['chose_rescue']},
  {eventId:'event-light',trigger:'hold_beacon',setFlags:['chose_beacon']},
  {eventId:'event-shelter',trigger:'warn_shelter',setFlags:['chose_shelter']}];
 w.endings=[
  {endingId:'ending-rescue',title:'Một người trở về',result:'success',requiredFlags:['chose_rescue']},
  {endingId:'ending-beacon',title:'Ánh sáng qua đêm',result:'failure',requiredFlags:['chose_beacon']},
  {endingId:'ending-shelter',title:'Những người ở lại',result:'partial',requiredFlags:['chose_shelter']}];
 return w;
}

const on=(flag)=>({op:'flag_set',flag});
const off=(flag)=>({op:'flag_unset',flag});
const any=(...conditions)=>({op:'any',conditions});
const rule=(ruleId,fromSceneId,transitionIndex,condition,flags,toSceneId)=>({ruleId,fromSceneId,
 transitionIndex,condition,actions:[...flags.map(flag=>({op:'set_flag',flag})),
  {op:'enter_scene',sceneId:toSceneId}]});
export async function richOnlineManifest(world=richOnlineWorld()){
 const rules=[
  rule('talk-lan','scene-quay',0,off('chose_rescue'),[],'scene-lan'),
  rule('inspect-ropes','scene-quay',1,off('chose_rescue'),['checked_mooring'],'scene-ropes'),
  rule('climb-tower','scene-quay',2,any(on('crew_access'),on('keeper_access'),on('trusted_access')),[],'scene-tower'),
  rule('rescue-direct','scene-quay',3,on('crew_access'),['chose_rescue'],'scene-rescue'),
  rule('earn-access','scene-lan',0,any(on('keeper_access'),on('crew_access'),on('native_local'),
   on('checked_mooring')),['trusted_access'],'scene-tower'),
  rule('hear-lan','scene-lan',1,off('chose_rescue'),['heard_lan'],'scene-ropes'),
  rule('leave-lan','scene-lan',2,off('chose_rescue'),[],'scene-quay'),
  rule('rescue-rope','scene-ropes',0,on('checked_mooring'),['chose_rescue'],'scene-rescue'),
  rule('leave-ropes','scene-ropes',1,off('chose_rescue'),[],'scene-quay'),
  rule('report-ropes','scene-ropes',2,on('trusted_access'),[],'scene-tower'),
  rule('read-log','scene-tower',0,off('chose_rescue'),['saw_log'],'scene-log'),
  rule('keep-beacon','scene-tower',1,any(on('keeper_access'),on('trusted_access')),['chose_beacon'],'scene-beacon'),
  rule('down-quay','scene-tower',2,off('chose_rescue'),[],'scene-quay'),
  rule('call-lan','scene-tower',3,off('chose_rescue'),[],'scene-lan'),
  rule('signal-log','scene-log',0,on('saw_log'),['chose_beacon'],'scene-beacon'),
  rule('share-log','scene-log',1,on('saw_log'),['log_shared'],'scene-shelter'),
  rule('close-log','scene-log',2,on('saw_log'),[],'scene-tower'),
  rule('visit-quay','scene-shelter',0,off('chose_shelter'),['heard_villagers'],'scene-quay'),
  rule('bring-rope','scene-shelter',1,off('chose_shelter'),['checked_mooring'],'scene-ropes'),
  rule('warn-shelter','scene-shelter',2,off('chose_shelter'),['chose_shelter'],'scene-witness')];
 return {version:G4A_ENGINE_VERSION,contentVersion:world.contentVersion,contentHash:await hashAuthoringJson(world),rules};
}

export async function richOnlineScript(world=richOnlineWorld()){
 return {version:'g5c-author-demo-script-1',contentHash:await hashAuthoringJson(world),pages:[
  page('scene-quay',
   'Mưa quất rát mặt. Chiếc thuyền Gió Nam va vào cọc bến; một bóng người đang cố bám sợi dây neo đã sờn. Trên đồi, đèn hải đăng chớp hai lần rồi yếu đi.',
   'Tiếng người từ cầu cảng: “Dây sắp đứt! Ai biết cách giữ mũi thuyền không?”',[
    ['choice-talk','talk-lan','Gặp bà Lan, hỏi về người và ngọn đèn.'],
    ['choice-ropes','inspect-ropes','Cúi xuống kiểm tra dây neo trước khi quyết định.'],
    ['choice-tower','climb-tower','Lên tháp đèn kiểm tra tín hiệu.'],
    ['choice-direct','rescue-direct','Minh lao ra mạn thuyền, kéo người gặp nạn.']],{
    'entry-supporting':'Thấy Minh, người lái đò Tư kêu: “Cậu thuộc con nước này. Đừng để dây quật trúng người!”',
    'entry-virtual':'Bà Lan nhìn phù hiệu lạ: “Giấy không đỡ được con thuyền. Muốn tôi mở tháp, hãy hiểu tình hình ngoài bến trước.”',
    'entry-protagonist':'Ai đó nhận ra người gác đèn và hô: “An! Đừng quên mấy thuyền còn ở ngoài luồng!”',
    'entry-bystander':'Người trong bến biết Hảo hay buộc dây: “Tụi tôi giữ thuyền, cậu giúp xem nút nào còn chắc.”'}),
  page('scene-lan',
   'Trong mái hiên sạt mưa, bà Lan trải tấm bản đồ bến lên thùng dầu. Bà không hỏi bạn là anh hùng; bà hỏi bạn đã nhìn thấy gì.',
   'Bà Lan: “Trong tháp chỉ còn một bình dầu. Muốn giữ đèn, phải biết ai đang trôi ngoài kia. Muốn cứu người, phải biết dây có chịu nổi không.”',[
    ['choice-access','earn-access','Kể điều mình biết, xin quyền vào tháp.'],
    ['choice-warning','hear-lan','Hỏi kỹ đường nước và nút dây yếu nhất.'],
    ['choice-leave-lan','leave-lan','Chào bà Lan, quay ra nhìn cầu cảng.']],{
    'entry-protagonist':'Bà Lan đẩy sổ trực về phía An: “Con đã nhận ca này. Quyết định đêm nay là của con.”',
    'entry-supporting':'Bà Lan ngập ngừng: “Minh, ta tin tay lái của cậu, nhưng không biết thuyền nào còn ngoài luồng.”',
    'entry-bystander':'Bà Lan gọi bằng tên cũ: “Hảo, người trong kho trú bão đang trông vào con.”',
    'entry-virtual':'Bà Lan giữ lại tờ giấy của người lạ: “Không có xác nhận. Hãy xem sợi dây bị đứt rồi quay lại nói chuyện.”'}),
  page('scene-ropes',
   'Đầu dây neo quấn quanh cọc gỗ. Bạn nhìn thấy vết mòn lâu ngày, không phải vết cắt mới. Dùng nút phụ có thể kéo một người lên, nhưng mất thời gian chuyển dầu cho đèn.',
   'Tiếng thủy thủ ở đầu bến: “Nếu còn dây khô, cứu được một người. Nhưng đêm nay ai dám bỏ mặc luồng ngoài?”',[
    ['choice-rescue-rope','rescue-rope','Thắt nút phụ, phối hợp đưa người vào bờ.'],
    ['choice-back-quay','leave-ropes','Lùi lại cầu cảng để cân nhắc tình hình.'],
    ['choice-report','report-ropes','Báo tình trạng dây neo cho người canh tháp.']],{
    'entry-protagonist':'An nhận ra dây dự phòng từng được ghi thiếu trong sổ bảo dưỡng.',
    'entry-supporting':'Minh có thể chịu sóng để dẫn người vào điểm buộc an toàn.',
    'entry-bystander':'Dây khô Hảo lấy từ kho đủ để làm nút kéo; người dân đã chờ sẵn.',
    'entry-virtual':'Tình trạng dây neo là bằng chứng thực tế đầu tiên người thanh tra có thể trình bà Lan.'}),
  page('scene-tower',
   'Căn phòng trên đỉnh tháp rung theo gió. Ngọn đèn quay chậm; đồng hồ báo còn rất ít dầu. Dưới kia, tiếng gọi bến gần như bị biển nuốt mất.',
   'Có tiếng bà Lan từ cầu thang: “Đừng vặn thêm dầu khi chưa biết ngoài cửa biển còn ai.”',[
    ['choice-read-log','read-log','Mở sổ trực, kiểm tra danh sách tàu chưa về.'],
    ['choice-beacon','keep-beacon','Dồn số dầu cuối cùng để giữ ánh đèn qua bão.'],
    ['choice-descend','down-quay','Xuống cầu cảng xem người gặp nạn.'],
    ['choice-call-lan','call-lan','Gọi bà Lan lên, hỏi về người ngoài biển.']],{
    'entry-protagonist':'Đây là nơi An được giao trực. Cô có quyền giữ đèn, nhưng cũng phải chịu trách nhiệm về hậu quả.',
    'entry-supporting':'Minh chỉ được chạm vào máy đèn khi có người gác tin cậy.',
    'entry-bystander':'Hảo bước vào tháp như người giúp việc khẩn cấp; đây không phải chức trách thường ngày của cậu.',
    'entry-virtual':'Bà Lan tạm cho người thanh tra vào quan sát; danh tính vẫn chưa được chứng thực.'}),
  page('scene-log',
   'Trang sổ bị mưa thấm ghi ba tàu chưa về: Gió Nam, Sao Mai và Lục Bình. Một ký hiệu bên tên Gió Nam đã bị bỏ trống. Sổ không cho bạn biết ai đúng, chỉ nhắc bạn có nhiều người đang đợi.',
   'Dòng chữ mực nhòe của ca trước: “Giữ tín hiệu có thể cứu nhiều thuyền. Đừng quên người ngay dưới chân tháp.”',[
    ['choice-signal-log','signal-log','Đọc xong danh sách, giữ ánh sáng cho các tàu xa.'],
    ['choice-share-log','share-log','Mang danh sách xuống kho để người nhà biết tình hình.'],
    ['choice-close-log','close-log','Gấp sổ, quay lại phòng đèn.']],{
    'entry-protagonist':'An nhận ra nét chữ của mình trong dòng ghi ca trước.',
    'entry-supporting':'Minh nghĩ tới người bạn vẫn ở trên chiếc Sao Mai.',
    'entry-bystander':'Hảo thuộc tên hai gia đình ở kho đang đợi tin.',
    'entry-virtual':'Bản ghi chứng minh tình hình thực tế nhưng không khiến giấy tờ người thanh tra tự nhiên trở thành hợp lệ.'}),
  page('scene-shelter',
   'Trong kho lợp mái tôn, những đứa trẻ ngồi cạnh cuộn dây khô. Một người mẹ đếm tên trên mảnh giấy ướt; bên ngoài là tiếng kẻng báo nước dâng.',
   'Người phụ nữ: “Thuyền có thể đợi. Bọn nhỏ thì không. Ai dẫn chúng lên nền cao?”',[
    ['choice-visit-quay','visit-quay','Nghe người dân kể rồi chạy ra cầu cảng.'],
    ['choice-bring-rope','bring-rope','Mang dây khô ra bến hỗ trợ cứu người.'],
    ['choice-warn-shelter','warn-shelter','Dẫn trẻ nhỏ và người già lên nền cao trước.']],{
    'entry-bystander':'Hảo biết cả lối đi qua sân sau, và những người trong kho gọi cậu bằng tên.',
    'entry-protagonist':'Người dân nhìn áo người gác đèn, hỏi liệu còn tín hiệu cho người ngoài biển không.',
    'entry-supporting':'Có người nhận ra Minh và hỏi con thuyền của anh còn ra khơi được chứ.',
    'entry-virtual':'Không ai trong kho nhận ra người mang phù hiệu thanh tra; họ tin vào hành động hơn danh xưng.'}),
  page('scene-rescue',
   'Nút dây cuối giữ được. Người ở mạn thuyền được kéo lên, thở dốc trên ván bến. Khi mọi người quay nhìn đồi cao, đèn hải đăng đã yếu đi. Vẫn còn tiếng còi của một con tàu ở xa.',
   'Bà Lan: “Chúng ta cứu được một người trước mắt. Ta sẽ ghi lại cả những chiếc thuyền ta chưa tới kịp.”',[],null,'ending-rescue'),
  page('scene-beacon',
   'Đèn quay thêm một vòng sáng qua cửa vịnh. Những con thuyền xa đổi hướng và tránh bãi đá. Dưới cầu cảng, sợi dây đứt bật vào màn mưa. Không ai biết người ở mạn thuyền có kịp bám vào đâu không.',
   'Bà Lan: “Giữ đèn có thể cứu nhiều người. Nhưng không ai được kể đêm nay như thể không có mất mát.”',[],null,'ending-beacon'),
  page('scene-witness',
   'Từng đứa trẻ và người già được đưa lên căn gác khô. Bạn kiểm lại số người trong kho hai lần. Qua khe cửa, ánh đèn trên tháp vẫn chớp yếu và còi thuyền không dứt. Bạn đã bảo vệ được những người ở lại.',
   'Người mẹ: “Cảm ơn. Giờ ai có thể báo cho người ngoài biển biết nơi này vẫn còn chờ họ?”',[],null,'ending-shelter')
 ]};
}
