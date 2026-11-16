// Presentation lifecycle only. Layout is CSS grid/flex inside real parent containers.
export function placeStage(stage){stage.dataset.layoutVersion='VIS-R3E-P0-structural';}
export function mountResponsiveStage({host,stage}){
 const update=()=>{if(!host.clientWidth||!host.clientHeight)return;placeStage(stage);stage.dataset.contentWidth=String(host.clientWidth);stage.dataset.contentHeight=String(host.clientHeight);stage.dataset.fitReady='true';stage.dataset.fitActive='true';};
 const observer=new ResizeObserver(update);observer.observe(host);update();return {update,dispose(){observer.disconnect();stage.dataset.fitActive='false';}};
}
export {tileView} from './r3d-view.mjs';
