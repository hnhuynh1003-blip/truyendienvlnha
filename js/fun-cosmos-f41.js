/* F4.2B — approved AI layers, parallax and unchanged receipt-only retrieval. */
(function(root){
 'use strict';if(!root?.document)return;
 let current=null;
 const HIGH=['S','SS','SSS'];
 function mount({host,phase='idle',count=1}={}){
  current?.dispose();
  const pack=root.DuduVantVatArtF42B;if(!pack)return null;
  const doc=root.document,el=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls||'';
   if(text!==undefined)n.textContent=text;return n;};
  const scene=el('div','f41-cosmos');scene.dataset.phase=phase==='spin'?'travel':'idle';
  scene.setAttribute('role','group');scene.setAttribute('aria-label','Cổng Bách Giới truy bảo');
  const background=el('img','f42b-background');background.alt='';background.decoding='async';background.setAttribute('aria-hidden','true');
  background.src=(root.matchMedia?.('(max-width:600px)')?.matches?pack.background.mobile:pack.background.desktop);
  const gate=el('img','f42b-gate');gate.alt='';gate.decoding='async';gate.src=pack.gate;gate.setAttribute('aria-hidden','true');
  const effect=el('div','f42b-open-effect');effect.setAttribute('aria-hidden','true');
  const canvas=el('canvas','f41-universe');canvas.setAttribute('aria-hidden','true');
  const haze=el('div','f41-haze');haze.setAttribute('aria-hidden','true');
  const crystals=el('div','f41-crystals');crystals.setAttribute('aria-hidden','true');
  const target=el('button','f41-target');target.type='button';target.hidden=true;
  target.setAttribute('aria-label','Thu hồi mục tiêu bí ẩn');
  const seal=el('span','f41-target-seal');seal.setAttribute('aria-hidden','true');
  // One neutral sealed vessel, independent of the committed prize and its rarity.
  const vessel=el('img','f42b-sealed-vessel');vessel.src=pack.seal;vessel.alt='';vessel.decoding='async';
  seal.append(vessel);
  target.append(seal);const instruction=el('span','f41-retrieve-hint','Chạm hoặc kéo về');instruction.hidden=true;
  const status=el('span','f41-status');status.setAttribute('role','status');
  const skip=el('button','f41-skip','Bỏ qua');skip.type='button';skip.hidden=phase!=='spin';
  skip.setAttribute('aria-label','Bỏ qua hoạt ảnh truy bảo');
  const header=el('div','f41-coordinate','BÁCH GIỚI');header.setAttribute('aria-hidden','true');
  scene.append(background,gate,canvas,haze,effect,crystals,target,instruction,header,status,skip);host.append(scene);
  let disposed=false,finish=null,frame=null,last=0,intersecting=true,observer=null,resizeObserver=null;
  let rows=null,amount=count,skipped=false,drag=null,opened=false,openingFx=null;
  const timers=new Set(),motion=root.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced=()=>!!motion?.matches;
  const later=(fn,ms)=>{const id=root.setTimeout(()=>{timers.delete(id);if(!disposed)fn();},ms);timers.add(id);return id;};
  function clearTimers(){for(const id of timers)root.clearTimeout(id);timers.clear();}
  function complete(value){clearTimers();target.hidden=true;instruction.hidden=true;skip.hidden=true;
   drag=null;const done=finish;finish=null;rows=null;if(done)done(value);}
  // Five approved sample paintings are scenery only; 20 particles reuse these resources.
  // Particle motion, stars and material streams share one 30-fps, capped-DPR canvas.
  const context=canvas.getContext?.('2d'),sprites=[];
  const particles=Array.from({length:20},(_,i)=>({z:.22+(i%10)/8,x:Math.sin(i*7.13)*1.25,
   y:Math.cos(i*4.87)*1.15,art:i%pack.samples.length,tilt:Math.sin(i)*.3}));
  const stars=Array.from({length:170},(_,i)=>({z:.08+(i%80)/85,x:Math.sin(i*12.37)*2.8,y:Math.cos(i*6.31)*2.8}));
  pack.samples.forEach(sample=>{
   const image=doc.createElement('img');image.decoding='async';image.src=sample.src;sprites.push(image);
   image.onload=()=>{if(disposed)return;resume();};
  });
  let cameraX=0,cameraY=0,aimX=0,aimY=0,tick=0,flight=0;
  function readyLayer(){if(!disposed)resume();}
  background.onload=readyLayer;gate.onload=readyLayer;
  function paint(time){
   frame=null;if(disposed||doc.hidden||!intersecting||!scene.isConnected||!scene.getClientRects().length)return;
   if(time-last>=33||reduced()){
    const rect=scene.getBoundingClientRect(),dpr=Math.min(root.devicePixelRatio||1,1.35);
    const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const dt=Math.min(2,(time-last)/33||1);last=time;tick+=dt;
    cameraX+=(aimX-cameraX)*.075;cameraY+=(aimY-cameraY)*.075;
    const state=scene.dataset.phase;
    if(!reduced())flight+=((['travel','target','recall','open'].includes(state)?1:0)-flight)*.075*dt;
    const c=context;c.globalAlpha=1;c.clearRect(0,0,w,h);
    const still=reduced();
    background.style.transform='translate3d('+(-cameraX*.17)+'px,'+(-cameraY*.17)+'px,0) scale('+(still?1.02:1.04+flight*.08)+')';
    gate.style.transform='translate3d('+(cameraX*.28)+'px,'+(cameraY*.28)+'px,0) scale('+(still?1:1+flight*.1)+')';
    const speed=state==='travel'?.005+flight*.03:state==='recall'?.018:.0013;
    const cx=w*.5,cy=h*.42;
    c.lineWidth=dpr*.7;
    for(const p of stars){if(!reduced())p.z-=speed*dt;if(p.z<.04)p.z=1;
     const x=cx+p.x*w*.12/p.z+cameraX*(1-p.z),y=cy+p.y*h*.12/p.z+cameraY*(1-p.z);
     c.globalAlpha=Math.min(.52,(1-p.z)*.65);c.fillStyle='#d4deef';c.fillRect(x,y,dpr,dpr);
     if(state==='travel'||state==='recall'){c.strokeStyle='#b4d8f0';c.beginPath();c.moveTo(x,y);
      c.lineTo(x+(x-cx)*.14,y+(y-cy)*.14);c.stroke();}
    }
    // Sort far to near: projected size and velocity both rise as depth approaches camera.
    for(const p of [...particles].sort((a,b)=>b.z-a.z)){
     if(!reduced())p.z-=speed*dt*(.75+p.art*.013);if(p.z<.12)p.z=1.35;
     const img=sprites[p.art];if(!img?.complete||!img.naturalWidth)continue;
     const s=Math.min(w*.32,w*.06/p.z),wave=Math.sin(tick*.006+p.art)*.04;
     const x=cx+(p.x+wave)*w*.09/p.z+cameraX*(1-p.z),y=cy+p.y*h*.09/p.z+cameraY*(1-p.z);
     if(x<-s||x>w+s||y<-s||y>h+s)continue;
     c.save();c.globalAlpha=Math.min(.96,Math.max(.17,(1.4-p.z)*.82))*(state==='target'?.24:1);
     c.translate(x,y);c.rotate(p.tilt+tick*.0008*(1-p.z));c.globalCompositeOperation='source-over';
     const ratio=img.naturalWidth/img.naturalHeight,iw=ratio>1?s:s*ratio,ih=ratio>1?s/ratio:s;
     c.drawImage(img,-iw/2,-ih/2,iw,ih);c.restore();
    }
    c.globalAlpha=1;
    if(state==='open'&&HIGH.includes(scene.dataset.rank)){
     const glow=c.createRadialGradient(cx,cy,5,cx,cy,w*.6);glow.addColorStop(0,scene.dataset.rank==='SSS'?'#f9d4a333':'#a2b7e324');glow.addColorStop(1,'#00000000');c.fillStyle=glow;c.fillRect(0,0,w,h);
    }
   }
   if(!reduced())frame=root.requestAnimationFrame(paint);
  }
  function resume(){if(!disposed&&context&&!frame&&!doc.hidden&&intersecting)frame=root.requestAnimationFrame(paint);}
  function visibility(){scene.classList.toggle('is-paused',!!doc.hidden);
   if(doc.hidden&&finish)complete(false);
   if(doc.hidden&&frame){root.cancelAnimationFrame(frame);frame=null;}else resume();}
  function onMotion(){if(reduced()&&frame){root.cancelAnimationFrame(frame);frame=null;}resume();
   if(reduced()&&scene.dataset.phase==='travel'&&finish)showTarget();}
  if(root.ResizeObserver){resizeObserver=new root.ResizeObserver(()=>resume());resizeObserver.observe(scene);}
  doc.addEventListener('visibilitychange',visibility);motion?.addEventListener?.('change',onMotion);
  if(root.IntersectionObserver){observer=new root.IntersectionObserver(entries=>{
   intersecting=entries.some(e=>e.isIntersecting);scene.classList.toggle('is-paused',!intersecting||!!doc.hidden);
   if(!intersecting){if(frame)root.cancelAnimationFrame(frame);frame=null;if(finish)complete(false);}else resume();
  });observer.observe(scene);}
  scene.addEventListener('pointermove',event=>{if(drag||reduced())return;const r=scene.getBoundingClientRect();aimX=(event.clientX-r.left-r.width/2)*.07;aimY=(event.clientY-r.top-r.height/2)*.06;});
  scene.addEventListener('pointerleave',()=>{aimX=0;aimY=0;});
  function showTarget(){if(!finish||disposed||skipped)return;scene.dataset.phase='target';
   target.hidden=false;target.disabled=false;instruction.hidden=false;
   target.style.setProperty('--pull-x','0px');target.style.setProperty('--pull-y','0px');
   status.textContent='Mục tiêu bí ẩn đã xuất hiện. Chạm hoặc kéo về để thu hồi.';
   resume();
  }
  function prepareOpeningFx(){
   if(openingFx||!rows)return;
   const best=root.DuduVantVatWheelF39?.featured?.(rows)||rows[0],src=pack.effects[best?.rank];
   if(!src)return;
   openingFx=el('img','f42b-effect-image');openingFx.alt='';openingFx.decoding='async';openingFx.src=src;
  }
  function showPrizes(){
   if(!finish||!rows||opened)return;opened=true;target.hidden=true;scene.dataset.phase='open';
   const best=root.DuduVantVatWheelF39?.featured?.(rows)||rows[0];
   const rank=['F','E','D','C','B','A','S','SS','SSS'].includes(best?.rank)?best.rank:'F';
   scene.dataset.rank=rank;crystals.replaceChildren();
   prepareOpeningFx();
   if(openingFx){effect.className='f42b-open-effect rank-'+rank.toLowerCase();effect.replaceChildren(openingFx);}
   rows.forEach((row,i)=>{const item=root.DuduItemCatalog?.byId(row.itemId);
    const card=el('span','f41-crystal rank-'+String(row.rank||'F').toLowerCase());
    card.dataset.itemId=row.itemId;card.style.setProperty('--n',i);
    if(item){const image=el('span','f41-prize-art');root.DuduItemArtV13?.mount?.(image,item);card.append(image);}
    else card.append(el('span','f41-gold-coin'));crystals.append(card);});
   status.textContent=amount+' phần thưởng đã khai mở';resume();
   later(()=>{scene.dataset.phase='landed';complete(true);},reduced()?0:rank==='SSS'?1600:rank==='SS'?1250:rank==='S'?1000:['A','B','C'].includes(rank)?700:400);
  }
  function retrieve(){if(!finish||scene.dataset.phase!=='target')return;
   clearTimers();drag=null;scene.classList.remove('is-pulling');scene.dataset.phase='recall';target.disabled=true;instruction.hidden=true;
   target.style.setProperty('--pull-x','0px');target.style.setProperty('--pull-y','0px');
   status.textContent='Đang thu hồi phong ấn';prepareOpeningFx();later(showPrizes,reduced()?0:420);resume();
  }
  target.addEventListener('click',retrieve);
  target.addEventListener('pointerdown',event=>{if(scene.dataset.phase!=='target'||drag)return;
   if(event.button!==undefined&&event.button!==0)return;event.preventDefault();
   drag={id:event.pointerId,x:event.clientX,y:event.clientY};target.setPointerCapture?.(event.pointerId);
   scene.classList.add('is-pulling');});
  target.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;
   const dx=Math.max(-60,Math.min(60,event.clientX-drag.x)),dy=Math.max(-20,Math.min(95,event.clientY-drag.y));
   target.style.setProperty('--pull-x',dx+'px');target.style.setProperty('--pull-y',dy+'px');
   if(dy>=52)retrieve();});
  target.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;drag=null;
   scene.classList.remove('is-pulling');retrieve();});
  target.addEventListener('pointercancel',event=>{if(drag?.id!==event.pointerId)return;drag=null;
   scene.classList.remove('is-pulling');target.style.setProperty('--pull-x','0px');target.style.setProperty('--pull-y','0px');});
  skip.addEventListener('click',()=>{skipped=true;skip.disabled=true;
   if(finish){scene.dataset.phase='landed';complete(true);}else status.textContent='Đang xác nhận bảo vật…';});
  const controller={
   play(results,n){
    if(disposed||finish||!intersecting||doc.hidden||
     (scene.getClientRects&&!scene.getClientRects().length)||
     ![1,5,10].includes(n)||!Array.isArray(results)||results.length!==n)return Promise.resolve(false);
    rows=results;amount=n;opened=false;scene.dataset.count=String(n);scene.dataset.phase='travel';skip.hidden=false;
    if(skipped){rows=null;scene.dataset.phase='landed';skip.hidden=true;return Promise.resolve(true);}
    return new Promise(done=>{finish=done;later(showTarget,reduced()?0:750);resume();});
   },
   dispose(){if(disposed)return;disposed=true;complete(false);if(frame)root.cancelAnimationFrame(frame);
    observer?.disconnect();resizeObserver?.disconnect();doc.removeEventListener('visibilitychange',visibility);motion?.removeEventListener?.('change',onMotion);
    for(const img of sprites)img.onload=null;background.onload=null;gate.onload=null;
    if(openingFx)openingFx.onload=null;scene.remove();if(current===controller)current=null;}
  };
  current=controller;resume();return controller;
 }
 root.DuduCosmicHuntF41=Object.freeze({mount,play:(rows,n)=>current?.play(rows,n)??Promise.resolve(false),dispose:()=>current?.dispose()});
})(typeof window!=='undefined'?window:null);
