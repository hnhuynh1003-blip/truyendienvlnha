/* Read-only UI for server-confirmed collectible ownership.
 * Item definitions and locally editable userProfile.inventory are NOT proof.
 * Server claims and public release remain disabled until owner-approved rollout.
 */
(function(root){
  'use strict';
  const WORKER_URL='https://dudu-ai-staging.dudu-studio-ai.workers.dev';
  let sandbox=false;
  function init(isSandbox){sandbox=!!isSandbox;}
  async function mine(){
    if(sandbox)return {ok:false,reason:'sandbox',items:[]};
    const current=root.firebase?.auth?.()?.currentUser;
    if(!current)return {ok:false,reason:'unauthenticated',items:[]};
    try{
      const jwt=await current.getIdToken();
      const res=await fetch(WORKER_URL+'/v1/collectibles/mine',{
        method:'GET',
        headers:{Authorization:'Bearer '+jwt},
        cache:'no-store',
        signal:AbortSignal.timeout(10000)
      });
      if(!res.ok)return {ok:false,reason:res.status===503?'disabled':'unavailable',items:[]};
      const payload=await res.json();
      if(!Array.isArray(payload?.items))return {ok:false,reason:'invalid',items:[]};
      // Only server ledger rows are accepted, never browser inventory.
      return {ok:true,items:payload.items.slice(0,500)};
    }catch(_){return {ok:false,reason:'unavailable',items:[]};}
  }
  root.DuduCollectiblesClient=Object.freeze({init,mine});
})(typeof window!=='undefined'?window:globalThis);
