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
 function fail(ticket,retry){
  if(!isCurrent(ticket))return false;
  if(region){
   region.hidden=false;
   region.replaceChildren();
   const message=root.document.createElement('p');
   message.textContent='Chưa tải được chương. Kiểm tra kết nối rồi thử lại.';
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
