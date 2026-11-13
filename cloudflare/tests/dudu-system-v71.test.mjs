/* V71 SQLite integration — real transactions, 99 persistent systems,
 * one-time UID-bound passes, random exclusive assignments, private provenance.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const path=new URL('../src/dudu-system-registry-v71.mjs',import.meta.url);
const source=fs.readFileSync(path,'utf8')
 .replace("import {DurableObject} from 'cloudflare:workers';",
  'class DurableObject { constructor(ctx,env){this.ctx=ctx;this.env=env;} }');
const {DuduSystemRegistry,validateHostName}=await import(
 'data:text/javascript,'+encodeURIComponent(source));
function setup(){
 const db=new DatabaseSync(':memory:');
 const sql={exec(q,...params){
  const sql=q.trim();
  if(!params.length&&sql.startsWith('CREATE ')){db.exec(sql);return {toArray:()=>[]};}
  const stmt=db.prepare(sql);
  if(/^(SELECT|WITH)/i.test(sql))return {toArray:()=>stmt.all(...params)};
  stmt.run(...params);return {toArray:()=>[]};
 }};
 const storage={sql,transactionSync(fn){
  db.exec('BEGIN IMMEDIATE');
  try{const r=fn();db.exec('COMMIT');return r;}
  catch(e){db.exec('ROLLBACK');throw e;}
 }};
 const ledger=new DuduSystemRegistry({storage},{});
 return {db,ledger,sql};
}
test('V71 seeds exactly 99 persistent System identities; public payload conceals origin',()=>{
 const {db,ledger,sql}=setup();
 try{
  assert.deepEqual(ledger.counts(),{total:99,available:99});
  assert.equal(sql.exec('SELECT COUNT(DISTINCT public_id) n FROM v71_systems')
   .toArray()[0].n,99);
  assert.equal(sql.exec('SELECT COUNT(DISTINCT internal_id) n FROM v71_systems')
   .toArray()[0].n,99);
  const p=ledger.view('reader');assert.equal(p.stage,'locked');
  assert.equal(JSON.stringify(p).includes('origin'),false);
 }finally{db.close();}
});
test('V71 one-use card grants random one-of-99 exclusive identity with immutable host name',()=>{
 const {db,ledger,sql}=setup();
 try{
  const time=Date.now();
  assert.equal(ledger.issuePilot('reader','hash-one',time).ok,true);
  assert.equal(ledger.issuePilot('reader','hash-two',time).code,'pass-already-issued');
  assert.equal(ledger.redeem('intruder','hash-one',time).code,'invalid-pass');
  assert.equal(ledger.redeem('reader','wrong',time).code,'invalid-pass');
  const first=ledger.redeem('reader','hash-one',time);
  assert.equal(first.ok,true);
  assert.match(first.profile.host.id,/^KC-[A-F0-9]{18}$/);
  assert.match(first.profile.system.id,/^DUDU-\d\d$/);
  assert.equal(first.profile.host.name,null);
  assert.equal(first.profile.stage,'awaiting-name-or-pact');
  assert.equal(ledger.redeem('reader','hash-one',time).code,'already-bound');
  assert.equal(ledger.redeem('another','hash-one',time).code,'invalid-pass');
  assert.deepEqual(ledger.counts(),{total:99,available:98});
  assert.equal(JSON.stringify(first.profile).includes('origin'),false);
  assert.equal(JSON.stringify(first.profile).includes('private_temperament'),false);
  assert.equal(ledger.registerHostName('reader','  Thanh  Vân ',time).ok,true);
  assert.equal(ledger.registerHostName('reader','Tên khác',time).code,'name-already-registered');
  assert.equal(ledger.view('reader').host.name,'Thanh Vân');
  assert.equal(ledger.acceptPact('reader','bad-version',time).code,'terms-mismatch');
  assert.equal(ledger.acceptPact('reader','v71-pilot-1',time).ok,true);
  assert.equal(ledger.acceptPact('reader','v71-pilot-1',time).code,'already-signed');
  assert.equal(ledger.view('reader').stage,'linked');
  assert.equal(ledger.view('reader').worldAccess,false);
  const row=sql.exec('SELECT origin,private_temperament,internal_id FROM v71_systems WHERE occupant_uid=?','reader').toArray()[0];
  assert.ok(['regular','irregular'].includes(row.origin));
  assert.ok(row.private_temperament);
  assert.equal(first.profile.system.internal_id,undefined);
 }finally{db.close();}
});
test('V71 recoil/reclaim only via future internal verified event; memory reset and registry return',()=>{
 const {db,ledger,sql}=setup();
 try{
  const now=Date.now();
  ledger.issuePilot('reader','a',now);ledger.redeem('reader','a',now);
  const num=sql.exec('SELECT system_num FROM v71_hosts WHERE uid=?','reader').toArray()[0].system_num;
  sql.exec('UPDATE v71_systems SET private_memory=? WHERE system_num=?','["confidential-memory"]',num);
  assert.equal(ledger.reclaimByRule('reader','fake','verified_failure_threshold',now).ok,false);
  assert.equal(ledger.reclaimByRule('reader','event-id-verified-0001','wrong-reason',now).ok,false);
  assert.equal(ledger.counts().available,98);
  // NOT exposed as an API route; a future trusted rule engine must authorize
  // this internal method with independently verified failure receipts.
  assert.equal(ledger.reclaimByRule('reader','event-id-verified-0001','verified_failure_threshold',now).ok,true);
  const row=sql.exec('SELECT occupant_uid,private_memory,memory_epoch FROM v71_systems WHERE system_num=?',num).toArray()[0];
  assert.equal(row.occupant_uid,null);assert.equal(row.private_memory,'[]');
  assert.equal(row.memory_epoch,1);
  assert.equal(ledger.view('reader').stage,'locked');
  assert.equal(ledger.counts().available,99);
  assert.equal(ledger.reclaimByRule('reader','event-id-verified-0001','verified_failure_threshold',now).ok,false);
 }finally{db.close();}
});
test('V71 invalid identity names fail; no client patch can alter ID',()=>{
 assert.equal(validateHostName('  '),null);
 assert.equal(validateHostName('x'),null);
 assert.equal(validateHostName('a'.repeat(29)),null);
 assert.equal(validateHostName('<script>'),null);
 assert.equal(validateHostName(' Mây '),'Mây');
});
