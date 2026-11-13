// Calls the original module. No copied appraisal logic, Arcade act(), wallet or timers.
let legacy;
if(typeof window==='undefined'){
 const {createRequire}=await import('node:module');legacy=createRequire(import.meta.url)('../../js/personal-jade-core-v1.js');
}else{
 await import('/__shared/personal-jade-core-v1.js');legacy=window.DuduPersonalJadeCoreV1;
}
if(!legacy?.surface||!legacy?.scanHint)throw Error('Original jade helpers unavailable');
export const SPECIMEN=Object.freeze({id:2,site:0,grade:3,color:1,size:5,flaw:'fracture',seed:17});
export function specimenView(){return {surface:legacy.surface(SPECIMEN),hints:[0,1,2].map(spot=>legacy.scanHint(SPECIMEN,spot,2))};}
export {TREATMENTS} from './jade-policy.mjs';
