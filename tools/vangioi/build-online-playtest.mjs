#!/usr/bin/env node
// Generate a public, REDACTED synthetic fixture and a browser-only bundle.
// No source rights, publisher token, reward/save backend or hidden Canon.
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {lighthouseWorld,lighthouseEngineManifest,lighthousePlaytestScript}
 from '../../cloudflare/tests/fixtures/vangioi-author-playtest-world.mjs';

const require=createRequire(import.meta.url);
const {build}=require('../../cloudflare/node_modules/esbuild');
const dir=fileURLToPath(new URL('../../playtests/ben-suong/',import.meta.url));
const world=lighthouseWorld();
// Do not ship source fixture secretTruth, even if the prototype repository is
// public. Re-pin G4A/script to this *public* world, not the author-only copy.
world.story.secretTruth='Nội dung riêng tư không được phân phối trong bản thử online.';
const manifest=await lighthouseEngineManifest(world);
const script=await lighthousePlaytestScript(world);
await mkdir(dir,{recursive:true});
await writeFile(fileURLToPath(new URL('../../playtests/ben-suong/demo-content.json',import.meta.url)),
 JSON.stringify({world,manifest,script})+'\n','utf8');
await build({
 entryPoints:[fileURLToPath(new URL('online-roleplay-entry.mjs',import.meta.url))],
 outfile:fileURLToPath(new URL('../../playtests/ben-suong/app.js',import.meta.url)),
 bundle:true,format:'esm',platform:'browser',target:'es2022',
 minify:true,legalComments:'none',logLevel:'warning',
 // The JSON-clone helper shares a module with server-only authoring.
 // Never bundle Firebase token verifier/JWKS into this public test page.
 plugins:[{name:'deny-auth-in-public-demo',setup(compilation){
  compilation.onResolve({filter:/^\.\/auth\.mjs$/},args=>{
   if(!args.importer.endsWith('/vangioi-authoring.mjs'))
    throw new Error('Unexpected auth import in public demo');
   return {path:'forbidden-auth',namespace:'public-demo-only'};
  });
  compilation.onLoad({filter:/.*/,namespace:'public-demo-only'},()=>({
   contents:'export function verifyFirebaseIdToken(){throw Error("Auth forbidden in public demo");}',
   loader:'js'
  }));
 }}]
});
process.stdout.write('G5C-P3 public redacted static demo built; no Worker deployment.\n');
