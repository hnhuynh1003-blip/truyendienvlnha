// Manual G2K smoke. NEVER run against a real Firebase project.
// Requires temporary @google-cloud/firestore installed in cloudflare/node_modules.
// npx firebase-tools@13.35.1 emulators:exec \
//  --config tools/vangioi/firebase-emulator-g2k.json --only firestore \
//  --project demo-vangioi-g2k \
//  'node cloudflare/tests/manual/vangioi-g2k-emulator.mjs'
import assert from 'node:assert/strict';
import {Firestore} from '@google-cloud/firestore';
import {createG2KEmulatorSourceRehearsal,assertG2KLocalEmulator,
 G2K_EMULATOR_PROJECT} from '../../src/vangioi-g2k-emulator-boundary.mjs';

// Strict guard BEFORE any Firestore network operation, even synthetic writes.
assertG2KLocalEmulator({
 emulatorHost:process.env.FIRESTORE_EMULATOR_HOST,
 firestoreProjectId:G2K_EMULATOR_PROJECT,
 credentialPath:process.env.GOOGLE_APPLICATION_CREDENTIALS||null,
 activeProjectId:process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||null
});

const db=new Firestore({projectId:G2K_EMULATOR_PROJECT});
const storyId='epub-g2k-'+crypto.randomUUID();
const book=db.collection('epub_stories_v49').doc(storyId);
const child=book.collection('chapters').doc('chapter-0001');
const OP='synthetic-operator',RECIPIENT='synthetic-author';
const input=()=>({storyId,requestId:crypto.randomUUID(),authorizedUid:RECIPIENT});
const request=uid=>new Request('https://fixture.invalid',{headers:{Authorization:'Bearer '+uid}});
let authorizedPermit=true,savedHash=null,reads=0;

try{
 await book.set({id:storyId,title:'Synthetic G2K',ownerUid:'synthetic-owner',status:'published',
  chapterCount:1,chapterIndex:[{id:'chapter-0001',title:'First',order:0}],
  admin:true,permit:{status:'active',authorizedUid:RECIPIENT}});
 await child.set({id:'chapter-0001',title:'First',order:0,content:'PRIVATE_SYNTHETIC_CHAPTER'});
 const service=createG2KEmulatorSourceRehearsal({firestore:db,
  emulatorHost:process.env.FIRESTORE_EMULATOR_HOST,
  credentialPath:process.env.GOOGLE_APPLICATION_CREDENTIALS||null,
  activeProjectId:process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||null,
  verify:async req=>({uid:req.headers.get('Authorization')?.slice(7),admin:true}),
  isOperator:async uid=>uid===OP,
  readAdaptationPermit:async({storyId,contentHash})=>{
   reads++;
   if(!authorizedPermit)return {ok:false,code:'permit-revoked'};
   savedHash??=contentHash;
   return {ok:true,permit:{storyId,contentHash:savedHash,authorizedUid:RECIPIENT,
    status:'active',revision:1,license:'original',sourceNote:'Synthetic fixture evidence',proofRef:null}};
  }
 });

 assert.equal((await service.prepare(request('unassigned-admin'),input())).code,'forbidden');
 assert.equal(reads,0);
 authorizedPermit=false;
 assert.equal((await service.prepare(request(OP),input())).code,'library-source-unavailable');
 authorizedPermit=true;
 const valid=await service.prepare(request(OP),input());
 assert.equal(valid.ok,true);
 assert.equal(valid.registryInput.payload.chapters[0].text,'PRIVATE_SYNTHETIC_CHAPTER');
 assert.equal('canPublish' in valid,false);
 assert.equal('canGrant' in valid,false);
 assert.equal('session' in valid,false);

 await child.update({content:'SECOND_SYNTHETIC_VERSION'});
 assert.equal((await service.prepare(request(OP),input())).ok,false);
 authorizedPermit=false;
 assert.equal((await service.prepare(request(OP),input())).ok,false);
 console.log('PASS G2K: local emulator, operator denial, permit denial, hash change; no production access');
}finally{
 // These synthetic rows are always scoped to the guarded demo emulator.
 try{await child.delete();await book.delete();}finally{await db.terminate();}
}
