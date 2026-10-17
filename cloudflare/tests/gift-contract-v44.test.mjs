import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DESTINATIONS,STAGES,quoteGift,transition,authorBindingStatus}
 from '../src/gift-contract-v44.mjs';
const story={id:'novel-one',status:'PUBLISHED',realmTag:'CULTIVATION'};
const chapter={id:'ch-one',storyId:'novel-one',status:'PUBLISHED',realmTag:'CULTIVATION'};
const author={source:'SERVER_AUTHOR_REGISTRY',status:'VERIFIED',
 storyId:story.id,ownerUid:'uid-author-123',revision:1};
const item=(patch={})=>({source:'SERVER_ITEM_LEDGER',id:'common-biscuit',
 instanceId:'inst-0001',ownerUid:'uid-reader-123',status:'OWNED',
 scope:'COMMON',giftable:true,transferable:true,unique:false,
 ...patch});
const req=(args={})=>({senderUid:'uid-reader-123',item:item(),story,chapter,
 binding:author,destination:DESTINATIONS.AUTHOR,note:'Cảm ơn tác giả!',now:20261017,
 ...args});
test('V44: verified server author mapping resolves recipient UID, never display name',()=>{
 const planned=quoteGift(req());
 assert.equal(planned.ok,true);
 assert.equal(planned.quote.recipientType,'AUTHOR_UID');
 assert.equal(planned.quote.recipientKey,'uid-author-123');
 assert.equal(planned.quote.status,STAGES.PENDING);
 assert.equal(planned.quote.note,'Cảm ơn tác giả!');
 assert.equal(authorBindingStatus({story,binding:author}).verified,true);
 assert.equal(authorBindingStatus({story,binding:author}).label,'Tác giả đã xác minh');
});
test('V44: no author UID inferred from story UI data, self-assigned author role or unverified mapping',()=>{
 const forgedStory={...story,authorUid:'uid-reader-123',ownerUid:'uid-reader-123',
  authorName:'Tác giả',role:'admin'};
 for(const binding of [null,undefined,{...author,status:'PENDING'},
  {...author,source:'CLIENT_PROFILE'}, {...author,storyId:'some-other-story'},
  {...author,ownerUid:'bad uid'}, {...author,revision:0}])
  assert.equal(quoteGift(req({story:forgedStory,binding})).reason,'author-unverified');
 assert.equal(authorBindingStatus({story:forgedStory}).verified,false);
 assert.equal(quoteGift(req({senderUid:'uid-author-123',
  item:item({ownerUid:'uid-author-123'})})).reason,'self-gift');
});
test('V44: story vault is different from author account and chapter vault',()=>{
 const giftToStory=quoteGift(req({binding:null,destination:DESTINATIONS.STORY}));
 const giftToChapter=quoteGift(req({binding:null,destination:DESTINATIONS.CHAPTER}));
 assert.equal(giftToStory.ok,true);
 assert.equal(giftToStory.quote.recipientType,'STORY_VAULT');
 assert.equal(giftToStory.quote.recipientKey,story.id);
 assert.equal(giftToChapter.ok,true);
 assert.equal(giftToChapter.quote.recipientType,'CHAPTER_VAULT');
 assert.equal(giftToChapter.quote.recipientKey,story.id+'::'+chapter.id);
 assert.equal(giftToStory.quote.recipientKey==='uid-author-123',false);
 assert.equal(quoteGift(req({destination:DESTINATIONS.NPC})).reason,'npc-gift-separate-workflow');
});
test('V44: source item must exist in authoritative server ledger and belong to signed sender',()=>{
 for(const fake of [
  {...item(),source:'BROWSER_INVENTORY'},
  {...item(),ownerUid:'uid-other-123'},
  {...item(),status:'ESCROW'},
  {...item(),instanceId:''},
  {...item(),instanceId:'wrong space'},
  {...item(),giftable:false},
  {...item(),transferable:false},
  {...item(),unique:true},
  {...item(),scope:'DUDU'},
  {...item(),scope:'FUNCTIONAL'},
  {...item(),locked:true}
 ])assert.equal(quoteGift(req({item:fake})).ok,false);
 assert.equal(quoteGift(req({senderUid:'not a uid'})).reason,'sender-unauthenticated');
});
test('V44: realm gifts require precise origin story/chapter, not just similar genre',()=>{
 const realm=item({id:'cult-spirit-fragment',scope:'REALM',realmTag:'CULTIVATION',
  originStoryId:story.id,originChapterId:chapter.id});
 assert.equal(quoteGift(req({item:realm})).ok,true);
 assert.equal(quoteGift(req({item:{...realm,originStoryId:'novel-two'}})).reason,
  'realm-source-mismatch');
 assert.equal(quoteGift(req({item:{...realm,originChapterId:'ch-two'}})).reason,
  'realm-source-mismatch');
 assert.equal(quoteGift(req({item:realm,chapter:{...chapter,realmTag:'FANTASY'}})).reason,
  'realm-source-mismatch');
 assert.equal(quoteGift(req({item:realm,chapter:null})).reason,'realm-source-mismatch');
});
test('V44: author-defined story and chapter item require author approval and matching scope',()=>{
 const storyItem=item({id:'author-story-item',scope:'STORY',originStoryId:story.id});
 assert.equal(quoteGift(req({item:storyItem})).ok,true);
 assert.equal(quoteGift(req({item:{...storyItem,originStoryId:'other'}})).reason,
  'story-source-mismatch');
 const chItem=item({id:'author-chapter-item',scope:'CHAPTER',
  originStoryId:story.id,originChapterId:chapter.id});
 assert.equal(quoteGift(req({item:chItem,destination:DESTINATIONS.CHAPTER})).reason,
  'chapter-transfer-locked');
 assert.equal(quoteGift(req({item:{...chItem,authorTransferApproval:true},
  destination:DESTINATIONS.CHAPTER})).ok,true);
 assert.equal(quoteGift(req({item:{...chItem,authorTransferApproval:true},
  destination:DESTINATIONS.AUTHOR})).reason,'chapter-transfer-locked');
});
test('V44: accept or decline only by verified designated recipient',()=>{
 const receipt={...quoteGift(req()).quote,transferId:'transfer-1'};
 assert.equal(transition({receipt,action:'ACCEPT',actorUid:'uid-reader-123',now:300}).reason,
  'not-recipient');
 const accept=transition({receipt,action:'ACCEPT',actorUid:'uid-author-123',now:300});
 assert.equal(accept.ok,true);
 assert.equal(accept.receipt.status,STAGES.ACCEPTED);
 assert.equal(transition({receipt:accept.receipt,action:'ACCEPT',
  actorUid:'uid-author-123',now:310}).alreadyApplied,true);
 assert.equal(transition({receipt:accept.receipt,action:'DECLINE',
  actorUid:'uid-author-123',now:311}).reason,'finalized');
 assert.equal(transition({receipt,action:'DECLINE',actorUid:'uid-author-123',
  now:400}).receipt.status,STAGES.DECLINED);
});
test('V44: cancel pending only by sender, server-only expiry and return',()=>{
 const receipt={...quoteGift(req({destination:DESTINATIONS.STORY})).quote,
  transferId:'transfer-2'};
 assert.equal(transition({receipt,action:'CANCEL',
  actorUid:'uid-author-123',now:300}).reason,'not-sender');
 const cancel=transition({receipt,action:'CANCEL',
  actorUid:'uid-reader-123',now:300});
 assert.equal(cancel.receipt.status,STAGES.CANCELLED);
 assert.equal(transition({receipt,action:'RETURN',
  actorUid:'uid-author-123',now:300}).reason,'return-requires-server-worker');
 assert.equal(transition({receipt,action:'EXPIRE',now:300}).reason,
  'expiry-requires-server-worker');
 assert.equal(transition({receipt,action:'INVALID',actorUid:'uid-reader-123',now:300}).reason,
  'invalid-action');
});
test('V44: note bounds, moderation requirement and public metadata never yields author UID',()=>{
 assert.equal(quoteGift(req({note:'X'.repeat(161)})).reason,'invalid-request');
 assert.equal(quoteGift(req({note:'\u0000'})).reason,'invalid-request');
 assert.equal(quoteGift(req({story:{...story,status:'DRAFT'}})).reason,
  'story-unavailable');
 assert.equal(quoteGift(req({destination:DESTINATIONS.CHAPTER,
  chapter:{...chapter,storyId:'novel-two'}})).reason,'chapter-unavailable');
 assert.equal(JSON.stringify(authorBindingStatus({story,binding:author})).includes('ownerUid'),false);
});
