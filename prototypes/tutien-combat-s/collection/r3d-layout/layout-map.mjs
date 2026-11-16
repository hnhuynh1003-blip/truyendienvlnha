import layout from './layout-data.mjs';
export const BASE_STAGE = Object.freeze(layout.base_stage);
export const layoutMap = layout;
/** Width-locked scale to avoid skew, duplicate host chrome and displaced hitboxes. */
export function getScaledBox(b, stageWidth) {
  const scale=stageWidth/BASE_STAGE.width;
  return Object.fromEntries(['x','y','width','height'].map(k=>[k,Math.round((b[k]??0)*scale*100)/100]));
}
/** Example: getScreenLayout('portal',390) or getScreenLayout('herb',320). */
export function getScreenLayout(scene, stageWidth) {
  const common=layoutMap.shared;
  if(scene==='portal')return { shared:common, ...layoutMap.portal, baseWidth:BASE_STAGE.width, scale:stageWidth/BASE_STAGE.width };
  if(!['herb','mineral','egg'].includes(scene))throw new Error(`Unsupported scene: ${scene}`);
  return { shared:common, ...layoutMap.collection, sceneAssets:layoutMap.collection[scene], baseWidth:BASE_STAGE.width, scale:stageWidth/BASE_STAGE.width };
}
export default layoutMap;
