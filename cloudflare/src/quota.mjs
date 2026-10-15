import {DurableObject} from 'cloudflare:workers';
import {utcDay,quotaFailure,quotaMessage,USER_DAILY_LIMIT,GLOBAL_DAILY_LIMIT} from './limits.mjs';

// Exactly one SQLite-backed Durable Object ("global-budget-v1") owns ALL quotas.
// Synchronous transactions serialize simultaneous users and prevent quota races.
export class DuduQuota extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    this.sql=ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS user_usage (
      day TEXT NOT NULL, uid TEXT NOT NULL, calls INTEGER NOT NULL,
      last_at INTEGER NOT NULL, active_until INTEGER NOT NULL, active_id TEXT,
      PRIMARY KEY(day,uid)
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS global_usage (
      day TEXT PRIMARY KEY, calls INTEGER NOT NULL
    )`);
  }
  reserve(uid,now){
    if(typeof uid!=='string'||uid.length<1||uid.length>128) return {ok:false,code:'invalid-user'};
    const day=utcDay(now);
    const id=crypto.randomUUID();
    return this.ctx.storage.transactionSync(()=>{
      const user=this.sql.exec(
        'SELECT calls,last_at,active_until FROM user_usage WHERE day=? AND uid=?',day,uid
      ).one() || null;
      const global=this.sql.exec(
        'SELECT calls FROM global_usage WHERE day=?',day
      ).one() || null;
      const failure=quotaFailure(user,global,now);
      if(failure) return {ok:false,code:failure,message:quotaMessage(failure)};
      this.sql.exec(`INSERT INTO user_usage (day,uid,calls,last_at,active_until,active_id)
        VALUES (?,?,1,?,?,?) ON CONFLICT(day,uid) DO UPDATE SET
        calls=calls+1,last_at=excluded.last_at,
        active_until=excluded.active_until,active_id=excluded.active_id`,
        day,uid,now,now+45_000,id);
      this.sql.exec(`INSERT INTO global_usage (day,calls)
        VALUES (?,1) ON CONFLICT(day) DO UPDATE SET calls=calls+1`,day);
      return {ok:true,id,day,remaining:Math.max(0,USER_DAILY_LIMIT-Number(user?.calls||0)-1),
        globalRemaining:Math.max(0,GLOBAL_DAILY_LIMIT-Number(global?.calls||0)-1)};
    });
  }
  release(uid,day,id){
    this.sql.exec('UPDATE user_usage SET active_until=0,active_id=NULL WHERE day=? AND uid=? AND active_id=?',day,uid,id);
    return true;
  }
  status(uid,now){
    const day=utcDay(now);
    const user=this.sql.exec('SELECT calls FROM user_usage WHERE day=? AND uid=?',day,uid).one();
    const global=this.sql.exec('SELECT calls FROM global_usage WHERE day=?',day).one();
    return {dailyLimit:USER_DAILY_LIMIT,remaining:Math.max(0,USER_DAILY_LIMIT-Number(user?.calls||0)),
      globalRemaining:Math.max(0,GLOBAL_DAILY_LIMIT-Number(global?.calls||0))};
  }
}
