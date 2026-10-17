const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('V47 Pilot board is doubly opt-in: sandbox=1 AND pilot=1',()=>{
 const html=source('index.html');
 assert.match(html,/const IS_SANDBOX_MODE = DUDU_QUERY\.get\('sandbox'\) === '1'/);
 assert.match(html,/const IS_PILOT_STAGING_MODE = IS_SANDBOX_MODE && DUDU_QUERY\.get\('pilot'\) === '1'/);
 assert.match(html,/if\(IS_PILOT_STAGING_MODE\)\{[\s\S]{0,250}DuduPilotLabUIV451\?\.render/);
 assert.match(html,/if\(IS_PILOT_STAGING_MODE\)\{[\s\S]{0,250}DuduStoryPilotCommentsV452\?\.render/);
 assert.match(html,/else\{[\s\S]{0,120}DuduSandboxDiscussionUI\?\.render\(sharedBoardOptions\)/);
 assert.doesNotMatch(html,/DuduStoryPilotCommentsV452\?\.render\(\{[^}]*sandbox:IS_SANDBOX_MODE/);
});
test('V47 isolated Firebase connection has explicit login and fixed staging origin',()=>{
 const client=source('js/pilot-client-v45-1.js');
 const ui=source('js/pilot-lab-ui-v45-1.js');
 const board=source('js/story-comments-pilot-v45-2.js');
 assert.match(client,/dudu-v451-pilot-auth/);
 assert.match(client,/https:\/\/dudu-ai-staging\.dudu-studio-ai\.workers\.dev/);
 assert.match(client,/signInWithEmailAndPassword/);
 assert.match(client,/fb\.auth\.Auth\.Persistence\.SESSION/);
 assert.match(ui,/Đăng nhập Email\/Password Pilot/);
 assert.match(ui,/Đăng nhập Google Pilot/);
 assert.match(ui,/password\.value=''/);
 assert.match(board,/if\(!sandbox\|\|!storyId\|\|!session\(\)\)/);
 assert.doesNotMatch(client,/localStorage|firebase\.firestore|db\.collection|\/v1\/gifts\//);
});
test('V47 staging defaults cannot activate comments or gift settlement on push',()=>{
 const env=source('cloudflare/wrangler.toml');
 const workflow=source('.github/workflows/dudu-pilot-staging-v45.yml');
 assert.match(env,/COMMENTS_ENABLED = "false"/);
 assert.match(env,/PILOT_ENABLED = "false"/);
 assert.match(env,/PILOT_SETTLEMENT_ENABLED = "false"/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/ENABLE_V45_SHARED_COMMENTS/);
 assert.match(workflow,/dudu-pilot-staging/);
 assert.doesNotMatch(workflow,/^\s*push:/m);
});
