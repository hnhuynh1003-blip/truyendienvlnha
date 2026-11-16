// Geometry comes from force_track.svg: viewBox640x76, green rail x45..595.
// One native input remains the sole value/input authority; no second visible thumb.
export function forceGeometry(width){
 if(!Number.isFinite(width)||width<=0)throw Error('Invalid force width');
 const start=width*45/640,end=width*595/640,hitWidth=2*start,artWidth=Math.min(30,hitWidth);
 return {start,end,hitWidth,artWidth,artTop:36-artWidth*26/76,height:72};
}
export function valueFromPosition(x,width){const g=forceGeometry(width);return Math.round(Math.max(0,Math.min(1,(x-g.start)/(g.end-g.start)))*100);}
export function mountForceControl(range){
 const update=()=>{if(!range.clientWidth)return;const g=forceGeometry(range.clientWidth);range.style.setProperty('--r3e-thumb-width',g.hitWidth+'px');range.style.setProperty('--r3e-thumb-art-width',g.artWidth+'px');range.style.setProperty('--r3e-thumb-art-top',g.artTop+'px');};
 const observer=new ResizeObserver(update);observer.observe(range);update();range.ownerDocument.defaultView.addEventListener('pagehide',()=>observer.disconnect(),{once:true});return {update,dispose:()=>observer.disconnect()};
}
