#!/usr/bin/env node
// One original author manuscript -> normalized chapters -> world-content-1
// -> G4A/G4B pin -> browser-only author/play preview. Never deploy Worker.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {hashAuthoringJson} from '../../cloudflare/src/vangioi-authoring.mjs';
import {tangMayWorld,tangMayManifest,tangMayScript,SCI_FI_STORYBOARD}
 from '../../cloudflare/tests/fixtures/vangioi-tang-may-9-author-world.mjs';

const require=createRequire(import.meta.url);
const {build}=require('../../cloudflare/node_modules/esbuild');
const assetRoot=new URL('../../playtests/tang-may-9/assets/',import.meta.url);
const source=new URL('../../contracts/vangioi/samples/tang-may-9/BAN_GHI_SO_0_TAC_PHAM_GOC.md',import.meta.url);
const dir=fileURLToPath(new URL('../../playtests/tang-may-9/',import.meta.url));
const parseChapters=markdown=>{
 const blocks=markdown.split(/\n(?=## CHƯƠNG \d{2} — )/u).slice(1);
 if(blocks.length!==3)throw Error('Expected exactly three source chapters');
 return blocks.map((block,i)=>{
  const body=i===blocks.length-1?block.split(/\n---\n/)[0]:block;
  const [heading,...lines]=body.trim().split('\n');
  const match=heading.match(/^## CHƯƠNG (\d{2}) — (.+)$/u);
  if(!match||Number(match[1])!==i+1||lines.join('\n').trim().length<1500)
   throw Error('Invalid author chapter '+(i+1));
  return {chapterId:'chapter-'+(i+1),title:'Chương '+(i+1)+' — '+match[2],text:lines.join('\n').trim()};
 });
};
const chapters=parseChapters(await readFile(source,'utf8'));
const files={city:'thanh-pho.webp',archive:'kho-ky-uc.webp',relay:'tram-relay.webp',
 lam:'vai-0.webp',khai:'vai-1.webp',nhi:'vai-2.webp',k07:'vai-3.webp',tuyen:'ong-tuyen.webp'};
const hashes={};
for(const [key,name] of Object.entries(files)){
 const bytes=await readFile(new URL(name,assetRoot));
 if(bytes.toString('ascii',8,12)!=='WEBP')throw Error('Invalid scene/portrait image '+name);
 hashes[key]=createHash('sha256').update(bytes).digest('hex');
}
const world=tangMayWorld(await hashAuthoringJson(chapters),hashes);
// Strictly public demo: text describes fictional Canon, but do not ship the
// private author-notes field as part of the web-play runtime snapshot.
world.story.secretTruth='Tác giả giữ ghi chú nội bộ trong nguồn gốc; không trao quyền Canon cho người chơi.';
const manifest=await tangMayManifest(world),script=await tangMayScript(world);
const authoring={version:'g5c-p5-author-sandbox-1',chapters,storyboard:SCI_FI_STORYBOARD,
 sourceKind:'original',sourceTitle:'Tầng Mây 9 — Bản Ghi Số 0',
 editorNote:'Chương nguồn và lời cảnh là hai lớp tác giả khác nhau. Các điều chỉnh chỉ nằm trong RAM browser và buộc pin lại world/engine.'};
await mkdir(dir,{recursive:true});
await writeFile(new URL('../../playtests/tang-may-9/author-content.json',import.meta.url),
 JSON.stringify({authoring,world,manifest,script})+'\n','utf8');
await build({
 entryPoints:[fileURLToPath(new URL('tang-may-author-playtest-entry.mjs',import.meta.url))],
 outfile:fileURLToPath(new URL('../../playtests/tang-may-9/app.js',import.meta.url)),
 bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none',logLevel:'warning',
 plugins:[{name:'deny-auth-in-public-author-demo',setup(compilation){
  compilation.onResolve({filter:/^\.\/auth\.mjs$/},args=>{
   if(!args.importer.endsWith('/vangioi-authoring.mjs'))throw Error('Unexpected auth module');
   return {path:'forbidden-auth',namespace:'public-author-demo'};
  });
  compilation.onLoad({filter:/.*/,namespace:'public-author-demo'},()=>({
   contents:'export function verifyFirebaseIdToken(){throw Error("Auth forbidden in public author demo");}',
   loader:'js'}));
 }}]
});
process.stdout.write('G5C-P6 three-chapter author draft, character briefings and role POV visual bundle built; no server publishing.\n');
