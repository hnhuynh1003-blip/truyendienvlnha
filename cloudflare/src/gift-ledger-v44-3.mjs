/* DUDU V44.3 · one globally serialized, trust-only gift ledger.
 * OFF by default. A separately audited issuer must populate SERVER-VERIFIED
 * stories and items. No public endpoint mints items or approves authors.
 */
import {DurableObject} from 'cloudflare:workers';
import {quoteGift,transition,STAGES} from './gift-contract-v44.mjs';
import {requestGift,requestDecision} from './gift-requests-v44-3.mjs';
const KEY=/^[A-Za-z0-9][\w:-]{0,159}$/;
const ID=x=>typeof x==='string'&&KEY.test(x);
const fail=code=>({ok:false,code});
export class DuduGiftLedger extends DurableObject{
 constructor(ctx,env){
  super(ctx,env);this.sql=ctx.storage.sql;
  this.sql.exec(`CREATE TABLE IF NOT EXISTS trusted_stories(
   story_id TEXT PRIMARY KEY,status TEXT NOT NULL,realm_tag TEXT,
   owner_uid TEXT, binding_status TEXT,revision INTEGER NOT NULL,
   issuer_ref TEXT NOT NULL)`);
  this.sql.exec(`CREATE TABLE IF NOT EXISTS trusted_chapters(
   story_id TEXT NOT NULL,chapter_id TEXT NOT NULL,realm_tag TEXT,
   status TEXT NOT NULL,PRIMARY KEY(story_id,chapter_id))`);
  this.sql.exec(`CREATE TABLE IF NOT EXISTS trusted_items(
   instance_id TEXT PRIMARY KEY,item_id TEXT NOT NULL,scope TEXT NOT NULL,
   realm_tag TEXT,origin_story_id TEXT,origin_chapter_id TEXT,
   owner_uid TEXT NOT NULL,holder_type TEXT NOT NULL DEFAULT 'USER',
   holder_key TEXT NOT NULL,status TEXT NOT NULL,
   transferable INTEGER NOT NULL, giftable INTEGER NOT NULL,
   locked INTEGER NOT NULL DEFAULT 0, unique_item INTEGER NOT NULL DEFAULT 0,
   chapter_approved INTEGER NOT NULL DEFAULT 0,
   issuer_ref TEXT NOT NULL)`);
  this.sql.exec(`CREATE TABLE IF NOT EXISTS gift_receipts(
   transfer_id TEXT PRIMARY KEY,request_id TEXT NOT NULL,sender_uid TEXT NOT NULL,
   item_instance_id TEXT NOT NULL,story_id TEXT NOT NULL,chapter_id TEXT,
   destination TEXT NOT NULL,recipient_type TEXT NOT NULL,
   recipient_key TEXT NOT NULL,author_revision INTEGER,
   note TEXT NOT NULL,status TEXT NOT NULL,
   created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
   UNIQUE(sender_uid,request_id))`);
  this.sql.exec(`CREATE INDEX IF NOT EXISTS gift_author_queue
   ON gift_receipts(recipient_type,recipient_key,status,created_at)`);
  this.sql.exec(`CREATE INDEX IF NOT EXISTS gift_sender_queue
   ON gift_receipts(sender_uid,created_at)`);
 }
 // No route exposes writes to trusted_stories/chapters/items. They require
 // independent publisher/issuer evidence and a separately reviewed migration.
 getEvidence(storyId,chapterId,itemInstanceId){
  const storyRow=this.sql.exec(
   'SELECT * FROM trusted_stories WHERE story_id=?',storyId).toArray()[0];
  const chapterRow=chapterId?this.sql.exec(
   'SELECT * FROM trusted_chapters WHERE story_id=? AND chapter_id=?',
   storyId,chapterId).toArray()[0]:null;
  const i=this.sql.exec('SELECT * FROM trusted_items WHERE instance_id=?',
   itemInstanceId).toArray()[0];
  const story=storyRow?{id:storyRow.story_id,status:storyRow.status,
   realmTag:storyRow.realm_tag}:null;
  const chapter=chapterRow?{id:chapterRow.chapter_id,
   storyId:chapterRow.story_id,status:chapterRow.status,
   realmTag:chapterRow.realm_tag}:null;
  const binding=storyRow?.owner_uid?{source:'SERVER_AUTHOR_REGISTRY',
   status:storyRow.binding_status,storyId:storyRow.story_id,
   ownerUid:storyRow.owner_uid,revision:storyRow.revision}:null;
  const item=i?{source:'SERVER_ITEM_LEDGER',id:i.item_id,
   instanceId:i.instance_id,ownerUid:i.owner_uid,status:i.status,
   scope:i.scope,realmTag:i.realm_tag,originStoryId:i.origin_story_id,
   originChapterId:i.origin_chapter_id,giftable:i.giftable===1,
   transferable:i.transferable===1,locked:i.locked===1,
   unique:i.unique_item===1,authorTransferApproval:i.chapter_approved===1}:null;
  return {story,chapter,binding,item};
 }
 quote(request,uid,now){
  const p=requestGift(request);
  if(!p||!ID(uid))return fail('invalid-request');
  const e=this.getEvidence(p.storyId,p.chapterId,p.itemInstanceId);
  const q=quoteGift({senderUid:uid,...e,destination:p.destination,note:p.note,now});
  if(!q.ok)return fail(q.reason);
  return {ok:true,previewOnly:true,canTransferNow:false,
   itemId:q.quote.itemId,scope:q.quote.originalScope,
   destination:q.quote.destination,recipientType:q.quote.recipientType,
   storyId:q.quote.storyId,chapterId:q.quote.chapterId||null,
   authorVerified:q.quote.recipientType==='AUTHOR_UID'};
 }
 send(request,uid,now){
  const p=requestGift(request);if(!p||!ID(uid))return fail('invalid-request');
  return this.ctx.storage.transactionSync(()=>{
   const existing=this.sql.exec(`SELECT transfer_id AS transferId,item_instance_id AS itemInstanceId,
    story_id AS storyId,chapter_id AS chapterId,destination,note,status
    FROM gift_receipts WHERE sender_uid=? AND request_id=?`,uid,p.requestId).toArray()[0];
   if(existing){
    if(existing.itemInstanceId!==p.itemInstanceId||existing.storyId!==p.storyId||
     existing.chapterId!==p.chapterId||existing.destination!==p.destination||
     existing.note!==p.note.trim())return fail('idempotency-conflict');
    return {ok:true,alreadyApplied:true,...existing};
   }
   const e=this.getEvidence(p.storyId,p.chapterId,p.itemInstanceId);
   const quoted=quoteGift({senderUid:uid,...e,destination:p.destination,note:p.note,now});
   if(!quoted.ok)return fail(quoted.reason);
   const q=quoted.quote,transferId='gift-'+crypto.randomUUID();
   const author=q.recipientType==='AUTHOR_UID',status=author?STAGES.PENDING:STAGES.ACCEPTED;
   const holder=author?('ESCROW:'+transferId):q.recipientKey;
   // No item can exist in two owners: one SQL transaction owns status & receipt.
   const updated=this.sql.exec(`UPDATE trusted_items
    SET holder_type=?,holder_key=?,status=?
    WHERE instance_id=? AND holder_type='USER' AND holder_key=? AND status='OWNED'`,
    author?'ESCROW':'VAULT',holder,author?'ESCROW':'VAULT',
    p.itemInstanceId,uid);
   // SQLite exec metadata differs by runtime; verify row after update instead.
   const after=this.sql.exec('SELECT holder_type,holder_key FROM trusted_items WHERE instance_id=?',
    p.itemInstanceId).toArray()[0];
   if(after?.holder_key!==holder||after?.holder_type!==(author?'ESCROW':'VAULT'))
    throw Error('atomic-item-lock-failed');
   this.sql.exec(`INSERT INTO gift_receipts
    (transfer_id,request_id,sender_uid,item_instance_id,story_id,chapter_id,
    destination,recipient_type,recipient_key,author_revision,note,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    transferId,p.requestId,uid,p.itemInstanceId,q.storyId,q.chapterId||null,
    q.destination,q.recipientType,q.recipientKey,q.authorBindingRevision||null,
    q.note,status,now,now);
   return {ok:true,transferId,status,recipientType:q.recipientType,
    deliveredToAuthor:false,heldInEscrow:author,storyId:q.storyId};
  });
 }
 decide(request,uid,now){
  const p=requestDecision(request);
  if(!p||!ID(uid))return fail('invalid-request');
  return this.ctx.storage.transactionSync(()=>{
   const t=this.sql.exec('SELECT * FROM gift_receipts WHERE transfer_id=?',
    p.transferId).toArray()[0];
   if(!t)return fail('not-found');
   const current={transferId:t.transfer_id,senderUid:t.sender_uid,
    destination:t.destination,recipientType:t.recipient_type,
    recipientKey:t.recipient_key,status:t.status};
   // Check identity EVEN on idempotent replay (no data leak).
   if(p.action==='CANCEL'?uid!==t.sender_uid:
      t.recipient_type!=='AUTHOR_UID'||uid!==t.recipient_key)
    return fail('forbidden');
   const result=transition({receipt:current,action:p.action,actorUid:uid,now});
   if(!result.ok)return fail(result.reason);
   if(result.alreadyApplied)return {ok:true,alreadyApplied:true,status:t.status};
   if(t.status!==STAGES.PENDING||t.recipient_type!=='AUTHOR_UID')
    return fail('finalized');
   const item=this.sql.exec('SELECT holder_type,holder_key,status FROM trusted_items WHERE instance_id=?',
    t.item_instance_id).toArray()[0];
   if(item?.holder_type!=='ESCROW'||item?.holder_key!=='ESCROW:'+t.transfer_id||
    item.status!=='ESCROW')throw Error('escrow-invariant-failed');
   const accepted=p.action==='ACCEPT';
   const owner=accepted?t.recipient_key:t.sender_uid;
   this.sql.exec(`UPDATE trusted_items SET owner_uid=?,
    holder_type='USER',holder_key=?,status='OWNED'
    WHERE instance_id=? AND holder_type='ESCROW' AND holder_key=?`,
    owner,owner,t.item_instance_id,'ESCROW:'+t.transfer_id);
   this.sql.exec('UPDATE gift_receipts SET status=?,updated_at=? WHERE transfer_id=?',
    result.receipt.status,now,t.transfer_id);
   return {ok:true,alreadyApplied:false,status:result.receipt.status};
  });
 }
 authorInbox(uid){
  if(!ID(uid))return fail('unauthenticated');
  const rows=this.sql.exec(`SELECT transfer_id AS transferId,
   story_id AS storyId,chapter_id AS chapterId,note,status,
   created_at AS createdAt,item_instance_id AS itemInstanceId
   FROM gift_receipts WHERE recipient_type='AUTHOR_UID' AND recipient_key=?
   ORDER BY created_at DESC LIMIT 60`,uid).toArray();
  return {ok:true,items:rows};
 }
 outgoing(uid){
  if(!ID(uid))return fail('unauthenticated');
  return {ok:true,items:this.sql.exec(`SELECT transfer_id AS transferId,
   story_id AS storyId,chapter_id AS chapterId,destination,status,note,
   created_at AS createdAt,item_instance_id AS itemInstanceId
   FROM gift_receipts WHERE sender_uid=?
   ORDER BY created_at DESC LIMIT 60`,uid).toArray()};
 }
}
