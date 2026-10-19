// DUDU V67.2 viewport/overlay: fake mobile events, no browser APIs or server.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'js/dudu-messenger-v67-2.js'),'utf8');
const callbacks={},properties={};
const phone={style:{
 setProperty(k,v){properties[k]=v;},
 removeProperty(k){delete properties[k];}
}};
let isActive=false,duduOpen=false,openTools=true,hides=0;
const diary={get open(){return openTools;},set open(v){openTools=v;},contains(t){return t===diary;}};
const app={classList:{contains:x=>x==='dudu-v43-companion-open'&&duduOpen}};
const body={classList:{contains:x=>x==='dudu-v672-chatting'&&isActive}};
const doc={
 readyState:'complete',body,
 getElementById(id){return {
 'cyber-phone':phone,'phone-app-chat':app,'dudu-v43-diary':diary}[id]||null;},
 addEventListener(name,cb){(callbacks[name] ||= []).push(cb);}
};
const vv={height:490.2,offsetTop:13,
 addEventListener(name,cb){(callbacks['viewport:'+name] ||= []).push(cb);}};
const win={document:doc,visualViewport:vv,
 addEventListener(name,cb){(callbacks['window:'+name] ||= []).push(cb);},
 DuduCompanionV43:{hide(){hides++;isActive=false;duduOpen=false;}}};
vm.runInNewContext(js,{window:win},{timeout:1500});
const api=win.DuduMessengerV672;
assert.equal(api.version,2);
assert.equal(api.adjustViewport(),false);
isActive=true;duduOpen=true;
assert.equal(api.adjustViewport(),true);
assert.equal(properties['--dudu-v672-viewport-height'],'490px');
assert.equal(properties['--dudu-v672-viewport-top'],'13px');
callbacks['pointerdown'][0]({target:{}});
assert.equal(openTools,false,'Tap outside should close diary');
openTools=true;
callbacks['pointerdown'][0]({target:diary});
assert.equal(openTools,true,'Tap inside must preserve diary');
let stopped=false;
callbacks['keydown'][0]({key:'Escape',preventDefault(){},
 stopImmediatePropagation(){stopped=true;}});
assert.equal(stopped,true,'Escape closes diary before the Phone global handler');
assert.equal(openTools,false);
callbacks['dudu:phone:lifecycle'][0]({detail:{open:false,appId:null,conversation:null}});
assert.equal(hides,1,'Closing Phone hides DUDU controller');
assert.equal(properties['--dudu-v672-viewport-height'],undefined,
 'Viewport override is cleared when DUDU closes');
assert.equal(api.adjustViewport(),false);
assert.ok(!/\bfetch\s*\(|localStorage\.|firebase\.firestore|saveDB\s*\(/.test(js));
console.log('DUDU V67.2 viewport: mobile keyboard, diary overlay, escape, exit cleanup OK');
