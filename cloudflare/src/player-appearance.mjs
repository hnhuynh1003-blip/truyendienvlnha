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
