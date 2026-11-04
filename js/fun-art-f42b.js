/* F4.2B — approved AI layers. Samples are scenery, never drawable catalog entries. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduVantVatArtF42B=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';const base='assets/van-tuong/f42b/';
 const samples=Object.freeze([
  {rank:'D',src:base+'sample-d.webp'}, {rank:'A',src:base+'sample-a.webp'},
  {rank:'S',src:base+'sample-s.webp'}, {rank:'SS',src:base+'sample-ss.webp'},
  {rank:'SSS',src:base+'sample-sss.webp'}
 ].map(x=>Object.freeze({...x,role:'SCENERY_ONLY',catalogId:null})));
 return Object.freeze({version:'f42b-1',
  background:Object.freeze({mobile:base+'background-mobile.webp',desktop:base+'background-desktop.webp'}),
  gate:base+'gate.webp',seal:base+'sample-s.webp',samples,
  effects:Object.freeze({S:base+'open-s.webp',SS:base+'open-ss.webp',SSS:base+'open-sss.webp'}),
  // No approved item-ID/rank mapping was supplied. Keep actual receipt artwork unchanged.
  rewardMappings:Object.freeze({})});
});
