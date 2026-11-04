/* F4.1 — bounded, cancellable presentation of committed Vạn Tượng receipts. */
(function(root){
 'use strict';if(!root?.document)return;
 let current=null;
 const ART=['f31-fossil-dragon','f32-cult-sword','f34-origin-dawn-goddess',
 'f31-doll-starlight','f31-apple-moon','f32-cosmos-sovereign','f32-fossil-egg',
 'f31-weapon-neon','f32b-doll-fairy','f31-card-clover','f32b-fruit-dragon','f31-figure-samurai'];
 function mount({host,phase='idle',count=1}={}){
  current?.dispose();
  const doc=root.document,el=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls||'';
   if(text!==undefined)n.textContent=text;return n;};
  const scene=el('div','f41-cosmos');scene.dataset.phase=phase;
  scene.setAttribute('role','group');scene.setAttribute('aria-label','Hố Vũ Trụ Truy Bảo');
  const backdrop=el('div','f41-backdrop'),nebula=el('div','f41-nebula');
  const stars=el('canvas','f41-stars');stars.setAttribute('aria-hidden','true');
  const planets=el('div','f41-planets');planets.setAttribute('aria-hidden','true');
  planets.append(el('i','f41-planet one'),el('i','f41-planet two'));
  const rifts=el('div','f41-rifts');rifts.setAttribute('aria-hidden','true');
  for(let i=0;i<3;i++){const r=el('i','f41-rift');r.style.setProperty('--i',i);rifts.append(r);}
  const well=el('div','f41-well');well.setAttribute('aria-hidden','true');
  well.append(el('i','f41-ring outer'),el('i','f41-ring inner'),el('i','f41-core'));
  const debris=el('div','f41-debris');debris.setAttribute('aria-hidden','true');
  ART.forEach((id,i)=>{const item=root.DuduItemCatalog?.byId(id),visual=root.DuduItemArtV13?.visual?.(item);
   if(!visual||visual.src.startsWith('data:'))return;
   const drift=el('span','f41-drift depth-'+(i%3));drift.style.setProperty('--i',i);
   drift.style.setProperty('--x',((i*137.5)%360)+'deg');
   const image=el('img','');image.src=visual.src;image.alt='';image.width=90;image.height=90;
   image.decoding='async';image.loading='lazy';drift.append(image);debris.append(drift);});
  const stream=el('div','f41-stream');stream.setAttribute('aria-hidden','true');
  const crystals=el('div','f41-crystals');crystals.setAttribute('aria-hidden','true');
  const mark=el('span','f41-eyebrow','BÁCH GIỚI · TRUY BẢO');
  const status=el('span','f41-status');status.setAttribute('role','status');
  const skip=el('button','f41-skip','Bỏ qua');skip.type='button';skip.hidden=phase==='idle'||phase==='landed';
  skip.setAttribute('aria-label','Bỏ qua hoạt ảnh truy bảo');
  scene.append(backdrop,nebula,stars,planets,rifts,well,debris,stream,crystals,mark,status,skip);host.append(scene);
  let disposed=false,finish=null,timer=null,frame=null,last=0,skipped=false,observer=null;
  const motion=root.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced=()=>!!motion?.matches;
  function settle(value){if(timer!==null)root.clearTimeout(timer);timer=null;
   const done=finish;finish=null;if(done)done(value);}
  function skipAnimation(){skipped=true;scene.classList.add('is-skipped');skip.disabled=true;
   if(finish){scene.dataset.phase='landed';settle(true);}else status.textContent='Đang xác nhận bảo vật…';}
  skip.addEventListener('click',skipAnimation);
  // 150 procedural stars, at most 30 fps and 1.5x DPR. No per-star DOM or image loads.
  const context=stars.getContext?.('2d');
  const points=Array.from({length:150},(_,i)=>({a:i*2.399963,z:(i%50+1)/50,r:i%5===0?1.25:.65}));
  function paint(time){
   frame=null;if(disposed||doc.hidden||!scene.isConnected||!scene.getClientRects().length)return;
   if(time-last>=33||reduced()){
    const rect=scene.getBoundingClientRect(),dpr=Math.min(root.devicePixelRatio||1,1.5);
    const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
    if(stars.width!==w||stars.height!==h){stars.width=w;stars.height=h;}
    context.clearRect(0,0,w,h);const cx=w*.5,cy=h*.43;
    for(const p of points){if(!reduced())p.z-=scene.dataset.phase==='settle'?.022:.0025;
     if(p.z<.03)p.z=1;const radius=(1-p.z)*Math.max(w,h)*.62;
     const x=cx+Math.cos(p.a)*radius,y=cy+Math.sin(p.a)*radius*.82;
     context.globalAlpha=Math.max(.12,1-p.z);context.fillStyle='#e8dfff';
     context.beginPath();context.arc(x,y,p.r*dpr,0,Math.PI*2);context.fill();
     if(scene.dataset.count==='10'&&scene.dataset.phase==='settle'){
      context.strokeStyle='#dcc4ff';context.lineWidth=dpr*.65;context.beginPath();context.moveTo(x,y);
      context.lineTo(x+(x-cx)*.06,y+(y-cy)*.06);context.stroke();}
    }last=time;
   }
   if(!reduced())frame=root.requestAnimationFrame(paint);
  }
  function resume(){if(!disposed&&context&&!frame&&!doc.hidden)frame=root.requestAnimationFrame(paint);}
  function visibility(){if(doc.hidden&&frame){root.cancelAnimationFrame(frame);frame=null;}else resume();}
  doc.addEventListener('visibilitychange',visibility);
  motion?.addEventListener?.('change',resume);
  if(root.IntersectionObserver){observer=new root.IntersectionObserver(entries=>{
   const visible=entries.some(e=>e.isIntersecting);scene.classList.toggle('is-paused',!visible);
   if(!visible&&frame){root.cancelAnimationFrame(frame);frame=null;}else if(visible)resume();
  });observer.observe(scene);}
  resume();
  const controller={
   async play(results,amount){
    if(disposed)return false;
    const rows=Array.isArray(results)?results:[];
    if(![1,5,10].includes(amount)||rows.length!==amount)return false;
    scene.dataset.count=String(amount);scene.dataset.phase='settle';crystals.replaceChildren();
    status.textContent=amount+' bảo vật đã được xác nhận';skip.hidden=false;
    rows.forEach((row,i)=>{
     const rank=['F','E','D','C','B','A','S','SS','SSS','COIN'].includes(row.rank)?row.rank:'F';
     const crystal=el('span','f41-crystal rank-'+rank.toLowerCase());
     crystal.style.setProperty('--n',i);crystal.style.setProperty('--count',amount);
     crystal.dataset.itemId=row.itemId;const seal=el('i','f41-seal');crystal.append(seal);
     const item=root.DuduItemCatalog?.byId(row.itemId);
     if(item){const image=el('span','f41-prize-art');root.DuduItemArtV13?.mount?.(image,item);crystal.append(image);}
     else crystal.append(el('span','f41-gold-coin'));
     crystals.append(crystal);
    });
    if(skipped||reduced()){scene.dataset.phase='landed';skip.hidden=true;return true;}
    return new Promise(done=>{finish=done;timer=root.setTimeout(()=>{
     scene.dataset.phase='landed';skip.hidden=true;settle(true);
    },amount===1?1900:amount===5?2500:2850);});
   },
   dispose(){if(disposed)return;disposed=true;settle(false);if(frame)root.cancelAnimationFrame(frame);
    observer?.disconnect();doc.removeEventListener('visibilitychange',visibility);
    motion?.removeEventListener?.('change',resume);scene.remove();if(current===controller)current=null;}
  };
  current=controller;return controller;
 }
 function dispose(){current?.dispose();}
 return root.DuduCosmicHuntF41=Object.freeze({mount,play:(rows,count)=>current?.play(rows,count)??Promise.resolve(false),dispose});
})(typeof window!=='undefined'?window:null);
