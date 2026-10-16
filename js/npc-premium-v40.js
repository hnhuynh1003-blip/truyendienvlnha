/* DUDU V40 — approved anime portrait atlas F01-F60 / M01-M12.
   Seven original WebP sheets; each character keeps an independent, immutable ID.
   No personality or world lore is inferred from an illustration.
   The four older anime candidates and legacy character IDs remain compatible. */
(function(root){
 'use strict';
 function infoFor(id){
   const match=/^portrait-([fm])-(\d{2})$/.exec(String(id||''));
   if(!match)return null;
   const gender=match[1],n=Number(match[2]);
   if(gender==='f'&&(n<1||n>60)||gender==='m'&&(n<1||n>12))return null;
   const cols=gender==='f'?5:4;
   const rows=gender==='f'?2:3;
   const start=gender==='f'?Math.floor((n-1)/10)*10+1:1;
   const end=gender==='f'?start+9:12;
   const slot=gender==='f'?(n-1)%10:n-1;
   const col=slot%cols,row=Math.floor(slot/cols);
   const sheet=gender+String(start).padStart(2,'0')+'-'+gender+String(end).padStart(2,'0');
   return Object.freeze({id,gender,number:n,cols,rows,col,row,
     path:'assets/npc/premium/sheets/'+sheet+'.webp'});
 }
 function styleFor(id){
   const p=infoFor(id);if(!p)return null;
   return {
     image:'url("'+p.path+'?v=40-1")',
     size:(100*p.cols)+'% '+(100*p.rows)+'%',
     position:(p.col/(p.cols-1)*100)+'% '+(p.row/(p.rows-1)*100)+'%'
   };
 }
 function paint(node,id){
   if(!node)return false;
   const style=styleFor(id);
   if(!style)return false;
   node.replaceChildren();
   node.style.backgroundImage=style.image;
   node.style.backgroundSize=style.size;
   node.style.backgroundPosition=style.position;
   node.style.backgroundRepeat='no-repeat';
   node.style.backgroundColor='#1b1f36';
   node.style.imageRendering='auto';
   node.dataset.premiumPortraitId=id;
   return true;
 }
 root.DuduNpcPremiumV40=Object.freeze({infoFor,styleFor,paint});
})(typeof window!=='undefined'?window:globalThis);
