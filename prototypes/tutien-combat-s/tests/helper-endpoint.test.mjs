import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createServer} from '../serve.mjs';
test('fixed helper endpoint serves exact source only; raw traversal aliases and writes denied',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=(path,method='GET')=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path,method},res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>resolve({code:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.end();});
 try{
  const exact='/__shared/personal-jade-core-v1.js',r=await request(exact);
  assert.equal(r.code,200);assert.equal(r.body,await readFile(new URL('../../../js/personal-jade-core-v1.js',import.meta.url),'utf8'));assert.equal(r.headers['access-control-allow-origin'],undefined);
  assert.equal((await request(exact,'HEAD')).body,'');assert.equal((await request(exact,'POST')).code,405);
  for(const p of [exact+'?path=../../index.html','/__shared/other.js','/js/personal-jade-core-v1.js','/__shared/../index.html','/%2e%2e/index.html','/__shared/%2e%2e/personal-jade-core-v1.js','/%252e%252e%252findex.html','/__shared%2fpersonal-jade-core-v1.js','/..\\index.html'])assert.equal((await request(p)).code,403,p);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
