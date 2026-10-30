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
    biscuit:'<rect x="15" y="18" width="46" height="41" rx="10" fill="#d6a56a" stroke="#ffe2ab" stroke-width="3"/><rect x="20" y="23" width="36" height="31" rx="7" fill="#edc68d"/><g fill="#94633d"><circle cx="28" cy="32" r="3"/><circle cx="45" cy="29" r="3"/><circle cx="39" cy="45" r="4"/><circle cx="26" cy="46" r="2"/><circle cx="49" cy="43" r="2"/></g>',
    water:'<path d="M32 11h12v7l7 7v33q-12 8-26 0V25l7-7Z" fill="#b6eaff" fill-opacity=".62" stroke="#c8f5ff" stroke-width="2.6"/><rect x="31" y="8" width="14" height="7" rx="2" fill="#65b9e9"/><path d="M27 32h22v18H27Z" fill="#3484ba"/><path d="M29 43q7-7 18 0" fill="none" stroke="#bdfaff" stroke-width="2"/>',
    coffee:'<rect x="23" y="14" width="30" height="48" rx="6" fill="#915c56" stroke="#ffd3a0" stroke-width="2.4"/><path d="M25 20h26l-3 36H28Z" fill="#46334a"/><path d="M31 37q7-11 14 0q-3 13-14 0Z" fill="#f5c886"/><path d="M36 25q-4 7 0 10m6-11q4 5 0 10" fill="none" stroke="#e8d5c9" stroke-width="2" stroke-linecap="round"/>',
    flashlight:'<path d="M25 21l24-4 9 10-6 11-19-2Z" fill="#a9dce9" stroke="#dafbff" stroke-width="2.2"/><path d="M23 31l11-3 12 25-9 5Z" fill="#395878" stroke="#91c4db" stroke-width="2.5"/><path d="M44 19l13 8-5 8-13-7Z" fill="#fff2b2"/><path d="M31 39l10-4m-8 10 10-4" stroke="#aad8e8" stroke-width="2"/>',
    raincoat:'<path d="M28 17q10-7 20 0l10 14-9 9-3-6v27H30V34l-5 6-9-9Z" fill="#e6b85f" stroke="#fff0b7" stroke-width="2.6"/><path d="M28 17q10 22 20 0M38 28v32" stroke="#947546" stroke-width="2.4" fill="none"/><path d="M19 31l7 5m31-5-8 5" stroke="#ffe4a0" stroke-width="2"/>',
    medkit:'<rect x="13" y="24" width="50" height="37" rx="8" fill="#c64d65" stroke="#ffc5c9" stroke-width="2.5"/><path d="M28 24v-8h20v8" fill="none" stroke="#c8e5ef" stroke-width="3"/><rect x="31" y="33" width="14" height="20" rx="2" fill="#fff4e6"/><path d="M25 43h26" stroke="#fff4e6" stroke-width="7"/>',
    filter:'<path d="M20 16h36l-5 11-6 9v23q-7 7-14 0V36l-6-9Z" fill="#679ab4" stroke="#c9f0f4" stroke-width="2.7"/><path d="M25 25h26M31 37h14M31 45h14" stroke="#d9faf1" stroke-width="2"/><path d="M38 51q-7 8 0 11q8-3 0-11Z" fill="#82e5eb"/>',
    repair:'<path d="M20 30V19h36v11" fill="none" stroke="#e9bc7c" stroke-width="5"/><rect x="12" y="27" width="52" height="32" rx="7" fill="#a37b58" stroke="#f1d2a0" stroke-width="2.4"/><path d="M12 40h52M33 36h10v10H33Z" stroke="#f4d59b" stroke-width="2.3" fill="#536d83"/><path d="M23 45v10m30-10v10" stroke="#e9c28e" stroke-width="2"/>',
    compass:'<circle cx="38" cy="38" r="25" fill="#bfbd9c" stroke="#f8eac0" stroke-width="3"/><circle cx="38" cy="38" r="19" fill="#254b67" stroke="#d5efe9" stroke-width="2"/><path d="M38 20v36M20 38h36" stroke="#8bb6b8" stroke-width="1.6"/><path d="M47 29L33 34l-4 14 14-5Z" fill="#f29385" stroke="#fff2d9" stroke-width="1.8"/><circle cx="38" cy="38" r="3" fill="#ffe7b6"/>',
    tent:'<path d="M10 58L36 16l30 42Z" fill="#6dbaa6" stroke="#ddf4db" stroke-width="2.7"/><path d="M36 16v42H10m26 0h30" fill="none" stroke="#e6e1bc" stroke-width="2.4"/><path d="M36 31L23 57h27Z" fill="#244d56" stroke="#bddcd2" stroke-width="2"/><path d="M14 58l-5 6m52-6 6 6" stroke="#efd9ad" stroke-width="2"/>',
    healthBox:'<rect x="14" y="21" width="48" height="39" rx="7" fill="#f0f1df" stroke="#b9e3e9" stroke-width="3"/><path d="M27 21v-7h22v7" fill="none" stroke="#91c7d1" stroke-width="3"/><rect x="34" y="27" width="9" height="26" rx="2" fill="#cf6773"/><rect x="25" y="36" width="27" height="9" rx="2" fill="#cf6773"/>',
    signal:'<rect x="24" y="25" width="29" height="37" rx="6" fill="#395d83" stroke="#beeaff" stroke-width="2.5"/><path d="M37 25l6-17" stroke="#cbeaff" stroke-width="3" stroke-linecap="round"/><circle cx="38" cy="42" r="7" fill="#8df7de"/><path d="M19 17q-12 16 0 32m39-31q11 13 0 29" fill="none" stroke="#83e7e6" stroke-width="2.6" stroke-linecap="round"/><rect x="30" y="54" width="17" height="3" rx="1" fill="#8cb9e4"/>',
    supplyKit:'<path d="M14 27l24-14 24 14-24 15Z" fill="#eed7a5" stroke="#fff7cf" stroke-width="2.3"/><path d="M14 27v29l24 13V42Z" fill="#aa794f" stroke="#f4cd94" stroke-width="2"/><path d="M62 27v29L38 69V42Z" fill="#8e6049" stroke="#f4cd94" stroke-width="2"/><path d="M38 13v29m-9-24 24 15" stroke="#b7895c" stroke-width="3"/><path d="M38 47v14M31 54h14" stroke="#eaf9d2" stroke-width="4"/>',
    timePulse:'<circle cx="38" cy="38" r="24" fill="#284b7f" stroke="#bcdbfc" stroke-width="3"/><path d="M38 18v8m20 12h-8m-12 20v-8m-20-12h8" stroke="#beeafa" stroke-width="2.5"/><path d="M38 25v14l-10 8" stroke="#ffd89d" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M48 12l9 6-8 7" fill="none" stroke="#8ef1e1" stroke-width="3"/>',
    coupon:'<path d="M14 19h48v13q-8 5 0 12v13H14V44q8-6 0-12Z" fill="#ad78c0" stroke="#f9d6ff" stroke-width="2.4"/><path d="M37 22v32" stroke="#f6d7ff" stroke-width="2" stroke-dasharray="4 4"/><circle cx="28" cy="32" r="4" fill="none" stroke="#fff5cb" stroke-width="2.6"/><circle cx="48" cy="46" r="4" fill="none" stroke="#fff5cb" stroke-width="2.6"/><path d="M26 51l24-26" stroke="#fff5cb" stroke-width="3"/>',
    cloth:'<path d="M22 11Q40 5 53 22L43 40l13 15-12 11-19-21 8-15Z" fill="#b58fbf" stroke="#ffe2ff" stroke-width="2.5"/><path d="M22 11l14 13m-4 10 18 19M42 60l-4 8m11-12 0 11" stroke="#ead8ff" stroke-width="2"/>',
    rope:'<path d="M31 14Q10 14 17 33q6 10 19 1t23 4q8 13-4 20-9 6-18-1" fill="none" stroke="#d0a875" stroke-width="10" stroke-linecap="round"/><path d="M31 14Q10 14 17 33q6 10 19 1t23 4q8 13-4 20-9 6-18-1" fill="none" stroke="#fff0bb" stroke-width="2" stroke-dasharray="4 6" stroke-linecap="round"/>',
    candle:'<path d="M22 29h33l-4 33H26Z" fill="#f4dfb2" stroke="#fff3d4" stroke-width="2.6"/><path d="M38 30v-9" stroke="#7c5b4c" stroke-width="2"/><path d="M38 11q14 13 0 17q-14-4 0-17Z" fill="#ffbe66" stroke="#fff7bb" stroke-width="2"/><path d="M20 35q9 9 18 0t19 0" stroke="#ba946c" stroke-width="2" fill="none"/>',
    bandage:'<rect x="15" y="24" width="46" height="28" rx="11" transform="rotate(-22 38 38)" fill="#edceaa" stroke="#ffebd1" stroke-width="2.4"/><rect x="31" y="29" width="15" height="18" rx="3" transform="rotate(-22 38 38)" fill="#fff0cc"/><g fill="#b98d6a"><circle cx="33" cy="34" r="1.5"/><circle cx="44" cy="42" r="1.5"/><circle cx="36" cy="43" r="1.5"/></g>',
    battery:'<rect x="28" y="15" width="20" height="7" rx="2" fill="#a9d6f3"/><rect x="21" y="20" width="34" height="43" rx="7" fill="#2f6880" stroke="#b9e8ea" stroke-width="2.5"/><path d="M38 27l-9 17h8l-3 12 13-19h-9Z" fill="#ffe39a"/><path d="M25 57h27" stroke="#83e5d0" stroke-width="2"/>',
    map:'<path d="M12 20l17-8 18 7 17-8v43l-17 9-18-8-17 9Z" fill="#d6ba8e" stroke="#fff0bb" stroke-width="2.4"/><path d="M29 12v43m18-36v44" stroke="#9c805e" stroke-width="2"/><path d="M18 36q9-15 21-1t20-7" stroke="#567f99" stroke-width="3" stroke-dasharray="5 4" fill="none"/><circle cx="51" cy="47" r="4" fill="#c15c62"/>',
    paper:'<path d="M20 11h27l11 12v42H20Z" fill="#eee0bb" stroke="#c9a77d" stroke-width="2.5"/><path d="M47 11v13h11M26 33h25M26 41h23M26 49h19M26 57h16" stroke="#9a826e" stroke-width="2" fill="none"/>',
    key:'<circle cx="25" cy="29" r="11" fill="none" stroke="#ead6a0" stroke-width="6"/><path d="M33 37l23 23 5-5-8-7 4-5-6-5-4 5-9-11" stroke="#e9d2a0" stroke-width="7" stroke-linecap="round" fill="none"/>',
    journal:'<rect x="19" y="13" width="41" height="51" rx="5" fill="#845c80" stroke="#deb4d7" stroke-width="2.5"/><path d="M29 13v51" stroke="#f1c69a" stroke-width="4"/><path d="M36 30h16m-16 9h16m-16 9h11" stroke="#f2d1e5" stroke-width="2"/><path d="M42 14v14l7-4 7 4V14" fill="#c99f6b"/>',
    photo:'<rect x="15" y="14" width="46" height="48" rx="3" fill="#e8d9bf" stroke="#fdf0db" stroke-width="2.5"/><rect x="21" y="20" width="34" height="29" rx="2" fill="#5d8ca1"/><circle cx="44" cy="29" r="5" fill="#ebd49a"/><path d="M21 46l11-13 9 9 7-7 7 11" fill="#42687c"/><path d="M28 56h20" stroke="#947d73" stroke-width="2"/>',
    bell:'<path d="M25 25q0-14 13-14t13 14v19l9 8H16l9-8Z" fill="#d8af66" stroke="#ffebb3" stroke-width="2.6"/><path d="M31 58q7 11 14 0" fill="none" stroke="#ffe0a4" stroke-width="5"/><circle cx="38" cy="13" r="4" fill="#f4d994"/><path d="M25 46h26" stroke="#9a723d" stroke-width="2"/>',
    cassette:'<rect x="12" y="22" width="52" height="37" rx="5" fill="#455b7a" stroke="#bfd4ef" stroke-width="2.5"/><rect x="19" y="28" width="38" height="18" rx="3" fill="#ad9dc1"/><circle cx="28" cy="37" r="6" fill="#edf0e0"/><circle cx="48" cy="37" r="6" fill="#edf0e0"/><circle cx="28" cy="37" r="2" fill="#526c86"/><circle cx="48" cy="37" r="2" fill="#526c86"/><path d="M24 53h28" stroke="#e6d8ac" stroke-width="3"/>',
    headset:'<path d="M19 41v-9q0-21 19-21t19 21v9" stroke="#c5d8ec" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="12" y="38" width="13" height="22" rx="6" fill="#62799b" stroke="#d8edff" stroke-width="2.3"/><rect x="51" y="38" width="13" height="22" rx="6" fill="#62799b" stroke="#d8edff" stroke-width="2.3"/><path d="M57 60q-2 9-15 9" stroke="#9dcde5" stroke-width="3" fill="none"/>',
    lantern:'<path d="M27 19q11-8 22 0l9 12-8 25H26l-8-25Z" fill="#b86b62" stroke="#ffceb0" stroke-width="2.5"/><path d="M27 19h22M26 56h24M38 18v39M23 32h30" stroke="#f9d6a5" stroke-width="2"/><path d="M32 14h12M38 57v8" stroke="#ffecb7" stroke-width="3"/><ellipse cx="38" cy="39" rx="9" ry="12" fill="#ffd88d" fill-opacity=".4"/>',
    seed:'<path d="M38 59V31m0 17q-19 0-23-20q18 0 23 17m0-11q2-21 22-23q-1 21-22 29" fill="#58b98d" stroke="#b4f0c8" stroke-width="2.4"/><path d="M24 58h28l-4 9H28Z" fill="#a77b54" stroke="#ead2a3" stroke-width="2"/>',
    mirror:'<ellipse cx="38" cy="32" rx="19" ry="23" fill="#709cbb" stroke="#f6d7a0" stroke-width="5"/><path d="M27 24q6-8 13-8" stroke="#e2f9ff" stroke-width="3" fill="none"/><path d="M38 56v13M28 69h20" stroke="#e9c58d" stroke-width="6" stroke-linecap="round"/>',
    // Functional items must not masquerade as mystery loot parcels.
    // A self-contained power cartridge with a prominent lightning symbol.
    frequencyCell:'<path d="M16 25l-5 7v12l5 7M60 25l5 7v12l-5 7" stroke="#79ebef" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/><rect x="23" y="10" width="30" height="6" rx="3" fill="#d0eeff" stroke="#5ca9d6" stroke-width="1.8"/><rect x="19" y="15" width="38" height="48" rx="10" fill="#193b62" stroke="#a5efff" stroke-width="2.6"/><rect x="23" y="21" width="30" height="35" rx="7" fill="#247aa2" stroke="#6feadf" stroke-width="1.5"/><path d="M40 25L29 41h9l-3 13 14-20H39Z" fill="#ffe58c" stroke="#fff8dc" stroke-width="1.8" stroke-linejoin="round"/><circle cx="27" cy="59" r="2" fill="#80fbea"/><circle cx="49" cy="59" r="2" fill="#80fbea"/>'
  });
  const OVERRIDES=Object.freeze({
    f1:'bread',f2:'water',e2:'coffee',d1:'bread',c1:'blade',e3:'blade',
    b1:'device',b2:'blade',s1:'device','cult-spirit-fragment':'gem',
    'cult-ward-talisman':'scroll','cult-dew-herb':'flask',
    'fantasy-moon-sand':'gem','fantasy-blood-gem':'gem',
    'horror-unnamed-key':'relic','urban-oneway-ticket':'scroll',
    'dudu-first-chapter':'scroll','dudu-new-reader':'relic',
    'dudu-tool-frequency-cell-v43':'frequencyCell',
    'common-biscuit':'biscuit','common-bottled-water':'water',
    'common-flashlight':'flashlight','common-raincoat':'raincoat',
    'common-basic-medkit':'medkit','common-water-filter':'filter',
    'common-repair-kit':'repair','common-compass':'compass',
    'common-tent':'tent','common-health-box':'healthBox',
    'common-signal-device':'signal',
    'dudu-tool-supply-kit-v438':'supplyKit',
    'dudu-tool-time-pulse-v438':'timePulse',
    'dudu-tool-discount-v438':'coupon',
    'urban-coffee':'coffee','urban-keycard':'device'
  });
  // Recognizable category art for older world packs. A raw parcel is reserved
  // for an actual box, not used as the picture for every unidentified prop.
  const ICON_SHAPES=Object.freeze({
    '🧣':'cloth','🧥':'raincoat','🪢':'rope','🕯️':'candle','🩹':'bandage',
    '🔋':'battery','🗺️':'map','📰':'paper','🧾':'paper','📄':'paper',
    '🎟️':'coupon','🎫':'scroll','🎙️':'device','📻':'signal',
    '😷':'medkit','🧪':'flask','🖼️':'photo','🔔':'bell','📓':'journal',
    '📮':'scroll','🗝️':'key','🔑':'key','🎧':'headset','💐':'seed',
    '📷':'photo','💾':'device','📼':'cassette','💡':'lantern','⌚':'timePulse',
    '🌧️':'water','🧤':'cloth','🚰':'filter','🧂':'flask',
    '🌱':'seed','🧰':'repair','📟':'device','⚙️':'repair',
    '⚫':'relic','🏮':'lantern','🎵':'cassette','🖋️':'journal',
    '🪞':'mirror','🏚️':'relic','🧴':'water'
  });
  function visual(item){
    if(!item||typeof item!=='object')return null;
    const rank=Object.prototype.hasOwnProperty.call(RANKS,item.rank)?item.rank:'F';
    const [light,dark,glow]=RANKS[rank];
    const id=typeof item.id==='string'?item.id:typeof item.itemId==='string'?item.itemId:'';
    const shape=Object.prototype.hasOwnProperty.call(OVERRIDES,id)?OVERRIDES[id]:
      (Object.prototype.hasOwnProperty.call(ICON_SHAPES,item.icon)?ICON_SHAPES[item.icon]:
      (item.scope==='DUDU'?'relic':item.type==='WEAPON'?'blade':
       item.type==='FOOD'?'bread':item.realmTag==='CULTIVATION'?'gem':
       item.realmTag==='SCIFI'?'device':item.realmTag==='FANTASY'?'flask':
       item.scope==='FUNCTIONAL'?'device':'parcel'));
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
  // One artwork renderer for both the store and all warehouse views.
  // It changes presentation only; it never edits the item or its ownership.
  function mount(container,item){
    if(!container)return false;
    const data=visual(item);
    const doc=container.ownerDocument||(typeof document!=='undefined'?document:null);
    if(!data||!doc?.createElement)return false;
    const img=doc.createElement('img');
    img.className='dudu-item-v13-art';
    img.src=data.src;img.alt='';img.width=76;img.height=76;
    img.decoding='async';img.loading='lazy';
    container.replaceChildren(img);
    container.classList.add('dudu-item-v13-frame');
    container.style.setProperty('--rarity-glow',data.light);
    container.dataset.rarity=data.rank;
    return true;
  }
  return Object.freeze({RANKS,SHAPES,OVERRIDES,ICON_SHAPES,visual,mount});
});
