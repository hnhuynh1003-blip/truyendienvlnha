/* V45.2: verify the shared board is not the account-local V44.2 journal.
 * Network and Firebase real credential tests are excluded from this suite.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const from=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const pilot=require('../js/pilot-client-v45-1.js');
test('V45.2: Pilot phone and story use the exact same session without automatic Auth startup',()=>{
 const a=pilot.getShared(),b=pilot.getShared();
 assert.equal(a,b);
 assert.equal(a.session().signed,false);
 assert.equal(a.session().approved,false);
 assert.equal(typeof a.session().sessionRevision,'number');
 assert.equal(pilot.cleanScope('story-01','chapter-01').storyId,'story-01');
});
test('V45.2: reader and cover display shared Pilot board separately from private journal',()=>{
 const index=from('index.html');
 for(const section of ['story','chapter']){
  const pilotId=section+'-comments-pilot-v452';
  const localId=section+'-comments-v442';
  const a=index.indexOf('id="'+pilotId+'"');
  const b=index.indexOf('id="'+localId+'"');
  assert.ok(a>0&&b>a,'shared board must be visually BEFORE private section: '+section);
 }
 assert.match(index,/DuduSandboxDiscussionUI\?\.render\(sharedBoardOptions\)/);
 assert.match(index,/DuduStoryPilotCommentsV452\?\.render\(\{/);
 assert.match(index,/IS_PILOT_STAGING_MODE/);
 assert.match(index,/sandbox:IS_SANDBOX_MODE/);
 assert.match(index,/chapterIds:\(novel\?\.chapters\|\|\[\]\)\.map/);
 assert.match(index,/js\/story-comments-pilot-v45-2\.js\?v=45-2/);
 assert.match(index,/css\/story-comments-pilot-v45-2\.css\?v=45-2/);
 const local=from('js/story-comments-ui-v44-2.js');
 assert.match(local,/nhật ký bình luận riêng của tài khoản/);
 const shared=from('js/story-comments-pilot-v45-2.js');
 assert.match(shared,/A và B chỉ thấy bình luận của nhau/);
 assert.match(shared,/api\.list\(storyId,chapterId\)/);
 assert.match(shared,/api\.post\(\{storyId,chapterId,requestId/);
 assert.match(shared,/getShared\?\.\(\)/);
 assert.doesNotMatch(shared,/localStorage\.(?:getItem|setItem|removeItem)|firebase\.firestore\(|userProfile\./);
 assert.doesNotMatch(shared,/\/v1\/gifts\//);
});
test('V45.2: shared results cannot be shown after Firebase account/session change',()=>{
 const ui=from('js/story-comments-pilot-v45-2.js');
 const client=from('js/pilot-client-v45-1.js');
 assert.match(client,/sessionRevision:epoch/);
 assert.match(ui,/current\?\.sessionRevision===auth\.sessionRevision/);
 assert.match(ui,/sessionRevision!==api\.session\(\)\.sessionRevision/);
 assert.match(ui,/host\.dataset\.pilotScope!==key/);
 assert.match(ui,/if\(!sandbox\|\|!storyId\|\|!session\(\)\)/);
});
