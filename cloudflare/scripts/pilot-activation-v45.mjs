/* V45 Pilot deploy preparation. NEVER commits UIDs or enables live gift APIs.
 * Output is an ephemeral Wrangler config plus a chmod 0600 secret-bulk file.
 * Run only under a manually authorized staging-only workflow.
 */
import {readFile,writeFile,chmod} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pilotConfig} from '../src/pilot-policy-v45.mjs';
const mode=process.argv[2];
if(!['enable','disable'].includes(mode))
 throw Error('Expected enable or disable.');
if(process.env.GITHUB_ACTIONS==='true'&&
 process.env.GITHUB_REF!=='refs/heads/main')
 throw Error('Deploys must originate from main.');
const base=await readFile(resolve('wrangler.toml'),'utf8');
const must=/^name = "dudu-ai-staging"$/m;
if(!must.test(base))throw Error('Refusing to deploy an unrecognized Worker.');
for(const [key,value] of [
 ['PILOT_ENABLED','false'],['COMMENTS_ENABLED','false'],
 ['GIFTS_ENABLED','false'],['GIFT_SETTLEMENT_ENABLED','false'],
 ['PILOT_SETTLEMENT_ENABLED','false'],['AI_ENABLED','false']
]){
 const line=new RegExp('^'+key+' = "'+value+'"$', 'gm');
 if([...base.matchAll(line)].length!==1)
  throw Error('Missing fail-closed flag in base config: '+key);
}
let next=base;
if(mode==='enable'){
 if(process.env.PILOT_ACTIVATION_CONFIRM!=='ENABLE_V45_SHARED_COMMENTS')
  throw Error('Manual activation confirmation does not match.');
 const secrets={
  PILOT_READER_A_UID:process.env.PILOT_READER_A_UID,
  PILOT_READER_B_UID:process.env.PILOT_READER_B_UID,
  PILOT_AUTHOR_UID:process.env.PILOT_AUTHOR_UID,
  PILOT_NAMESPACE:process.env.PILOT_NAMESPACE
 };
 const check=pilotConfig({
  PILOT_ENABLED:'true',
  ...secrets
 });
 if(!check.ok)throw Error('Pilot UID/namespace validation failed: '+check.code);
 next=next.replace(/^PILOT_ENABLED = "false"$/m,'PILOT_ENABLED = "true"')
  .replace(/^COMMENTS_ENABLED = "false"$/m,'COMMENTS_ENABLED = "true"');
 const file=resolve('.pilot-v45-secrets.json');
 await writeFile(file,JSON.stringify(secrets),{encoding:'utf8',mode:0o600,flag:'w'});
 await chmod(file,0o600);
 console.log('Pilot preflight complete: 3 unique signed UID targets and isolated namespace.');
}else{
 if(process.env.PILOT_ACTIVATION_CONFIRM!=='DISABLE_V45_SHARED_COMMENTS')
  throw Error('Manual rollback confirmation does not match.');
 console.log('Pilot rollback prepared: base staging defaults to all gates OFF.');
}
const config=resolve('.pilot-v45-activation.toml');
await writeFile(config,next,{encoding:'utf8',mode:0o600,flag:'w'});
await chmod(config,0o600);
console.log('Staging config generated. Gifts, settlements, AI and collectibles remain OFF.');
