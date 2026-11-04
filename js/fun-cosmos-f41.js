/* F4.1a — perspective rift, player retrieval, and presentation-only receipt reveal. */
(function(root){
 'use strict';if(!root?.document)return;
 let current=null;
 const ART=['f31-fossil-dragon','f32-cult-sword','f34-origin-dawn-goddess',
 'f31-doll-starlight','f31-apple-moon','f32-cosmos-sovereign','f32-fossil-egg',
 'f31-weapon-neon','f32b-doll-fairy','f31-card-clover','f32b-fruit-dragon','f31-figure-samurai'];
 const HIGH=['S','SS','SSS'];
 function mount({host,phase='idle',count=1}={}){
  current?.dispose();
  const doc=root.document,el=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls||'';
   if(text!==undefined)n.textContent=text;return n;};
  const scene=el('div','f41-cosmos');scene.dataset.phase=phase==='spin'?'travel':'idle';
  scene.setAttribute('role','group');scene.setAttribute('aria-label','Khe nứt vũ trụ truy bảo');
  const canvas=el('canvas','f41-universe');canvas.setAttribute('aria-hidden','true');
  const haze=el('div','f41-haze');haze.setAttribute('aria-hidden','true');
  const crystals=el('div','f41-crystals');crystals.setAttribute('aria-hidden','true');
  const target=el('button','f41-target');target.type='button';target.hidden=true;
  target.setAttribute('aria-label','Thu hồi mục tiêu bí ẩn');
  const seal=el('span','f41-target-seal');seal.setAttribute('aria-hidden','true');
  seal.append(el('i','f41-seal-face'),el('i','f41-seal-stroke'),el('i','f41-seal-shard'));
  target.append(seal);const instruction=el('span','f41-retrieve-hint','Chạm hoặc kéo về');instruction.hidden=true;
  const status=el('span','f41-status');status.setAttribute('role','status');
  const skip=el('button','f41-skip','Bỏ qua');skip.type='button';skip.hidden=phase!=='spin';
  skip.setAttribute('aria-label','Bỏ qua hoạt ảnh truy bảo');
  const header=el('div','f41-coordinate','KHE NỨT · 09');header.setAttribute('aria-hidden','true');
  scene.append(canvas,haze,crystals,target,instruction,header,status,skip);host.append(scene);
  let disposed=false,finish=null,frame=null,last=0,intersecting=true,observer=null;
  let rows=null,amount=count,skipped=false,drag=null,opened=false;
  const timers=new Set(),motion=root.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced=()=>!!motion?.matches;
  const later=(fn,ms)=>{const id=root.setTimeout(()=>{timers.delete(id);if(!disposed)fn();},ms);timers.add(id);return id;};
  function clearTimers(){for(const id of timers)root.clearTimeout(id);timers.clear();}
  function complete(value){clearTimers();target.hidden=true;instruction.hidden=true;skip.hidden=true;
   drag=null;const done=finish;finish=null;rows=null;if(done)done(value);}
  // Only twelve cached image resources; 24 depth particles reuse these paintings.
  // Particle motion, stars and material streams share one 30-fps, capped-DPR canvas.
  const context=canvas.getContext?.('2d'),sprites=[];
  const particles=Array.from({length:24},(_,i)=>({z:.16+(i%12)/13,x:Math.sin(i*7.13)*1.8,
   y:Math.cos(i*4.87)*1.7,art:i%ART.length,tilt:Math.sin(i)*.3}));
  const stars=Array.from({length:170},(_,i)=>({z:.08+(i%80)/85,x:Math.sin(i*12.37)*2.8,y:Math.cos(i*6.31)*2.8}));
  ART.forEach(id=>{
   const visual=root.DuduItemArtV13?.visual?.(root.DuduItemCatalog?.byId(id));
   if(!visual||visual.src.startsWith('data:'))return;
   const image=doc.createElement('img');image.decoding='async';image.src=visual.src;sprites.push(image);
   image.onload=()=>{if(disposed)return;resume();};
  });
  let scenery=null,sceneryKey='',cameraX=0,cameraY=0,aimX=0,aimY=0,tick=0,flight=0;
  function backdrop(w,h){
   const key=w+'x'+h;if(sceneryKey===key)return;sceneryKey=key;
   scenery=doc.createElement('canvas');scenery.width=w;scenery.height=h;const c=scenery.getContext('2d');
   c.fillStyle='#050a18';c.fillRect(0,0,w,h);
   for(const [x,y,r,color]of [[.18,.28,.74,'#45337c'],[.85,.64,.65,'#164957'],[.6,.12,.43,'#20355f']]){
    const g=c.createRadialGradient(w*x,h*y,0,w*x,h*y,w*r);g.addColorStop(0,color);g.addColorStop(1,'#050b1800');c.fillStyle=g;c.fillRect(0,0,w,h);
   }
   // Distant fractured gateways have different silhouettes, never wheel sectors.
   c.strokeStyle='#7482ae55';c.lineWidth=1;
   for(let n=0;n<3;n++){const x=w*(.14+n*.34),y=h*(.18+n*.13),s=w*(.018+n*.006);
    c.beginPath();c.moveTo(x-s,y+s*1.6);c.lineTo(x-s*.7,y-s);c.lineTo(x+s*.3,y-s*2);
    c.lineTo(x+s,y+s*.8);c.stroke();}
  }
  function rift(c,w,h,time){
   const cx=w*.5+cameraX*.12,cy=h*.42+cameraY*.12;
   c.save();c.translate(cx,cy);c.rotate(-.39);const travel=scene.dataset.phase==='travel';
   const breathe=1+Math.sin(time*.0005)*.025,zoom=1+flight*.58;
   c.scale(zoom*breathe,zoom*breathe);
   // Receding fractured walls leave an irregular deep opening, not a black disc.
   function edge(i,side,scale=1){const yy=(i/22-.5)*h*.77*scale;
    const meander=(Math.sin(i*1.7)*.017+Math.sin(i*.57+time*.0002)*.012)*w*scale;
    const gap=w*.105*Math.pow(Math.sin(i/22*Math.PI),.8)*scale;
    return [meander+side*gap,yy];}
   for(let layer=8;layer>=0;layer--){const extra=layer*w*.008;
    c.beginPath();for(let i=0;i<=22;i++){const [x,y]=edge(i,-1);if(i===0)c.moveTo(x-extra,y);else c.lineTo(x-extra,y);}
    for(let i=22;i>=0;i--){const [x,y]=edge(i,1);c.lineTo(x+extra,y);}c.closePath();
    c.fillStyle=layer===0?'#030a19':layer<3?'#8797e51b':'#576ea70a';c.fill();
   }
   for(const side of [-1,1]){
    for(let glow=3;glow>=0;glow--){c.beginPath();for(let i=0;i<=22;i++){const [x,y]=edge(i,side);if(!i)c.moveTo(x,y);else c.lineTo(x,y);}
     c.lineWidth=glow?glow*w*.013:Math.max(1,w*.003);
     c.strokeStyle=glow?(side<0?'#9c84da15':'#78bec515'):(side<0?'#b5a5edbb':'#a0d2d5bb');c.stroke();}
   }
   // Nested, fainter fractures and dust inside the opening make the far wall recede.
   for(let n=1;n<=3;n++){const scale=1-n*.21;c.beginPath();for(let i=0;i<=22;i++){
     const [x,y]=edge(i,-1,scale);if(!i)c.moveTo(x,y);else c.lineTo(x,y);}
    for(let i=22;i>=0;i--){const [x,y]=edge(i,1,scale);c.lineTo(x,y);}c.closePath();
    c.lineWidth=.6;c.strokeStyle=n===1?'#697e9d55':'#5c789329';c.stroke();}
   for(let j=0;j<18;j++){const side=j%2?1:-1,yy=(j/17-.5)*h*.82;
    const bend=Math.sin(time*.0003+j)*h*.025;c.beginPath();c.moveTo(side*w*.65,yy*1.1);
    c.bezierCurveTo(side*w*.32,yy+bend,side*w*.16,yy*.45,side*w*.07,yy*.16);
    c.lineWidth=j%3===0?1.1:.6;c.strokeStyle=j%3===0?'#d3bd8750':'#82b1c83d';c.stroke();
    c.setLineDash([w*.035,w*.35]);c.lineDashOffset=-time*.012-j*10;
    c.lineWidth=j%3===0?1.8:1;c.strokeStyle=j%3===0?'#e5cda699':'#bed6e099';c.stroke();c.setLineDash([]);}
   c.restore();
  }
  function paint(time){
   frame=null;if(disposed||doc.hidden||!intersecting||!scene.isConnected||!scene.getClientRects().length)return;
   if(time-last>=33||reduced()){
    const rect=scene.getBoundingClientRect(),dpr=Math.min(root.devicePixelRatio||1,1.35);
    const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}backdrop(w,h);
    const dt=Math.min(2,(time-last)/33||1);last=time;tick+=dt;
    cameraX+=(aimX-cameraX)*.075;cameraY+=(aimY-cameraY)*.075;
    const state=scene.dataset.phase;
    if(!reduced())flight+=((['travel','target','recall','open'].includes(state)?1:0)-flight)*.075*dt;
    const c=context;c.globalAlpha=1;const zoom=1+flight*.08;
    c.drawImage(scenery,(w-w*zoom)/2,(h-h*zoom)/2,w*zoom,h*zoom);rift(c,w,h,reduced()?0:time);
    const speed=state==='travel'?.005+flight*.03:state==='recall'?.018:.0013;
    const cx=w*.5,cy=h*.42;
    c.lineWidth=dpr*.7;
    for(const p of stars){if(!reduced())p.z-=speed*dt;if(p.z<.04)p.z=1;
     const x=cx+p.x*w*.12/p.z+cameraX*(1-p.z),y=cy+p.y*h*.12/p.z+cameraY*(1-p.z);
     c.globalAlpha=Math.min(.7,(1-p.z)*.8);c.fillStyle='#d4deef';c.fillRect(x,y,dpr,dpr);
     if(state==='travel'||state==='recall'){c.strokeStyle='#b4d8f0';c.beginPath();c.moveTo(x,y);
      c.lineTo(x+(x-cx)*.14,y+(y-cy)*.14);c.stroke();}
    }
    // Sort far to near: projected size and velocity both rise as depth approaches camera.
    for(const p of [...particles].sort((a,b)=>b.z-a.z)){
     if(!reduced())p.z-=speed*dt*(.75+p.art*.013);if(p.z<.12)p.z=1.35;
     const img=sprites[p.art];if(!img?.complete||!img.naturalWidth)continue;
     const s=Math.min(w*.32,w*.047/p.z),wave=Math.sin(tick*.006+p.art)*.04;
     const x=cx+(p.x+wave)*w*.19/p.z+cameraX*(1-p.z),y=cy+p.y*h*.19/p.z+cameraY*(1-p.z);
     if(x<-s||x>w+s||y<-s||y>h+s)continue;
     c.save();c.globalAlpha=Math.min(.82,Math.max(.06,(1.4-p.z)*.6))*(state==='target'?.3:1);
     c.translate(x,y);c.rotate(p.tilt+tick*.0008*(1-p.z));c.globalCompositeOperation='screen';
     c.drawImage(img,-s/2,-s/2,s,s);c.restore();
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
  function showPrizes(){
   if(!finish||!rows||opened)return;opened=true;target.hidden=true;scene.dataset.phase='open';
   const best=root.DuduVantVatWheelF39?.featured?.(rows)||rows[0];
   const rank=['F','E','D','C','B','A','S','SS','SSS'].includes(best?.rank)?best.rank:'F';
   scene.dataset.rank=rank;crystals.replaceChildren();
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
   status.textContent='Đang thu hồi phong ấn';later(showPrizes,reduced()?0:420);resume();
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
    observer?.disconnect();doc.removeEventListener('visibilitychange',visibility);motion?.removeEventListener?.('change',onMotion);
    for(const img of sprites)img.onload=null;scene.remove();if(current===controller)current=null;}
  };
  current=controller;resume();return controller;
 }
 root.DuduCosmicHuntF41=Object.freeze({mount,play:(rows,n)=>current?.play(rows,n)??Promise.resolve(false),dispose:()=>current?.dispose()});
})(typeof window!=='undefined'?window:null);
