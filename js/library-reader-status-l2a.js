/* L2A — UI-only loading/error status for an on-demand EPUB chapter.
 * Never requests data, grants rights, or persists reading/reward state.
 */
(function(root){
 'use strict';
 if(!root?.document)return;
 const region=root.document.getElementById('library-read-feedback');
 let version=0;
 function clear(){
  if(!region)return;
  region.replaceChildren();
  region.hidden=true;
 }
 function cancel(){version++;clear();}
 function isCurrent(ticket){return ticket===version;}
 function begin(title){
  const ticket=++version;
  if(region){
   region.hidden=false;
   region.replaceChildren();
   const label=root.document.createElement('p');
   label.textContent='Đang tải '+(String(title||'chương truyện'))+'…';
   region.appendChild(label);
  }
  return ticket;
 }
 function success(ticket){
  if(!isCurrent(ticket))return false;
  clear();return true;
 }
 function fail(ticket,retry,error,stage){
  if(!isCurrent(ticket))return false;
  if(region){
   region.hidden=false;
   region.replaceChildren();
   const message=root.document.createElement('p');
   const labels={HTTP_401:'Phi\u00ean ch\u01b0a \u0111\u01b0\u1ee3c x\u00e1c th\u1ef1c',HTTP_403:'Kh\u00f4ng c\u00f3 quy\u1ec1n \u0111\u1ecdc',HTTP_404:'Kh\u00f4ng t\u00ecm th\u1ea5y t\u00e0i nguy\u00ean',HTTP_5XX:'M\u00e1y ch\u1ee7 t\u1ea1m l\u1ed7i',NETWORK:'L\u1ed7i m\u1ea1ng/CORS',TOKEN_FAILED:'Kh\u00f4ng l\u1ea5y \u0111\u01b0\u1ee3c token',SESSION_CHANGED:'Phi\u00ean \u0111\u00e3 thay \u0111\u1ed5i'};
   const code=Object.hasOwn(labels,error?.code)?error.code:null;
   const phase=stage==='layout'?'layout/asset':stage==='chapter'?'chapter':'EPUB';
   message.textContent=(code?labels[code]:'Ch\u01b0a t\u1ea3i ho\u1eb7c x\u00e1c minh \u0111\u01b0\u1ee3c EPUB')+' ['+phase+(code?' / '+code:'')+']. L\u1ed7i n\u00e0y kh\u00f4ng \u0111\u1ed5i d\u1eef li\u1ec7u \u0111\u1ecdc.' ;
   region.appendChild(message);
   if(typeof retry==='function'){
    const button=root.document.createElement('button');
    button.type='button';button.className='btn';button.textContent='Tải lại chương';
    button.addEventListener('click',retry);
    region.appendChild(button);
   }
  }
  return true;
 }
 root.DuduLibraryReaderStatusL2A=Object.freeze({begin,success,fail,cancel,isCurrent});
})(typeof window!=='undefined'?window:null);
