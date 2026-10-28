#!/usr/bin/env node
// G5C-P7: PUBLIC, read-only Library reference -> NEW original adaptation notes
// -> G3C/G4A/G4B OFFLINE author/play test. No source/permit verification,
// no full novel chapter text, no Worker/Firestore writes or rewards.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {hashAuthoringJson} from '../../cloudflare/src/vangioi-authoring.mjs';
import {ERRO_SOURCE,ERRO_CHAPTER_NOTES,ERRO_STORYBOARD,erroModernWorld,erroModernManifest,erroModernScript}
 from '../../cloudflare/tests/fixtures/vangioi-erro-modern-world.mjs';

const require=createRequire(import.meta.url);
const {build}=require('../../cloudflare/node_modules/esbuild');
const asset=new URL('../../playtests/he-thong-erro/assets/thi-tran-mo.webp',import.meta.url);
const bytes=await readFile(asset);
if(bytes.toString('ascii',8,12)!=='WEBP')throw Error('Missing WebP world art');
const notes=structuredClone(ERRO_CHAPTER_NOTES);
const world=erroModernWorld(await hashAuthoringJson(notes),createHash('sha256').update(bytes).digest('hex'));
const manifest=await erroModernManifest(world),script=await erroModernScript(world);
const authoring={version:'g5c-p7-erro-author-sandbox-1',chapters:notes,storyboard:ERRO_STORYBOARD,
 sourceKind:'original-adaptation-notes-only',sourceTitle:ERRO_SOURCE.title,sourceReference:ERRO_SOURCE,
 editorNote:'Chỉ ghi chú chuyển thể. Không có permit nguồn Thư viện hay quyền phát hành; sửa RAM để kiểm thử.'};
await writeFile(new URL('../../playtests/he-thong-erro/author-content.json',import.meta.url),
 JSON.stringify({authoring,world,manifest,script})+'\n','utf8');
await build({
 entryPoints:[fileURLToPath(new URL('erro-modern-author-playtest-entry.mjs',import.meta.url))],
 outfile:fileURLToPath(new URL('../../playtests/he-thong-erro/app.js',import.meta.url)),
 bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none',logLevel:'warning',
 plugins:[{name:'deny-auth-in-public-erro-demo',setup(compilation){
  compilation.onResolve({filter:/^\.\/auth\.mjs$/},args=>{
   if(!args.importer.endsWith('/vangioi-authoring.mjs'))throw Error('Unexpected auth dependency');
   return {path:'forbidden-auth',namespace:'public-erro-demo'};
  });
  compilation.onLoad({filter:/.*/,namespace:'public-erro-demo'},()=>({
   contents:'export function verifyFirebaseIdToken(){throw Error("Auth forbidden in public author demo");}',loader:'js'}));
 }}]
});
process.stdout.write('G5C-P7 ERRO modern arc author notes and G4A/G4B browser rehearsal built; no Library permit or production.\n');
