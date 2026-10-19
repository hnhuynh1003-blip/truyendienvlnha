// Regression: DUDU F pilot has TWO discoverable entry points, without server rewards.
// Run: node tests/dudu-pilot-visibility-v1.cjs
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html');
const shell=read('js/site-shell-v60.js');
const ui=read('js/dudu-pilot-ui-v1.js');
const standalone=read('dudu-pilot.html');
assert.match(shell,/dudu-pilot-entry-inline/,'World Atlas must render persistent pilot card');
assert.match(shell,/pilotLink\.href='dudu-pilot\.html\?v=2'/,'World Atlas needs direct fallback');
assert.match(shell,/root\.append\(pilot,starter,hidden\)/,'Pilot should appear before genre tiles');
assert.match(html,/site-shell-v60\.js\?v=foundation-f1/,'Refresh old HTML asset version');
assert.match(html,/dudu-pilot-ui-v1\.js\?v=2/,'Refresh pilot UI bundle version');
assert.match(ui,/querySelector\('\.dudu-pilot-entry-inline'\)/,
 'Optional modal module must not create duplicate CTA');
assert.match(ui,/queueMicrotask\(mount\)/,'Wait for world shell render');
assert.match(standalone,/id="dudu-pilot-standalone-start"/);
assert.match(standalone,/window\.DuduPilotUIV1\.open\(\)/);
assert.match(standalone,/js\/dudu-story-engine-v1\.js/);
assert.match(standalone,/js\/dudu-pilot-f-v1\.js/);
assert.match(standalone,/js\/dudu-pilot-ui-v1\.js/);
assert.match(standalone,/Không cần đăng nhập/);
assert.match(standalone,/không cấp EXP/);
const engine=require('../js/dudu-story-engine-v1.js');
const pilot=require('../js/dudu-pilot-f-v1.js');
assert.deepEqual(engine.validate(pilot),[],'Pilot works without Firebase credentials');
for(const location of Object.values(pilot.places))assert.ok(
 fs.existsSync(path.join(root,location.background)),location.background);
console.log('DUDU pilot entry V1: main CTA and standalone fallback, cache bust, story safety OK');
