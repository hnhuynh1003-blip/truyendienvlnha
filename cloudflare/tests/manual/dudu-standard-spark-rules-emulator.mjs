// Run ONLY against demo emulator (never production):
// npx -y firebase-tools@13.35.1 emulators:exec --only firestore \
//   --project demo-dudu-standard --config firebase.rules-review.json \
//   'node cloudflare/tests/manual/dudu-standard-spark-rules-emulator.mjs'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const epubApi=require('../../../js/epub-production-v49.js');
const honorApi=require('../../../js/personal-honor-c46.js');
const shopApi=require('../../../js/personal-spark-items-v1.js');
const blindApi=require('../../../js/personal-blind-box-c29.js');

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
 // importDraft() must check that the random new ID is unused before set().
 // C3.0 accidentally denied this exact read even to custom-claim admins.
 await yes('owner admin can probe a nonexistent EPUB ID before import',
  root(owner).doc('epub-new-upload-preflight').get());
 await no('unauthenticated guest cannot probe nonexistent EPUB IDs',
  root(guest).doc('epub-new-upload-preflight').get());
 await no('non-admin reader cannot probe nonexistent EPUB IDs',
  root(reader).doc('epub-new-upload-preflight').get());
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
 const realAuth={currentUser:{uid:'author-a',getIdTokenResult:async()=>({claims:{admin:true}})}};
 const liveImport={title:'[Edit] Nghiệt Duyên - Tăng Minh',author:'xxMeenx2',
  genre:'FanFiction, Completed',publicationState:'Hoàn thành',desc:'Văn án thử',
  coverImage:'data:image/jpeg;base64,/9j/2Q==',sourceName:'nghiet-duyen.epub',
  chapters:[{title:'Chương một',content:'Nội dung chương một được nhập bằng công cụ EPUB thật.'},
   {title:'Chương hai',content:'Nội dung chương hai còn nguyên vẹn.'}]};
 await yes('actual web importDraft passes preflight and imports metadata plus chapters',
  epubApi.importDraft(liveImport,{db:owner,auth:realAuth,bookId:'epub-real-import-repro'}));
 await yes('actual web publishDraft publishes fully imported EPUB',
  epubApi.publishDraft('epub-real-import-repro',{db:owner,auth:realAuth,confirmRights:true}));
 await yes('actual web metadata editor commits published book change',
  epubApi.updatePublishedMetadata('epub-real-import-repro',{db:owner,auth:realAuth,
   metadata:{publicationState:'Đang ra',title:'Nghiệt Duyên - Bản hiệu đính'}}));
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

 // C4.22 prototype: only archived owner books can enter the irreversible
 // deletion state. All nested deletes require that state and the same admin UID.
 const TO_DELETE='epub-c422-delete';
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore(),ref=db.collection('epub_stories_v49').doc(TO_DELETE);
  await ref.set(book(TO_DELETE,'archived'));
  await ref.collection('chapters').doc(CH).set(chapter());
  await ref.collection('chapters').doc(CH).collection('revisions').doc('rev-000001').set(revision());
 });
 const goneRef=db=>root(db).doc(TO_DELETE);
 const goneChapter=db=>goneRef(db).collection('chapters').doc(CH);
 const goneRevision=db=>goneChapter(db).collection('revisions').doc('rev-000001');
 await no('C4.22 guest cannot read archived book',goneRef(guest).get());
 await no('C4.22 owner cannot delete archived parent before lock',goneRef(owner).delete());
 await no('C4.22 owner cannot delete archived chapter',goneChapter(owner).delete());
 await no('C4.22 owner cannot delete archived revision',goneRevision(owner).delete());
 await no('C4.22 reader cannot mark book deleting',goneRef(reader).update({status:'deleting'}));
 await no('C4.22 foreign admin cannot mark book deleting',goneRef(foreign).update({status:'deleting'}));
 await no('C4.22 owner cannot skip archive',root(owner).doc(STORY).update({status:'deleting'}));
 await no('C4.22 owner cannot change identity while locking',goneRef(owner).update({
  status:'deleting',title:'Bị thay đổi',updatedAt:'2026-10-30T02:00:00Z'}));
 await yes('C4.22 owner marks archived book deleting',goneRef(owner).update({
  status:'deleting',updatedAt:'2026-10-30T02:00:00Z'}));
 await no('C4.22 reader cannot view deleting book',goneRef(reader).get());
 await no('C4.22 owner cannot restore deleting book',goneRef(owner).update({status:'published'}));
 await no('C4.22 foreign admin cannot delete revision',goneRevision(foreign).delete());
 await no('C4.22 foreign admin cannot delete chapter',goneChapter(foreign).delete());
 await no('C4.22 foreign admin cannot delete parent',goneRef(foreign).delete());
 await yes('C4.22 owner deletes revision',goneRevision(owner).delete());
 await yes('C4.22 owner deletes chapter',goneChapter(owner).delete());
 await yes('C4.22 owner deletes parent last',goneRef(owner).delete());

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
 // C4.16: reproduce the real 403 from a *fresh reader* whose profile does
 // not yet contain questV437 or questsDayV43. Test the actual web engines,
 // not only simplified patches that omit their quest-event fields.
 const freshShop=env.authenticatedContext('reader-shop-new').firestore();
 const freshShopRef=freshShop.collection('profiles_v2').doc('reader-shop-new');
 await yes('C4.16 first-time reader creates own profile without quest fields',
  freshShopRef.set({username:'reader-shop-new',name:'Reader',currency:50,
   inventory:[],quests:[],storyStates:{}}));
 await yes('C4.16 first-time reader purchases a Shop item with quest progress',
  shopApi.run({db:freshShop,auth:{currentUser:{uid:'reader-shop-new'}},
   uid:'reader-shop-new',kind:'purchase',itemId:'common-biscuit',
   requestId:'shop-00000000-0000-4000-8000-000000000001',
   now:()=>new Date('2026-10-31T12:00:00.000Z')}));
 const shopProfile=(await freshShopRef.get()).data();
 assert.equal(shopProfile.currency,42);
 assert.equal(shopProfile.inventory.length,1);
 assert.equal(shopProfile.questsDayV43,'2026-10-31');
 assert.equal(typeof shopProfile.questV437,'object');
 await no('C4.16 still reject malformed quest progress',
  freshShopRef.update({questV437:'forged'}));
 await no('C4.16 still reject malformed quest day',
  freshShopRef.update({questsDayV43:{fake:true}}));

 const freshBox=env.authenticatedContext('reader-box-new').firestore();
 const freshBoxRef=freshBox.collection('profiles_v2').doc('reader-box-new');
 const boxAuth={currentUser:{uid:'reader-box-new'}};
 const boxId='00000000-0000-4000-8000-000000000002';
 const boxTime=()=>Date.parse('2026-10-31T12:00:00.000Z');
 await yes('C4.16 first-time blind-box reader creates own profile',
  freshBoxRef.set({username:'reader-box-new',name:'Reader',currency:50,
   inventory:[],quests:[],storyStates:{}}));
 await yes('C4.16 reader starts a free DUDU FUN blind box',
  blindApi.run({db:freshBox,auth:boxAuth,uid:'reader-box-new',
   kind:'start',id:boxId,mode:'free',roll:0,now:boxTime}));
 await yes('C4.16 reader claims its box with quest progress and inventory',
  blindApi.run({db:freshBox,auth:boxAuth,uid:'reader-box-new',
   kind:'claim',id:boxId,now:boxTime}));
 const boxProfile=(await freshBoxRef.get()).data();
 assert.equal(boxProfile.questsDayV43,'2026-10-31');
 assert.equal(boxProfile.inventory.length,1);
 const honorAuth={currentUser:{uid:'reader-a'}};
 await yes('C4.6.3 owner equips a locally unlocked cosmetic title',honorApi.run({
  db:reader,auth:honorAuth,uid:'reader-a',kind:'equip',titleId:'reader',
  localProfile:{readRewards:{chapter1:true}}
 }));
 await yes('C4.6.3 owner pins one earned medal',honorApi.run({
  db:reader,auth:honorAuth,uid:'reader-a',kind:'pin',achievementId:'read-one'
 }));
 await yes('C4.6.3 owner reconciles device-only cosmetic preferences',honorApi.run({
  db:reader,auth:honorAuth,uid:'reader-a',kind:'preferences',titleId:'entity',
  pinnedIds:[]
 }));
 const validHonor=(await user.get()).data().honorV1;
 assert.equal(validHonor.version,1);
 assert.equal(validHonor.equipped,'entity');
 assert.deepEqual(validHonor.pinned,[]);
 // C4.14 regression: C4.8 added 17 more achievements and 4 more titles.
 // An existing owner with such a cosmetic ledger must still be able to
 // commit ordinary inventory/Shop/FUN transactions to the same profile.
 const journeyEarned=['read-one',
  'neon-250','neon-revenue-500','neon-pro-setup','neon-crown',
  'mine-deep-ready','mine-burst-25','mine-scanner-3','mine-guardian',
  'garden-harvest-10','garden-harvest-30','garden-five-species',
  'garden-sanctuary','jade-cut-20','jade-album-12',
  'jade-exhibit-10','jade-ruins-access','jade-masterwork'];
 await yes('C4.14 owner stores all newly added C4.8 achievement IDs and title',
  user.update({honorV1:{version:1,earned:journeyEarned,
   equipped:'neon-emperor',pinned:['neon-crown','jade-cut-20']},
   title:'Vương Giả Phố Đêm'}));
 await yes('C4.14 Shop purchase remains allowed after journey title sync',
  reader.runTransaction(async tx=>{
   const snap=await tx.get(user);
   tx.update(user,{currency:snap.data().currency-5,
    inventory:[{id:'jade-test-tool',instanceId:'shop-test-after-honor'}],
    storyStates:{...snap.data().storyStates,
     __duduPersonalItemsV1:{version:1,receipts:{'shop-test-after-honor':{kind:'purchase'}}}}});
  }));
 await yes('C4.14 FUN claim still writes item and currency after journey title sync',
  reader.runTransaction(async tx=>{
   const snap=await tx.get(user);
   tx.update(user,{currency:snap.data().currency+3,
    inventory:[...snap.data().inventory,{id:'fun-copper',instanceId:'fun-test-after-honor'}],
    storyStates:{...snap.data().storyStates,
     __duduFunLiveC25:{version:1,day:'2026-10-31',rounds:{box:{status:'claimed'}}}}});
  }));
 await no('C4.6.3 honor cannot be written to a different user',
  owner.collection('profiles_v2').doc('reader-a').update({honorV1:validHonor}));
 await no('C4.6.3 honor rejects extra nested fields',
  user.update({honorV1:{...validHonor,administrator:true}}));
 await no('C4.6.3 honor rejects unknown title IDs',
  user.update({honorV1:{...validHonor,equipped:'admin'}}));
 await no('C4.6.3 honor rejects forged achievement IDs',
  user.update({honorV1:{...validHonor,earned:['forged-achievement']}}));
 await no('C4.6.3 honor rejects unearned pinned medals',
  user.update({honorV1:{...validHonor,pinned:['jade-longstone']}}));
 await no('C4.6.3 honor rejects oversized pinned lists',
  user.update({honorV1:{...validHonor,pinned:Array(4).fill('read-one')}}));
 await no('C4.6.3 honor rejects malformed record type',
  user.update({honorV1:'not-an-honor-map'}));
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
 const walletBeforeDeniedReceipt=(await user.get()).data().currency;
 await no('cannot create receipt without matching wallet update',transferRef.set(transferData));
 await no('Arcade exchange receipt denied until trusted enablement',reader.runTransaction(async tx=>{
  const snap=await tx.get(user);
  assert.equal(snap.data().currency,walletBeforeDeniedReceipt);
  tx.update(user,{currency:walletBeforeDeniedReceipt+5,arcadeLastReceiptV1:transferId});
  tx.set(transferRef,transferData);
 }));
 assert.equal((await user.get()).data().currency,walletBeforeDeniedReceipt);
 await no('owner cannot read disabled exchange receipt',transferRef.get());
 await no('other account cannot read exchange receipt',owner.collection('profiles_v2')
  .doc('reader-a').collection('arcade_receipts_v1').doc(transferId).get());
 await no('receipt is immutable',transferRef.update({walletXu:100}));
 await no('receipt cannot be deleted',transferRef.delete());
 console.log('DUDU STANDARD/SPARK EMULATOR PASS: '+checks+' checks');
}finally{await env.cleanup();}
