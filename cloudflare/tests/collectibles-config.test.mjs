import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const worker=fs.readFileSync(path.join(root,'src/index.mjs'),'utf8');
const wrangler=fs.readFileSync(path.join(root,'wrangler.toml'),'utf8');
const ledger=fs.readFileSync(path.join(root,'src/collectibles.mjs'),'utf8');
test('collectibles have independent OFF switch and separate SQLite object',()=>{
  assert.match(wrangler,/COLLECTIBLES_ENABLED = "false"/);
  assert.match(wrangler,/AI_ENABLED = "false"/);
  assert.match(wrangler,/name = "DUDU_COLLECTIBLES"/);
  assert.match(wrangler,/tag = "v2-collectibles-sqlite"/);
  assert.match(worker,/if\(env\.COLLECTIBLES_ENABLED!=='true'\)/);
  assert.match(worker,/const user=await verifyFirebaseIdToken\(req,env\.PROJECT_ID\)/);
  assert.match(worker,/path\.startsWith\('\/v1\/collectibles\/admin\/'\)&&!user\.admin/);
});
test('claims use verified uid and server-owned SQL ledger, never browser inventory',()=>{
  assert.match(worker,/await bucket\.claim\(user\.uid,ids\.storyId,ids\.chapterId,ids\.itemId,now\)/);
  assert.match(worker,/await bucket\.mine\(user\.uid\)/);
  assert.match(ledger,/PRIMARY KEY\(uid,story_id,item_id\)/);
  assert.match(ledger,/this\.ctx\.storage\.transactionSync/);
  assert.doesNotMatch(ledger,/userProfile|localStorage|Gemini/);
});
