/* Permanent retirement: no query/storage switch, script loading or data writes. */
(function(root){
 'use strict';
 const worlds=false;
 const retired=async()=>false;
 root.DuduFeaturesT0=Object.freeze({worlds,loadLegacy:retired,restoreArchive:retired});
})(typeof window!=='undefined'?window:{});
