/* L6-P2C4: server-side ID allocation and create-only draft descriptor.
 * PURE: no Firebase/Admin SDK call, Worker route, network, R2 or publish.
 * Caller MUST supply verified admin JWT identity and keep issued IDs in
 * server-owned state. Client-provided issued IDs grant no rights.
 */
import {prepareR2CatalogDraft} from './library-r2-catalog-draft-v1.mjs';
const UID=/^[A-Za-z0-9_-]{1,128}$/;
const BOOK=/^epub-[a-f0-9]{32}$/;
const REV=/^r-[a-f0-9]{32}$/;
const fail=why=>{throw Error('L6-P2C4 trusted draft: '+why);};
function requireAdmin(identity){
 if(!identity||identity.admin!==true||typeof identity.uid!=='string'||!UID.test(identity.uid))
  fail('verified admin identity required');
}
export function issueDraftIds({identity,cryptoApi=globalThis.crypto}={}){
 requireAdmin(identity);
 if(typeof cryptoApi?.randomUUID!=='function')fail('secure ID allocator missing');
 const allocate=()=>{
  const raw=cryptoApi.randomUUID();
  if(typeof raw!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(raw))
   fail('secure UUID invalid');
  return raw.replaceAll('-','');
 };
 return Object.freeze({bookId:'epub-'+allocate(),revisionId:'r-'+allocate(),ownerUid:identity.uid});
}
export function prepareCreateOnlyDraft({identity,issued,manifest,layouts,metadata}={}){
 requireAdmin(identity);
 if(!issued||typeof issued!=='object'||!BOOK.test(issued.bookId||'')||
  !REV.test(issued.revisionId||'')||issued.ownerUid!==identity.uid||
  manifest?.bookId!==issued.bookId||manifest?.revisionId!==issued.revisionId)
  fail('IDs must match previously server-issued draft identity');
 const prepared=prepareR2CatalogDraft({identity,manifest,layouts,metadata});
 if(prepared.fields?.status?.stringValue!=='importing'||
  prepared.fields?.ownerUid?.stringValue!==identity.uid||
  prepared.fields?.backend?.stringValue!=='r2')fail('unsafe draft state');
 return Object.freeze({collection:'epub_catalog_r2_v1',documentId:issued.bookId,
  fields:prepared.fields,precondition:Object.freeze({exists:false}),
  clientMayWrite:false,publishable:false,eligibleForDeletion:false,
  requiresServerIssuedSession:true,requiresIndependentVerification:true});
}
