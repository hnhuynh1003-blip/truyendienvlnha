/* V44.4: exercise the real SQLite SQL paths with a fake DO scheduler.
 * Unlike regex-only tests, these verify item custody and receipts.
 * node:sqlite is built into the project's Node 22 CI runtime.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const source=new URL('../src/gift-ledger-v44-3.mjs',import.meta.url);
let script=fs.readFileSync(source,'utf8')
 .replace("import {DurableObject} from 'cloudflare:workers';",
   'class DurableObject { constructor(ctx,env){this.ctx=ctx;this.env=env} }')
 .replace("'./gift-contract-v44.mjs'",JSON.stringify(
   new URL('../src/gift-contract-v44.mjs',import.meta.url).href))
 .replace("'./gift-requests-v44-3.mjs'",JSON.stringify(
   new URL('../src/gift-requests-v44-3.mjs',import.meta.url).href));
const {DuduGiftLedger}=await import('data:text/javascript,'+encodeURIComponent(script));
const reader='reader123',author='author123',other='attacker123';
const t0=1760668000000;
function setup(){
 const db=new DatabaseSync(':memory:');
 const sql={exec(q,...args){
  if(!args.length){db.exec(q);return {toArray:()=>[]};}
  const statement=db.prepare(q);
  if(/^\s*(SELECT|WITH|PRAGMA)/i.test(q)){
   const rows=statement.all(...args);
   return {toArray:()=>rows};
  }
  statement.run(...args);
  return {toArray:()=>[]};
 }};
 const ctx={storage:{sql,transactionSync(fn){
  db.exec('BEGIN IMMEDIATE');
  try{const result=fn();db.exec('COMMIT');return result;}
  catch(e){db.exec('ROLLBACK');throw e;}
 }}};
 const ledger=new DuduGiftLedger(ctx,{});
 const run=(q,...args)=>sql.exec(q,...args);
 run("INSERT INTO trusted_stories VALUES (?,?,?,?,?,?,?)",
  'story-one','PUBLISHED','CULTIVATION',author,'VERIFIED',1,'issuer:trusted-1');
 run("INSERT INTO trusted_chapters VALUES (?,?,?,?)",
  'story-one','chapter-one','CULTIVATION','PUBLISHED');
 const item=(instanceId,scope='COMMON',params={})=>{
  run(`INSERT INTO trusted_items
   (instance_id,item_id,scope,realm_tag,origin_story_id,origin_chapter_id,
   owner_uid,holder_type,holder_key,status,transferable,giftable,locked,
   unique_item,chapter_approved,issuer_ref)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
   instanceId,params.itemId||'common-biscuit',scope,params.realm||null,
   params.story||null,params.chapter||null,
   params.owner||reader,'USER',params.owner||reader,'OWNED',
   params.transferable===false?0:1,params.giftable===false?0:1,
   params.locked?1:0,params.unique?1:0,
   params.chapterApproved?1:0,'issuer:trusted-1');
 };
 const getItem=id=>run('SELECT * FROM trusted_items WHERE instance_id=?',id).toArray()[0];
 const receipt=id=>run('SELECT * FROM gift_receipts WHERE transfer_id=?',id).toArray()[0];
 const request=(instanceId,destination='AUTHOR',other={})=>({
  requestId:'req-'+instanceId,storyId:'story-one',chapterId:null,
  itemInstanceId:instanceId,destination,note:'Cảm ơn tác giả',...other
 });
 return {db,ledger,run,item,getItem,receipt,request};
}
test('V44.4 actual SQLite: escrow pending → author accepts → unique owner',()=>{
 const x=setup();try{
  x.item('gift-one');
  const p=x.request('gift-one');
  assert.equal(x.ledger.quote(p,reader,t0).ok,true);
  assert.equal(x.ledger.quote(p,other,t0).code,'not-server-owned');
  const created=x.ledger.send(p,reader,t0);
  assert.equal(created.ok,true);
  assert.equal(created.status,'PENDING');
  assert.equal(created.heldInEscrow,true);
  assert.equal(x.getItem('gift-one').holder_type,'ESCROW');
  assert.equal(x.ledger.authorInbox(author).items.length,1);
  assert.equal(x.ledger.authorInbox(other).items.length,0);
  const retry=x.ledger.send(p,reader,t0+1);
  assert.equal(retry.ok,true);assert.equal(retry.alreadyApplied,true);
  assert.equal(retry.transferId,created.transferId);
  assert.equal(x.run('SELECT count(*) AS n FROM gift_receipts').toArray()[0].n,1);
  assert.equal(x.ledger.send({...p,note:'different'},reader,t0+2).code,'idempotency-conflict');
  assert.equal(x.ledger.decide({transferId:created.transferId,action:'ACCEPT'},other,t0+3).code,'forbidden');
  const accept=x.ledger.decide({transferId:created.transferId,action:'ACCEPT'},author,t0+4);
  assert.equal(accept.status,'ACCEPTED');
  assert.equal(x.getItem('gift-one').owner_uid,author);
  assert.equal(x.getItem('gift-one').status,'OWNED');
  assert.equal(x.getItem('gift-one').holder_type,'USER');
  assert.equal(x.ledger.decide({transferId:created.transferId,action:'ACCEPT'},author,t0+5).alreadyApplied,true);
  assert.equal(x.ledger.decide({transferId:created.transferId,action:'CANCEL'},reader,t0+6).code,'finalized');
  assert.equal(x.ledger.send({...p,requestId:'second-request'},reader,t0+7).code,'not-server-owned');
 }finally{x.db.close();}
});
test('V44.4 actual SQLite: decline/cancel return original item, not a clone',()=>{
 const x=setup();try{
  x.item('gift-decline');x.item('gift-cancel');
  const declined=x.ledger.send(x.request('gift-decline'),reader,t0);
  const canceled=x.ledger.send(x.request('gift-cancel'),reader,t0+1);
  assert.equal(x.ledger.decide({transferId:declined.transferId,action:'DECLINE'},author,t0+2).status,'DECLINED');
  assert.equal(x.ledger.decide({transferId:canceled.transferId,action:'CANCEL'},reader,t0+3).status,'CANCELLED');
  for(const id of ['gift-decline','gift-cancel']){
   const item=x.getItem(id);
   assert.equal(item.owner_uid,reader);
   assert.equal(item.holder_key,reader);
   assert.equal(item.holder_type,'USER');
   assert.equal(item.status,'OWNED');
  }
  assert.equal(x.run('SELECT COUNT(*) AS n FROM trusted_items').toArray()[0].n,2);
 }finally{x.db.close();}
});
test('V44.4 actual SQLite: false chapter IDs fail even for common gift',()=>{
 const x=setup();try{
  x.item('gift-wrong-chapter');
  const bad=x.request('gift-wrong-chapter','AUTHOR',{chapterId:'not-registered'});
  assert.equal(x.ledger.quote(bad,reader,t0).code,'chapter-unavailable');
  assert.equal(x.ledger.send(bad,reader,t0).code,'chapter-unavailable');
  assert.equal(x.getItem('gift-wrong-chapter').status,'OWNED');
  const correct={...bad,chapterId:'chapter-one'};
  assert.equal(x.ledger.send(correct,reader,t0).ok,true);
 }finally{x.db.close();}
});
test('V44.4 actual SQLite: author reassignment revokes pending receipt without losing escrow',()=>{
 const x=setup();try{
  x.item('gift-reassigned');
  const created=x.ledger.send(x.request('gift-reassigned'),reader,t0);
  x.run(`UPDATE trusted_stories SET owner_uid=?,revision=revision+1 WHERE story_id=?`,
   other,'story-one');
  assert.equal(x.ledger.authorInbox(author).items.length,0);
  assert.equal(x.ledger.authorInbox(other).items.length,0);
  assert.equal(x.ledger.decide({transferId:created.transferId,action:'ACCEPT'},author,t0+1).code,
   'author-binding-changed');
  assert.equal(x.ledger.decide({transferId:created.transferId,action:'ACCEPT'},other,t0+2).code,'forbidden');
  assert.equal(x.getItem('gift-reassigned').status,'ESCROW');
  assert.equal(x.ledger.decide({transferId:created.transferId,action:'CANCEL'},reader,t0+3).status,'CANCELLED');
  assert.equal(x.getItem('gift-reassigned').owner_uid,reader);
 }finally{x.db.close();}
});
test('V44.4 actual SQLite: story/chapter vaults never grant to author UID',()=>{
 const x=setup();try{
  x.item('vault-story');x.item('vault-chapter');
  const story=x.ledger.send(x.request('vault-story','STORY'),reader,t0);
  const chapter=x.ledger.send(x.request('vault-chapter','CHAPTER',
   {chapterId:'chapter-one'}),reader,t0);
  assert.equal(story.status,'ACCEPTED');
  assert.equal(chapter.status,'ACCEPTED');
  assert.equal(x.getItem('vault-story').holder_type,'VAULT');
  assert.equal(x.getItem('vault-story').holder_key,'story-one');
  assert.equal(x.getItem('vault-chapter').holder_key,'story-one::chapter-one');
  assert.equal(x.ledger.authorInbox(author).items.length,0);
  assert.equal(x.ledger.decide({transferId:story.transferId,action:'ACCEPT'},author,t0+1).code,'forbidden');
 }finally{x.db.close();}
});
test('V44.4 actual SQLite: protected/system/cross-world items fail closed',()=>{
 const x=setup();try{
  x.item('system-protected','DUDU');
  x.item('function-protected','FUNCTIONAL');
  x.item('locked-gift','COMMON',{locked:true});
  x.item('cross-world','REALM',{realm:'CULTIVATION',story:'wrong-story',
   chapter:'chapter-one'});
  x.item('correct-world','REALM',{realm:'CULTIVATION',story:'story-one',
   chapter:'chapter-one'});
  for(const id of ['system-protected','function-protected','locked-gift']){
   assert.equal(x.ledger.send(x.request(id),reader,t0).code,'non-transferable');
  }
  assert.equal(x.ledger.send(x.request('cross-world','AUTHOR',
   {chapterId:'chapter-one'}),reader,t0).code,'realm-source-mismatch');
  assert.equal(x.ledger.send(x.request('correct-world','AUTHOR',
   {chapterId:'chapter-one'}),reader,t0).ok,true);
  assert.equal(x.ledger.send(x.request('correct-world','AUTHOR',
   {requestId:'another-attempt',chapterId:'chapter-one'}),reader,t0+2).code,'not-server-owned');
  assert.equal(x.run('SELECT COUNT(*) AS n FROM gift_receipts').toArray()[0].n,1);
 }finally{x.db.close();}
});
test('V44.4 actual SQLite: failure inside escrow transaction rolls back item custody',()=>{
 const x=setup();try{
  x.item('gift-rollback');
  // Intentionally collide a receipt primary key inside the same transaction.
  // Cannot mint duplicate rows by racing one sender instance.
  x.run(`INSERT INTO gift_receipts
   (transfer_id,request_id,sender_uid,item_instance_id,story_id,
   chapter_id,destination,recipient_type,recipient_key,author_revision,
   note,status,created_at,updated_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
   'collision','req-other',other,'unrelated','story-one',null,
   'AUTHOR','AUTHOR_UID',author,1,'test','PENDING',t0,t0);
  const p=x.request('gift-rollback');
  const a=x.ledger.send(p,reader,t0+1);
  assert.equal(a.ok,true);
  assert.equal(x.getItem('gift-rollback').status,'ESCROW');
  assert.equal(x.run('SELECT COUNT(*) AS n FROM gift_receipts').toArray()[0].n,2);
 }finally{x.db.close();}
});
