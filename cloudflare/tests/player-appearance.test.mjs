import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appearanceFrames,normalizeAppearanceSave,isApprovedPreset,
  displayState,PLAYER_FRAME_IDS} from '../src/player-appearance-rules.mjs';

const reader={uid:'reader-uid',admin:false};
const admin={uid:'admin-uid',admin:true};
const record=(kind='anime',frameId='moon',presetId='anime-moon-blue',revision=0)=>
  ({expectedRevision:revision,avatar:{kind,frameId,presetId}});

test('server determines frame permissions using verified admin claim only',()=>{
 assert.deepEqual(appearanceFrames(reader),PLAYER_FRAME_IDS.free);
 assert.deepEqual(appearanceFrames(admin),[...PLAYER_FRAME_IDS.free,'author']);
 for(const id of ['legend','soulbond','author']){
   assert.equal(normalizeAppearanceSave(record('anime',id),reader),null);
 }
 assert.equal(normalizeAppearanceSave(record('anime','legend'),admin),null);
 assert.equal(normalizeAppearanceSave(record('anime','soulbond'),admin),null);
 assert.equal(normalizeAppearanceSave(record('anime','author'),admin).avatar.frameId,'author');
});

test('cannot nominate a different UID or sneak in ownership metadata',()=>{
 const source=record();
 for(const additional of [{uid:'victim'}, {ownerUid:'victim'},
  {unlockedFrames:['legend']},{eventCompleted:true},
  {admin:true},{recipientUid:'victim'}]){
   assert.equal(normalizeAppearanceSave({...source,...additional},admin),null);
 }
 assert.equal(normalizeAppearanceSave(
   {...source,avatar:{...source.avatar,role:'admin'}},admin),null);
 assert.equal(normalizeAppearanceSave(
   {...source,avatar:{...source.avatar,uploadId:'own-bad'}},reader),null);
});

test('catalog whitelist cannot be forged, uploaded photos cannot sync without object storage',()=>{
 assert.equal(isApprovedPreset('portrait-f-60'),true);
 assert.equal(isApprovedPreset('portrait-f-61'),false);
 assert.equal(isApprovedPreset('portrait-m-12'),true);
 assert.equal(isApprovedPreset('portrait-m-13'),false);
 assert.equal(isApprovedPreset('portrait-n-01'),false);
 assert.equal(isApprovedPreset('__proto__'),false);
 for(const id of ['anime-moon-blue','anime-moon-violet','anime-peach-court','anime-adventurer'])
   assert.equal(isApprovedPreset(id),true);
 for(const kind of ['upload','other'])
   assert.equal(normalizeAppearanceSave(record(kind),reader),null);
 assert.equal(normalizeAppearanceSave(record('anime','moon','portrait-f-03'),reader),null);
 assert.equal(normalizeAppearanceSave(record('vector','moon','anime-moon-blue'),reader),null);
 assert.equal(normalizeAppearanceSave(record('vector','violet','portrait-f-03'),reader).avatar.kind,'vector');
});

test('revision is required and displayState never claims locked rewards',()=>{
 for(const v of [-1,1.1,NaN,Number.MAX_SAFE_INTEGER+1,'0']){
   assert.equal(normalizeAppearanceSave(record('anime','moon','anime-moon-blue',v),reader),null);
 }
 assert.equal(normalizeAppearanceSave(record('initials','none','',0),reader).avatar.kind,'initials');
 assert.equal(normalizeAppearanceSave(record('initials','none','fake',0),reader),null);
 assert.deepEqual(displayState(null,reader).avatar,{kind:'initials',presetId:'',frameId:'none'});
 const owned={revision:3,avatar:{kind:'anime',presetId:'anime-moon-blue',frameId:'author'}};
 assert.equal(displayState(owned,reader).avatar.frameId,'none');
 assert.equal(displayState(owned,reader).revision,3);
 assert.equal(displayState(owned,admin).avatar.frameId,'author');
 assert.equal(displayState(owned,reader).uploadsEnabled,false);
 assert.deepEqual(displayState(owned,reader).lockedFrames,['legend','soulbond','author']);
});

test('Worker feature kill switch and per-UID Durable Object binding remain OFF',async()=>{
 const fs=await import('node:fs');const path=await import('node:path');
 const root=path.resolve(import.meta.dirname,'..');
 const worker=fs.readFileSync(path.join(root,'src/index.mjs'),'utf8');
 const config=fs.readFileSync(path.join(root,'wrangler.toml'),'utf8');
 const store=fs.readFileSync(path.join(root,'src/player-appearance.mjs'),'utf8');
 assert.match(config,/PLAYER_AVATAR_SYNC_ENABLED = "false"/);
 assert.match(worker,/env\.PLAYER_AVATAR_SYNC_ENABLED!=='true'/);
 assert.match(worker,/const identity=await verifyFirebaseIdToken\(req,env\.PROJECT_ID\)/);
 assert.match(worker,/getByName\('player-avatar-'\+identity\.uid\)/);
 assert.match(worker,/normalizeAppearanceSave\(body,identity,awards\)/);
 assert.match(worker,/store\.save\(approved,Date\.now\(\)\)/);
 assert.match(config,/tag = "v3-player-appearance-sqlite"/);
 assert.match(config,/name = "DUDU_PLAYER_APPEARANCE"/);
 assert.match(store,/this\.ctx\.storage\.transactionSync/);
 assert.match(store,/normalized\.expectedRevision!==existing\.revision/);
 assert.doesNotMatch(store,/userProfile|firebase|request\.uid/);
 assert.doesNotMatch(worker,/path==='\/v1\/player-avatar\/grant'/);
});
