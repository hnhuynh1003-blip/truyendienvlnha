// G2X: read-only source inventory and checksum tripwire. NOT a live IAM
// policy, full JavaScript taint analyzer, or protection from raw Admin SDK.
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,join} from 'node:path';

export const ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const inventoryFile='contracts/vangioi/v49-writer-inventory-g2x.json';
const targets=/\bepub_stories_v49\b/;
// Deliberately omit `.add` here: Set.add in the read-only G1T reader is not
// Firestore CollectionReference.add. Manifest checks cover known mutations;
// this lexical scan remains an incomplete, review-required tripwire.
const writes=/\.\s*(?:set|update|create|delete)\s*\(/;
const adminSdk=/\b(?:firebase-admin(?:\/(?:app|firestore))?|@google-cloud\/firestore)\b/;
const sha256=s=>createHash('sha256').update(s).digest('hex');
const sort=x=>[...x].sort((a,b)=>a.localeCompare(b,'en'));
const validPath=path=>typeof path==='string'&&
 /^[A-Za-z0-9_./-]+$/.test(path)&&!path.includes('..')&&
 !path.startsWith('/')&&!path.startsWith('./');
const unique=list=>new Set(list).size===list.length;

// Only source trees: never read credentials, .env files, node_modules, test
// fixtures, generated bundles, or any real Firebase data.
function walk(root,dir,files){
 for(const entry of readdirSync(resolve(root,dir),{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())walk(root,path,files);
  else if(entry.isFile()&&/\.(?:mjs|cjs|js)$/.test(entry.name))
   files[path.split('\\').join('/')]=readFileSync(resolve(root,path),'utf8');
 }
}
export function loadG2XSource(root=ROOT,manifest){
 const sources={};
 for(const folder of manifest.sourceRoots)walk(root,folder,sources);
 return sources;
}
export function inspectG2XInventory(manifest,sources){
 if(!manifest||manifest.schemaVersion!==1||
  manifest.targetCollection!=='epub_stories_v49'||
  !Array.isArray(manifest.writerFiles)||!Array.isArray(manifest.watchFiles)||
  !Array.isArray(manifest.adminSdkSourceAllowlist)||
  !Array.isArray(manifest.sourceRoots))
  throw TypeError('g2x-inventory-invalid-manifest');
 const pinned=[...manifest.writerFiles,...manifest.watchFiles];
 const listed=pinned.map(x=>x.path);
 if(!unique(listed)||!listed.every(validPath)||
  !manifest.adminSdkSourceAllowlist.every(validPath)||
  !unique(manifest.adminSdkSourceAllowlist)||
  !manifest.sourceRoots.every(validPath))
  throw TypeError('g2x-inventory-invalid-path');
 const entries=Object.entries(sources);
 const seenWriters=sort(entries.filter(([,s])=>targets.test(s)&&writes.test(s))
  .map(([p])=>p));
 const expectedWriters=sort(manifest.writerFiles.map(x=>x.path));
 const seenAdmin=sort(entries.filter(([,s])=>adminSdk.test(s)).map(([p])=>p));
 const expectedAdmin=sort(manifest.adminSdkSourceAllowlist);
 const problems=[];
 for(const path of seenWriters.filter(x=>!expectedWriters.includes(x)))
  problems.push('unknown-v49-writer:'+path);
 for(const path of expectedWriters.filter(x=>!seenWriters.includes(x)))
  problems.push('missing-or-reclassified-v49-writer:'+path);
 for(const path of seenAdmin.filter(x=>!expectedAdmin.includes(x)))
  problems.push('unknown-admin-sdk:'+path);
 for(const path of expectedAdmin.filter(x=>!seenAdmin.includes(x)))
  problems.push('missing-admin-sdk:'+path);
 for(const {path,sha256:expected} of pinned){
  if(typeof sources[path]!=='string')problems.push('missing-pinned-file:'+path);
  else if(!/^[a-f0-9]{64}$/.test(expected)||sha256(sources[path])!==expected)
   problems.push('pinned-source-drift:'+path);
 }
 return Object.freeze({ok:problems.length===0,
  writerCount:seenWriters.length,adminSdkCount:seenAdmin.length,
  pinnedCount:pinned.length,problems:sort(problems),
  productionEnforced:false,iamChanged:false});
}
export function runG2XAudit(root=ROOT){
 const manifest=JSON.parse(readFileSync(resolve(root,inventoryFile),'utf8'));
 const actual=loadG2XSource(root,manifest);
 return inspectG2XInventory(manifest,actual);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=runG2XAudit();
 process.stdout.write(JSON.stringify(result)+'\n');
 if(!result.ok)process.exitCode=1;
}
