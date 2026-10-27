// Browser-safe authoring validation only. No auth, SQL writer or network client.
import {validateDraftContent,inspectContent} from '../cloudflare/src/vangioi-content.mjs';
import {copyAuthoringContent} from '../cloudflare/src/vangioi-authoring.mjs';
import {analyzeG3AReachability} from '../cloudflare/src/vangioi-reachability-g3a.mjs';
import {analyzeG3BMobileAssets} from '../cloudflare/src/vangioi-mobile-assets-g3b.mjs';
export {verifyLocalPngRaster} from './vangioi-local-png.mjs';
export {inspectPngBytes} from '../cloudflare/src/vangioi-png.mjs';
export {validateDraftContent,inspectContent,copyAuthoringContent};
// G3C is a read-only, local report composed from the existing G1D/G3A/G3B
// analyzers. It NEVER turns author-provided data into approval or a publish
// capability. Incomplete drafts remain savable under the G1D draft contract.
export function inspectCreatorQa(content,{assetObservations=[]}={}){
 const structure=inspectContent(content);
 const base={...structure,canPublish:false,engineVerified:false,
  deviceVerified:false,productionAuthorized:false};
 if(!structure.valid)return {...base,qaStatus:'fix-structure-first',
  reachability:null,mobileAssets:null};
 return {...base,qaStatus:'needs-engine-and-device-review',
  reachability:analyzeG3AReachability(content),
  mobileAssets:analyzeG3BMobileAssets(content,{assetObservations})};
}
export function parseDraft(text){
 try{
  if(typeof text!=='string'||new TextEncoder().encode(text).length>2*1024*1024)return {ok:false,code:'file-limit'};
  const content=copyAuthoringContent(JSON.parse(text));
  if(content.schemaVersion!=='world-content-1')return {ok:false,code:'unsupported-version'};
  const report=validateDraftContent(content);
  return report.valid?{ok:true,content}:{ok:false,code:'invalid-content',errors:report.errors};
 }catch{return {ok:false,code:'invalid-json'};}
}
