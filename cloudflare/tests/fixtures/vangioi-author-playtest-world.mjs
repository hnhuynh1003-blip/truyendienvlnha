// A brand-new, author-shaped test world. Original story, PLACEHOLDER source
// and asset hashes; no upload, approval, licence, publication or real rewards.
import {hashAuthoringJson} from '../../src/vangioi-authoring.mjs';
import {G4A_ENGINE_VERSION} from '../../src/vangioi-engine-g4a.mjs';

const A='a'.repeat(64),B='b'.repeat(64);

export function lighthouseWorld(){
 return {
  schemaVersion:'world-content-1',contentVersion:'1.0.0',
  title:'Ngọn đèn cuối ở Bến Sương',genreId:'era',requestedWorldRank:'F',dangerLevel:'moderate',
  contentTags:['storm','relationships'],
  storySource:{kind:'original',storyId:'source-ben-suong-demo',storyVersion:'fixture-1',contentHash:A},
  story:{
   logline:'Một cơn bão kéo tới; người gác đèn phải chọn giúp người hay giữ tín hiệu cho cả bến.',
   setting:'Bến Sương, một hải đăng cũ ở thị trấn ven biển trước thời vô tuyến phổ biến.',
   playerRole:'Người tập việc địa phương hoặc một thanh tra tín hiệu vừa đến bến.',
   opening:'Sóng đánh vào chân cầu cảng. Đèn hải đăng nhấp nháy lần cuối.',
   secretTruth:'PRIVATE_DEMO_CANON: máy phát điện đang cạn nhiên liệu, không có thủ phạm bí mật.',
   plotBeats:['Bão nổi ở cầu cảng.','Chọn cách dùng quãng thời gian còn lại.',
    'Nhìn hậu quả ở tháp đèn.'],
   worldRules:['Mỗi đêm chỉ có đủ thời gian cho một việc quan trọng.',
    'Cứu người và giữ đèn đều có cái giá của nó.']},
  worldCoverAssetId:'art-ben-suong-cover',assets:[
   {assetId:'art-ben-suong-cover',assetVersion:'fixture-1',kind:'worldCover',contentHash:B,
    altText:'Cầu cảng ướt mưa, phía xa là một hải đăng.'},
   {assetId:'art-ben-suong-quay',assetVersion:'fixture-1',kind:'sceneBackground',contentHash:B,
    altText:'Cầu cảng Bến Sương trong đêm bão.'},
   {assetId:'art-ben-suong-tower',assetVersion:'fixture-1',kind:'sceneBackground',contentHash:B,
    altText:'Phòng đèn hải đăng có hai ngọn đèn dự phòng.'}],
  maps:[{mapId:'map-ben-suong',name:'Bến Sương',placeIds:['place-quay','place-tower']}],
  places:[
   {placeId:'place-quay',mapId:'map-ben-suong',name:'Cầu cảng',sceneIds:['scene-quay']},
   {placeId:'place-tower',mapId:'map-ben-suong',name:'Tháp đèn',
    sceneIds:['scene-tower','scene-safe','scene-warning']}],
  scenes:[
   {sceneId:'scene-quay',placeId:'place-quay',backgroundAssetId:'art-ben-suong-quay',
    summary:'Người đi biển kêu cứu trong lúc đèn hải đăng sắp tắt.',viewIds:['view-quay'],
    transitions:[{toSceneId:'scene-tower',trigger:'help_sailor'},
     {toSceneId:'scene-tower',trigger:'keep_beacon'}]},
   {sceneId:'scene-tower',placeId:'place-tower',backgroundAssetId:'art-ben-suong-tower',
    summary:'Bão vẫn quật cửa sổ. Chỉ còn một quyết định ở tháp đèn.',viewIds:['view-tower'],
    transitions:[{toSceneId:'scene-safe',trigger:'resolve_help',requiredFlag:'helped_sailor'},
     {toSceneId:'scene-warning',trigger:'resolve_beacon',requiredFlag:'saved_beacon'}]},
   {sceneId:'scene-safe',placeId:'place-tower',backgroundAssetId:'art-ben-suong-tower',
    summary:'Có người được cứu nhưng tín hiệu hải đăng yếu dần.',viewIds:['view-safe'],transitions:[]},
   {sceneId:'scene-warning',placeId:'place-tower',backgroundAssetId:'art-ben-suong-tower',
    summary:'Đèn tiếp tục soi biển nhưng có người không kịp cập bến.',viewIds:['view-warning'],transitions:[]}],
  views:[
   {viewId:'view-quay',sceneId:'scene-quay',kind:'text_only',hotspots:[]},
   {viewId:'view-tower',sceneId:'scene-tower',kind:'text_only',hotspots:[]},
   {viewId:'view-safe',sceneId:'scene-safe',kind:'text_only',hotspots:[]},
   {viewId:'view-warning',sceneId:'scene-warning',kind:'text_only',hotspots:[]}],
  cast:[{characterId:'character-lan',displayName:'Bà Lan',narrativeRole:'supporting',
   presence:'onstage',playableAsCast:false,storyNotes:'Người gác đèn có tuổi, thận trọng.'}],
  characterVisuals:[],characterAppearances:[],
  npcs:[{npcId:'npc-lan',characterId:'character-lan',name:'Bà Lan',mode:'scripted',
   interactionLevels:['scripted'],dialoguePolicy:'choice_tree',friendable:false,
   introSceneId:'scene-quay',role:'Người gác đèn',
   knowledge:['Bão đã tới; đèn chỉ còn một bình dầu dự phòng.'],
   dialogueNodes:[{nodeId:'node-lan',text:'Con chỉ có thể cứu một việc trước khi nước lên.'}]}],
  playerEntryProfiles:[
   {entryId:'entry-local',label:'Người tập việc địa phương',mode:'native_extra',
    nativeSlotId:'slot-apprentice',socialAnchorNotes:'Đã sống ở Bến Sương từ nhỏ.',
    startSceneId:'scene-quay',initialKnownFacts:['Bà Lan đã trông đèn nhiều năm.'],initialFlags:['local_anchor']},
   {entryId:'entry-inspector',label:'Thanh tra tín hiệu',mode:'system_cover',
    identityAssurance:'unknown',coverName:'Thanh tra mới đến',
    startSceneId:'scene-quay',initialKnownFacts:['Đèn đang thiếu dầu.'],initialFlags:['inspector_cover']}],
  entryPolicy:{mode:'player_choice'},entry:{entrySceneId:'scene-quay'},
  items:[],shops:[],
  missions:[{missionId:'mission-night-watch',name:'Qua đêm bão',kind:'main',
   requiredForCompletion:true,startSceneId:'scene-quay',summary:'Ra quyết định khi bão đến.',
   objectives:[{objectiveId:'objective-tower',verb:'reach',targetId:'scene-tower',requiredCount:1}],
   rewardRequest:{exp:0,items:[]},replayPolicy:'repeat_no_reward'}],
  // G1D/G3A declaration of the same effects executed by G4A's allowlist
  // rules below. These event descriptions do not execute themselves.
  events:[
   {eventId:'event-rescue-choice',trigger:'help_sailor',setFlags:['helped_sailor','decided']},
   {eventId:'event-beacon-choice',trigger:'keep_beacon',setFlags:['saved_beacon','decided']}],
  endings:[
   {endingId:'ending-rescue',title:'Người trở về',result:'success',requiredFlags:['helped_sailor']},
   {endingId:'ending-beacon',title:'Ánh sáng chưa tắt',result:'failure',requiredFlags:['saved_beacon']}],
  playRequirements:{requiredVisitPlaceIds:[],requiredInteractNpcIds:[]},
  aiPolicy:{aiNpcRequested:false,allowAiRewards:false,allowAiWorldMutation:false}
 };
}

export async function lighthouseEngineManifest(world=lighthouseWorld()){
 return {version:G4A_ENGINE_VERSION,contentVersion:world.contentVersion,
  contentHash:await hashAuthoringJson(world),rules:[
   {ruleId:'help-sailor',fromSceneId:'scene-quay',transitionIndex:0,
    condition:{op:'flag_unset',flag:'decided'},
    actions:[{op:'set_flag',flag:'helped_sailor'},{op:'set_flag',flag:'decided'},
     {op:'enter_scene',sceneId:'scene-tower'}]},
   {ruleId:'save-beacon',fromSceneId:'scene-quay',transitionIndex:1,
    condition:{op:'flag_unset',flag:'decided'},
    actions:[{op:'set_flag',flag:'saved_beacon'},{op:'set_flag',flag:'decided'},
     {op:'enter_scene',sceneId:'scene-tower'}]},
   {ruleId:'conclude-rescue',fromSceneId:'scene-tower',transitionIndex:0,
    condition:{op:'flag_set',flag:'helped_sailor'},
    actions:[{op:'enter_scene',sceneId:'scene-safe'}]},
   {ruleId:'conclude-beacon',fromSceneId:'scene-tower',transitionIndex:1,
    condition:{op:'flag_set',flag:'saved_beacon'},
    actions:[{op:'enter_scene',sceneId:'scene-warning'}]}
  ]};
}

export async function lighthousePlaytestScript(world=lighthouseWorld()){
 return {version:'g5c-author-demo-script-1',contentHash:await hashAuthoringJson(world),
  pages:[
   {sceneId:'scene-quay',narration:'Sóng bắn qua lan can. Một người chèo thuyền trượt khỏi mạn.',
    dialogue:'Bà Lan: “Chúng ta không thể vừa kéo người ấy lên vừa thay dầu trước khi thủy triều lên!”',
    entryNotes:{'entry-local':'Bà Lan nắm tay bạn: “Con biết con nước ở đây, giúp ta quyết định.”',
     'entry-inspector':'Bà Lan nhìn giấy tờ lạ của bạn: “Thanh tra mới đến ư? Tôi chưa biết có nên tin cậu.”'},
    choices:[{choiceId:'choice-rescue',ruleId:'help-sailor',label:'Kéo người chèo thuyền lên trước.'},
     {choiceId:'choice-beacon',ruleId:'save-beacon',label:'Chạy lên giữ đèn báo hiệu cho các thuyền khác.'}]},
   {sceneId:'scene-tower',narration:'Bạn tới phòng đèn khi cơn gió mạnh nhất đi qua.',
    dialogue:'Bà Lan: “Một lựa chọn đã được đưa ra. Hãy nhìn xem chuyện gì xảy đến.”',
    choices:[{choiceId:'choice-finish-rescue',ruleId:'conclude-rescue',label:'Nhìn về cầu cảng.'},
     {choiceId:'choice-finish-beacon',ruleId:'conclude-beacon',label:'Nhìn ra cửa biển.'}]},
   {sceneId:'scene-safe',narration:'Người chèo thuyền được cứu. Đêm ấy nhiều thuyền phải tìm đường bằng tiếng chuông vì hải đăng tắt.',
    dialogue:'Bà Lan: “Ta đã giữ được một mạng người. Những người khác vẫn cần chúng ta kể lại sự thật.”',
    endingId:'ending-rescue',choices:[]},
   {sceneId:'scene-warning',narration:'Ánh đèn cứu được nhiều thuyền ngoài xa. Khi bình minh lên, người chèo thuyền vẫn mất tích.',
    dialogue:'Bà Lan: “Ánh sáng đã giúp nhiều người. Nhưng đêm nay có một cái tên ta phải ghi nhớ.”',
    endingId:'ending-beacon',choices:[]}
  ]};
}
