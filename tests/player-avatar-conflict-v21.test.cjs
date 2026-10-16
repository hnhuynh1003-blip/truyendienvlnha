const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'js/player-avatar-conflict-ui-v21.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/player-avatar-conflict-v21.css'),'utf8');
const avatarUi=fs.readFileSync(path.join(root,'js/player-avatar-ui-v16.js'),'utf8');

test('V21 is clearly an offline-only illustration, not live account sync',()=>{
 for(const phrase of [
  'Đối chiếu avatar nhiều thiết bị (mô phỏng)',
  'không đọc dữ liệu thật',
  'Mô phỏng giữ trên thiết bị',
  'Mô phỏng dùng bản máy chủ'
 ])assert.ok(html.includes(phrase),phrase);
 assert.match(html,/src="js\/player-avatar-sync-plan-v20.js"/);
 assert.match(html,/src="js\/player-avatar-conflict-ui-v21.js"/);
 assert.match(html,/href="css\/player-avatar-conflict-v21.css"/);
 assert.match(ui,/if\(!IS_SANDBOX_MODE\)return/);
 assert.match(html,/Đồng bộ máy chủ đang tắt/);
 assert.match(ui,/DuduPlayerAvatarSyncPlanV20\.review\(/);
 assert.match(ui,/DuduPlayerAvatarSyncPlanV20\.explicitChoice\(/);
 assert.doesNotMatch(ui,/\bfetch\s*\(|indexedDB\.|localStorage\.|saveCurrentAccount\(|saveDB\(|userProfile\.playerAvatar\s*=/);
 assert.doesNotMatch(ui,/DuduPlayerAvatarSyncV17\.createClient\(/);
});
test('V21 safely locks the simulated photo scenario and protects unsupported server choice',()=>{
 assert.match(ui,/kind:'upload',uploadId:'own-v21-demo'/);
 assert.match(ui,/keep\.disabled=!plan\.canKeepDevice/);
 assert.match(ui,/use\.disabled=!plan\.canUseServer/);
 assert.match(ui,/Không thể ghi đè ảnh riêng/);
 assert.match(ui,/Không gửi ảnh lên mạng/);
 assert.match(html,/Máy chủ \(giả lập\)/);
});
test('V21 preview gets torn down on editor close and account reopen',()=>{
 assert.equal((avatarUi.match(/closePlayerAvatarSyncReviewV21\(\)/g)||[]).length,2);
 assert.match(ui,/playerAvatarReviewV21=null/);
 assert.match(ui,/panel\.hidden=true/);
 assert.match(css,/body\.dudu-phone-v11 \.dudu-avatar-v21-demo/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\[hidden\]/);
});
