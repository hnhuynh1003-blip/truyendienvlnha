// Run ONLY against demo emulator (never production):
// npx -y firebase-tools@13.35.1 emulators:exec --only firestore \
//   --project demo-dudu-standard --config firebase.rules-review.json \
//   'node cloudflare/tests/manual/dudu-standard-spark-rules-emulator.mjs'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';

const PROJECT='demo-dudu-standard';
const HOST='127.0.0.1:18087';
if(process.env.FIRESTORE_EMULATOR_HOST!==HOST||
 process.env.GOOGLE_APPLICATION_CREDENTIALS||
 [process.env.GCLOUD_PROJECT,process.env.GOOGLE_CLOUD_PROJECT,process.env.FIREBASE_PROJECT_ID]
  .some(x=>x&&x!==PROJECT))throw Error('Only isolated demo emulator is allowed');

const rules=readFileSync(new URL('../../../firestore.rules',import.meta.url),'utf8');
if(!rules.includes('NOT DEPLOYED')||!rules.includes('lastRevisionId'))
 throw Error('Expected review-only candidate');

const env=await initializeTestEnvironment({
 projectId:PROJECT,firestore:{host:'127.0.0.1',port:18087,rules}
});
const CH='chapter-0001',STORY='epub-reviewed-one',DRAFT='epub-private-one';
const chapter=(content='Bản đầu')=>({id:CH,order:0,title:'Chương một',content,wordCount:2});
const book=(id,status='importing',uid='author-a')=>({
 id,title:'Tác phẩm thử nghiệm',author:'Du',genre:'Giả tưởng',desc:'Văn án',
 publicationState:'Đang ra',status,ownerUid:uid,chapterCount:1,
 chapterIndex:[{id:CH,title:'Chương một',wordCount:2,order:0}],
 createdAt:'2026-10-30T00:00:00.000Z',updatedAt:'2026-10-30T00:00:00.000Z',
 sourceName:'test.epub',importSchema:57,importFingerprint:'v57-abcd1234-ef567890-1',
 coverImage:''
});
const revision=(uid='author-a',content='Bản đầu')=>({
 id:'rev-000001',chapterId:CH,ownerUid:uid,beforeVersion:0,version:1,
 createdAt:'2026-10-30T01:00:00.000Z',reason:'edit',
 title:'Chương một',content,wordCount:2
});
let checks=0;
async function yes(name,promise){await assertSucceeds(promise);checks++;process.stdout.write('PASS '+name+'\n');}
async function no(name,promise){await assertFails(promise);checks++;process.stdout.write('BLOCK '+name+'\n');}

try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await db.collection('epub_stories_v49').doc(STORY).set(book(STORY,'published'));
  await db.collection('epub_stories_v49').doc(STORY).collection('chapters').doc(CH).set(chapter());
  await db.collection('epub_stories_v49').doc(DRAFT).set(book(DRAFT,'draft'));
  await db.collection('epub_stories_v49').doc(DRAFT).collection('chapters').doc(CH).set(chapter());
  await db.collection('economy_accounts_v52').doc('reader-a').set({balance:10});
  await db.collection('economy_accounts_v52').doc('reader-a')
   .collection('items').doc('item-a').set({id:'item-a'});
 });
 const guest=env.unauthenticatedContext().firestore();
 const reader=env.authenticatedContext('reader-a',{admin:false}).firestore();
 const owner=env.authenticatedContext('author-a',{admin:true}).firestore();
 const foreign=env.authenticatedContext('author-b',{admin:true}).firestore();
 const root=db=>db.collection('epub_stories_v49');
 const chapterRef=(db,id=STORY)=>root(db).doc(id).collection('chapters').doc(CH);

 await yes('guest reads published',root(guest).doc(STORY).get());
 await yes('guest reads published chapter',chapterRef(guest).get());
 await no('guest cannot see draft',root(guest).doc(DRAFT).get());
 await no('guest cannot see private chapter',chapterRef(guest,DRAFT).get());
 await yes('filtered public query',root(guest).where('status','==','published').limit(60).get());
 await no('unfiltered public query denied',root(guest).get());
 await no('unbounded public query denied',root(guest).where('status','==','published').get());
 await no('large public query denied',root(guest).where('status','==','published').limit(100).get());
 await yes('author owns book query',root(owner).where('ownerUid','==','author-a').limit(60).get());
 await no('foreign admin cannot see draft',root(foreign).doc(DRAFT).get());
 await no('reader cannot create book',root(reader).doc('epub-hacker').set(book('epub-hacker')));
 await no('foreign admin cannot create for author',root(foreign).doc('epub-hacker').set(book('epub-hacker')));
 await no('owner cannot create foreign book',root(owner).doc('epub-hacker').set(book('epub-hacker','importing','reader-a')));
 await no('owner cannot create giant title',root(owner).doc('epub-hacker').set({...book('epub-hacker'),title:'X'.repeat(150)}));
 await no('owner cannot update ownerUid',root(owner).doc(STORY).update({ownerUid:'author-b'}));
 await no('owner cannot mutate chapterIndex',root(owner).doc(STORY).update({chapterIndex:[]}));
 await no('owner cannot archive draft bypass',root(owner).doc(DRAFT).update({status:'archived'}));
 await no('owner cannot schema pollute published book',root(owner).doc(STORY).update({randomField:'bad'}));

 const fresh='epub-reviewed-new';
 await yes('author imports EPUB',root(owner).doc(fresh).set(book(fresh)));
 await yes('author creates importing chapter',chapterRef(owner,fresh).set(chapter()));
 await no('reader cannot insert imported chapter',chapterRef(reader,fresh).set(chapter()));
 await yes('author moves to draft',root(owner).doc(fresh).update({status:'draft',updatedAt:'2026-10-30T01:00:00Z'}));
 await no('author cannot create chapter in draft',root(owner).doc(fresh).collection('chapters').doc('chapter-0002').set({...chapter(),id:'chapter-0002'}));
 await yes('author publishes draft',root(owner).doc(fresh).update({status:'published',publishedAt:'2026-10-30T01:00:00Z',updatedAt:'2026-10-30T01:00:00Z'}));
 await yes('author edits metadata',root(owner).doc(fresh).update({publicationState:'Hoàn thành',updatedAt:'2026-10-30T01:00:00Z'}));
 await yes('author archives book',root(owner).doc(fresh).update({status:'archived',updatedAt:'2026-10-30T01:00:00Z'}));
 await no('guest cannot read archived chapter',chapterRef(guest,fresh).get());
 await yes('author restores book',root(owner).doc(fresh).update({status:'published',updatedAt:'2026-10-30T01:00:00Z'}));

 await no('single chapter edit without revision',chapterRef(owner).update({content:'Bản đã sửa',wordCount:3,editVersion:1,editedAt:'2026-10-30T01:00:00Z',lastRevisionId:'rev-000001'}));
 await no('forged standalone revision',chapterRef(owner).collection('revisions').doc('rev-000001').set(revision()));
 await no('atomic edit with forged old text',owner.runTransaction(async tx=>{
  const ch=chapterRef(owner),rev=ch.collection('revisions').doc('rev-000001');
  await tx.get(ch);
  tx.set(rev,revision('author-a','Sai nội dung sao lưu'));
  tx.update(ch,{content:'Bản đã sửa',wordCount:3,editVersion:1,
   editedAt:'2026-10-30T01:00:00Z',lastRevisionId:'rev-000001'});
 }));
 await no('foreign owner cannot update chapter',chapterRef(foreign).update({content:'Hack'}));
 await no('owner cannot add oversized chapter',chapterRef(owner).update({content:'X'.repeat(430000)}));

 await yes('atomic edit plus immutable backup',owner.runTransaction(async tx=>{
  const ch=chapterRef(owner),rev=ch.collection('revisions').doc('rev-000001');
  const snapshot=await tx.get(ch);assert.equal(snapshot.data().content,'Bản đầu');
  tx.set(rev,revision());
  tx.update(ch,{content:'Bản đã sửa',wordCount:3,editVersion:1,
   editedAt:'2026-10-30T01:00:00Z',lastRevisionId:'rev-000001'});
 }));
 await yes('owner views revision',chapterRef(owner).collection('revisions').doc('rev-000001').get());
 await yes('owner lists revision history',chapterRef(owner).collection('revisions').orderBy('version','desc').limit(20).get());
 await no('guest cannot view history',chapterRef(guest).collection('revisions').doc('rev-000001').get());
 await no('revision cannot be overwritten',chapterRef(owner).collection('revisions').doc('rev-000001').update({content:'Hacker'}));
 await no('revision cannot be deleted',chapterRef(owner).collection('revisions').doc('rev-000001').delete());

 await yes('user reads own verified wallet',reader.collection('economy_accounts_v52').doc('reader-a').get());
 await yes('user reads own item',reader.collection('economy_accounts_v52').doc('reader-a').collection('items').doc('item-a').get());
 await no('other user cannot read wallet',owner.collection('economy_accounts_v52').doc('reader-a').get());
 await no('user cannot mint wallet funds',reader.collection('economy_accounts_v52').doc('reader-a').update({balance:9999999}));
 await no('user cannot mint verified item',reader.collection('economy_accounts_v52').doc('reader-a').collection('items').doc('fake').set({id:'fake'}));
 await no('user cannot create arbitrary trade',reader.collection('trades_v52').doc('fake').set({ok:true}));

 const user=reader.collection('profiles_v2').doc('reader-a');
 await yes('owner creates legacy profile',user.set({username:'reader-a',name:'Reader',role:'reader',level:1,exp:0,currency:50,inventory:[],quests:[]}));
 await yes('owner updates legacy progress',user.update({currency:80}));
 await yes('C2.9 blind box and scratch state saves to own profile',user.update({
  storyStates:{
   __duduBlindBoxC29:{version:1,lastFreeDay:'2026-10-30',total:1,
    spent:0,duplicate:0,album:['fun-copper'],history:[],ids:[],active:null},
   __duduScratchC28:{version:1,total:1,spent:10,won:5,album:{dragon:1},
    prizes:[5],history:[],buyIds:[],active:null}
  }
 }));
 await yes('C2.9 reward inventory and currency share one owner transaction',reader.runTransaction(async tx=>{
  const snap=await tx.get(user);assert.equal(snap.data().currency,80);
  tx.update(user,{currency:70,inventory:[{id:'fun-copper',instanceId:'box-test-1'}]});
 }));
 await yes('C2.9 profile reset compatible with bounded schema',user.set({
  username:'reader-a',name:'Reader',title:'Thực Thể Ký Tự',role:'reader',level:1,
  exp:0,currency:50,inventory:[],quests:[],lootedChapters:{},readRewards:{},
  dailyReadLog:{day:'',chapters:[]},collectedCharacters:{},storyStates:{}
 }));
 await yes('restore pre-reset virtual wallet for replay probes',user.update({currency:80}));
 await no('different user cannot read private profile',owner.collection('profiles_v2').doc('reader-a').get());
 await no('different user cannot modify profile',owner.collection('profiles_v2').doc('reader-a').update({currency:10}));
 await no('reader cannot self-promote role',user.update({role:'admin'}));
 await no('reader cannot add bogus admin flag',user.update({isAdmin:true}));
 await no('reader cannot add arbitrary profile field',user.update({hacked:'yes'}));
 await no('reader cannot create bogus profile',reader.collection('profiles_v2').doc('reader-b').set({role:'admin'}));
 await no('reader cannot write negative currency',user.update({currency:-10}));
 await no('reader cannot insert 1MB title',user.update({title:'X'.repeat(900000)}));
 await no('reader cannot insert enormous storyStates map',user.update({
  storyStates:Object.fromEntries(Array.from({length:501},(_,i)=>['k'+i,{}]))
 }));
 await no('legacy profile cannot be deleted',user.delete());

 const transferId='ex-12345678-1234-4123-8123-123456789012';
 const transferData={id:transferId,uid:'reader-a',gameXu:50,walletXu:5,rate:10,
  gameBalanceTenthsBefore:800,createdAt:'2026-10-30T02:00:00Z'};
 const transferRef=user.collection('arcade_receipts_v1').doc(transferId);
 await no('cannot create receipt without matching wallet update',transferRef.set(transferData));
 await no('Arcade exchange receipt denied until trusted enablement',reader.runTransaction(async tx=>{
  const snap=await tx.get(user);assert.equal(snap.data().currency,80);
  tx.update(user,{currency:85,arcadeLastReceiptV1:transferId});
  tx.set(transferRef,transferData);
 }));
 assert.equal((await user.get()).data().currency,80);
 await no('owner cannot read disabled exchange receipt',transferRef.get());
 await no('other account cannot read exchange receipt',owner.collection('profiles_v2')
  .doc('reader-a').collection('arcade_receipts_v1').doc(transferId).get());
 await no('receipt is immutable',transferRef.update({walletXu:100}));
 await no('receipt cannot be deleted',transferRef.delete());
 console.log('DUDU STANDARD/SPARK EMULATOR PASS: '+checks+' checks');
}finally{await env.cleanup();}
