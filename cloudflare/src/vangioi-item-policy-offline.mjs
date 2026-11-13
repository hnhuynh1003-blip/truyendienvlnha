// G1M offline preflight only. Never imported by the Worker or Creator.
import Ajv2020 from 'ajv/dist/2020.js';
import {readFileSync} from 'node:fs';
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';
const schema=JSON.parse(readFileSync(new URL('../../contracts/vangioi/item-policy-proposal-1.schema.json',import.meta.url)));
const validate=new Ajv2020({allErrors:true,strict:true}).compile(schema);
export async function inspectItemPolicyProposal(input,{worldId,content,catalog=[]}={}){
 const errors=[],warnings=[],add=(code,path)=>errors.push({code,path});
 const result=()=>({validForOfflineReview:errors.length===0,errors,warnings});
 let p,c;
 try{p=copyAuthoringJson(input);c=copyAuthoringJson(content);}catch{add('invalid-json','/');return result();}
 if(!validate(p)){
  for(const e of validate.errors)add('schema:'+e.keyword,e.instancePath||'/');
  return result();
 }
 if(p.worldId!==worldId)add('world-mismatch','/worldId');
 if(p.contentHash!==await hashAuthoringJson(c))add('content-pin-mismatch','/contentHash');
 if(!Array.isArray(c?.items)){add('invalid-world-content','/');return result();}
 const ids=new Set(c.items.map(i=>i.itemId)),items=new Map(),groups=new Set(),entities=new Set(),routes=new Set();
 p.items.forEach((item,i)=>{
  const path='/items/'+i;
  if(items.has(item.itemId))add('duplicate-item',path);items.set(item.itemId,item);
  if(!ids.has(item.itemId))add('missing-world-item',path+'/itemId');
  if(item.origin==='standard'){
   // Catalog supplied by trusted offline operator, never taken from proposal JSON.
   const matches=catalog.filter(r=>r.definitionId===item.definition.definitionId&&r.version===item.definition.version);
   if(matches.length!==1||matches[0].contentHash!==item.definition.contentHash||matches[0].status!=='approved')
    add('unverified-standard-definition',path+'/definition');
  }else warnings.push({code:'custom-definition-review-required',path});
  if(item.layer==='notebook'&&(Object.values(item.permissions).some(Boolean)||item.quantity!==1))add('notebook-is-not-inventory',path);
  if((item.permissions.use||item.permissions.trade||item.permissions.crossWorld)&&!item.permissions.hold)add('hold-required',path+'/permissions');
  if(item.permissions.crossWorld)warnings.push({code:'cross-world-review-required',path});
  for(const [j,x]of item.exceptions.entries())warnings.push({code:x.kind+'-exception-review-required',path:path+'/exceptions/'+j});
 });
 p.acquisitionGroups.forEach((g,i)=>{
  const path='/acquisitionGroups/'+i,item=items.get(g.itemId);
  if(groups.has(g.groupId))add('duplicate-acquisition-group',path);groups.add(g.groupId);
  const entity=g.scope+':'+g.entityId;
  if(entities.has(entity))add('duplicate-entity-claim',path);entities.add(entity);
  if(!item)add('missing-policy-item',path+'/itemId');
  else if(item.layer!=='world'||!item.permissions.hold||g.quantity>item.quantity)add('invalid-acquisition',path);
  for(const route of g.routes){if(routes.has(route))add('ambiguous-route',path+'/routes');routes.add(route);}
 });
 return result();
}
