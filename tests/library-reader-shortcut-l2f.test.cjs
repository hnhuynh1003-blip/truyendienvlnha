'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createDetector}=require('../js/library-reader-shortcut-l2f.js');

test('L2F only reveals floating TOC after a sustained upward swipe, not while reading down',()=>{
 const detector=createDetector();
 assert.equal(detector.update(0),false);
 assert.equal(detector.update(250),false);
 assert.equal(detector.update(700),false);
 assert.equal(detector.update(664),false,'brief upward movement remains quiet');
 assert.equal(detector.update(633),false);
 assert.equal(detector.update(608),true,'an 92px upward swipe reveals TOC');
 assert.equal(detector.update(602),true,'shortcut remains while continuing upward');
 assert.equal(detector.update(615),false,'downward reading hides it immediately');
 assert.equal(detector.update(600),false,'tiny reversal does not re-open it');
 assert.equal(detector.update(180),false,'chapter header already contains TOC');
 detector.reset(900);
 assert.equal(detector.update(900),false,'new chapter/reload starts without a floating overlay');
 assert.equal(detector.update(799),true,'a deliberate upward swipe can reveal again');
});

test('L2F uses the existing back-to-contents route and adds no new data writes',()=>{
 const root=join(__dirname,'..');
 const html=readFileSync(join(root,'index.html'),'utf8');
 const css=readFileSync(join(root,'css/library-reading-return-c443.css'),'utf8');
 assert.match(html,/js\/library-reader-shortcut-l2f\.js\?v=/);
 assert.match(html,/floatBar\.style\.display = revealToc\?'flex':'none'/);
 assert.match(html,/handleBack\(window,\(\)=>goCover\(\)\)/);
 assert.match(css,/display:none/);
 assert.doesNotMatch(readFileSync(join(root,'js/library-reader-shortcut-l2f.js'),'utf8'),
  /localStorage|sessionStorage|firestore|coin|reward/i);
});
