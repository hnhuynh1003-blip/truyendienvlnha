import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectItemPolicyProposal} from '../src/vangioi-item-policy-offline.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {validateDraftContent} from '../src/vangioi-content.mjs';
import {content} from './fixtures/vangioi-content.mjs';
async function fixture(){
 const c=content();c.items=[{itemId:'item-bag'}];
 const p={schemaVersion:'item-policy-proposal-1',worldId:'world-test',contentHash:await hashAuthoringJson(c),items:[{
 itemId:'item-bag',definition:{definitionId:'medical-bag',version:'v1',contentHash:'a'.repeat(64)},origin:'custom',layer:'world',
 provenance:'Synthetic source chapter one',effects:'Inspect medical evidence',limits:'No healing bonus',quantity:1,
 permissions:{hold:true,use:false,trade:false,crossWorld:false},exceptions:[]}],
 acquisitionGroups:[{groupId:'bag-discovery',itemId:'item-bag',entityId:'single-bag',scope:'instance',quantity:1,routes:['kitchen-route','npc-route','store-route']}]};
 return {c,p,run:()=>inspectItemPolicyProposal(p,{worldId:'world-test',content:c})};
}
test('G1M many routes share one entity and review result never grants runtime authority',async()=>{
 const f=await fixture(),before=JSON.stringify(f.p),r=await f.run();assert.equal(r.validForOfflineReview,true);
 assert.equal(r.warnings[0].code,'custom-definition-review-required');assert.equal(JSON.stringify(f.p),before);
 for(const key of ['approved','canPublish','canGrant','canExport'])assert.equal(Object.hasOwn(r,key),false);
});
for(const [name,mutate,code]of [
 ['foreign world',p=>p.worldId='other-world','world-mismatch'],
 ['stale content pin',p=>p.contentHash='b'.repeat(64),'content-pin-mismatch'],
 ['duplicate entity',p=>p.acquisitionGroups.push({...p.acquisitionGroups[0],groupId:'other-group',routes:['other-route']}),'duplicate-entity-claim'],
 ['route assigned twice',p=>p.acquisitionGroups.push({...p.acquisitionGroups[0],groupId:'other-group',entityId:'other-bag'}),'ambiguous-route'],
 ['missing item',p=>p.acquisitionGroups[0].itemId='absent-item','missing-policy-item'],
 ['excess quantity',p=>p.acquisitionGroups[0].quantity=2,'invalid-acquisition'],
 ['notebook ownership',p=>p.items[0].layer='notebook','notebook-is-not-inventory'],
 ['use without holding',p=>{p.items[0].permissions.hold=false;p.items[0].permissions.use=true;},'hold-required'],
 ['forged standard',p=>p.items[0].origin='standard','unverified-standard-definition']
])test('G1M rejects '+name,async()=>{const f=await fixture();mutate(f.p);assert.ok((await f.run()).errors.some(e=>e.code===code));});
test('G1M exact catalog pin required, revoked or ambiguous catalog fails closed',async()=>{
 const f=await fixture();f.p.items[0].origin='standard';const row={...f.p.items[0].definition,status:'approved'};
 const run=catalog=>inspectItemPolicyProposal(f.p,{worldId:'world-test',content:f.c,catalog});
 assert.equal((await run([row])).validForOfflineReview,true);
 for(const catalog of [[{...row,status:'revoked'}],[{...row,contentHash:'b'.repeat(64)}],[row,row]])assert.equal((await run(catalog)).validForOfflineReview,false);
});
test('G1M era/power exceptions and export requests need review without blanket rejection',async()=>{
 const f=await fixture();f.p.items[0].permissions.crossWorld=true;
 f.p.items[0].exceptions=['era','power'].map(kind=>({kind,rationale:'Sealed future relic in ancient setting',sourceNote:'Synthetic chapter two'}));
 const r=await f.run();assert.equal(r.validForOfflineReview,true);assert.equal(r.warnings.length,4);
});
test('G1M rejects authority fields, invalid numbers and private data stays out of diagnostics',async()=>{
 for(const change of [p=>p.approved=true,p=>p.items[0].exp=999,p=>p.items[0].quantity=true,p=>p.items[0].quantity=-1,p=>p.items[0].quantity=1.5,p=>p.items[0].provenance='   ']){
  const f=await fixture();change(f.p);f.p.items[0].effects='SECRET_SENTINEL';const r=await f.run();assert.equal(r.validForOfflineReview,false);assert.ok(!JSON.stringify(r).includes('SECRET_SENTINEL'));
 }
});
test('G1M sidecar does not relax existing world schema',()=>{
 const c=content();assert.equal(validateDraftContent(c).valid,true);c.itemPolicy={};assert.equal(validateDraftContent(c).valid,false);
});
