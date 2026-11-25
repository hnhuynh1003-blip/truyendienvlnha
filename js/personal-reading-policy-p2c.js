/* P2C release gate. No approved gameplay rate yet; keep disabled.
 * Candidate values are for balancing discussion only, not runtime defaults. */
(function(root){
 'use strict';
 const APPROVED_POLICY=null;
 const api=Object.freeze({policy:APPROVED_POLICY,enabled:()=>APPROVED_POLICY!==null});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalReadingPolicyP2C=api;
})(typeof window!=='undefined'?window:null);
