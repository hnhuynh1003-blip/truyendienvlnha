/* DUDU V25 — private SQL ledger with authenticated, append-only evidence.
 * NOT a public Durable Object API. Instantiate inside a separately audited
 * server-only DO, passing ctx.storage.sql, ctx.storage.transactionSync and
 * secrets sourced from protected Worker secrets. Never pass browser payloads.
 */
import {verifyV25Receipt} from './milestone-receipt-v25.mjs';

const FRAME_SOURCE=Object.freeze({
  legend:'VERIFIED_STORY_MILESTONE',soulbond:'VERIFIED_NPC_BOND'
});
const conflict=code=>({ok:false,code});
const query=(sql,statement,...args)=>sql.exec(statement,...args).toArray();
const first=(sql,statement,...args)=>query(sql,statement,...args)[0]||null;

export class V25TrustedMilestoneLedger{
  #sql;#transaction;#secrets;
  constructor({sql,transactionSync,secrets}={}){
    if(!sql||typeof sql.exec!=='function'||
      typeof transactionSync!=='function'||
      !secrets||typeof secrets.approval!=='string'||
      typeof secrets.progress!=='string'||
      secrets.approval.length<32||secrets.progress.length<32||
      secrets.approval===secrets.progress)
      throw new TypeError('private SQL store and distinct service secrets required');
    this.#sql=sql;this.#transaction=transactionSync;this.#secrets=secrets;
    sql.exec(`CREATE TABLE IF NOT EXISTS v25_event_receipts(
      event_id TEXT PRIMARY KEY,kind TEXT NOT NULL,digest TEXT NOT NULL,
      received_at INTEGER NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS v25_approval_versions(
      story_id TEXT NOT NULL,milestone_id TEXT NOT NULL,
      revision INTEGER NOT NULL,status TEXT NOT NULL,
      frame_id TEXT,chapter_id TEXT,npc_id TEXT,minimum_trust INTEGER,
      reviewed_at INTEGER NOT NULL,
      PRIMARY KEY(story_id,milestone_id,revision))`);
    sql.exec(`CREATE TABLE IF NOT EXISTS v25_approval_heads(
      story_id TEXT NOT NULL,milestone_id TEXT NOT NULL,
      revision INTEGER NOT NULL,PRIMARY KEY(story_id,milestone_id))`);
    sql.exec(`CREATE TABLE IF NOT EXISTS v25_chapters(
      uid TEXT NOT NULL,story_id TEXT NOT NULL,chapter_id TEXT NOT NULL,
      completed_at INTEGER NOT NULL,receipt_id TEXT NOT NULL,
      PRIMARY KEY(uid,story_id,chapter_id))`);
    sql.exec(`CREATE TABLE IF NOT EXISTS v25_bonds(
      uid TEXT NOT NULL,story_id TEXT NOT NULL,npc_id TEXT NOT NULL,
      milestone_id TEXT NOT NULL,trust INTEGER NOT NULL,
      verified_at INTEGER NOT NULL,receipt_id TEXT NOT NULL,
      PRIMARY KEY(uid,story_id,npc_id,milestone_id))`);
    sql.exec(`CREATE TABLE IF NOT EXISTS v25_completions(
      evidence_id TEXT PRIMARY KEY,uid TEXT NOT NULL,story_id TEXT NOT NULL,
      milestone_id TEXT NOT NULL,approval_revision INTEGER NOT NULL,
      frame_source TEXT NOT NULL,npc_id TEXT,
      completed_at INTEGER NOT NULL,receipt_id TEXT NOT NULL,
      UNIQUE(uid,story_id,milestone_id,approval_revision))`);
  }
  #approval(storyId,milestoneId){
    return first(this.#sql,`SELECT v.story_id AS storyId,
      v.milestone_id AS milestoneId,v.revision,v.status,
      v.frame_id AS frameId,v.chapter_id AS chapterId,
      v.npc_id AS npcId,v.minimum_trust AS minimumTrust,
      v.reviewed_at AS reviewedAt FROM v25_approval_heads h
      JOIN v25_approval_versions v ON v.story_id=h.story_id
      AND v.milestone_id=h.milestone_id AND v.revision=h.revision
      WHERE h.story_id=? AND h.milestone_id=?`,storyId,milestoneId);
  }
  /* All writes pass HMAC verification BEFORE opening the SQL transaction.
   * Failed dependencies roll back receipt insertion, allowing safe retry.
   */
  async ingestSignedReceipt({rawBytes,timestamp,signature,now}={}){
    let attested;
    try{
      attested=await verifyV25Receipt({
        rawBytes,timestamp,signature,secrets:this.#secrets,now
      });
    }catch(_){return conflict('invalid-attestation');}
    if(!attested)return conflict('invalid-attestation');
    try{
      return this.#transaction(()=>this.#apply(attested.event,attested.digest,now));
    }catch(_){return conflict('ledger-write-unavailable');}
  }
  #apply(event,digest,now){
    const prior=first(this.#sql,
      'SELECT kind,digest FROM v25_event_receipts WHERE event_id=?',event.eventId);
    if(prior)return prior.kind===event.kind&&prior.digest===digest?
      {ok:true,alreadyProcessed:true}:conflict('event-id-reuse');
    let outcome;
    switch(event.kind){
      case 'APPROVAL_PUBLISHED':
      case 'APPROVAL_REVOKED':
        outcome=this.#applyApproval(event);break;
      case 'CHAPTER_VERIFIED':
        outcome=this.#applyChapter(event);break;
      case 'BOND_VERIFIED':
        outcome=this.#applyBond(event);break;
      case 'MILESTONE_COMPLETED':
        outcome=this.#applyCompletion(event);break;
      default:return conflict('unsupported-receipt');
    }
    if(!outcome.ok)return outcome;
    this.#sql.exec(`INSERT INTO v25_event_receipts
      (event_id,kind,digest,received_at) VALUES(?,?,?,?)`,
      event.eventId,event.kind,digest,now);
    return {...outcome,eventId:event.eventId};
  }
  #applyApproval(event){
    const prev=this.#approval(event.storyId,event.milestoneId);
    if(event.revision!==(prev?Number(prev.revision)+1:1))
      return conflict('approval-revision-conflict');
    if(event.kind==='APPROVAL_REVOKED'&&!prev)
      return conflict('approval-not-found');
    const revoked=event.kind==='APPROVAL_REVOKED';
    const frameId=revoked?prev.frameId:event.frameId;
    const chapterId=revoked?prev.chapterId:event.chapterId;
    const npcId=revoked?prev.npcId:event.npcId;
    const minTrust=revoked?prev.minimumTrust:event.minimumTrust;
    this.#sql.exec(`INSERT INTO v25_approval_versions
      (story_id,milestone_id,revision,status,frame_id,chapter_id,npc_id,
       minimum_trust,reviewed_at) VALUES(?,?,?,?,?,?,?,?,?)`,
      event.storyId,event.milestoneId,event.revision,
      revoked?'REVOKED':'APPROVED',frameId,chapterId,npcId,
      minTrust,event.reviewedAt);
    this.#sql.exec(`INSERT INTO v25_approval_heads
      (story_id,milestone_id,revision) VALUES(?,?,?)
      ON CONFLICT(story_id,milestone_id) DO UPDATE SET revision=excluded.revision`,
      event.storyId,event.milestoneId,event.revision);
    return {ok:true,approvalRevision:event.revision,
      active:!revoked};
  }
  #applyChapter(event){
    const prior=first(this.#sql,`SELECT completed_at AS completedAt
      FROM v25_chapters WHERE uid=? AND story_id=? AND chapter_id=?`,
      event.uid,event.storyId,event.chapterId);
    if(prior)return conflict('chapter-already-recorded');
    this.#sql.exec(`INSERT INTO v25_chapters
      (uid,story_id,chapter_id,completed_at,receipt_id)
      VALUES(?,?,?,?,?)`,event.uid,event.storyId,event.chapterId,
      event.completedAt,event.eventId);
    return {ok:true,chapterVerified:true};
  }
  #applyBond(event){
    const approval=this.#approval(event.storyId,event.milestoneId);
    if(!approval||approval.status!=='APPROVED'||
      approval.frameId!=='soulbond'||approval.npcId!==event.npcId||
      event.trust<approval.minimumTrust||
      event.verifiedAt<approval.reviewedAt)
      return conflict('bond-not-eligible');
    const previous=first(this.#sql,`SELECT trust FROM v25_bonds
      WHERE uid=? AND story_id=? AND npc_id=? AND milestone_id=?`,
      event.uid,event.storyId,event.npcId,event.milestoneId);
    if(previous)return conflict('bond-already-recorded');
    this.#sql.exec(`INSERT INTO v25_bonds
      (uid,story_id,npc_id,milestone_id,trust,verified_at,receipt_id)
      VALUES(?,?,?,?,?,?,?)`,
      event.uid,event.storyId,event.npcId,event.milestoneId,
      event.trust,event.verifiedAt,event.eventId);
    return {ok:true,bondVerified:true};
  }
  #applyCompletion(event){
    const approval=this.#approval(event.storyId,event.milestoneId);
    if(!approval||approval.status!=='APPROVED'||
      Number(approval.revision)!==event.approvalRevision||
      event.completedAt<approval.reviewedAt)
      return conflict('unapproved-milestone');
    const chapter=this.getChapterProof({
      uid:event.uid,storyId:event.storyId,chapterId:approval.chapterId
    });
    if(!chapter||chapter.completedAt>event.completedAt||
      chapter.completedAt<approval.reviewedAt)
      return conflict('missing-chapter-proof');
    if(approval.frameId==='soulbond'){
      const bond=this.getBondProof({
        uid:event.uid,storyId:event.storyId,npcId:approval.npcId,
        milestoneId:event.milestoneId
      });
      if(!bond||bond.verifiedAt>event.completedAt||
        bond.trust<approval.minimumTrust)
        return conflict('missing-bond-proof');
    }
    const existing=first(this.#sql,`SELECT evidence_id FROM v25_completions
      WHERE uid=? AND story_id=? AND milestone_id=?
        AND approval_revision=?`,
      event.uid,event.storyId,event.milestoneId,event.approvalRevision);
    if(existing)return conflict('milestone-already-completed');
    const colliding=first(this.#sql,
      'SELECT evidence_id FROM v25_completions WHERE evidence_id=?',
      event.evidenceId);
    if(colliding)return conflict('evidence-id-reuse');
    const source=FRAME_SOURCE[approval.frameId];
    this.#sql.exec(`INSERT INTO v25_completions
      (evidence_id,uid,story_id,milestone_id,approval_revision,frame_source,
       npc_id,completed_at,receipt_id) VALUES(?,?,?,?,?,?,?,?,?)`,
      event.evidenceId,event.uid,event.storyId,event.milestoneId,
      event.approvalRevision,source,approval.npcId,event.completedAt,
      event.eventId);
    return {ok:true,completed:true,evidenceId:event.evidenceId,
      source};
  }
  /* UID-scoped reads. The V24 adapter rechecks all three ledgers.
   * No SQL key, HMAC, raw receipt, or private account data is returned.
   */
  getCompletion({uid,evidenceId,source}={}){
    const row=first(this.#sql,`SELECT c.uid,c.evidence_id AS evidenceId,
      c.frame_source AS source,c.story_id AS storyId,
      c.milestone_id AS milestoneId,c.approval_revision AS approvalRevision,
      c.npc_id AS npcId,c.completed_at AS completedAt
      FROM v25_completions c WHERE c.uid=? AND c.evidence_id=?
      AND c.frame_source=?`,uid,evidenceId,source);
    return row?{...row,status:'VERIFIED_COMPLETE',
      verifiedBy:'TRUSTED_SERVER'}:null;
  }
  getApproval({storyId,milestoneId}={}){
    const row=this.#approval(storyId,milestoneId);
    return row?.status==='APPROVED'?{
      storyId:row.storyId,milestoneId:row.milestoneId,
      frameId:row.frameId,
      kind:row.frameId==='legend'?'STORY':'NPC_BOND',
      status:row.status,published:true,
      revision:Number(row.revision),chapterId:row.chapterId,
      npcId:row.npcId,minimumTrust:row.minimumTrust,
      reviewedAt:Number(row.reviewedAt)
    }:null;
  }
  getChapterProof({uid,storyId,chapterId}={}){
    const row=first(this.#sql,`SELECT uid,story_id AS storyId,
      chapter_id AS chapterId,completed_at AS completedAt
      FROM v25_chapters WHERE uid=? AND story_id=? AND chapter_id=?`,
      uid,storyId,chapterId);
    return row?{...row,status:'VERIFIED_COMPLETE',
      verifiedBy:'TRUSTED_SERVER'}:null;
  }
  getBondProof({uid,storyId,npcId,milestoneId}={}){
    const row=first(this.#sql,`SELECT uid,story_id AS storyId,
      npc_id AS npcId,milestone_id AS milestoneId,
      trust,verified_at AS verifiedAt FROM v25_bonds
      WHERE uid=? AND story_id=? AND npc_id=? AND milestone_id=?`,
      uid,storyId,npcId,milestoneId);
    return row?{...row,status:'VERIFIED_BONDED',
      verifiedBy:'TRUSTED_SERVER'}:null;
  }
}
export function createV25MilestoneReaders(ledger){
  if(!(ledger instanceof V25TrustedMilestoneLedger))
    throw new TypeError('V25 verified ledger is required');
  return Object.freeze({
    loadCompletion:args=>ledger.getCompletion(args),
    loadApproval:args=>ledger.getApproval(args),
    loadChapterProof:args=>ledger.getChapterProof(args),
    loadBondProof:args=>ledger.getBondProof(args)
  });
}
