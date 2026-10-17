/* V45: no Firebase calls or production data. Validate the server-side pilot
 * boundary and the fail-closed routing contract before staging activation.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pilotAccess,pilotConfig} from '../src/pilot-policy-v45.mjs';

const env=()=>({
 PILOT_ENABLED:'true',PILOT_NAMESPACE:'v45-private-qa',
 PILOT_READER_A_UID:'firebase_reader_A_123',
 PILOT_READER_B_UID:'firebase_reader_B_456',
 PILOT_AUTHOR_UID:'firebase_author_789'
});
const identity=uid=>({uid,admin:false});

test('V45: pilot is disabled when explicit server gate is missing',()=>{
 const configuration=pilotConfig({...env(),PILOT_ENABLED:'false'});
 assert.equal(configuration.ok,false);
 assert.equal(configuration.code,'pilot-disabled');
 assert.equal(configuration.status,503);
 assert.equal(pilotAccess({},identity('firebase_reader_A_123')).ok,false);
});
test('V45: requires a private v45 namespace and three distinct UID secrets',()=>{
 for(const namespace of ['',undefined,'main','production','v45-','v45-..',
  'v45-PRIVATE','v45-public/sandbox']){
  assert.equal(pilotConfig({...env(),PILOT_NAMESPACE:namespace}).code,
   'pilot-config-incomplete');
 }
 for(const key of ['PILOT_READER_A_UID','PILOT_READER_B_UID','PILOT_AUTHOR_UID']){
  assert.equal(pilotConfig({...env(),[key]:''}).code,
   'pilot-config-incomplete');
 }
 assert.equal(pilotConfig({...env(),PILOT_READER_B_UID:env().PILOT_READER_A_UID}).code,
  'pilot-config-incomplete');
 assert.equal(pilotConfig({...env(),PILOT_AUTHOR_UID:'<script>'}).ok,false);
});
test('V45: JWT identity determines role; client-provided names/roles are ignored',()=>{
 const a=pilotAccess(env(),identity('firebase_reader_A_123'));
 const b=pilotAccess(env(),identity('firebase_reader_B_456'));
 const author=pilotAccess(env(),identity('firebase_author_789'));
 assert.equal(a.role,'READER_A');
 assert.equal(b.role,'READER_B');
 assert.equal(author.role,'AUTHOR');
 assert.equal(a.giftStore,'gift-pilot-v45-private-qa');
 assert.equal(a.commentStore,'comments-pilot-v45-private-qa');
 assert.equal(b.commentStore,a.commentStore,'participants share their isolated pilot discussion');
 assert.notEqual(a.giftStore,'gift-global-v1');
 assert.notEqual(a.commentStore,'comments-global-v1');
 assert.equal(pilotAccess(env(),{uid:'outsider_567',role:'AUTHOR',admin:true}).code,
  'pilot-forbidden');
 assert.equal(pilotAccess(env(),{role:'AUTHOR'}).code,'unauthenticated');
});
test('V45: pilot routes rely on signed UID and separated stores, not public list',()=>{
 const code=fs.readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 const config=fs.readFileSync(new URL('../wrangler.toml',import.meta.url),'utf8');
 assert.match(code,/import \{pilotAccess\} from '\.\/pilot-policy-v45\.mjs'/);
 assert.match(code,/const pilot=pilotAccess\(env,identity\)/);
 assert.match(code,/const pilot=pilotAccess\(env,user\)/);
 assert.match(code,/getByName\(pilot\.giftStore\)/);
 assert.match(code,/getByName\(pilot\.commentStore\)/);
 assert.doesNotMatch(code,/getByName\('gift-global-v1'\)|getByName\('comments-global-v1'\)/);
 assert.match(code,/Every Pilot route, including list, requires a signed and allowlisted UID/);
 assert.match(code,/\/v1\/pilot\/status/);
 assert.match(config,/PILOT_ENABLED = "false"/);
 assert.match(config,/COMMENTS_ENABLED = "false"/);
 assert.match(config,/GIFTS_ENABLED = "false"/);
 assert.match(config,/GIFT_SETTLEMENT_ENABLED = "false"/);
 assert.match(config,/PILOT_SETTLEMENT_ENABLED = "false"/);
 assert.match(code,/env\.PILOT_SETTLEMENT_ENABLED!=='true'/);
 assert.doesNotMatch(config,/PILOT_(READER_A_UID|READER_B_UID|AUTHOR_UID)\s*=/);
});
