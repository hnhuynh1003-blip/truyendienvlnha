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
  async function authorRequest(endpoint,data){
    if(sandbox)return {ok:false,reason:'sandbox'};
    const auth=root.firebase?.auth?.();
    const user=auth?.currentUser;
    if(!user)return {ok:false,reason:'unauthenticated'};
    // Server verifies admin:true custom claim; UI role is not a trust boundary.
    try {
      const jwt=await user.getIdToken();
      const res=await fetch(WORKER_URL+endpoint,{
        method:'POST',
        headers:{Authorization:'Bearer '+jwt,'Content-Type':'application/json'},
        body:JSON.stringify(data),
        cache:'no-store',
        signal:AbortSignal.timeout(15000)
      });
      const payload=await res.json().catch(()=>null);
      if(!res.ok||payload?.error||payload?.ok===false)
        return {ok:false,reason:res.status===503?'disabled':
          res.status===403?'forbidden':payload?.error?.code||payload?.code||'unavailable'};
      return {ok:true,...payload};
    } catch(_){return {ok:false,reason:'unavailable'};}
  }
  function savePrivateDraft(draft){return authorRequest('/v1/collectibles/admin/draft/save',draft);}
  function listPrivateDrafts(storyId,chapterId=null){
    return authorRequest('/v1/collectibles/admin/draft/list',{storyId,chapterId});
  }
  function archivePrivateDraft(storyId,itemId){
    return authorRequest('/v1/collectibles/admin/draft/archive',{storyId,itemId});
  }
  function previewPrivateDraft(storyId,itemId){
    return authorRequest('/v1/collectibles/admin/draft/preview',{storyId,itemId});
  }
  function publishPrivateDraft(approval){
    return authorRequest('/v1/collectibles/admin/publish',approval);
  }
  root.DuduCollectiblesClient=Object.freeze({
    init,mine,savePrivateDraft,listPrivateDrafts,archivePrivateDraft,
    previewPrivateDraft,publishPrivateDraft
  });
})(typeof window!=='undefined'?window:globalThis);
