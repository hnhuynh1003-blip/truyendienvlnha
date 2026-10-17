/* V45: manual deploy safety is tested without Cloudflare credentials.
 * All secrets are fake and written only to a temporary OS directory.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,copyFile,mkdtemp,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const script=fileURLToPath(new URL('../scripts/pilot-activation-v45.mjs',import.meta.url));
const config=fileURLToPath(new URL('../wrangler.toml',import.meta.url));
const fake={
 PILOT_READER_A_UID:'reader_A_abc0123',
 PILOT_READER_B_UID:'reader_B_def4567',
 PILOT_AUTHOR_UID:'author_GHI8912',
 PILOT_NAMESPACE:'v45-test-activate',
 PILOT_ACTIVATION_CONFIRM:'ENABLE_V45_SHARED_COMMENTS'
};
async function run(mode,env){
 const dir=await mkdtemp(join(tmpdir(),'dudu-v45-deploy-test-'));
 await copyFile(config,join(dir,'wrangler.toml'));
 const out=spawnSync(process.execPath,[script,mode],{
  cwd:dir,encoding:'utf8',
  env:{...process.env,GITHUB_ACTIONS:'false',GITHUB_REF:'',...env}
 });
 return {dir,out};
}
test('V45 manual activation: distinct UIDs and manual confirmation required',async()=>{
 for(const wrong of [
  {...fake,PILOT_ACTIVATION_CONFIRM:'NO'},
  {...fake,PILOT_READER_A_UID:''},
  {...fake,PILOT_AUTHOR_UID:fake.PILOT_READER_B_UID},
  {...fake,PILOT_NAMESPACE:'production'},
  {...fake,PILOT_NAMESPACE:''}
 ]){
  const {out}=await run('enable',wrong);
  assert.notEqual(out.status,0);
  assert.doesNotMatch(out.stdout,/[rR]eader_A_abc0123|[aA]uthor_GHI8912/);
 }
});
test('V45 manual activation: only comments and pilot gates ON, all others OFF',async()=>{
 const {dir,out}=await run('enable',fake);
 assert.equal(out.status,0,out.stderr);
 const deployed=await readFile(join(dir,'.pilot-v45-activation.toml'),'utf8');
 const secret=JSON.parse(await readFile(join(dir,'.pilot-v45-secrets.json'),'utf8'));
 for(const on of ['PILOT_ENABLED','COMMENTS_ENABLED'])
  assert.match(deployed,new RegExp('^'+on+' = "true"$','m'));
 for(const off of ['GIFTS_ENABLED','GIFT_SETTLEMENT_ENABLED','PILOT_SETTLEMENT_ENABLED',
  'AI_ENABLED','COLLECTIBLES_ENABLED','AVATAR_AWARDS_ENABLED'])
  assert.match(deployed,new RegExp('^'+off+' = "false"$','m'));
 assert.match(deployed,/^name = "dudu-ai-staging"$/m);
 assert.deepEqual(secret,{
  PILOT_READER_A_UID:fake.PILOT_READER_A_UID,
  PILOT_READER_B_UID:fake.PILOT_READER_B_UID,
  PILOT_AUTHOR_UID:fake.PILOT_AUTHOR_UID,
  PILOT_NAMESPACE:fake.PILOT_NAMESPACE
 });
 assert.equal((await stat(join(dir,'.pilot-v45-secrets.json'))).mode&0o077,0);
 assert.equal((await stat(join(dir,'.pilot-v45-activation.toml'))).mode&0o077,0);
 assert.doesNotMatch(deployed,/reader_A_abc0123|reader_B_def4567|author_GHI8912/);
 assert.doesNotMatch(out.stdout,/reader_A_abc0123|reader_B_def4567|author_GHI8912/);
});
test('V45 emergency rollback keeps all Pilot gates OFF without UID secrets',async()=>{
 const {dir,out}=await run('disable',{
  PILOT_ACTIVATION_CONFIRM:'DISABLE_V45_SHARED_COMMENTS'
 });
 assert.equal(out.status,0,out.stderr);
 const base=await readFile(join(dir,'wrangler.toml'),'utf8');
 const deployed=await readFile(join(dir,'.pilot-v45-activation.toml'),'utf8');
 assert.equal(deployed,base);
 assert.equal(fs.existsSync(join(dir,'.pilot-v45-secrets.json')),false);
});
test('V45 never deploys Worker from automatic push or exposes UID in GitHub YAML',()=>{
 const repoRoot=fileURLToPath(new URL('../../',import.meta.url));
 const workflow=fs.readFileSync(join(repoRoot,'.github/workflows/dudu-pilot-staging-v45.yml'),'utf8');
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/^\s+push:/m);
 assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/environment: dudu-pilot-staging/);
 assert.match(workflow,/secrets\.PILOT_READER_A_UID/);
 assert.match(workflow,/secrets\.PILOT_READER_B_UID/);
 assert.match(workflow,/secrets\.PILOT_AUTHOR_UID/);
 assert.match(workflow,/secrets\.PILOT_NAMESPACE/);
 assert.match(workflow,/wrangler secret bulk/);
 assert.match(workflow,/wrangler deploy --config \.pilot-v45-activation\.toml/);
 assert.match(workflow,/if: inputs\.operation == 'enable'/);
 assert.match(workflow,/test "\$status" = 401/);
});
