// Browser-safe authoring validation only. No auth, SQL writer or network client.
import {validateDraftContent,inspectContent} from '../cloudflare/src/vangioi-content.mjs';
import {copyAuthoringContent} from '../cloudflare/src/vangioi-authoring.mjs';
export {validateDraftContent,inspectContent,copyAuthoringContent};
export function parseDraft(text){
 try{
  if(typeof text!=='string'||new TextEncoder().encode(text).length>2*1024*1024)return {ok:false,code:'file-limit'};
  const content=copyAuthoringContent(JSON.parse(text));
  if(content.schemaVersion!=='world-content-1')return {ok:false,code:'unsupported-version'};
  const report=validateDraftContent(content);
  return report.valid?{ok:true,content}:{ok:false,code:'invalid-content',errors:report.errors};
 }catch{return {ok:false,code:'invalid-json'};}
}
