const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const lab=require('../js/multi-actor-lab-v44-5.js');
const sample=(instanceId,other={})=>({
 type:'POST',requestId:'req-'+instanceId,
 text:'Cảm ơn tác giả vì chương truyện!',
 instanceId,recipientId:'AUTHOR',...other
});
const perform=(state,action)=>{
 const result=lab.run(state,action);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.deepEqual(lab.audit(result.state),[]);
 return result;
};
test('V44.5: separate fictional identities and fresh fixture, no external account',()=>{
 const s=lab.initial();
 assert.deepEqual(lab.ACTORS.map(x=>x.id),['A','B','AUTHOR']);
 assert.equal(s.version,1);
 assert.equal(s.items.length,6);
 assert.equal(lab.inventory(s,'A').length,4);
 assert.equal(lab.inventory(s,'B').length,2);
 assert.equal(lab.inventory(s,'AUTHOR').length,0);
 assert.equal(s.transfers.length,0);
 assert.deepEqual(lab.audit(s),[]);
 const fresh=lab.initial();
 assert.deepEqual(fresh,s);
 assert.notEqual(s.items[0],fresh.items[0]);
});
test('V44.5: A sends a comment with exactly one item; author accepts',()=>{
 const start=lab.initial();
 const one=perform(start,sample('lab-item-1'));
 const gift=one.state.transfers[0];
 assert.equal(gift.status,'PENDING');
 assert.equal(gift.senderId,'A');assert.equal(gift.recipientId,'AUTHOR');
 assert.equal(one.state.comments[0].id,gift.commentId);
 assert.equal(lab.inventory(one.state,'A').length,3);
 assert.equal(lab.inventory(one.state,'AUTHOR').length,0);
 assert.equal(one.state.items.filter(x=>x.holderType==='ESCROW').length,1);
 assert.equal(lab.initial().items[0].holderId,'A','prototype never mutates seed');
 const asAuthor=perform(one.state,{type:'SWITCH',actor:'AUTHOR'}).state;
 const taken=perform(asAuthor,{type:'DECIDE',transferId:gift.id,decision:'ACCEPT'});
 assert.equal(taken.state.transfers[0].status,'ACCEPTED');
 assert.equal(lab.inventory(taken.state,'AUTHOR').length,1);
 assert.equal(lab.inventory(taken.state,'A').length,3);
 assert.equal(taken.state.items.filter(x=>x.holderType==='ESCROW').length,0);
 assert.equal(taken.state.items.length,6);
 const repeated=lab.run(taken.state,{type:'DECIDE',transferId:gift.id,decision:'ACCEPT'});
 assert.equal(repeated.ok,true);assert.equal(repeated.alreadyApplied,true);
 assert.strictEqual(repeated.state,taken.state);
});
test('V44.5: cancel, decline return exactly the original instanceId',()=>{
 const sent=perform(lab.initial(),sample('lab-item-1'));
 const id=sent.state.transfers[0].id;
 const cancelled=perform(sent.state,{type:'DECIDE',transferId:id,decision:'CANCEL'});
 assert.equal(cancelled.state.items.find(x=>x.instanceId==='lab-item-1').holderId,'A');
 assert.equal(cancelled.state.transfers[0].status,'CANCELLED');
 assert.equal(lab.run(cancelled.state,{type:'DECIDE',transferId:id,decision:'CANCEL'}).alreadyApplied,true);
 const again=lab.run(cancelled.state,{type:'DECIDE',transferId:id,decision:'ACCEPT'});
 assert.equal(again.ok,false);
 const newer=perform(cancelled.state,{type:'POST',requestId:'req-2',
  text:'Mời nhận thêm món nữa',instanceId:'lab-item-2',recipientId:'B'});
 const asB=perform(newer.state,{type:'SWITCH',actor:'B'});
 const refuse=perform(asB.state,{type:'DECIDE',transferId:newer.state.transfers[1].id,decision:'DECLINE'});
 assert.equal(refuse.state.items.find(x=>x.instanceId==='lab-item-2').holderId,'A');
 assert.equal(refuse.state.items.length,6);
});
test('V44.5: sender/recipient authorization, nonowner rejection, replay conflicts',()=>{
 const sent=perform(lab.initial(),sample('lab-item-1'));
 const id=sent.state.transfers[0].id;
 assert.equal(lab.run(sent.state,{type:'DECIDE',transferId:id,decision:'ACCEPT'}).reason,'not-allowed');
 const repeated=lab.run(sent.state,sample('lab-item-1'));
 assert.equal(repeated.ok,true);assert.equal(repeated.alreadyApplied,true);
 assert.strictEqual(repeated.state,sent.state);
 assert.equal(lab.run(sent.state,sample('lab-item-1',{text:'Khác nội dung'})).reason,
  'idempotency-conflict');
 const unable=lab.run(sent.state,sample('lab-item-1',{requestId:'other-request'}));
 assert.equal(unable.reason,'item-not-owned');
 assert.equal(unable.state.items.length,6);
 const b=perform(sent.state,{type:'SWITCH',actor:'B'});
 assert.equal(lab.run(b.state,sample('lab-item-2',{requestId:'stolen'})).reason,'item-not-owned');
 assert.equal(lab.run(b.state,sample('lab-item-5',{requestId:'self',recipientId:'B'})).reason,'invalid-recipient');
 assert.equal(lab.run(b.state,sample('lab-item-5',{requestId:'unknown',recipientId:'U'})).reason,'invalid-recipient');
 assert.equal(lab.inbox(b.state,'B').length,0);
 assert.equal(lab.outgoing(b.state,'A').length,1);
});
test('V44.5: post, reply; author sees shared thread; disconnected writes blocked',()=>{
 const first=perform(lab.initial(),{type:'POST',requestId:'comment-A',
  text:'Một bình luận của A'});
 assert.equal(first.state.comments.length,1);
 assert.equal(first.state.transfers.length,0);
 const B=perform(first.state,{type:'SWITCH',actor:'B'});
 const reply=perform(B.state,{type:'POST',requestId:'comment-B',
  text:'B đã trả lời A',parentId:first.state.comments[0].id});
 assert.equal(reply.state.comments[1].parentId,first.state.comments[0].id);
 const offline=perform(reply.state,{type:'SET_OFFLINE',value:true}).state;
 assert.equal(lab.run(offline,{type:'POST',requestId:'offline',
  text:'Không gửi được'}).reason,'simulated-offline');
 assert.equal(offline.comments.length,2);
 assert.equal(lab.run(offline,{type:'DECIDE',decision:'ACCEPT',transferId:'fake'}).reason,
  'simulated-offline');
 const live=perform(offline,{type:'SET_OFFLINE',value:false});
 assert.equal(live.state.comments.length,2);
 assert.equal(lab.run(live.state,{type:'POST',requestId:'bad',
  text:'nested not allowed',parentId:reply.state.comments[1].id}).reason,
  'invalid-parent');
});
test('V44.5: no granted real prize from a tampered persisted model',()=>{
 const s=lab.initial();
 const duplicate=JSON.parse(JSON.stringify(s));
 duplicate.items.push({...duplicate.items[0]});
 assert.ok(lab.audit(duplicate).includes('duplicate-or-invalid-instance'));
 assert.equal(lab.run(duplicate,{type:'POST',text:'hack',
  requestId:'hack'}).reason,'corrupt-state');
 const forged=JSON.parse(JSON.stringify(s));
 forged.items[0].scope='DUDU';
 assert.ok(lab.audit(forged).includes('invalid-item-definition'));
 const ghost=JSON.parse(JSON.stringify(s));
 ghost.items[0].holderType='ESCROW';ghost.items[0].holderId='ghost';
 assert.ok(lab.audit(ghost).includes('orphaned-escrow'));
});
test('V44.5: separate dedicated storage, no Firebase, userProfile, or real inventory writes',()=>{
 const get=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
 const domain=get('js/multi-actor-lab-v44-5.js');
 const ui=get('js/multi-actor-lab-ui-v44-5.js');
 const page=get('index.html');
 assert.match(ui,/dudu-v445-multi-actor-lab-v1/);
 assert.match(ui,/localStorage\.setItem\(KEY,JSON\.stringify\(result\.state\)\)/);
 assert.match(ui,/if\(!sandbox\|\|!model\(\)\)/);
 assert.match(ui,/result\.state!==current/);
 assert.match(page,/appName==='lab-v445'&&!IS_SANDBOX_MODE/);
 assert.match(page,/id="phone-app-lab-v445"/);
 assert.match(page,/DuduMultiActorLabUIV445\?\.render/);
 const executable=(domain+'\n'+ui).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
 assert.doesNotMatch(executable, /firebase\.|\.firestore\(|fetch\(|userProfile|DuduAuth|Worker\b|COLLECTIBLES_ENABLED/);
 assert.match(ui,/Dữ liệu chỉ nằm trong dudu-v445/);
});


test('V44.5.1: audit rejects item identity swaps and wrong realm provenance',()=>{
 const s=lab.initial();
 const swap=JSON.parse(JSON.stringify(s));
 swap.items[0].itemId='common-bottled-water';
 swap.items[0].name='Nước Uống Đóng Chai';
 swap.items[0].icon='💧';
 assert.ok(lab.audit(swap).includes('invalid-seed-provenance'));
 const realm=JSON.parse(JSON.stringify(s));
 const item=realm.items.find(i=>i.itemId==='cult-spirit-fragment');
 item.sourceStoryId='another-story';
 assert.ok(lab.audit(realm).includes('invalid-seed-provenance'));
 assert.equal(lab.run(realm,{type:'POST',requestId:'forged',text:'Không cho phép'})
   .reason,'corrupt-state');
});
test('V44.5.1: audit rejects mismatched comment sender and duplicate request IDs',()=>{
 const posted=perform(lab.initial(),sample('lab-item-1')).state;
 const forged=JSON.parse(JSON.stringify(posted));
 forged.transfers[0].senderId='B';
 assert.ok(lab.audit(forged).includes('invalid-transfer-comment-link'));
 const unrelated=JSON.parse(JSON.stringify(posted));
 unrelated.transfers[0].requestId='different-request';
 assert.ok(lab.audit(unrelated).includes('invalid-transfer-comment-link'));
 const repeated=JSON.parse(JSON.stringify(posted));
 repeated.comments.push({...repeated.comments[0],id:'another-comment'});
 assert.ok(lab.audit(repeated).includes('invalid-comment'));
});
test('V44.5.1: idempotent replay still works when comment quota is full',()=>{
 let state=lab.initial();
 for(let i=0;i<99;i++){
  state=perform(state,{type:'POST',requestId:'quota-'+i,
   text:'Bình luận đủ dài '+i}).state;
 }
 const request=sample('lab-item-1');
 state=perform(state,request).state;
 assert.equal(state.comments.length,100);
 assert.equal(state.transfers.length,1);
 const replay=lab.run(state,request);
 assert.equal(replay.ok,true);
 assert.equal(replay.alreadyApplied,true);
 assert.strictEqual(replay.state,state);
 assert.equal(lab.run(state,{type:'POST',requestId:'quota-over',
  text:'Thêm bình luận'}).reason,'comment-limit');
});


test('V44.5.1: invalid persisted records are reported instead of crashing audit',()=>{
 const invalidItem=lab.initial();invalidItem.items[0]=null;
 assert.ok(lab.audit(invalidItem).includes('invalid-item'));
 const invalidComment=lab.initial();invalidComment.comments=[null];
 assert.ok(lab.audit(invalidComment).includes('invalid-comment'));
 const invalidTransfer=lab.initial();invalidTransfer.transfers=[null];
 assert.ok(lab.audit(invalidTransfer).includes('invalid-receipt'));
 const malformedParent=lab.initial();
 malformedParent.comments=[null,{
  id:'comment-1',requestId:'comment-request-1',
  authorId:'A',parentId:'missing',text:'Bình luận sai nguồn',
  storyId:lab.STORY.id,chapterId:lab.STORY.chapterId
 }];
 assert.ok(lab.audit(malformedParent).includes('invalid-reply'));
 const imageSwap=lab.initial();imageSwap.items[0].icon='❌';
 assert.ok(lab.audit(imageSwap).includes('invalid-item-definition'));
});
