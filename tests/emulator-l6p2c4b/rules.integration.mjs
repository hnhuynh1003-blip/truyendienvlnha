/* L6-P2C4B: REAL Firebase Firestore Emulator integration suite.
 * Requires L6_RULES_FILE to point at the generated merged local R1.2 Rules.
 * NO credentials, NO production project, NO live Firestore writes.
 */
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {getDoc,setDoc,updateDoc,deleteDoc,getDocs,doc,collection} from 'firebase/firestore';

const projectId='demo-dudu-library-rules';
const rawPath=process.env.L6_RULES_FILE;
if(!rawPath || !existsSync(resolve(rawPath)) || basename(resolve(rawPath))==='firestore.rules')
 throw Error('Set L6_RULES_FILE to an existing, separate, owner-R1.2-plus-catalog REVIEW Rules file (not firestore.rules).');
const source=readFileSync(resolve(rawPath),'utf8');
if(!source.includes('match /epub_catalog_r2_v1/{bookId}') ||
   !source.includes('match /epub_stories_v49/{storyId}') ||
   !source.includes('allow create, update, delete: if false;') ||
   !/function\s+approvedReader\s*\(/.test(source) ||
   !/function\s+approvedPlayer\s*\(/.test(source))
 throw Error('Refusing to test an incomplete or permissive Rules file.');
const testEnv=await initializeTestEnvironment({
 projectId,firestore:{host:'127.0.0.1',port:8189,rules:source}
});
let checks=0;
const get=(ctx,id)=>getDoc(doc(ctx.firestore(),'epub_catalog_r2_v1',id));
async function check(label,fn){
 try{await fn();checks++;console.log('PASS',label);}
 catch(error){console.error('FAILED',label);throw error;}
}
try{
 await testEnv.clearFirestore();
 await testEnv.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await setDoc(doc(db,'epub_catalog_r2_v1','epub-published'),{
   status:'published',ownerUid:'author',revision:'r-0123456789abcdef'
  });
  await setDoc(doc(db,'epub_catalog_r2_v1','epub-draft'),{
   status:'draft',ownerUid:'author',revision:'r-0123456789abcdef'
  });
  await setDoc(doc(db,'approved_accounts_v1','reader'),{enabled:true});
  await setDoc(doc(db,'approved_accounts_v1','revoked'),{enabled:false});
  await setDoc(doc(db,'profiles_v2','revoked'),{level:1});
  await setDoc(doc(db,'profiles_v2','legacy'),{level:1});
  await setDoc(doc(db,'studio_data','main_library'),{novels:[]});
 });
 const anonymous=testEnv.unauthenticatedContext();
 const reader=testEnv.authenticatedContext('reader');
 const newbie=testEnv.authenticatedContext('new-user');
 const legacy=testEnv.authenticatedContext('legacy');
 const revoked=testEnv.authenticatedContext('revoked');
 const owner=testEnv.authenticatedContext('author',{admin:true});
 const otherAdmin=testEnv.authenticatedContext('other-admin',{admin:true});
 await check('Web main_library remains publicly readable',()=>assertSucceeds(
  getDoc(doc(anonymous.firestore(),'studio_data','main_library'))));
 await check('Anonymous user cannot get published EPUB R2 catalog',()=>assertFails(get(anonymous,'epub-published')));
 await check('Signed-in but unapproved user cannot get EPUB R2 catalog',()=>assertFails(get(newbie,'epub-published')));
 await check('Explicit approved_accounts_v1 enabled:true can get published catalog',()=>assertSucceeds(get(reader,'epub-published')));
 await check('Legacy profiles_v2 account is grandfathered when allow record absent',()=>assertSucceeds(get(legacy,'epub-published')));
 await check('Explicit enabled:false overrides legacy profile',()=>assertFails(get(revoked,'epub-published')));
 await check('Approved reader cannot get draft EPUB R2 catalog',()=>assertFails(get(reader,'epub-draft')));
 await check('Admin owner can get own draft EPUB R2 catalog',()=>assertSucceeds(get(owner,'epub-draft')));
 await check('Different admin cannot get another owner draft',()=>assertFails(get(otherAdmin,'epub-draft')));
 await check('Catalog list is denied for approved reader',()=>assertFails(
  getDocs(collection(reader.firestore(),'epub_catalog_r2_v1'))));
 await check('Catalog create is denied for author client',()=>assertFails(
  setDoc(doc(owner.firestore(),'epub_catalog_r2_v1','epub-forged'),{status:'published',ownerUid:'author'})));
 await check('Catalog update is denied for author client',()=>assertFails(
  updateDoc(doc(owner.firestore(),'epub_catalog_r2_v1','epub-published'),{status:'draft'})));
 await check('Catalog delete is denied for author client',()=>assertFails(
  deleteDoc(doc(owner.firestore(),'epub_catalog_r2_v1','epub-published'))));
 console.log('L6-P2C4B: '+checks+'/13 emulator policy checks PASS (local only).');
}finally{
 await testEnv.cleanup();
}
