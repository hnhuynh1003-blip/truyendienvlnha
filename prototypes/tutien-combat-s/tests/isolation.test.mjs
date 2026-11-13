import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from '../serve.mjs';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
test('standalone page blocks outbound requests and has only local modules/styles',async()=>{
 const html=await read('../index.html');assert.match(html,/connect-src 'none'/);assert.doesNotMatch(html,/https?:\/\//);
 for(const p of ['../ui.mjs','../world-ui.mjs','../world-core.mjs','../combat-core.mjs','../fixture.mjs','../mock-repository.mjs']){
  const source=await read(p);assert.doesNotMatch(source,/https?:\/\//);assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|firebase\.|profiles_v2|economy_accounts_v52|localStorage/);
  for(const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g))assert.match(match[1],/^\.\//);
 }
});
test('loopback preview serves prototype only; rejects writes and root traversal',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const base=`http://127.0.0.1:${server.address().port}`;
  const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/MOCK ONLY/);
  assert.equal((await fetch(base+'/firestore.rules')).status,403);
  assert.equal((await fetch(base+'/%2e%2e%2findex.html')).status,403);
  assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
  assert.equal((await fetch(base+'/__browser-report',{method:'POST',body:'{}'})).status,405);
  assert.equal((await fetch(base+'/ui.mjs')).headers.get('content-type'),'text/javascript; charset=utf-8');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
