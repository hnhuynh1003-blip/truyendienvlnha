import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanId,normalizedPublication,parseScopedIds,isChapterMature,MIN_CHAPTER_ELAPSED_MS}
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
