'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css/phone-frame-c415.css'),'utf8');

test('C4.15 phone frame is loaded after reader and messenger styling',()=>{
 const link='css/phone-frame-c415.css?v=c415-3';
 assert.ok(html.includes(link));
 assert.ok(html.indexOf(link)>html.indexOf('css/library-editorial-l2c3.css'));
 assert.ok(html.indexOf(link)>html.indexOf('css/dudu-messenger-v67-2.css'));
});

test('C4.15 retains close and back actions while hiding duplicate home bar',()=>{
 assert.match(html,/class="phone-close-btn" onclick="togglePhone\(\)"/);
 assert.match(html,/class="phone-home-bar" onclick="phoneHome\(\)"/);
 assert.match(css,/\.phone-home-bar\s*\{display:none!important;\}/);
 assert.match(css,/\.phone-close-btn\s*\{[\s\S]*?width:32px;/);
 assert.match(css,/\.phone-app-header\s*\{[\s\S]*?margin-bottom:8px;/);
 assert.match(css,/\.phone-screen:has\(> #phone-home-screen\[style\*="display: none"\]\)/);
 assert.match(css,/padding-right:40px;/);
 assert.match(css,/not\(\.dudu-v672-chatting\)/);
});

test('C4.15 R3 mobile phone takes the viewport and hides site navigation only while open',()=>{
 assert.match(css,/dudu-site-v60\.dudu-reading-active #cyber-phone/);
 assert.match(css,/dudu-site-v60:not\(\.dudu-reading-active\) #cyber-phone/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/body\.dudu-phone-v11\.dudu-phone-open > header,/);
 assert.match(css,/body\.dudu-phone-v11\.dudu-phone-open \.d60-bottomnav \{display:none!important;\}/);
 assert.match(css,/width:100vw;/);
 assert.match(css,/height:100dvh;/);
 assert.match(css,/max-height:100dvh;/);
 assert.match(css,/\.phone-speaker \{display:none;\}/);
 assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
 assert.match(html,/document\.body\.classList\.toggle\('dudu-phone-open', opened\)/);
});
