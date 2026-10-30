const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const client=require('../js/gift-recipient-v44.js');
const trade=require('../js/inventory-trade-v43-9.js');
const catalog=require('../js/item-catalog-v2.js');
const book={id:'story-1',title:'Tác phẩm một',ownerUid:'uid-from-browser',authorName:'Admin',role:'admin',
 chapters:[{id:'ch-1',realmTag:'CULTIVATION'}]};
test('V44: local story support and author delivery have different recipient states',()=>{
 const local=client.preview(book);
 const author=client.preview(book,client.MODES.AUTHOR);
 assert.equal(local.enabled,true);
 assert.equal(local.delivered,false);
 assert.equal(local.verified,false);
 assert.equal(local.mode,client.MODES.STORY_SANDBOX);
 assert.equal(author.enabled,false);
 assert.equal(author.verified,false);
 assert.equal(author.reason,'author-server-binding-required');
 assert.equal('recipientUid' in author,false);
 assert.equal(client.preview(null).enabled,false);
 assert.equal(client.preview(book,client.MODES.NPC).enabled,false);
});
test('V44: new sandbox gift receipts preserve legacy journal and explicit local-only status',()=>{
 const gift={...catalog.byId('common-biscuit'),instanceId:'shop-snack',
  obtainedFrom:{kind:'SHOP',source:'DUDU_MARKET'}};
 const plan=trade.storyGift({inventory:[gift],itemInstanceId:gift.instanceId,
  stories:[book],storyId:book.id,chapterId:'ch-1',day:'2026-10-17',
  note:'Lời cảm ơn tác giả'});
 assert.equal(plan.ok,true);
 assert.equal(plan.state.history[0].recipientKind,'STORY_SANDBOX');
 assert.equal(plan.state.history[0].deliveryStatus,'LOCAL_JOURNAL_ONLY');
 assert.match(client.label(plan.state.history[0]),/Sandbox/);
 assert.match(client.label({...plan.state.history[0],recipientKind:undefined}),/Sandbox/);
 assert.equal(plan.serverReceipt,undefined);
});
test('C2.4b: legacy recipient contracts remain, but player-facing author gifts are retired',()=>{
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const html=read('index.html'),view=read('js/inventory-view-v42.js');
 const css=read('css/gift-recipient-v44.css');
 assert.match(html,/src="js\/gift-recipient-v44\.js\?v=\d+"/);
 assert.doesNotMatch(html,/DuduGiftRecipientV44\.preview\(novels\.find/);
 assert.doesNotMatch(view,/dudu-v44-recipient-locked|Tặng cho truyện|onStoryGift/);
 assert.match(html,/onclick="openPhoneApp\('author-mail'\)"[^>]*hidden/);
 assert.match(css,/body\.dudu-phone-v11/);
});
