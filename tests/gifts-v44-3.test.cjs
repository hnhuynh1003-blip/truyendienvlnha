const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const comments=require('../js/story-comments-v44-2.js');
const trade=require('../js/inventory-trade-v43-9.js');
const catalog=require('../js/item-catalog-v2.js');
const story={id:'story-one',title:'Test',chapters:[{id:'chapter-one'}]};
const sample={...catalog.byId('common-biscuit'),instanceId:'gift-instance-1',
 obtainedFrom:{kind:'SHOP',source:'DUDU_MARKET'}};
test('V44.3: comment gift and inventory journal can be assembled as one local plan',()=>{
 const state=comments.post({uid:'reader-a',name:'Reader A',
  storyId:story.id,chapterId:null,id:'comment-one',
  now:100000,text:'Cảm ơn tác giả'});
 assert.equal(state.ok,true);
 const tx=trade.storyGift({inventory:[sample],itemInstanceId:sample.instanceId,
  stories:[story],storyId:story.id,chapterId:null,
  note:'Đính kèm bình luận Sandbox',day:'2026-10-17'});
 assert.equal(tx.ok,true);
 const linked=comments.attachLocalGift({state:state.state,
  commentId:state.comment.id,item:sample});
 assert.equal(linked.ok,true);
 assert.equal(linked.state.comments[0].gift.deliveryStatus,'LOCAL_JOURNAL_ONLY');
 assert.equal(linked.state.comments[0].gift.recipientKind,'STORY_SANDBOX');
 assert.equal(linked.state.comments[0].gift.itemName,sample.name);
 assert.equal(tx.inventory.length,0);
 assert.equal(tx.state.history[0].deliveryStatus,'LOCAL_JOURNAL_ONLY');
 assert.equal(state.state.comments[0].gift,undefined,'no input mutation');
 assert.equal(comments.normalize(linked.state).comments[0].gift.itemName,sample.name);
 assert.equal(comments.attachLocalGift({state:linked.state,
  commentId:'comment-one',item:sample}).reason,'invalid-local-gift');
});
test('V44.3: cross-world and locked collectibles cannot attach to a story',()=>{
 const invalid={...catalog.byId('fantasy-ruins-seal'),instanceId:'weird',
  obtainedFrom:{kind:'CHAPTER',storyId:'different-story',chapterId:'x'}};
 const quote=trade.storyGift({inventory:[invalid],itemInstanceId:invalid.instanceId,
  stories:[story],storyId:story.id,day:'2026-10-17'});
 assert.equal(quote.ok,false);
 const author={id:'author-special',name:'Author collectible',rank:'S',
  scope:'CHAPTER',type:'ITEM',tradeable:false,instanceId:'locked',
  obtainedFrom:{kind:'CHAPTER',storyId:story.id,chapterId:'chapter-one'}};
 assert.equal(trade.storyTargets(author,[story]).length,0);
});
test('V44.3: mailbox never treats local sent notes as verified incoming gifts',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../js/story-comments-ui-v44-2.js'),'utf8');
 assert.match(html,/id="phone-app-author-mail"/);
 assert.match(html,/function renderAuthorMailV443\(\)/);
 assert.match(html,/Chưa có dữ liệu quà đến được xác minh/);
 assert.match(html,/localStorage\.setItem\(localKey/);
 assert.match(ui,/dudu-v4431-attached-chip/);
 assert.match(fs.readFileSync(path.join(__dirname,'../js/story-comments-v44-2.js'),'utf8'),/recipientKind/);
 assert.match(ui,/LOCAL_JOURNAL_ONLY/);
 assert.doesNotMatch(ui,/fetch\(|firebase\.firestore|grant\(/);
});
