import {DurableObject} from 'cloudflare:workers';

// DUDU V71 — authoritative (SQLite Durable Object) identity & 99-system pool.
// One DO instance serializes issuance, one-time redemption and assignment.
// Public system numbers NEVER identify origin; private flags never returned.
// No AI, browser data, Firebase profile or localStorage may mint a pass.
const COUNT=99,DAY=86400000;
const pick=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
const randomId=(prefix)=>prefix+Array.from(crypto.getRandomValues(new Uint8Array(9)),
 x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
export function validateHostName(value){
 if(typeof value!=='string')return null;
 const n=value.normalize('NFC').trim().replace(/\s+/g,' ');
 if(n.length<2||n.length>28||/[\p{C}<>{}]/u.test(n))return null;
 return n;
}
export function redactedSystemRow(row){
 if(!row)return null;
 return {
  id:row.display_id,name:row.display_name||'Hệ thống '+row.display_id,
  rank:row.rank,level:row.level,exp:row.exp,
  // NEVER emit origin, hidden personality, internal id, memory epoch or issuer proof.
  ledgerBacked:true
 };
}
export class DuduSystemRegistry extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);this.sql=ctx.storage.sql;
  this.sql.exec(`CREATE TABLE IF NOT EXISTS v71_systems(
    system_num INTEGER PRIMARY KEY,public_id TEXT UNIQUE NOT NULL,
    display_id TEXT NOT NULL,internal_id TEXT UNIQUE NOT NULL,origin TEXT NOT NULL,
    private_temperament TEXT NOT NULL,memory_epoch INTEGER NOT NULL DEFAULT 0,
    private_memory TEXT NOT NULL DEFAULT '[]',occupant_uid TEXT UNIQUE,
    rank TEXT NOT NULL DEFAULT 'F',level INTEGER NOT NULL DEFAULT 1,
    exp INTEGER NOT NULL DEFAULT 0)`);
  this.sql.exec(`CREATE TABLE IF NOT EXISTS v71_passes(
    uid TEXT PRIMARY KEY,code_hash TEXT UNIQUE NOT NULL,
    state TEXT NOT NULL,issued_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,redeemed_at INTEGER)`);
  this.sql.exec(`CREATE TABLE IF NOT EXISTS v71_hosts(
    uid TEXT PRIMARY KEY,host_id TEXT UNIQUE NOT NULL,
    host_name TEXT,system_num INTEGER NOT NULL UNIQUE,
    pact TEXT NOT NULL DEFAULT 'pending',
    terms_version TEXT,created_at INTEGER NOT NULL,
    stats_json TEXT NOT NULL,worlds INTEGER NOT NULL DEFAULT 0,
    missions INTEGER NOT NULL DEFAULT 0,achievements INTEGER NOT NULL DEFAULT 0,
    rewards INTEGER NOT NULL DEFAULT 0,items INTEGER NOT NULL DEFAULT 0,
    failures INTEGER NOT NULL DEFAULT 0)`);
  this.sql.exec(`CREATE TABLE IF NOT EXISTS v71_events(
    event_id TEXT PRIMARY KEY,uid TEXT NOT NULL,type TEXT NOT NULL,
    happened_at INTEGER NOT NULL,details TEXT NOT NULL)`);
  const existing=this.sql.exec('SELECT COUNT(*) AS c FROM v71_systems').toArray()[0].c;
  if(existing===0){
   this.ctx.storage.transactionSync(()=>{
    for(let n=1;n<=COUNT;n++){
     const number=String(n).padStart(2,'0');
     // Non-public distribution: no deterministic number-to-origin mapping.
     const irregular=pick(100)<18;
     const tone=['kín đáo','kiên nhẫn','nhiệt huyết','ham học','thận trọng','tự do'][pick(6)];
     // A rogue MAY claim another valid-looking number; the signed registry
     // always uses internal_id/system_num to establish true origin.
     const claimed=irregular&&pick(100)<42?1+pick(COUNT):n;
     const display='DUDU-'+String(claimed).padStart(2,'0');
     this.sql.exec(`INSERT OR IGNORE INTO v71_systems
       (system_num,public_id,display_id,internal_id,origin,private_temperament)
       VALUES (?,?,?,?,?,?)`,n,'DUDU-'+number,display,crypto.randomUUID(),
       irregular?'irregular':'regular',tone);
    }
   });
  }
 }
 counts(){
  const total=this.sql.exec('SELECT COUNT(*) AS c FROM v71_systems').toArray()[0].c;
  const free=this.sql.exec('SELECT COUNT(*) AS c FROM v71_systems WHERE occupant_uid IS NULL').toArray()[0].c;
  return {total:Number(total),available:Number(free)};
 }
 view(uid){
  const host=this.sql.exec(`SELECT h.*,s.system_num,s.public_id,s.display_id,s.rank,s.level,s.exp
    FROM v71_hosts h JOIN v71_systems s ON s.system_num=h.system_num
    WHERE h.uid=?`,uid).toArray()[0];
  if(host){
   return {stage:host.pact==='signed'?'linked':'awaiting-name-or-pact',
    host:{id:host.host_id,name:host.host_name,level:1,exp:0,
      stats:JSON.parse(host.stats_json),failures:host.failures},
    system:redactedSystemRow(host),
    pact:{status:host.pact,termsVersion:host.terms_version},
    progress:{worlds:host.worlds,missions:host.missions,achievements:host.achievements,
      rewards:host.rewards,items:host.items},worldAccess:false,
    authoritative:true};
  }
  const pass=this.sql.exec('SELECT state,expires_at FROM v71_passes WHERE uid=?',uid).toArray()[0];
  return {stage:'locked',passport:pass?
   {state:pass.state,expiresAt:pass.expires_at}:null,authoritative:true};
 }
 issuePilot(uid,hash,now){
  return this.ctx.storage.transactionSync(()=>{
   const host=this.sql.exec('SELECT uid FROM v71_hosts WHERE uid=?',uid).toArray()[0];
   if(host)return {ok:false,code:'already-bound'};
   const existing=this.sql.exec('SELECT state,expires_at FROM v71_passes WHERE uid=?',uid).toArray()[0];
   if(existing?.state==='issued'&&existing.expires_at>now)
    return {ok:false,code:'pass-already-issued'};
   this.sql.exec(`INSERT INTO v71_passes(uid,code_hash,state,issued_at,expires_at)
     VALUES (?,?,'issued',?,?) ON CONFLICT(uid) DO UPDATE SET
     code_hash=excluded.code_hash,state='issued',issued_at=excluded.issued_at,
     expires_at=excluded.expires_at,redeemed_at=NULL`,uid,hash,now,now+7*DAY);
   return {ok:true,expiresAt:now+7*DAY};
  });
 }
 redeem(uid,hash,now){
  return this.ctx.storage.transactionSync(()=>{
   if(this.sql.exec('SELECT uid FROM v71_hosts WHERE uid=?',uid).toArray()[0])
    return {ok:false,code:'already-bound'};
   const pass=this.sql.exec(`SELECT state,expires_at,code_hash FROM v71_passes
     WHERE uid=?`,uid).toArray()[0];
   if(!pass||pass.state!=='issued'||pass.expires_at<now||pass.code_hash!==hash)
    return {ok:false,code:'invalid-pass'};
   const vacant=this.sql.exec('SELECT system_num FROM v71_systems WHERE occupant_uid IS NULL').toArray();
   if(!vacant.length)return {ok:false,code:'system-pool-full'};
   const num=vacant[pick(vacant.length)].system_num;
   const hostId=randomId('KC-');
   const stats={};
   for(const key of ['fortune','luck','agility','strength','appearance','intelligence','stamina','spirit'])
    stats[key]=35+pick(46);
   this.sql.exec('UPDATE v71_systems SET occupant_uid=? WHERE system_num=? AND occupant_uid IS NULL',uid,num);
   this.sql.exec(`INSERT INTO v71_hosts(uid,host_id,system_num,created_at,stats_json)
      VALUES (?,?,?,?,?)`,uid,hostId,num,now,JSON.stringify(stats));
   this.sql.exec(`UPDATE v71_passes SET state='redeemed',redeemed_at=? WHERE uid=?`,now,uid);
   this.sql.exec(`INSERT INTO v71_events(event_id,uid,type,happened_at,details)
     VALUES (?,?,?,?,?)`,crypto.randomUUID(),uid,'passport_redeemed',now,JSON.stringify({system:num}));
   return {ok:true,profile:this.view(uid)};
  });
 }
 registerHostName(uid,name,now){
  const valid=validateHostName(name);
  if(!valid)return {ok:false,code:'invalid-name'};
  return this.ctx.storage.transactionSync(()=>{
   const row=this.sql.exec('SELECT host_name,pact FROM v71_hosts WHERE uid=?',uid).toArray()[0];
   if(!row)return {ok:false,code:'passport-required'};
   if(row.host_name)return {ok:false,code:'name-already-registered'};
   this.sql.exec('UPDATE v71_hosts SET host_name=? WHERE uid=? AND host_name IS NULL',valid,uid);
   this.sql.exec('INSERT INTO v71_events VALUES(?,?,?,?,?)',
     crypto.randomUUID(),uid,'host_named',now,JSON.stringify({name:valid}));
   return {ok:true,profile:this.view(uid)};
  });
 }
 // V71 contract: requires explicit consent, not a silent assignment on pass.
 acceptPact(uid,termsVersion,now){
  if(termsVersion!=='v71-pilot-1')return {ok:false,code:'terms-mismatch'};
  return this.ctx.storage.transactionSync(()=>{
   const row=this.sql.exec('SELECT pact,host_name FROM v71_hosts WHERE uid=?',uid).toArray()[0];
   if(!row||!row.host_name)return {ok:false,code:'name-required'};
   if(row.pact==='signed')return {ok:false,code:'already-signed'};
   this.sql.exec(`UPDATE v71_hosts SET pact='signed',terms_version=?
     WHERE uid=? AND pact='pending'`,termsVersion,uid);
   this.sql.exec('INSERT INTO v71_events VALUES(?,?,?,?,?)',
    crypto.randomUUID(),uid,'pact_signed',now,JSON.stringify({termsVersion}));
   return {ok:true,profile:this.view(uid)};
  });
 }
 // Internal-only future rule engine: no public route. A signed, uniquely
 // identified and approved fail event will be required before reclaim().
 // Reclaim does NOT delete reader data. System ID is durable and returns to
 // the free pool, its PRIVATE memory is reset, and old host ID is retired.
 reclaimByRule(uid,eventId,reason,now){
  if(typeof eventId!=='string'||eventId.length<12||
     reason!=='verified_failure_threshold')return {ok:false,code:'not-authorized'};
  return this.ctx.storage.transactionSync(()=>{
   const host=this.sql.exec('SELECT system_num FROM v71_hosts WHERE uid=?',uid).toArray()[0];
   if(!host)return {ok:false,code:'not-bound'};
   if(this.sql.exec('SELECT event_id FROM v71_events WHERE event_id=?',eventId).toArray()[0])
    return {ok:false,code:'duplicate-event'};
   this.sql.exec(`UPDATE v71_systems SET occupant_uid=NULL,memory_epoch=memory_epoch+1,
      private_memory='[]',rank='F',level=1,exp=0 WHERE system_num=? AND occupant_uid=?`,
    host.system_num,uid);
   this.sql.exec('DELETE FROM v71_hosts WHERE uid=?',uid);
   this.sql.exec('DELETE FROM v71_passes WHERE uid=?',uid);
   this.sql.exec('INSERT INTO v71_events VALUES(?,?,?,?,?)',eventId,uid,'system_reclaimed',now,
    JSON.stringify({reason,system:host.system_num}));
   return {ok:true};
  });
 }
}