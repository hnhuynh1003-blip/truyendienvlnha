/* P2D personal rollout: all authenticated accounts, no test-UID allowlist. */
(function(root){
 'use strict';
 const APPROVED_POLICY=Object.freeze({id:'personal-reading-v1',expPerMinute:2,dailyMaxMinutes:180});
 const api=Object.freeze({policy:APPROVED_POLICY,enabled:()=>APPROVED_POLICY!==null});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalReadingPolicyP2C=api;
})(typeof window!=='undefined'?window:null);
