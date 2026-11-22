// No cloud calls. Input is the independently downloaded current production bundle.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const input=process.env.DUDU_PRODUCTION_BUNDLE;if(!input)throw Error('LOCAL_VERIFIED_PRODUCTION_BUNDLE_REQUIRED');
let source=fs.readFileSync(input,'utf8');
if(crypto.createHash('sha256').update(source).digest('hex')!=='dba461ad9ed8b628c9153ab6f5562f605e6b4167d25c2f1424673657427a5884')throw Error('PRODUCTION_BASELINE_DRIFT');
if(!source.includes('var OWNER =')||!source.includes('function createCatalogServiceFetch('))throw Error('EXPORT_CONTEXT_DRIFT');
const before='|| u.search || u.hash) fail();';
if(source.split(before).length!==2)throw Error('PROJECTION_CONTEXT_DRIFT');
source=source.replace(before,'|| (u.search && !((options.method || "GET") === "GET" && u.search === "?mask.fieldPaths=status&mask.fieldPaths=revision&mask.fieldPaths=ownerUid&mask.fieldPaths=backend")) || u.hash) fail();');
const out=path.join(__dirname,'.private');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'private-production-legacy.mjs'),source+'\nexport {verifyFirebaseIdToken,createAutomaticServiceOAuth,createCatalogServiceFetch,OWNER};\n');
for(const [from,to] of [['orphan-guard.mjs','orphan-guard.mjs'],['entry.template.mjs','entry.mjs']])fs.copyFileSync(path.join(__dirname,from),path.join(out,to));
console.log('PRIVATE_BUILD_PREPARED_NO_CLOUD_MUTATION');
