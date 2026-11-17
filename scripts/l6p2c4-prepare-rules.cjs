/* DUDU L6-P2C4 — generate isolated review-only Rules from owner's live R1.2
 * export plus the R2 catalog review fragment. NEVER deploy or overwrite.
 * The user must verify the source is the actual currently Published Rules.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
function prepareRules(source,fragment){
 if(typeof source!=='string'||typeof fragment!=='string')throw Error('Missing Rules sources');
 const marker='match /databases/{database}/documents {';
 if(!source.includes("rules_version = '2';")||source.split(marker).length!==2||
  !/function\s+approvedReader\s*\(/.test(source)||
  !/function\s+approvedPlayer\s*\(/.test(source)||
  !/function\s+admin\s*\(/.test(source)||
  !/enabled\s*==\s*true/.test(source)||
  !/exists\(existingProfilePath\(uid\)\)/.test(source)||
  !/match \/epub_stories_v49\/\{storyId\}/.test(source))
  throw Error('Owner R1.2 input missing expected policy; refuse auto-merge');
 if(source.includes('match /epub_catalog_r2_v1/{bookId}'))throw Error('Catalog already exists in owner rules');
 if(!fragment.includes('REVIEW FRAGMENT ONLY')||
  !fragment.includes('allow list: if false;')||
  !fragment.includes('allow create, update, delete: if false;')||
  !fragment.includes('approvedReader()')||!fragment.includes('admin()'))
  throw Error('Review fragment did not retain denial rules');
 const index=fragment.indexOf('match /epub_catalog_r2_v1/{bookId}');
 if(index<0)throw Error('Catalog match missing');
 const block=fragment.slice(index);
 return source.replace(marker,marker+
  '\n\n    // L6-P2C4 local emulator merge; DO NOT deploy automatically.\n    '+block+'\n');
}
if(require.main===module){
 const [ownerPath,fragmentPath,outPath]=process.argv.slice(2);
 if(!ownerPath||!fragmentPath||!outPath)
  throw Error('Usage: node script owner-R1.2.rules catalog.rules.review isolated-out.rules');
 const owner=path.resolve(ownerPath),frag=path.resolve(fragmentPath),out=path.resolve(outPath);
 if(owner===out||frag===out||path.basename(out)==='firestore.rules'||fs.existsSync(out))
  throw Error('Refuse overwriting existing or production Rules path');
 const rules=prepareRules(fs.readFileSync(owner,'utf8'),fs.readFileSync(frag,'utf8'));
 fs.writeFileSync(out,rules,{flag:'wx',mode:0o600});
 process.stdout.write('Generated local-only review Rules: '+out+'\n');
}
module.exports={prepareRules};
