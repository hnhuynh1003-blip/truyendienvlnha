import {DurableObject} from 'cloudflare:workers';
import {COMMENT_LIMITS,validId} from './comment-policy-v44-2.mjs';

/* V44.2 Cloudflare SQLite discussion ledger.
 * Global, DO-serialized store, strictly feature-gated OFF by default.
 * The Worker must pass a JWT-verified UID. No browser writes directly.
 * Story/chapter IDs require explicit signed-admin registry registration.
 */
export class DuduDiscussion extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  this.sql=ctx.storage.sql;
  this.sql.exec(`CREATE TABLE IF NOT EXISTS story_registry(
    story_id TEXT PRIMARY KEY,registered_at INTEGER NOT NULL,
    registered_by TEXT NOT NULL
  )`);
  this.sql.exec(`CREATE TABLE IF NOT EXISTS chapter_registry(
    story_id TEXT NOT NULL,chapter_id TEXT NOT NULL,
    PRIMARY KEY(story_id,chapter_id)
  )`);
  this.sql.exec(`CREATE TABLE IF NOT EXISTS comments(
    id TEXT PRIMARY KEY,request_id TEXT NOT NULL,
    story_id TEXT NOT NULL,chapter_id TEXT,parent_id TEXT,
    uid TEXT NOT NULL,display_name TEXT NOT NULL,text TEXT NOT NULL,
    created_at INTEGER NOT NULL,hidden INTEGER NOT NULL DEFAULT 0,
    UNIQUE(uid,request_id)
  )`);
  this.sql.exec(`CREATE INDEX IF NOT EXISTS comments_scope
    ON comments(story_id,chapter_id,created_at)`);
  this.sql.exec(`CREATE INDEX IF NOT EXISTS comments_author
    ON comments(uid,created_at)`);
  this.sql.exec(`CREATE TABLE IF NOT EXISTS reports(
    comment_id TEXT NOT NULL,reporter_uid TEXT NOT NULL,
    reason TEXT NOT NULL,created_at INTEGER NOT NULL,
    PRIMARY KEY(comment_id,reporter_uid)
  )`);
  this.sql.exec(`CREATE TABLE IF NOT EXISTS notices(
    id TEXT PRIMARY KEY,recipient_uid TEXT NOT NULL,comment_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,read INTEGER NOT NULL DEFAULT 0
  )`);
  this.sql.exec(`CREATE INDEX IF NOT EXISTS notices_user
    ON notices(recipient_uid,created_at)`);
 }
 registered(storyId,chapterId){
  if(!validId(storyId)||(chapterId!==null&&!validId(chapterId)))return false;
  const exists=this.sql.exec('SELECT 1 AS ok FROM story_registry WHERE story_id=?',
   storyId).toArray().length===1;
  if(!exists)return false;
  return chapterId===null||this.sql.exec(
   'SELECT 1 AS ok FROM chapter_registry WHERE story_id=? AND chapter_id=?',
   storyId,chapterId).toArray().length===1;
 }
 register(rule,adminUid,now){
  if(!rule||!validId(rule.storyId)||!Array.isArray(rule.chapterIds)||
   !validId(adminUid))return {ok:false,code:'invalid-register'};
  return this.ctx.storage.transactionSync(()=>{
   this.sql.exec(`INSERT INTO story_registry(story_id,registered_at,registered_by)
    VALUES (?,?,?) ON CONFLICT(story_id) DO UPDATE SET
    registered_at=excluded.registered_at,registered_by=excluded.registered_by`,
    rule.storyId,now,adminUid);
   this.sql.exec('DELETE FROM chapter_registry WHERE story_id=?',rule.storyId);
   for(const id of rule.chapterIds)this.sql.exec(
    'INSERT INTO chapter_registry(story_id,chapter_id) VALUES (?,?)',rule.storyId,id);
   return {ok:true,storyId:rule.storyId,chapterCount:rule.chapterIds.length};
  });
 }
 list({storyId,chapterId=null}){
  if(!this.registered(storyId,chapterId))return {ok:false,code:'unknown-scope'};
  const rows=this.sql.exec(`SELECT c.id,c.story_id AS storyId,
   c.chapter_id AS chapterId,c.parent_id AS parentId,
   c.display_name AS name,c.text,c.created_at AS createdAt
   FROM comments c WHERE c.story_id=? AND c.chapter_id IS ?
   AND c.hidden=0 AND (c.parent_id IS NULL OR EXISTS (
    SELECT 1 FROM comments p WHERE p.id=c.parent_id AND p.hidden=0
   )) ORDER BY c.created_at DESC LIMIT 80`,storyId,chapterId).toArray();
  return {ok:true,comments:rows.reverse()};
 }
 post(entry,uid,now){
  if(!entry||!validId(uid)||!validId(entry.requestId))return {ok:false,code:'invalid-comment'};
  return this.ctx.storage.transactionSync(()=>{
   const prev=this.sql.exec(`SELECT id,story_id AS storyId,
    chapter_id AS chapterId,text,parent_id AS parentId
    FROM comments WHERE uid=? AND request_id=?`,uid,entry.requestId).toArray()[0];
   if(prev){
    if(prev.storyId!==entry.storyId||prev.chapterId!==entry.chapterId||
     prev.text!==entry.text||prev.parentId!==entry.parentId)
     return {ok:false,code:'idempotency-conflict'};
    return {ok:true,alreadyPosted:true,id:prev.id};
   }
   if(!this.registered(entry.storyId,entry.chapterId))
    return {ok:false,code:'unknown-scope'};
   const last=this.sql.exec(
    'SELECT created_at AS at FROM comments WHERE uid=? ORDER BY created_at DESC LIMIT 1',
    uid).toArray()[0];
   if(last&&now-last.at<COMMENT_LIMITS.cooldownMs)
    return {ok:false,code:'cooldown'};
   const start=now-86400000;
   const recent=this.sql.exec(
    'SELECT COUNT(*) AS n FROM comments WHERE uid=? AND created_at>=?',
    uid,start).toArray()[0];
   if(Number(recent?.n||0)>=COMMENT_LIMITS.daily)
    return {ok:false,code:'daily-limit'};
   const count=this.sql.exec(
    'SELECT COUNT(*) AS n FROM comments WHERE story_id=? AND chapter_id IS ?',
    entry.storyId,entry.chapterId).toArray()[0];
   if(Number(count?.n||0)>=COMMENT_LIMITS.maxCommentsPerThread)
    return {ok:false,code:'thread-full'};
   let parent=null;
   if(entry.parentId){
    parent=this.sql.exec(`SELECT id,uid,story_id AS storyId,
     chapter_id AS chapterId,parent_id AS parentId,hidden FROM comments
     WHERE id=?`,entry.parentId).toArray()[0];
    if(!parent||parent.hidden||parent.storyId!==entry.storyId||
     parent.chapterId!==entry.chapterId||parent.parentId!==null)
     return {ok:false,code:'invalid-parent'};
   }
   const id=crypto.randomUUID();
   this.sql.exec(`INSERT INTO comments(id,request_id,story_id,chapter_id,parent_id,
    uid,display_name,text,created_at,hidden) VALUES (?,?,?,?,?,?,?,?,?,0)`,
    id,entry.requestId,entry.storyId,entry.chapterId,entry.parentId,
    uid,entry.displayName,entry.text,now);
   if(parent&&parent.uid!==uid){
    this.sql.exec(`INSERT INTO notices(id,recipient_uid,comment_id,created_at,read)
     VALUES (?,?,?,?,0)`,'reply-'+id,parent.uid,id,now);
   }
   return {ok:true,id,alreadyPosted:false};
  });
 }
 report(entry,uid,now){
  if(!entry||!validId(uid)||!validId(entry.commentId))
   return {ok:false,code:'invalid-report'};
  return this.ctx.storage.transactionSync(()=>{
   const comment=this.sql.exec('SELECT uid,hidden FROM comments WHERE id=?',
    entry.commentId).toArray()[0];
   if(!comment)return {ok:false,code:'not-found'};
   if(comment.uid===uid)return {ok:false,code:'own-comment'};
   const old=this.sql.exec(`SELECT 1 AS ok FROM reports
    WHERE comment_id=? AND reporter_uid=?`,entry.commentId,uid).toArray()[0];
   if(old)return {ok:true,alreadyReported:true};
   this.sql.exec(`INSERT INTO reports(comment_id,reporter_uid,reason,created_at)
    VALUES (?,?,?,?)`,entry.commentId,uid,entry.reason,now);
   return {ok:true,alreadyReported:false};
  });
 }
 moderate({commentId,hidden},adminUid){
  if(!validId(adminUid)||!validId(commentId)||typeof hidden!=='boolean')
   return {ok:false,code:'invalid-moderation'};
  const old=this.sql.exec('SELECT 1 AS ok FROM comments WHERE id=?',
   commentId).toArray()[0];
  if(!old)return {ok:false,code:'not-found'};
  this.sql.exec('UPDATE comments SET hidden=? WHERE id=?',
   hidden?1:0,commentId);
  return {ok:true,hidden};
 }
 reports(){
  return {ok:true,reports:this.sql.exec(`SELECT
   r.comment_id AS commentId,r.reporter_uid AS reporterUid,
   r.reason,r.created_at AS createdAt,c.text,c.hidden
   FROM reports r JOIN comments c ON c.id=r.comment_id
   ORDER BY r.created_at DESC LIMIT 100`).toArray()};
 }
 inbox(uid){
  if(!validId(uid))return {ok:false,code:'invalid-user'};
  return {ok:true,notifications:this.sql.exec(`SELECT n.id,n.comment_id AS commentId,
    n.created_at AS createdAt,n.read,c.text
    FROM notices n JOIN comments c ON c.id=n.comment_id
    WHERE n.recipient_uid=? AND c.hidden=0
    ORDER BY n.created_at DESC LIMIT 30`,uid).toArray()};
 }
 markRead(uid){
  if(!validId(uid))return {ok:false,code:'invalid-user'};
  this.sql.exec('UPDATE notices SET read=1 WHERE recipient_uid=?',uid);
  return {ok:true};
 }
}
