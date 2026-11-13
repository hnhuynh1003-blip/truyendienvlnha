// Synthetic authoring content only; no user account or private story.
const HASH='a'.repeat(64),ASSET_HASH='b'.repeat(64);
export function content(){return {
 schemaVersion:'world-content-1',contentVersion:'1.0.0',title:'A room',genreId:'era',requestedWorldRank:'F',dangerLevel:'low',
 storySource:{kind:'library',storyId:'epub-existing_story',storyVersion:'version-7',contentHash:HASH},
 story:{logline:'A visitor solves a riddle.',setting:'A quiet room.',playerRole:'A local caretaker.',opening:'The door closes.',
  secretTruth:'SECRET_TRUTH_SENTINEL',plotBeats:['Read the room.','Solve the riddle.'],worldRules:['The door opens after the riddle.']},
 worldCoverAssetId:'art-cover',assets:[
  {assetId:'art-cover',assetVersion:'v1',contentHash:ASSET_HASH,kind:'worldCover',altText:'An old house'},
  {assetId:'art-room',assetVersion:'v1',contentHash:ASSET_HASH,kind:'sceneBackground',altText:'A quiet room'}],
 maps:[{mapId:'map-room',name:'House',placeIds:['place-room']}],
 places:[{placeId:'place-room',mapId:'map-room',name:'Room',sceneIds:['scene-room']}],
 scenes:[{sceneId:'scene-room',placeId:'place-room',backgroundAssetId:'art-room',summary:'A room.',viewIds:['view-room'],transitions:[]}],
 views:[{viewId:'view-room',sceneId:'scene-room',kind:'wide',assetId:'art-room',hotspots:[]}],
 cast:[],characterVisuals:[],characterAppearances:[],npcs:[],
 playerEntryProfiles:[{entryId:'entry-local',label:'Caretaker',mode:'native_extra',nativeSlotId:'slot-local',
  socialAnchorNotes:'A caretaker who has lived here for years.',startSceneId:'scene-room',initialKnownFacts:[],initialFlags:[]}],
 entryPolicy:{mode:'fixed',forcedEntryId:'entry-local'},entry:{entrySceneId:'scene-room'},
 items:[],shops:[],missions:[{missionId:'mission-room',name:'Visit the room',kind:'main',requiredForCompletion:true,
  startSceneId:'scene-room',summary:'Find a way out.',objectives:[{objectiveId:'objective-room',verb:'reach',targetId:'scene-room',requiredCount:1}],
  rewardRequest:{exp:0,items:[]},replayPolicy:'repeat_no_reward'}],events:[],
 endings:[{endingId:'ending-room',title:'Morning',result:'success',requiredFlags:[]}],
 playRequirements:{requiredVisitPlaceIds:[],requiredInteractNpcIds:[]},
 aiPolicy:{aiNpcRequested:false,allowAiRewards:false,allowAiWorldMutation:false}
};}
