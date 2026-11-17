/* L6-P2B: Firestore Rules-backed R1.2 authorizer for a FUTURE R2 catalog.
 * Not imported by the deployed Worker, and catalog Rules do not exist yet.
 * Firebase ID token (not a service account OAuth token) is forwarded to
 * Firestore REST, so deployed Firestore Rules remain a mandatory gate.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
const FIREBASE_UID=/^[A-Za-z0-9_-]{1,128}$/;
const HEX=/^[0-9a-f]{64}$/;
const REV=/^r-[a-f0-9]{16,32}$/;
const MIME=new Set(['image/jpeg','image/png','image/webp','image/gif']);
function field(f,n){return f?.[n];}
function string(f,n){const v=field(f,n);return v&&typeof v.stringValue==='string'?v.stringValue:null;}
function number(f,n){const v=field(f,n);const nvalue=v?.integerValue;const out=typeof nvalue==='string'&&/^[0-9]+$/.test(nvalue)?Number(nvalue):NaN;return Number.isSafeInteger(out)?out:null;}
function array(f,n){const v=field(f,n);return v?.arrayValue&&Array.isArray(v.arrayValue.values)?v.arrayValue.values:[];}
function map(v){return v&&typeof v==='object'&&!Array.isArray(v)&&v.mapValue?.fields&&typeof v.mapValue.fields==='object'?v.mapValue.fields:null;}
const bad=()=>{throw Error('Catalog dữ liệu R2 chưa hợp lệ.');};
export function parseCatalog(fields){
 if(!fields||typeof fields!=='object'||Array.isArray(fields))bad();
 const status=string(fields,'status'),ownerUid=string(fields,'ownerUid'),revision=string(fields,'revision');
 if(!['importing','draft','published','archived','deleting'].includes(status)||
  !ownerUid||ownerUid.length>128||!REV.test(revision||''))bad();
 const chapters=new Map(),assets=new Map();
 const ch=array(fields,'chapters');
 if(!ch.length||ch.length>160)bad();
 for(let i=0;i<ch.length;i++){
  const f=map(ch[i]);if(!f)bad();
  const id=string(f,'id'),bytes=number(f,'bytes'),sha256=string(f,'sha256'),order=number(f,'order');
  if(!ID.test(id||'')||chapters.has(id)||!Number.isInteger(bytes)||bytes<1||bytes>420000||
    !HEX.test(sha256||'')||order!==i)bad();
  chapters.set(id,Object.freeze({id,bytes,sha256}));
 }
 const as=array(fields,'assets');if(as.length>3000)bad();
 for(const value of as){
  const f=map(value);if(!f)bad();
  const id=string(f,'id'),bytes=number(f,'bytes'),sha256=string(f,'sha256'),mime=string(f,'mime');
  if(!ID.test(id||'')||assets.has(id)||!Number.isInteger(bytes)||bytes<1||bytes>10*1024*1024||
    !HEX.test(sha256||'')||!MIME.has(mime))bad();
  assets.set(id,Object.freeze({id,bytes,sha256,mime}));
 }
 const source=map(field(fields,'source'));
 const sourceBytes=number(source,'bytes'),sourceSha=string(source,'sha256');
 if(!Number.isInteger(sourceBytes)||sourceBytes<1||sourceBytes>30*1024*1024||!HEX.test(sourceSha||''))bad();
 return Object.freeze({status,ownerUid,revision,chapters,assets,
  source:Object.freeze({bytes:sourceBytes,sha256:sourceSha})});
}

async function getDoc(fetchFn,projectId,collection,id,token){
 if(!/^[a-z0-9-]{1,64}$/.test(projectId||'')||!(collection==='epub_catalog_r2_v1'?ID:FIREBASE_UID).test(id||''))return {status:400};
 const url='https://firestore.googleapis.com/v1/projects/'+projectId+
  '/databases/(default)/documents/'+collection+'/'+encodeURIComponent(id);
 try{
  const response=await fetchFn(url,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   cache:'no-store',redirect:'error'});
  if(response.status!==200)return {status:response.status};
  const data=await response.json();
  return {status:200,fields:data?.fields};
 }catch{return {status:503};}
}

/* Explicit enabled:false in approved_accounts blocks grandfathering. A missing
 * approval document MAY grandfather an existing self-owned profile. Other
 * Firestore failures always DENY; never turn network errors into approval.
 */
export async function checkApprovedReader({identity,token,projectId,fetchFn}){
 if(!identity?.uid||typeof token!=='string'||token.length<100||typeof fetchFn!=='function')return false;
 if(identity.admin===true)return true;
 const allow=await getDoc(fetchFn,projectId,'approved_accounts_v1',identity.uid,token);
 if(allow.status===200)return allow.fields?.enabled?.booleanValue===true;
 if(allow.status!==404)return false;
 const profile=await getDoc(fetchFn,projectId,'profiles_v2',identity.uid,token);
 return profile.status===200&&!!profile.fields;
}

export async function loadAuthorizedCatalog({request,env,identity,bookId,mode,fetchFn=fetch}){
 const auth=request?.headers?.get('Authorization')||'';
 const match=/^Bearer ([A-Za-z0-9_.-]{100,12000})$/.exec(auth);
 if(!match||!ID.test(bookId||'')||!identity?.uid||!['read','stage'].includes(mode))return null;
 // A reader must be approved under the owner-confirmed R1.2 policy.
 // Admin may inspect or stage the OWN books without a separate allowlist.
 if(mode==='read'&&!await checkApprovedReader({identity,token:match[1],projectId:env?.PROJECT_ID,fetchFn}))return null;
 if(mode==='stage'&&identity.admin!==true)return null;
 const doc=await getDoc(fetchFn,env?.PROJECT_ID,'epub_catalog_r2_v1',bookId,match[1]);
 if(doc.status!==200)return null; // New catalog Rules currently not deployed.
 let catalog;try{catalog=parseCatalog(doc.fields);}catch{return null;}
 if(catalog.status==='deleting')return null;
 if(mode==='stage'){
  if(identity.admin!==true||identity.uid!==catalog.ownerUid||
   !['importing','draft'].includes(catalog.status))return null;
 } else if(catalog.status!=='published'&&
           !(identity.admin===true&&identity.uid===catalog.ownerUid&&
             ['draft','importing','archived'].includes(catalog.status)))return null;
 return catalog;
}
