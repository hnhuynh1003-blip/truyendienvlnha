import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanId,normalizedPublication,normalizedPrivateDraft,normalizedDraftApproval,parseScopedIds,isChapterMature,MIN_CHAPTER_ELAPSED_MS}
  from '../src/collectible-rules.mjs';

const release=(overrides={})=>({
  confirmPublicRelease:true,
  item:{
    id:'author-item-001',storyId:'truyen-dien-vl',chapterId:'ch-1',npcId:'c2',
    name:'Đồng hồ bỏ túi',rank:'A',icon:'⌚',desc:'Kỷ vật chương đầu.',
    scope:'CHAPTER',acquisition:{method:'CHAPTER_EVENT'},
    published:true,archived:false,...overrides
  }
});
test('admin-published chapter rules require explicit safe release confirmation',()=>{
  const good=normalizedPublication(release());
  assert.deepEqual(good,{
    storyId:'truyen-dien-vl',itemId:'author-item-001',
    chapterId:'ch-1',npcId:'c2',name:'Đồng hồ bỏ túi',rank:'A',icon:'⌚',
    summary:'Kỷ vật chương đầu.',method:'CHAPTER_EVENT',unique:true
  });
  assert.ok(Object.isFrozen(good));
  assert.equal(normalizedPublication({...release(),confirmPublicRelease:false}),null);
  assert.equal(normalizedPublication(release({archived:true})),null);
  assert.equal(normalizedPublication(release({published:false})),null);
  assert.equal(normalizedPublication(release({id:'sss1'})),null);
});
test('invalid scope, missing chapter and random collectibles must fail closed',()=>{
  for(const item of [
    {chapterId:null},{chapterId:'other/id'},
    {scope:'STORY'},{rank:'X'},{name:' '},{desc:' '},
    {npcId:'external:uid'},{acquisition:{method:'RANDOM'}},
    {acquisition:{method:'COLLECTION_ONLY'}},
    {storyId:'../wrong-story'}
  ])assert.equal(normalizedPublication(release(item)),null,JSON.stringify(item));
  const story=normalizedPublication(release({
    chapterId:null,scope:'STORY',acquisition:{method:'STORY_EVENT'}
  }));
  assert.equal(story.method,'STORY_EVENT');
  assert.equal(story.chapterId,null);
});
test('UID comes from verified Firebase session, body only accepts scoped IDs',()=>{
  assert.deepEqual(parseScopedIds({storyId:'s-1',chapterId:'c-1'},{withChapter:true}),
    {storyId:'s-1',itemId:null,chapterId:'c-1',uid:null});
  assert.equal(parseScopedIds({storyId:'s-1',chapterId:'wrong/slash'},{withChapter:true}),null);
  assert.equal(parseScopedIds({storyId:'s-1',uid:'hi!',itemId:'i-1'},{withItem:true,withUid:true}),null);
  assert.deepEqual(parseScopedIds({storyId:'s-1',uid:'uid-1',itemId:'i-1'},{withItem:true,withUid:true}),
    {storyId:'s-1',itemId:'i-1',chapterId:null,uid:'uid-1'});
  assert.equal(cleanId(''),null);
  assert.equal(cleanId('../secrets'),null);
});
test('server elapsed time is the minimum gate, not evidence of real reading',()=>{
  const start=Date.parse('2026-10-15T09:00:00Z');
  assert.equal(MIN_CHAPTER_ELAPSED_MS,90000);
  assert.equal(isChapterMature(start,start+89999),false);
  assert.equal(isChapterMature(start,start+90000),true);
  assert.equal(isChapterMature(start,start+90001),true);
  assert.equal(isChapterMature(start,NaN),false);
});

test('private author drafts accept unpublished spoilers without making a public release',()=>{
  const body={storyId:'truyen-dien-vl',chapterId:'ch-1',
    item:{name:'Bí mật cuối chương',desc:'Chi tiết chỉ tác giả xem.',
      rank:'SS',type:'ITEM',icon:'🔒',npcId:'c2',method:'CHAPTER_EVENT'}};
  const record=normalizedPrivateDraft(body);
  assert.deepEqual(record,{storyId:'truyen-dien-vl',chapterId:'ch-1',
    itemId:null,npcId:'c2',name:'Bí mật cuối chương',
    summary:'Chi tiết chỉ tác giả xem.',rank:'SS',type:'ITEM',icon:'🔒',method:'CHAPTER_EVENT'});
  assert.equal(normalizedPublication({item:body.item,confirmPublicRelease:true}),null,
    'Private form input is not an authorized public release');
  assert.ok(Object.isFrozen(record));
  assert.equal(normalizedPrivateDraft({...body,itemId:'author-item-private001'})?.itemId,'author-item-private001');
});
test('private draft validation rejects invalid scopes, IDs and random grants',()=>{
  const body={storyId:'story-1',chapterId:null,
    item:{name:'Tên',desc:'Mô tả',rank:'E',type:'ITEM',icon:'🎁',
      method:'COLLECTION_ONLY'}};
  assert.equal(normalizedPrivateDraft(body)?.chapterId,null);
  for(const bad of [
    {...body,storyId:'../files'},
    {...body,chapterId:'ch?'},
    {...body,itemId:'sss1'},
    {...body,item:{...body.item,rank:'Z'}},
    {...body,item:{...body.item,method:'RANDOM'}},
    {...body,item:{...body.item,method:'CHAPTER_EVENT'}},
    {...body,item:{...body.item,npcId:'../other'}},
    {...body,item:{...body.item,desc:''}}
  ])assert.equal(normalizedPrivateDraft(bad),null,JSON.stringify(bad));
});

test('publication approval only accepts an exact server draft version and explicit dual confirmation',()=>{
  const valid={storyId:'story-1',itemId:'author-item-secret-1',
    expectedUpdatedAt:1792051200000,confirmPublicRelease:true,
    confirmRevealToOwner:true};
  assert.deepEqual(normalizedDraftApproval(valid),
    {storyId:valid.storyId,itemId:valid.itemId,
      expectedUpdatedAt:valid.expectedUpdatedAt});
  assert.ok(Object.isFrozen(normalizedDraftApproval(valid)));
  for(const input of [
    {...valid,confirmPublicRelease:false},
    {...valid,confirmRevealToOwner:false},
    {...valid,expectedUpdatedAt:0},
    {...valid,expectedUpdatedAt:1.5},
    {...valid,expectedUpdatedAt:'1792051200000'},
    {...valid,itemId:'sss1'},
    {...valid,storyId:'../other'},
    {...valid,itemId:'author-item-bad/name'},
    null
  ])assert.equal(normalizedDraftApproval(input),null);
});
