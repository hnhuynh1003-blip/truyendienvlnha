'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const story=require('../js/dudu-pilot-f-v1.js');
const engine=require('../js/dudu-story-engine-v1.js');
assert.deepEqual(engine.validate(story),[]);
for(const key of ['gate','hall']){
 const p=story.places[key];
 assert.match(p.photo,/^assets\/worlds\/quan-dao-(gate|hall)-cinematic\.webp$/);
 assert.ok(fs.existsSync(path.join(root,p.background)),'SVG fallback remains mandatory');
}
const ui=read('js/dudu-pilot-ui-v1.js');
assert.match(ui,/preview\.onerror/,'Failed optional AI art must not block gameplay');
assert.match(ui,/img\.isConnected/,'Delayed photo must not overwrite a different scene');
assert.match(read('dudu-pilot.html'),/dudu-pilot-cover/);
assert.match(read('dudu-pilot.html'),/photo\.onerror/);
assert.equal(story.rewardsEnabled,false);
console.log('DUDU Visual 2A: optional WebP scene identifiers and SVG fallback OK');
