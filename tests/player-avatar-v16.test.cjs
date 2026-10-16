const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const avatar=require('../js/player-avatar-v16.js');
const portraits=require('../js/npc-portrait-library-v1.js');
const anime=require('../js/npc-anime-candidates-v14.js');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const source=fs.readFileSync(path.resolve(__dirname,'../js/player-avatar-ui-v16.js'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../css/player-avatar-v16.css'),'utf8');
const vectorIds=portraits.CATALOG.map(x=>x.id);

test('V16 frames: six available, three future-locked, no implicit rewards',()=>{
 assert.equal(avatar.FREE.length,6);
 assert.equal(avatar.RESTRICTED.length,3);
 assert.equal(avatar.FRAMES.length,9);
 for(const frame of avatar.FREE){
  assert.equal(avatar.canChooseFrame(frame.id),true);
  assert.ok(frame.color.startsWith('#'));
 }
 for(const frame of avatar.RESTRICTED){
  assert.equal(avatar.canChooseFrame(frame.id),false);
  assert.equal(avatar.validate({kind:'initials',frameId:frame.id}),null);
 }
 assert.equal(avatar.canChooseFrame('__proto__'),false);
 assert.equal(avatar.frame('made-up'),null);
});

test('V16 safe fallback does not mutate old profiles',()=>{
 const old={name:'Nguyễn Thị Minh',level:17,inventory:[{id:'m1'}]};
 const snapshot=JSON.stringify(old);
 const safe=avatar.safeState(old,{vectorIds});
 assert.deepEqual(safe,{kind:'initials',presetId:'',uploadId:'',frameId:'none'});
 assert.equal(JSON.stringify(old),snapshot);
 assert.equal(avatar.initials(old.name),'TM');
 assert.equal(avatar.safeState({playerAvatar:{kind:'anime',presetId:'bad',frameId:'legend'}},{vectorIds}).kind,'initials');
});

test('V16 validates deliberate anime, vector and upload choices only',()=>{
 const a=avatar.validate({kind:'anime',frameId:'sakura',presetId:anime.CANDIDATES[0].id},{vectorIds});
 assert.deepEqual(a,{kind:'anime',frameId:'sakura',presetId:anime.CANDIDATES[0].id,uploadId:''});
 assert.equal(avatar.validate({kind:'anime',frameId:'sakura',presetId:'anime-evil'},{vectorIds}),null);
 assert.equal(avatar.validate({kind:'vector',frameId:'moon',presetId:'portrait-f-01'},{vectorIds}).kind,'vector');
 assert.equal(avatar.validate({kind:'vector',frameId:'moon',presetId:'portrait-n-01'},{vectorIds}),null,
  'Existing legacy NPC portraits are not automatically offered to player editor');
 assert.equal(avatar.validate({kind:'upload',frameId:'cyber',uploadId:'own-123-abc'},{vectorIds}).kind,'upload');
 assert.equal(avatar.validate({kind:'upload',frameId:'cyber',uploadId:'../../admin'},{vectorIds}),null);
 assert.equal(avatar.validate({kind:'initials',frameId:'none'}).kind,'initials');
 assert.equal(avatar.uploadIdentity('../../different-user'),null);
 assert.equal(avatar.uploadIdentity('sandbox-guest'),'sandbox-guest');
 assert.equal(avatar.isValidImageDataURL('data:image/svg+xml;base64,AAAA'),false);
 assert.equal(avatar.isValidImageDataURL('https://example.com/pic.png'),false);
});

test('V16 Sandbox UI fields integrated into home, account, profile and chat',()=>{
 for(const id of ['player-avatar-v16-modal','player-avatar-v1',
  'phone-player-avatar-v16','player-avatar-header-v16','phone-player-name-v16',
  'player-avatar-v16-frames','player-avatar-v16-preset-grid','player-avatar-preview-v16']){
   assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(html,/src="js\/player-avatar-ui-v16.js(?:\?v=[^"]+)?"/);
 assert.match(html,/href="css\/player-avatar-v16.css"/);
 assert.match(html,/if\(IS_SANDBOX_MODE\)renderPlayerAvatarPlacesV16\(\)/);
 assert.match(html,/if\(avatarBadge\)renderPlayerAvatarV16\(avatarBadge\)/);
 assert.match(source,/if\(!IS_SANDBOX_MODE\|\|!playerAvatarDraftV16\|\|/);
 assert.match(source,/DuduNpcPortraitLibrary\.saveUpload\(/);
 assert.match(source,/DuduPlayerAvatarV16\.SCOPE/);
 assert.match(source,/saveCurrentAccount\(\)/);
 assert.match(css,/body\.dudu-phone-v11 \.dudu-player-avatar-v16/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('V16 does not grant frames via client and has no remote upload',()=>{
 assert.doesNotMatch(source,/fetch\(|db\.collection\(|firebase\.storage\(|grantCollectible\(|grantFrame\(|unlockChapterCharacter\(/);
 assert.match(source,/if\(!DuduPlayerAvatarV16\.canChooseFrame\(frame\.id\)\)return/);
 assert.match(source,/Chờ xác minh thành tựu truyện từ máy chủ/);
 assert.match(source,/Chờ xác minh mốc quan hệ NPC từ máy chủ/);
 assert.match(source,/Chỉ mở khi tài khoản được máy chủ xác thực là Tác Giả/);
 assert.match(source,/if\(!IS_SANDBOX_MODE\)/);
 assert.doesNotMatch(source,/userProfile\.currency\s*[+*=-]|userProfile\.inventory\.push/);
});
