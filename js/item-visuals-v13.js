/* DUDU item miniatures V13 — illustration metadata only, never reward logic.
 * Category artwork and rarity palettes are deterministic for approved catalog
 * items. No player/AI-authored text is inserted into SVG markup.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduItemArtV13=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const RANKS=Object.freeze({
    F:['#8a98aa','#485a6c','#acb7c5'],
    E:['#66c19b','#245f55','#c6f7df'],
    D:['#5dacef','#184679','#c2e8ff'],
    C:['#7984fa','#283895','#d8ddff'],
    B:['#ba83f4','#5e2e9b','#f1d6ff'],
    A:['#eb8abf','#953a75','#ffe0f1'],
    S:['#f6be75','#a66e28','#fff3cf'],
    SS:['#ef8e85','#ab3f55','#fff0e7'],
    SSS:['#f4df96','#754cc8','#fffef2']
  });
  const SHAPES=Object.freeze({
    bread:'<path d="M19 41Q13 26 23 22Q29 12 39 20Q54 13 57 27Q61 39 54 45Z" fill="#e5af67" stroke="#85502b" stroke-width="2"/><path d="M26 30l3-5m10 5 3-7m5 12 3-5" stroke="#fff0c8" stroke-width="2.4" stroke-linecap="round"/>',
    drink:'<path d="M25 17h27l-4 34q-10 6-20 0Z" fill="#d2ebef" stroke="#537e95" stroke-width="2.5"/><path d="M25 20h27M31 14h15" stroke="#f9fdff" stroke-width="3"/><path d="M30 29h17l-2 18q-6 3-12 0Z" fill="#a95f78" opacity=".8"/>',
    blade:'<path d="M24 50L49 17Q55 13 57 17Q60 20 55 25L30 53Z" fill="#e6f4ff" stroke="#617f9f" stroke-width="2.4"/><path d="M20 50l16 7M20 49l-4 9M17 59l-5 5" stroke="#dca968" stroke-width="5" stroke-linecap="round"/>',
    shield:'<path d="M37 14L58 23v18Q52 57 37 64Q21 57 16 41V23Z" fill="#75bcd2" stroke="#edf9ff" stroke-width="2.5"/><path d="M37 21v34M23 34h28" stroke="#ebf6ff" stroke-width="2.7"/>',
    flask:'<path d="M30 12h17M35 13v17L23 51Q18 62 34 62h17Q62 62 56 51L44 30V13" stroke="#d4f3ff" stroke-width="3" fill="#588fa6"/><path d="M29 48Q37 43 51 48l6 12H23Z" fill="#c798ec"/><circle cx="42" cy="43" r="3" fill="#fff9d0"/>',
    scroll:'<path d="M23 22q-3-8 5-9h29v42q-1 8-8 8H22q-5-5 0-10Z" fill="#e9d3a4" stroke="#9b734d" stroke-width="2.2"/><path d="M31 32h17M29 39h21M31 46h14" stroke="#9d7c61" stroke-width="2.3" stroke-linecap="round"/><path d="M20 55q7-6 11 0q5 7-6 10q-8-1-5-10Z" fill="#ac7459"/>',
    gem:'<path d="M38 10l21 16-6 25-15 13-16-14-5-24Z" fill="#86d9e8" stroke="#e5faff" stroke-width="2.7"/><path d="M38 10v54M17 26h42M17 26l21 38 21-38" stroke="#eaffff" stroke-width="2" opacity=".9"/><path d="M38 10L29 26h18Z" fill="#e9ffff"/>',
    relic:'<circle cx="38" cy="37" r="22" fill="#8f6bd4" stroke="#f4db9d" stroke-width="3"/><circle cx="38" cy="37" r="14" fill="none" stroke="#dfceff" stroke-width="3"/><path d="M38 18V56M19 37h38" stroke="#fff1bf" stroke-width="3"/><circle cx="38" cy="37" r="5" fill="#fff2c3"/>',
    device:'<rect x="17" y="19" width="43" height="39" rx="8" fill="#435c80" stroke="#aeeaff" stroke-width="2.5"/><rect x="23" y="25" width="31" height="23" rx="3" fill="#152e4c"/><path d="M28 38l5-6 8 11 5-7" stroke="#7be7d1" stroke-width="3" fill="none"/><path d="M29 58v7m18-7v7" stroke="#a7dfff" stroke-width="3"/>',
    parcel:'<path d="M18 31l20-12 20 12v25L38 66 18 56Z" fill="#aa8665" stroke="#f6dbb6" stroke-width="2.5"/><path d="M18 31l20 13 20-13M38 44v22M29 25l20 14" fill="none" stroke="#f9dfb3" stroke-width="2.5"/>',
    // Functional items must not masquerade as mystery loot parcels.
    // A self-contained power cartridge with a prominent lightning symbol.
    frequencyCell:'<path d="M16 25l-5 7v12l5 7M60 25l5 7v12l-5 7" stroke="#79ebef" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/><rect x="23" y="10" width="30" height="6" rx="3" fill="#d0eeff" stroke="#5ca9d6" stroke-width="1.8"/><rect x="19" y="15" width="38" height="48" rx="10" fill="#193b62" stroke="#a5efff" stroke-width="2.6"/><rect x="23" y="21" width="30" height="35" rx="7" fill="#247aa2" stroke="#6feadf" stroke-width="1.5"/><path d="M40 25L29 41h9l-3 13 14-20H39Z" fill="#ffe58c" stroke="#fff8dc" stroke-width="1.8" stroke-linejoin="round"/><circle cx="27" cy="59" r="2" fill="#80fbea"/><circle cx="49" cy="59" r="2" fill="#80fbea"/>'
  });
  const OVERRIDES=Object.freeze({
    f1:'bread',f2:'drink',e2:'drink',d1:'bread',c1:'blade',e3:'blade',
    b1:'device',b2:'blade',s1:'device','cult-spirit-fragment':'gem',
    'cult-ward-talisman':'scroll','cult-dew-herb':'flask',
    'fantasy-moon-sand':'gem','fantasy-blood-gem':'gem',
    'horror-unnamed-key':'relic','urban-oneway-ticket':'scroll',
    'dudu-first-chapter':'scroll','dudu-new-reader':'relic',
    'dudu-tool-frequency-cell-v43':'frequencyCell'
  });
  function visual(item){
    if(!item||typeof item!=='object')return null;
    const rank=Object.prototype.hasOwnProperty.call(RANKS,item.rank)?item.rank:'F';
    const [light,dark,glow]=RANKS[rank];
    const id=typeof item.id==='string'?item.id:typeof item.itemId==='string'?item.itemId:'';
    const shape=Object.prototype.hasOwnProperty.call(OVERRIDES,id)?OVERRIDES[id]:
      (item.scope==='DUDU'?'relic':item.type==='WEAPON'?'blade':
       item.type==='FOOD'?'bread':item.realmTag==='CULTIVATION'?'gem':
       item.realmTag==='SCIFI'?'device':item.realmTag==='FANTASY'?'flask':
       item.scope==='FUNCTIONAL'?'device':'parcel');
    const stars=rank==='SSS'?4:rank==='SS'?3:rank==='S'?2:rank==='A'?1:0;
    const sparkles=Array.from({length:stars},(_,i)=>{
      const x=[14,61,56,19][i],y=[17,16,59,59][i];
      return '<path d="M'+x+' '+(y-4)+'v8m-4-4h8" stroke="'+glow+'" stroke-width="1.8"/>';
    }).join('');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 76" aria-hidden="true">'+
      '<defs><linearGradient id="p" x2="1" y2="1"><stop stop-color="'+dark+'"/>'+
      '<stop offset="1" stop-color="#101d35"/></linearGradient></defs>'+
      '<rect x="2" y="2" width="72" height="72" rx="18" fill="url(#p)"/>'+
      '<circle cx="38" cy="38" r="28" stroke="'+light+'" stroke-width="1.6" fill="none" opacity=".5"/>'+
      '<circle cx="38" cy="38" r="23" fill="'+light+'" opacity=".13"/>'+
      SHAPES[shape]+sparkles+
      '<circle cx="63" cy="12" r="4" fill="'+glow+'" opacity=".8"/></svg>';
    return Object.freeze({rank,shape,light,dark,
      src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)});
  }
  return Object.freeze({RANKS,SHAPES,OVERRIDES,visual});
});
