// Small, code-native SVG placeholders. No images, fonts or external resources.
const paths = {
  basic: ['M10 8l14 14M11 22L24 9M18 6l8-2-2 8M7 19l6 6M5 27l4-4'],
  guard: ['M16 3l10 4v8c0 6-5 10-10 14C11 25 6 21 6 15V7z','M16 8v14M11 15h10'],
  cleave: ['M5 25C5 12 14 5 27 5M5 25C13 14 20 10 27 5','M8 25l3 2M21 7l2 3'],
  ward: ['M16 3l11 8-4 14-14 0-4-14z','M16 8l6 5-3 8h-6l-3-8z'],
  suppress: ['M16 3C13 9 7 14 7 20a9 9 0 0018 0c0-6-6-11-9-17z','M11 20c0 3 2 5 5 5M13 14h6'],
  potion: ['M12 4h8M13 4v7L8 20c-3 5 0 8 8 8s11-3 8-8l-5-9V4','M11 20h10'],
  retreat: ['M19 5h8v22h-8M20 16H4m6-6-6 6 6 6']
};
export function actionIcon(action) {
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  for(const d of paths[action]||[]){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);svg.append(path);}
  return svg;
}
