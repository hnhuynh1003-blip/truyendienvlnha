const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'css/phone-refinement-v31.css'),'utf8');
const t=require('../js/phone-typography-v31.js');
const store=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),values};};

test('V31 offers four whitelist fonts and three sizes, fallbacks reject bad identifiers',()=>{
 assert.deepEqual(t.FONTS.map(x=>x.id),['be','quicksand','nunito','serif']);
 assert.deepEqual(t.SIZES,['small','normal','large']);
 assert.equal(t.normalize({font:'../../bad',size:'huge'}).font,'be');
 assert.equal(t.normalize({font:'../../bad',size:'huge'}).size,'normal');
 assert.equal(t.keyFor('../bad'),null);
 assert.ok(t.keyFor('tester'));
});
test('V31 typography settings are local and account-isolated',()=>{
 const s=store();assert.equal(t.write(s,'a',{font:'serif',size:'large'}),true);
 assert.equal(t.write(s,'b',{font:'quicksand',size:'small'}),true);
 assert.deepEqual(t.read(s,'a'),{font:'serif',size:'large'});
 assert.deepEqual(t.read(s,'b'),{font:'quicksand',size:'small'});
 assert.equal(t.write(s,'a',{font:'javascript:alert(1)',size:'normal'}),false);
 assert.equal(t.read(s,'a').font,'serif');
 assert.deepEqual(t.read({getItem(){throw Error('blocked')}},'a'),t.DEFAULT);
});
test('V31 settings use selected font only and do not alter chapter reading CSS',()=>{
 assert.match(html,/href="css\/phone-refinement-v31.css\?v=1"/);
 assert.match(html,/src="js\/phone-typography-v31.js"/);
 assert.match(html,/function renderPhoneTypographyV31\(\)/);
 assert.match(html,/font\.url/);
 assert.match(html,/function setPhoneFontV31\(id\)/);
 assert.match(html,/function setPhoneSizeV31\(size\)/);
 for(const x of t.FONTS)assert.match(html,new RegExp('data-dudu-v31-font="'+x.id+'"'));
 for(const x of t.SIZES)assert.match(html,new RegExp('data-dudu-v31-size="'+x+'"'));
 assert.doesNotMatch(css,/--font-reading\s*:/);
 assert.match(css,/#cyber-phone \:is\(button,input,select,textarea\)/);
});
test('V32 chat is wallpaper-backed, restores gifting, NPC progress stays in catalog',()=>{
 assert.match(html,/id="npc-v31-relation-host"/);
 assert.match(html,/function moveNpcProgressV31\(\)/);
 assert.match(html,/function npcCheckInFromCodexV31\(storyId,npcId\)/);
 assert.match(html,/checkin\.addEventListener\('click'/);
 const chat=html.slice(html.indexOf('<!-- APP: TRÒ CHUYỆN'),html.indexOf('<!-- APP: CỬA HÀNG -->'));
 assert.match(chat,/onclick="openGiftModalFromChat\(\)"/);
 assert.match(chat,/id="chat-messages-container"/);
 assert.match(css,/#phone-app-chat\{[\s\S]*?background:linear-gradient\(180deg,#0711249c/);
 assert.match(css,/\.dudu-v31-bubble/);
 assert.match(css,/#chat-char-affinity\{\s*display:none !important/);
 assert.match(css,/background-image:linear-gradient\(180deg,#0205120a/);
});
