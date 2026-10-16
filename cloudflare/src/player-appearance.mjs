import {DurableObject} from 'cloudflare:workers';

// One DO instance PER verified Firebase UID, selected by gateway getByName(uid).
// Never accept a client-controlled user identifier or any uploaded image bytes.
export class DuduPlayerAppearance extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    this.sql=ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS appearance (
      singleton INTEGER PRIMARY KEY CHECK(singleton=1),
      revision INTEGER NOT NULL, kind TEXT NOT NULL,
      preset_id TEXT NOT NULL, frame_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    // Read-only until a separately audited server event issuer exists.
    // No public/API method inserts frame awards, by design.
    this.sql.exec(`CREATE TABLE IF NOT EXISTS frame_awards (
      frame_id TEXT PRIMARY KEY CHECK(frame_id IN ('legend','soulbond')),
      source TEXT NOT NULL,evidence_id TEXT NOT NULL,
      granted_at INTEGER NOT NULL,
      UNIQUE(source,evidence_id)
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS award_events (
      event_id TEXT PRIMARY KEY,frame_id TEXT NOT NULL,
      evidence_id TEXT NOT NULL,received_at INTEGER NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS photo_drafts (
      asset_id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK(status IN ('PENDING','QUARANTINED')),
      reserved_at INTEGER NOT NULL,stored_at INTEGER
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS photo_variants (
      asset_id TEXT PRIMARY KEY,
      format TEXT NOT NULL CHECK(format IN ('webp','jpeg')),
      processed_at INTEGER NOT NULL,
      FOREIGN KEY(asset_id) REFERENCES photo_drafts(asset_id)
    )`);
  }
  reservePhotoDraft(assetId,now){
    if(typeof assetId!=='string'||!Number.isSafeInteger(now))
      return {ok:false,code:'invalid-request'};
    return this.ctx.storage.transactionSync(()=>{
      this.sql.exec(`DELETE FROM photo_drafts
        WHERE status='PENDING' AND reserved_at<?`,now-10*60*1000);
      const active=this.sql.exec(`SELECT COUNT(*) AS qty FROM photo_drafts`).toArray()[0];
      if(Number(active.qty)>=3)return {ok:false,code:'photo-quota'};
      this.sql.exec(`INSERT INTO photo_drafts
        (asset_id,status,reserved_at) VALUES(?,'PENDING',?)`,assetId,now);
      return {ok:true};
    });
  }
  finalizePhotoDraft(assetId,now){
    return this.ctx.storage.transactionSync(()=>{
      const owned=this.sql.exec(`SELECT status FROM photo_drafts WHERE asset_id=?`,
        assetId).toArray()[0];
      if(!owned||owned.status!=='PENDING')return {ok:false,code:'no-reservation'};
      this.sql.exec(`UPDATE photo_drafts SET status='QUARANTINED',stored_at=?
        WHERE asset_id=? AND status='PENDING'`,now,assetId);
      return {ok:true,quarantined:true};
    });
  }
  abandonPhotoDraft(assetId){
    this.sql.exec(`DELETE FROM photo_drafts
      WHERE asset_id=? AND status='PENDING'`,assetId);
    return {ok:true};
  }
  listPrivatePhotoDrafts(){
    // Return only owner-scoped metadata; no R2 keys, image bytes or URLs.
    return this.sql.exec(`SELECT p.asset_id AS assetId,
      p.status,p.reserved_at AS reservedAt,p.stored_at AS storedAt,
      CASE WHEN v.asset_id IS NULL THEN 0 ELSE 1 END AS processed
      FROM photo_drafts p LEFT JOIN photo_variants v ON v.asset_id=p.asset_id
      WHERE p.status='QUARANTINED'
      ORDER BY p.reserved_at DESC LIMIT 3`).toArray().map(row=>({
        assetId:row.assetId,status:row.status,
        reservedAt:Number(row.reservedAt),storedAt:Number(row.storedAt),
        processed:row.processed===1
      }));
  }
  markPrivateVariant(assetId,format,now){
    if(!['webp','jpeg'].includes(format)||!Number.isSafeInteger(now))
      return {ok:false,code:'invalid-variant'};
    return this.ctx.storage.transactionSync(()=>{
      const owned=this.ownPhotoDraft(assetId);
      if(!owned.owned)return {ok:false,code:'not-found'};
      const existing=this.sql.exec(`SELECT format FROM photo_variants
        WHERE asset_id=?`,assetId).toArray()[0];
      if(existing)return {ok:false,code:'already-processed'};
      this.sql.exec(`INSERT INTO photo_variants
        (asset_id,format,processed_at) VALUES(?,?,?)`,assetId,format,now);
      return {ok:true};
    });
  }
  ownPhotoDraft(assetId){
    const item=this.sql.exec(`SELECT status FROM photo_drafts
      WHERE asset_id=?`,assetId).toArray()[0];
    const variant=item?.status==='QUARANTINED'?this.sql.exec(
      `SELECT format FROM photo_variants WHERE asset_id=?`,assetId
    ).toArray()[0]:null;
    return {owned:item?.status==='QUARANTINED',variantFormat:variant?.format||null};
  }
  removePhotoDraft(assetId){
    return this.ctx.storage.transactionSync(()=>{
      const exists=this.ownPhotoDraft(assetId);
      if(!exists.owned)return {ok:false,code:'not-found'};
      this.sql.exec(`DELETE FROM photo_variants WHERE asset_id=?`,assetId);
      this.sql.exec(`DELETE FROM photo_drafts WHERE asset_id=?`,assetId);
      return {ok:true};
    });
  }
  recordSignedAward(event,now){
    // Gateway validates the webhook signature. This DO is per verified target
    // UID; event.uid is never accepted as a browser-controlled parameter.
    if(!event||!Number.isSafeInteger(now))return {ok:false,code:'invalid-event'};
    return this.ctx.storage.transactionSync(()=>{
      const previous=this.sql.exec(`SELECT frame_id AS frameId,
        evidence_id AS evidenceId FROM award_events WHERE event_id=?`,
        event.eventId).toArray()[0];
      if(previous)return previous.frameId===event.frameId&&
          previous.evidenceId===event.evidenceId?
          {ok:true,alreadyProcessed:true}:{ok:false,code:'event-reuse'};
      const existing=this.sql.exec(`SELECT source,evidence_id AS evidenceId
        FROM frame_awards WHERE frame_id=?`,event.frameId).toArray()[0];
      if(existing){
        // A frame is earned once. A different event cannot overwrite proof.
        return {ok:true,alreadyOwned:true};
      }
      this.sql.exec(`INSERT INTO frame_awards
        (frame_id,source,evidence_id,granted_at) VALUES(?,?,?,?)`,
        event.frameId,event.source,event.evidenceId,now);
      this.sql.exec(`INSERT INTO award_events
        (event_id,frame_id,evidence_id,received_at) VALUES(?,?,?,?)`,
        event.eventId,event.frameId,event.evidenceId,now);
      return {ok:true,granted:true};
    });
  }
  verifiedAwards(){
    return this.sql.exec(`SELECT frame_id AS frameId,source,
      evidence_id AS evidenceId,granted_at AS grantedAt
      FROM frame_awards ORDER BY granted_at ASC LIMIT 10`).toArray();
  }
  mine(){
    const row=this.sql.exec(`SELECT revision,kind,preset_id AS presetId,
      frame_id AS frameId,updated_at AS updatedAt
      FROM appearance WHERE singleton=1`).toArray()[0];
    return row?{revision:Number(row.revision),
      avatar:{kind:row.kind,presetId:row.presetId,frameId:row.frameId},
      updatedAt:Number(row.updatedAt)}:{
      revision:0,avatar:{kind:'initials',presetId:'',frameId:'none'},updatedAt:0
    };
  }
  save(normalized,now){
    if(!normalized||!Number.isFinite(now))return {ok:false,code:'invalid-request'};
    return this.ctx.storage.transactionSync(()=>{
      const existing=this.mine();
      if(normalized.expectedRevision!==existing.revision)
        return {ok:false,code:'revision-conflict',
          revision:existing.revision};
      const revision=existing.revision+1;
      const {kind,presetId,frameId}=normalized.avatar;
      this.sql.exec(`INSERT INTO appearance
        (singleton,revision,kind,preset_id,frame_id,updated_at)
        VALUES(1,?,?,?,?,?)
        ON CONFLICT(singleton) DO UPDATE SET
        revision=excluded.revision,kind=excluded.kind,
        preset_id=excluded.preset_id,frame_id=excluded.frame_id,
        updated_at=excluded.updated_at`,
        revision,kind,presetId,frameId,now);
      return {ok:true,revision,avatar:{kind,presetId,frameId},updatedAt:now};
    });
  }
}
