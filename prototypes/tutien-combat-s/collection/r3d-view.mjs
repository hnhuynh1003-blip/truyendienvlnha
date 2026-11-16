import layout,{BASE_STAGE,getScaledBox,getScreenLayout} from './r3d-layout/layout-map.mjs';
export {BASE_STAGE,getScreenLayout};
export function placeStage(stage,scene){
 const w=stage.clientWidth,screen=getScreenLayout(scene,w),set=(selector,b)=>{const el=stage.querySelector(selector);if(!el||!b)return;Object.assign(el.style,Object.fromEntries(Object.entries(getScaledBox(b,w)).map(([k,v])=>[k==='x'?'left':k==='y'?'top':k,v+'px'])));};
 stage.style.height=(w*BASE_STAGE.height/BASE_STAGE.width)+'px';
 for(const [selector,key]of [['#title-plate','title'],['#hp-hud','hp_hud'],['#stamina-hud','stamina_hud'],['#footer','footer']])set(selector,layout.shared[key]);
 for(const [selector,key]of [['#retreat','retreat'],['#action','action'],['#bag','bag']]){
  const box=layout.shared[key],origin=layout.shared.footer;set(selector,{...box,x:box.x-origin.x,y:box.y-origin.y});
 }
 for(const kind of ['herb','mineral','egg']){
  const selector=`[data-scene="${kind}"]`;set(selector,layout.portal['card_'+kind]);
  const card=stage.querySelector(selector),rect=getScaledBox(layout.portal['card_'+kind],w),image=card.querySelector('.location-frame');
  // SVG meet preserves its viewBox inside the official box. Anchor art to the painted frame, not letterboxing.
  const nw=image.naturalWidth||300,nh=image.naturalHeight||465,k=Math.min(rect.width/nw,rect.height/nh),pw=nw*k,ph=nh*k,ox=(rect.width-pw)/2,oy=(rect.height-ph)/2;
  const art=layout.portal.card_art_relative,label=layout.portal.card_label_relative;
  for(const [el,x,y,cw,ch]of [[card.querySelector('.location-art'),ox+art.x*pw,oy+art.y*ph,art.width*pw,art.height*ph],[card.querySelector('.location-label'),ox+label.x*pw,oy+(1-label.bottom-label.height)*ph,label.width*pw,label.height*ph]])if(el)Object.assign(el.style,{left:x+'px',top:y+'px',width:cw+'px',height:ch+'px',bottom:'auto'});
 }

 if(scene!=='portal'){
  set('#object',layout.collection['object_'+scene]);set('#control-panel',layout.collection.control_panel);
  // Keep caption below the panel SVG's painted inner ornament (viewBox850x420, corner y48).
  const panel=getScaledBox(layout.collection.control_panel,w),paintHeight=Math.min(panel.width/850,panel.height/420)*420;
  stage.querySelector('#clue').style.top=(panel.y+(panel.height-paintHeight)/2+paintHeight*(56/420))+'px';
  if(scene!=='egg')set('#force-wrap',screen.sceneAssets.force);
  if(scene!=='mineral')set('#timing',screen.sceneAssets.pulse);
  if(scene==='mineral')for(const [n,key]of ['target_left','target_middle','target_right'].entries())set(`[data-point="${n}"]`,screen.sceneAssets[key]);
  if(scene==='egg')set('#grid',screen.sceneAssets.grid);
 }
 stage.dataset.scale=String(w/BASE_STAGE.width);stage.dataset.layoutVersion=layout.schema_version;
}
// Hidden traps are never represented in DOM until a confirmed step reveals one.
export function tileView(state,index,visited){
 if(state.lastResult?.reason==='hazard'&&state.position===index)return {art:'hazard_revealed',label:'Lôi đã phát hiện'};
 if(index===state.position)return {art:'start',label:'Vị trí hiện tại'};
 if(index===2)return {art:'goal',label:'Tổ'};
 if(index===6)return {art:'start',label:'Điểm xuất phát'};
 if(visited.has(index))return {art:'safe',label:'Đã đi qua'};
 return {art:'hidden',label:'Chưa khám phá'};
}
