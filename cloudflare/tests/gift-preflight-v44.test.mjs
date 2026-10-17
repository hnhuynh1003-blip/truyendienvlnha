import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseGiftRequest,previewGift} from '../src/gift-preflight-v44.mjs';
import {DESTINATIONS} from '../src/gift-contract-v44.mjs';
const identity={uid:'reader-uid-1',admin:false};
const story={id:'story-1',status:'PUBLISHED',realmTag:'CULTIVATION'};
const chapter={id:'ch-1',storyId:'story-1',status:'PUBLISHED',realmTag:'CULTIVATION'};
const binding={storyId:'story-1',source:'SERVER_AUTHOR_REGISTRY',
 status:'VERIFIED',ownerUid:'author-uid-2',revision:3};
const owned={id:'common-biscuit',instanceId:'item-100',
 source:'SERVER_ITEM_LEDGER',ownerUid:'reader-uid-1',status:'OWNED',
 giftable:true,transferable:true,unique:false,scope:'COMMON'};
const seen=[];
const trusted={
 getStory:async id=>{seen.push(['story',id]);return story},
 getChapter:async(id,ch)=>{seen.push(['chapter',id,ch]);return chapter},
 getAuthorBinding:async id=>{seen.push(['binding',id]);return binding},
 getOwnedItem:async query=>{seen.push(['owned',query]);return owned}
};
const request={storyId:'story-1',chapterId:'ch-1',itemInstanceId:'item-100',
 destination:DESTINATIONS.AUTHOR,note:'Chúc tác giả vui'};
test('V44 preflight strips attacker-controlled fields before server resolution',()=>{
 assert.deepEqual(parseGiftRequest(request),request);
 for(const extra of [{uid:'other'}, {ownerUid:'other'}, {recipientUid:'other'},
  {item:owned},{binding},{story},{isAdmin:true},{status:'VERIFIED'},
  {proof:'a'}, {source:'SERVER_ITEM_LEDGER'}]){
  assert.equal(parseGiftRequest({...request,...extra}),null);
 }
 assert.equal(parseGiftRequest({...request,destination:'OWN_UID'}),null);
 assert.equal(parseGiftRequest({...request,itemInstanceId:'bad item'}),null);
 assert.equal(parseGiftRequest({...request,note:'x'.repeat(161)}),null);
});
test('V44 preflight resolves only trusted source, returns no recipient UID',async()=>{
 seen.length=0;
 const result=await previewGift({identity,request,source:trusted,now:1761000000000});
 assert.equal(result.ok,true);
 assert.equal(result.previewOnly,true);
 assert.equal(result.canTransferNow,false);
 assert.equal(result.authorVerified,true);
 assert.equal(result.recipientType,'AUTHOR_UID');
 assert.equal('recipientKey' in result,false);
 assert.equal(JSON.stringify(result).includes('author-uid-2'),false);
 assert.deepEqual(seen.find(x=>x[0]==='owned')[1],
  {uid:'reader-uid-1',instanceId:'item-100'});
});
test('V44 preflight fails closed on incomplete adapters, fake owner and unverified author',async()=>{
 assert.equal((await previewGift({identity,request,source:{}})).reason,
  'trusted-source-unavailable');
 assert.equal((await previewGift({identity:null,request,source:trusted})).reason,
  'unauthenticated');
 const withBinding={...trusted,getAuthorBinding:async()=>null};
 assert.equal((await previewGift({identity,request,source:withBinding})).reason,
  'author-unverified');
 const wrongItem={...trusted,getOwnedItem:async()=>({...owned,ownerUid:'another-uid'})};
 assert.equal((await previewGift({identity,request,source:wrongItem})).reason,
  'not-server-owned');
 const wrongId={...trusted,getStory:async()=>({...story,id:'other'})};
 assert.equal((await previewGift({identity,request,source:wrongId})).reason,
  'story-unavailable');
 const thrower={...trusted,getStory:async()=>{throw new Error('db-offline')}};
 assert.equal((await previewGift({identity,request,source:thrower})).reason,
  'trusted-source-unavailable');
});
test('V44 preflight never settles transfer and separates story, chapter, NPC',async()=>{
 const inStory={...request,destination:DESTINATIONS.STORY,chapterId:null};
 const p=await previewGift({identity,request:inStory,source:trusted,now:2000});
 assert.equal(p.ok,true);
 assert.equal(p.recipientType,'STORY_VAULT');
 assert.equal(p.canTransferNow,false);
 const c=await previewGift({identity,request:{...request,destination:DESTINATIONS.CHAPTER},
  source:trusted,now:2000});
 assert.equal(c.ok,true);
 assert.equal(c.recipientType,'CHAPTER_VAULT');
 const npc=await previewGift({identity,request:{...request,destination:DESTINATIONS.NPC},
  source:trusted,now:2000});
 assert.equal(npc.reason,'npc-gift-separate-workflow');
});
