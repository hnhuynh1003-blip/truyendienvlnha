/* DUDU V44.1 — local-only world discovery journal.
 * A catalog progress UI, NOT a grant, receipt, verified collectible, or
 * server-owned inventory. Records item IDs once encountered in local bag.
 */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?
  require('./item-catalog-v2.js'):root?.DuduItemCatalog);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduWorldCollectionV441=api;
})(typeof window!=='undefined'?window:null,function(catalog){
 'use strict';
 const VERSION=1,REALMS=Object.freeze({
  URBAN:['🏙️','Hiện đại'],APOCALYPSE:['☢️','Tận thế'],
  CULTIVATION:['☯️','Tu tiên'],FANTASY:['🌿','Huyền huyễn'],
  SCIFI:['🚀','Viễn tưởng'],HORROR:['🕯️','Kinh dị']
 });
 let opened=false,selected='URBAN',last=null;
 const own=(x,key)=>Object.prototype.hasOwnProperty.call(x,key);
 function normalize(raw){
  const found={};
  for(const tag of Object.keys(REALMS)){
   const ids=new Set(catalog.list({scope:'REALM',realmTag:tag}).map(x=>x.id));
   found[tag]=Array.isArray(raw?.found?.[tag])?
    [...new Set(raw.found[tag].filter(id=>typeof id==='string'&&ids.has(id)))].slice(0,20):[];
  }
  return {version:VERSION,found};
 }
 function record(raw,inventory=[]){
  const state=normalize(raw);
  for(const instance of Array.isArray(inventory)?inventory:[]){
   const item=catalog.byId(instance?.id||instance?.itemId);
   if(item?.scope==='REALM'&&item.realmTag&&own(state.found,item.realmTag)&&
      !state.found[item.realmTag].includes(item.id)){
    state.found[item.realmTag].push(item.id);
   }
  }
  return state;
 }
 function stats(raw,inventory=[]){
  const state=record(raw,inventory);
  const realms=Object.keys(REALMS).map(tag=>{
   const total=catalog.list({scope:'REALM',realmTag:tag}).length;
   const seen=state.found[tag].length;
   return {tag,icon:REALMS[tag][0],name:REALMS[tag][1],seen,total};
  });
  return {state,realms,seen:realms.reduce((sum,x)=>sum+x.seen,0),total:120};
 }
 const elem=(tag,cls,txt)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(txt!==undefined)n.textContent=String(txt);
  return n;
 };
 function render({host,inventory=[],history=null}={}){
  if(!host||typeof document==='undefined')return false;
  last={host,inventory,history};
  host.hidden=!opened;
  host.replaceChildren();
  if(!opened)return true;
  const summary=stats(history,inventory);
  const title=elem('div','dudu-v441-head');
  title.append(elem('strong','','🌐 Sổ Sưu Tập · '+summary.seen+'/'+summary.total));
  const close=elem('button','dudu-v441-close','×');
  close.type='button';close.setAttribute('aria-label','Đóng Sổ Sưu Tập');
  close.addEventListener('click',toggle);title.append(close);host.append(title);
  const nav=elem('div','dudu-v441-realms');
  for(const r of summary.realms){
   const button=elem('button','dudu-v441-world'+(selected===r.tag?' active':''),
    r.icon+' '+r.name+' '+r.seen+'/'+r.total);
   button.type='button';button.setAttribute('aria-pressed',String(selected===r.tag));
   button.addEventListener('click',()=>{selected=r.tag;render(last)});
   nav.append(button);
  }
  host.append(nav);
  const grid=elem('div','dudu-v441-catalog');
  const seen=new Set(summary.state.found[selected]);
  for(const item of catalog.list({scope:'REALM',realmTag:selected})){
   const available=seen.has(item.id);
   const button=elem('button','dudu-v441-collectible'+(available?' found':''),
     available?item.icon:'？');
   button.type='button';
   const name=available?item.name:'Chưa phát hiện';
   button.title=name;
   button.setAttribute('aria-label',name+(available?' · '+item.rank:''));
   button.addEventListener('click',()=>{
    const detail=host.querySelector('.dudu-v441-focus');
    if(detail)detail.textContent=available?
     item.icon+' '+item.name+' · '+item.rank+
     (item.acquisition.method==='CHAPTER_EVENT'?' · Sự kiện chương':''):
     'Chưa khám phá · tiếp tục đọc và thu thập trong thế giới này.';
   });
   grid.append(button);
  }
  host.append(grid);
  host.append(elem('div','dudu-v441-focus','Chạm biểu tượng để xem món đã khám phá.'));
  host.append(elem('small','dudu-v441-note',
   'Sổ theo dõi trên thiết bị, không phải chứng nhận sở hữu máy chủ. Đồ sự kiện chương không rơi ngẫu nhiên.'));
  return true;
 }
 function toggle(){
  opened=!opened;
  if(last)render(last);
  return opened;
 }
 function reset(){opened=false;selected='URBAN';if(last)render(last)}
 return Object.freeze({VERSION,REALMS,normalize,record,stats,render,toggle,reset});
});
