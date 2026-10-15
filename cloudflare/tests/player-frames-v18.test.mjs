import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appearanceFrames,normalizeVerifiedAwards,normalizeAppearanceSave,
 displayState,SERVER_AWARD_SOURCES} from '../src/player-appearance-rules.mjs';

const reader={uid:'reader-uid',admin:false};
const proof=(frameId,evidenceId='server-event-01')=>({
 frameId,source:SERVER_AWARD_SOURCES[frameId],evidenceId,grantedAt:1792000000000
});
const avatar=(frameId)=>({expectedRevision:0,avatar:{
 kind:'anime',presetId:'anime-moon-blue',frameId
}});
test('verified server ledger alone can show legend/bond eligibility',()=>{
 const proofs=[proof('legend'),proof('soulbond','bond-evidence-02')];
 assert.deepEqual(normalizeVerifiedAwards(proofs),['legend','soulbond']);
 assert.deepEqual(appearanceFrames(reader,proofs).slice(-2),['legend','soulbond']);
 for(const id of ['legend','soulbond']){
   assert.equal(normalizeAppearanceSave(avatar(id),reader),null);
   assert.equal(normalizeAppearanceSave(avatar(id),reader,proofs).avatar.frameId,id);
 }
 const state=displayState({revision:2,avatar:{
  kind:'anime',presetId:'anime-moon-blue',frameId:'soulbond'}},reader,proofs);
 assert.equal(state.avatar.frameId,'soulbond');
 assert.ok(!state.lockedFrames.includes('soulbond'));
});
test('forged client milestone or malformed ledger rows cannot unlock frames',()=>{
 const malicious=[
  {frameId:'legend',source:'CLIENT_EVENT',evidenceId:'abc',grantedAt:1792000000000},
  {frameId:'legend',source:'VERIFIED_STORY_MILESTONE',evidenceId:'../victim',grantedAt:1792000000000},
  {frameId:'soulbond',source:'VERIFIED_STORY_MILESTONE',evidenceId:'event-ok',grantedAt:1792000000000},
  {frameId:'soulbond',source:'VERIFIED_NPC_BOND',evidenceId:'event-ok',grantedAt:'now'},
  {frameId:'__proto__',source:'VERIFIED_NPC_BOND',evidenceId:'event-ok',grantedAt:1792000000000}
 ];
 assert.deepEqual(normalizeVerifiedAwards(malicious),[]);
 assert.equal(normalizeAppearanceSave({...avatar('legend'),claimedAchievements:['legend']},reader,
   [proof('legend')]),null);
 assert.equal(normalizeAppearanceSave({
   expectedRevision:0,avatar:{...avatar('soulbond').avatar,admin:true}
 },reader,[proof('soulbond')]),null);
 assert.deepEqual(appearanceFrames(reader,[]),
   ['none','moon','violet','sakura','cyber','starlight']);
});
test('ledger award IDs are unique, immutable and fail closed',()=>{
 assert.deepEqual(normalizeVerifiedAwards(null),[]);
 assert.deepEqual(normalizeVerifiedAwards([proof('legend'),proof('legend')]),['legend']);
 assert.deepEqual(normalizeVerifiedAwards([
   {...proof('legend'),grantedAt:-1},{...proof('soulbond'),evidenceId:''}
 ]),[]);
});
test('worker has no route to mint awards and reward gate is OFF',async()=>{
 const fs=await import('node:fs');const path=await import('node:path');
 const root=path.resolve(import.meta.dirname,'..');
 const worker=fs.readFileSync(path.join(root,'src/index.mjs'),'utf8');
 const store=fs.readFileSync(path.join(root,'src/player-appearance.mjs'),'utf8');
 const wrangler=fs.readFileSync(path.join(root,'wrangler.toml'),'utf8');
 assert.match(wrangler,/AVATAR_AWARDS_ENABLED = "false"/);
 assert.match(worker,/env\.AVATAR_AWARDS_ENABLED==='true'\?await store\.verifiedAwards\(\):\[\]/);
 assert.match(worker,/normalizeAppearanceSave\(body,identity,awards\)/);
 assert.match(worker,/displayState\(await store\.mine\(\),identity,awards\)/);
 assert.match(store,/CREATE TABLE IF NOT EXISTS frame_awards/);
 assert.match(store,/UNIQUE\(source,evidence_id\)/);
 assert.doesNotMatch(store,/INSERT INTO frame_awards|UPDATE frame_awards/);
 assert.doesNotMatch(worker,/player-avatar\/grant|avatar\/award|clientAchievement/);
});
