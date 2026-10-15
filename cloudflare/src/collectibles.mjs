import {DurableObject} from 'cloudflare:workers';
import {isChapterMature} from './collectible-rules.mjs';

/* Server-side collectible ownership ledger.
 * Separate from client-written Firestore profile inventory. All methods receive
 * a Firebase-verified UID from the Worker; only authenticated admin may publish
 * rules and grant manually. No economic item is minted in the browser.
 */
export class DuduCollectibles extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    this.sql=ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS releases (
      story_id TEXT NOT NULL,item_id TEXT NOT NULL,chapter_id TEXT,
      npc_id TEXT,name TEXT NOT NULL,rank TEXT NOT NULL,icon TEXT NOT NULL,
      summary TEXT NOT NULL,method TEXT NOT NULL,published_at INTEGER NOT NULL,
      disabled INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (story_id,item_id)
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS chapter_sessions (
      uid TEXT NOT NULL,story_id TEXT NOT NULL,chapter_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,PRIMARY KEY(uid,story_id,chapter_id)
    )`);
    // Private author vault: NEVER mirrored into public studio_data/main_library.
    this.sql.exec(`CREATE TABLE IF NOT EXISTS private_drafts (
      story_id TEXT NOT NULL,item_id TEXT NOT NULL,chapter_id TEXT,
      npc_id TEXT,name TEXT NOT NULL,rank TEXT NOT NULL,type TEXT NOT NULL,
      icon TEXT NOT NULL,summary TEXT NOT NULL,method TEXT NOT NULL,
      created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(story_id,item_id)
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS ownership (
      uid TEXT NOT NULL,story_id TEXT NOT NULL,item_id TEXT NOT NULL,
      granted_at INTEGER NOT NULL,source TEXT NOT NULL,
      PRIMARY KEY(uid,story_id,item_id)
    )`);
  }
  upsertDraft(rule,now){
    return this.ctx.storage.transactionSync(()=>{
      const itemId=rule.itemId||'author-item-'+crypto.randomUUID();
      const previous=this.sql.exec(
        'SELECT chapter_id,archived,updated_at FROM private_drafts WHERE story_id=? AND item_id=?',
        rule.storyId,itemId
      ).toArray()[0];
      if(rule.itemId&&!previous)return {ok:false,code:'not-found'};
      if(previous&&(previous.chapter_id||null)!==(rule.chapterId||null))
        return {ok:false,code:'immutable-scope'};
      if(previous?.archived)return {ok:false,code:'archived'};
      // Ensure the draft revision changes even when edits occur within a ms.
      const updatedAt=previous?Math.max(now,Number(previous.updated_at||0)+1):now;
      this.sql.exec(`INSERT INTO private_drafts
        (story_id,item_id,chapter_id,npc_id,name,rank,type,icon,summary,method,
         created_at,updated_at,archived)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)
        ON CONFLICT(story_id,item_id) DO UPDATE SET
         npc_id=excluded.npc_id,name=excluded.name,rank=excluded.rank,
         type=excluded.type,icon=excluded.icon,summary=excluded.summary,
         method=excluded.method,updated_at=excluded.updated_at`,
        rule.storyId,itemId,rule.chapterId,rule.npcId,
        rule.name,rule.rank,rule.type,rule.icon,rule.summary,rule.method,now,updatedAt);
      return {ok:true,storyId:rule.storyId,itemId};
    });
  }
  listPrivateDrafts(storyId,chapterId){
    // Admin-only API must call this. No public endpoint can list drafts.
    const items=chapterId===null?
      this.sql.exec(`SELECT story_id AS storyId,item_id AS itemId,
        chapter_id AS chapterId,npc_id AS npcId,name,rank,type,icon,
        summary,method,updated_at AS updatedAt
        FROM private_drafts WHERE story_id=? AND chapter_id IS NULL
        AND archived=0 ORDER BY updated_at DESC LIMIT 150`,storyId).toArray()
      :this.sql.exec(`SELECT story_id AS storyId,item_id AS itemId,
        chapter_id AS chapterId,npc_id AS npcId,name,rank,type,icon,
        summary,method,updated_at AS updatedAt
        FROM private_drafts WHERE story_id=? AND chapter_id=?
        AND archived=0 ORDER BY updated_at DESC LIMIT 150`,storyId,chapterId).toArray();
    return {items};
  }
  archivePrivateDraft(storyId,itemId){
    return this.ctx.storage.transactionSync(()=>{
      const previous=this.sql.exec(
        'SELECT 1 AS ok FROM private_drafts WHERE story_id=? AND item_id=?',
        storyId,itemId).toArray()[0];
      if(!previous)return {ok:false,code:'not-found'};
      this.sql.exec('UPDATE private_drafts SET archived=1 WHERE story_id=? AND item_id=?',
        storyId,itemId);
      // An archived secret cannot continue to mint new claims. Prior confirmed
      // ownership remains; the museum may still show already owned items.
      this.sql.exec('UPDATE releases SET disabled=1 WHERE story_id=? AND item_id=?',
        storyId,itemId);
      return {ok:true};
    });
  }
  draftPreview(storyId,itemId){
    const draft=this.sql.exec(`SELECT story_id AS storyId,item_id AS itemId,
      chapter_id AS chapterId,npc_id AS npcId,name,rank,type,icon,
      summary,method,updated_at AS updatedAt
      FROM private_drafts
      WHERE story_id=? AND item_id=? AND archived=0`,
      storyId,itemId).toArray()[0];
    if(!draft)return {ok:false,code:'not-found'};
    const current=this.sql.exec(`SELECT disabled,method,chapter_id AS chapterId,
      published_at AS publishedAt FROM releases WHERE story_id=? AND item_id=?`,
      storyId,itemId).toArray()[0];
    return {ok:true,draft,
      release:current?{disabled:!!current.disabled,method:current.method,
        chapterId:current.chapterId,publishedAt:current.publishedAt}:null};
  }
  publishDraft(approval,now){
    return this.ctx.storage.transactionSync(()=>{
      const draft=this.sql.exec(`SELECT story_id AS storyId,item_id AS itemId,
        chapter_id AS chapterId,npc_id AS npcId,name,rank,icon,summary,
        method,updated_at AS updatedAt,archived
        FROM private_drafts WHERE story_id=? AND item_id=?`,
        approval.storyId,approval.itemId).toArray()[0];
      if(!draft||draft.archived)return {ok:false,code:'not-found'};
      if(Number(draft.updatedAt)!==approval.expectedUpdatedAt)
        return {ok:false,code:'stale-draft'};
      if(!['CHAPTER_EVENT','STORY_EVENT'].includes(draft.method))
        return {ok:false,code:'not-releasable'};
      if(draft.method==='CHAPTER_EVENT'?!draft.chapterId:draft.chapterId!==null)
        return {ok:false,code:'invalid-scope'};
      const previous=this.sql.exec(`SELECT chapter_id AS chapterId,method,disabled
        FROM releases WHERE story_id=? AND item_id=?`,
        approval.storyId,approval.itemId).toArray()[0];
      if(previous&&(previous.method!==draft.method||
          (previous.chapterId||null)!==(draft.chapterId||null)))
        return {ok:false,code:'immutable-release'};
      // Admin has already previewed a server-owned record. Never use item text
      // from approval payload, nor publish an unpublished/archived/changed draft.
      this.sql.exec(`INSERT INTO releases
        (story_id,item_id,chapter_id,npc_id,name,rank,icon,summary,method,published_at,disabled)
        VALUES (?,?,?,?,?,?,?,?,?,?,0)
        ON CONFLICT(story_id,item_id) DO UPDATE SET
          npc_id=excluded.npc_id,name=excluded.name,rank=excluded.rank,
          icon=excluded.icon,summary=excluded.summary,published_at=excluded.published_at,
          disabled=0`,
        draft.storyId,draft.itemId,draft.chapterId,draft.npcId,draft.name,
        draft.rank,draft.icon,draft.summary,draft.method,now);
      return {ok:true,storyId:draft.storyId,itemId:draft.itemId,
        method:draft.method};
    });
  }
  disable(storyId,itemId){
    const released=this.sql.exec(
      'SELECT item_id FROM releases WHERE story_id=? AND item_id=?',storyId,itemId).toArray()[0];
    if(!released)return {ok:false,code:'not-found'};
    this.sql.exec('UPDATE releases SET disabled=1 WHERE story_id=? AND item_id=?',storyId,itemId);
    return {ok:true};
  }
  begin(uid,storyId,chapterId,now){
    // No title, description, or item ID sent back before completion.
    const available=this.sql.exec(`SELECT 1 AS eligible FROM releases
      WHERE story_id=? AND chapter_id=? AND method='CHAPTER_EVENT' AND disabled=0 LIMIT 1`,
      storyId,chapterId).toArray()[0];
    if(!available)return {ok:false,code:'not-available'};
    this.sql.exec(`INSERT INTO chapter_sessions(uid,story_id,chapter_id,started_at)
      VALUES (?,?,?,?) ON CONFLICT(uid,story_id,chapter_id) DO NOTHING`,
      uid,storyId,chapterId,now);
    return {ok:true,started:true};
  }
  claim(uid,storyId,chapterId,itemId,now){
    return this.ctx.storage.transactionSync(()=>{
      const item=this.sql.exec(`SELECT item_id,method,chapter_id,disabled FROM releases
        WHERE story_id=? AND item_id=?`,storyId,itemId).toArray()[0];
      if(!item||item.method!=='CHAPTER_EVENT'||item.chapter_id!==chapterId||item.disabled)
        return {ok:false,code:'not-available'};
      const owned=this.sql.exec('SELECT 1 AS yes FROM ownership WHERE uid=? AND story_id=? AND item_id=?',
        uid,storyId,itemId).toArray()[0];
      if(owned)return {ok:true,alreadyOwned:true};
      const session=this.sql.exec(`SELECT started_at FROM chapter_sessions
        WHERE uid=? AND story_id=? AND chapter_id=?`,uid,storyId,chapterId).toArray()[0];
      if(!session||!isChapterMature(Number(session.started_at),now))
        return {ok:false,code:'not-ready'};
      this.sql.exec(`INSERT INTO ownership(uid,story_id,item_id,granted_at,source)
        VALUES (?,?,?,?,'CHAPTER_EVENT')`,uid,storyId,itemId,now);
      return {ok:true,alreadyOwned:false};
    });
  }
  grant(uid,storyId,itemId,now){
    return this.ctx.storage.transactionSync(()=>{
      const item=this.sql.exec(`SELECT method,disabled,rank,name,chapter_id AS chapterId
        FROM releases WHERE story_id=? AND item_id=?`,storyId,itemId).toArray()[0];
      // Do not trust the browser's UI-only F/test eligibility checks.
      // For staging this endpoint grants ONLY an F-rank STORY_EVENT test
      // relic to the already JWT-verified admin UID (enforced at gateway).
      // Introduce a separate reviewed workflow for real reader awards later.
      if(!item||item.disabled||item.method!=='STORY_EVENT'||
         item.chapterId!==null||item.rank!=='F'||
         typeof item.name!=='string'||
         !item.name.toLocaleLowerCase('vi').includes('kiểm thử'))
        return {ok:false,code:'not-available'};
      const existed=this.sql.exec('SELECT 1 AS yes FROM ownership WHERE uid=? AND story_id=? AND item_id=?',
        uid,storyId,itemId).toArray()[0];
      if(existed)return {ok:true,alreadyOwned:true};
      this.sql.exec(`INSERT INTO ownership(uid,story_id,item_id,granted_at,source)
        VALUES (?,?,?,?,'STORY_EVENT')`,uid,storyId,itemId,now);
      return {ok:true,alreadyOwned:false};
    });
  }
  mine(uid){
    return this.sql.exec(`SELECT o.story_id AS storyId,o.item_id AS itemId,
      o.granted_at AS grantedAt,o.source,
      r.name,r.rank,r.icon,r.summary,r.npc_id AS npcId
      FROM ownership o LEFT JOIN releases r
      ON o.story_id=r.story_id AND o.item_id=r.item_id
      WHERE o.uid=? ORDER BY o.granted_at DESC LIMIT 500`,uid).toArray();
  }
}
