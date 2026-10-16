import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLocalJWKSet,generateKeyPair,exportJWK,SignJWT} from 'jose';
import {verifyFirebaseIdToken} from '../src/auth.mjs';

const project='truyendienvl';
async function setup(){
  const pair=await generateKeyPair('RS256');
  const key=await exportJWK(pair.publicKey);
  key.kid='firebase-test-kid';
  key.use='sig';
  const jwks=createLocalJWKSet({keys:[key]});
  async function sign(overrides={},privateKey=pair.privateKey){
    const now=Math.floor(Date.now()/1000);
    return new SignJWT({auth_time:now,admin:false,...(overrides.claims||{})})
      .setProtectedHeader({alg:'RS256',kid:'firebase-test-kid'})
      .setSubject(overrides.sub ?? 'uid-reader')
      .setAudience(overrides.aud ?? project)
      .setIssuer(overrides.iss ?? 'https://securetoken.google.com/'+project)
      .setIssuedAt(overrides.iat ?? now)
      .setExpirationTime(overrides.exp ?? now+3600)
      .sign(privateKey);
  }
  const request=(token)=>new Request('https://unit.test/v1/generate',{headers:{Authorization:'Bearer '+token}});
  return {pair,jwks,sign,request};
}
test('only correctly signed Firebase tokens with project issuer/audience identify users',async()=>{
  const {jwks,sign,request}=await setup();
  const token=await sign();
  assert.deepEqual(await verifyFirebaseIdToken(request(token),project,jwks),{uid:'uid-reader',admin:false});
  assert.deepEqual(await verifyFirebaseIdToken(request(await sign({claims:{admin:true},sub:'author'})),project,jwks),
    {uid:'author',admin:true});
  assert.equal(await verifyFirebaseIdToken(request(token),'other-project',jwks),null);
  assert.equal(await verifyFirebaseIdToken(request(await sign({aud:'other-project'})),project,jwks),null);
  assert.equal(await verifyFirebaseIdToken(request(await sign({iss:'https://securetoken.google.com/other'})),project,jwks),null);
});
test('forged signatures, expired tokens and future auth time fail closed',async()=>{
  const {jwks,sign,request}=await setup();
  const forged=await generateKeyPair('RS256');
  assert.equal(await verifyFirebaseIdToken(request(await sign({},forged.privateKey)),project,jwks),null);
  assert.equal(await verifyFirebaseIdToken(request(await sign({exp:Math.floor(Date.now()/1000)-300})),project,jwks),null);
  assert.equal(await verifyFirebaseIdToken(request(await sign({claims:{auth_time:Math.floor(Date.now()/1000)+600}})),project,jwks),null);
  assert.equal(await verifyFirebaseIdToken(request(await sign({sub:''})),project,jwks),null);
});
test('header without JWT is rejected without checking network',async()=>{
  const {jwks}=await setup();
  assert.equal(await verifyFirebaseIdToken(new Request('https://unit.test',{headers:{Authorization:'Bearer garbage'}}),project,jwks),null);
  assert.equal(await verifyFirebaseIdToken(new Request('https://unit.test'),project,jwks),null);
});
