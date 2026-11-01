/* L2F: optional in-reader TOC shortcut shown on an intentional upward swipe.
   Browser Back and the in-page TOC are always available independently. */
(function(root,factory){
 const api=factory();
 if(root)root.DuduReaderShortcutL2F=api.createDetector();
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='undefined'?null:window,function(){
 'use strict';
 function createDetector(){
  let lastY=0,upward=0,visible=false;
  function reset(y=0){
   lastY=Math.max(0,Number(y)||0);
   upward=0;visible=false;
   return false;
  }
  function update(y){
   const current=Math.max(0,Number(y)||0);
   const delta=current-lastY;
   if(current<240||delta>7){upward=0;visible=false;}
   else if(delta< -5){
    upward+=-delta;
    if(upward>=85)visible=true;
   }
   lastY=current;
   return visible;
  }
  return Object.freeze({reset,update});
 }
 return Object.freeze({createDetector});
});
