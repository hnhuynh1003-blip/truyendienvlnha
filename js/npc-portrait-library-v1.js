/* Sandbox NPC portrait choices. No live uploads or production writes.
 * Preset SVG avatars are illustrative placeholders, not canonical character art.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduNpcPortraitLibrary=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const NAMES=['Trầm tĩnh','Dịu dàng','Bí ẩn','Thanh lịch','Năng động','Kiên cường',
    'Mơ mộng','Tự tin','Ấm áp','Thông thái','Lạnh lùng','Hoài niệm',
    'Điềm đạm','Vui vẻ','Lãng mạn','Thực tế','Dũng cảm','Tinh tế',
    'Tự do','Sắc sảo','Trung thành','Trầm mặc','Thân thiện','Nghị lực'];
  const COLORS=[
    ['#5b3e8c','#c89ee9','#2b1f41'],['#c06a95','#ffc5df','#553048'],
    ['#296879','#81cbd4','#173a50'],['#894f4b','#efab9f','#4c2d31'],
    ['#466d55','#95cba3','#243d37'],['#9a7138','#f2ca86','#523c2b'],
    ['#375f97','#93bdff','#223251'],['#885c9d','#d0a4e9','#40274c']
  ];
  // R10 default gallery: 60 female + 12 male. Keep all previously
  // selectable IDs resolvable (including older male/neutral portraits) so
  // saved author choices are never silently reassigned to a different face.
  const GENDERS=Object.freeze(['female','male']);
  const WORLDS=Object.freeze(['modern','historical','fantasy']);
  function entry(gender,index,group,legacy=false){
    const i=index-1;
    const previous=gender==='female'?0:gender==='male'?1:2;
    const old=index<=24;
    const mood=NAMES[i%NAMES.length];
    const suffix=gender==='female'&&index>24?
      ' '+(index<=48?'II':'III'):'';
    return Object.freeze({
      id:'portrait-'+group+'-'+String(index).padStart(2,'0'),
      label:mood+suffix,gender,
      world:WORLDS[(i+(old?previous:0))%WORLDS.length],
      mood:mood.toLocaleLowerCase('vi'),hair:old?(i+previous*2)%6:(i+3)%6,
      palette:old?(i+previous*3)%COLORS.length:(i+5)%COLORS.length,
      skin:old?(i+previous)%4:(i+2)%4,eyes:i%3,
      ...(legacy?{legacy:true}:{})
    });
  }
  const CATALOG=Object.freeze([
    ...Array.from({length:60},(_,i)=>entry('female',i+1,'f')),
    ...Array.from({length:12},(_,i)=>entry('male',i+1,'m'))
  ]);
  const LEGACY=Object.freeze([
    ...Array.from({length:12},(_,i)=>entry('male',i+13,'m',true)),
    ...Array.from({length:24},(_,i)=>entry('neutral',i+1,'n',true))
  ]);
  const BY_ID=new Map([...CATALOG,...LEGACY].map(p=>[p.id,p]));
  function preset(id){return typeof id==='string'?BY_ID.get(id)||null:null;}
  function normalized(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'d')
      .toLocaleLowerCase('vi').trim();
  }
  function search({gender='all',world='all',query='',limit=100}={}){
    const validGender=gender==='all'||GENDERS.includes(gender)?gender:'all';
    const validWorld=world==='all'||WORLDS.includes(world)?world:'all';
    const q=normalized(query);
    const max=Number.isSafeInteger(limit)?Math.max(0,Math.min(1000,limit)):100;
    return CATALOG.filter(p=>(validGender==='all'||p.gender===validGender)&&
      (validWorld==='all'||p.world===validWorld)&&
      (!q||normalized(p.label+' '+p.gender+' '+p.world+' '+p.id).includes(q)))
      .slice(0,max);
  }
  function escapeXml(v){return String(v).replace(/[<>&"'\u0000-\u001f]/g,'');}
  function svgFor(id){
    const p=preset(id);if(!p)return null;
    const [dark,light,deep]=COLORS[p.palette];
    const skin=['#f4c9ac','#e8ad89','#bc846b','#f1d4bb'][p.skin];
    const hair=['#251d30','#514035','#342a45','#6b4a3b','#2c414a','#4a252e'][p.hair];
    const fringe=[
      'M38 75 Q47 15 95 27 Q120 45 115 69 L100 47 Q77 49 55 62Z',
      'M33 80 Q37 24 89 26 Q116 26 124 76 L102 48 Q75 62 53 48Z',
      'M35 73 Q48 20 94 26 Q123 29 119 81 Q102 40 82 54 Q55 38 43 81Z',
      'M34 79 Q34 28 85 23 Q127 31 122 78 L108 57 Q78 65 51 50Z',
      'M34 79 Q51 27 93 27 Q118 40 121 78 L96 45 Q70 60 51 49Z',
      'M36 75 Q45 22 97 27 Q123 44 123 83 L105 60 Q79 37 50 66Z'
    ][p.hair];
    const genderHair=p.gender==='male'?
      'M39 81 Q36 42 51 33 Q74 17 103 30 Q125 42 122 78 L113 64 Q85 55 54 66 L44 94Z':
      p.gender==='neutral'?
      'M34 80 Q35 29 81 24 Q119 30 127 80 L111 60 Q83 45 52 59Z':
      fringe;
    const longHair=p.gender==='female';
    const eyes=p.eyes===0?'M57 88 Q66 83 75 88 M91 88 Q100 83 109 88':
      p.eyes===1?'M57 88 Q66 91 75 88 M91 88 Q100 91 109 88':
      'M57 88 L75 88 M91 88 L109 88';
    const flower=p.hair%2===0?'<circle cx="117" cy="50" r="8" fill="#f7d18a" opacity=".8"/>':
      '<path d="M48 48 l-8 -6 m8 6 l-5 7" stroke="#eee6f3" stroke-width="2"/>';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="${escapeXml(p.label)}">
      <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset="1" stop-color="${deep}"/></linearGradient></defs>
      <rect width="160" height="160" rx="20" fill="url(#bg)"/>
      <circle cx="125" cy="28" r="45" fill="${light}" opacity=".15"/>
      <path d="M9 164 Q11 125 55 120 L105 120 Q152 125 154 164" fill="${light}"/>
      <path d="M59 119 L80 143 L101 119" fill="#f9e9df"/>
      ${longHair?'<path d="M38 80 Q27 35 68 23 Q124 12 127 74 L118 132 Q113 143 101 151 L103 109 L57 111 L57 151 Q34 143 38 80Z" fill="'+hair+'"/>':'<path d="M34 75 Q35 27 85 23 Q125 28 126 75 L112 85 L101 52 L52 60 L42 91Z" fill="'+hair+'"/>'}
      <rect x="69" y="107" width="24" height="29" rx="9" fill="${skin}"/>
      <ellipse cx="81" cy="78" rx="36" ry="46" fill="${skin}"/>
      <path d="${genderHair}" fill="${hair}"/>
      <path d="${eyes}" fill="none" stroke="#28212d" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M82 87 l-2 11 4 1" fill="none" stroke="#be856d" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M73 108 Q82 114 91 107" fill="none" stroke="#ad6677" stroke-width="2" stroke-linecap="round"/>
      <circle cx="52" cy="102" r="7" fill="#ea9c9d" opacity=".22"/>
      <circle cx="110" cy="102" r="7" fill="#ea9c9d" opacity=".22"/>
      ${flower}
      <path d="M20 157 Q51 123 61 130 L80 153 L101 130 Q120 127 142 157" fill="${dark}" opacity=".9"/>
      <path d="M80 142 l0 18" stroke="${light}" stroke-width="2"/>
    </svg>`;
  }
  function sourceFor(id){
    const svg=svgFor(id);return svg?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg):null;
  }
  const DB_NAME='dudu-sandbox-npc-portrait-library-v1';
  const STORE='uploads';
  function keyFor(uid,storyId,id){
    if([uid,storyId,id].some(x=>typeof x!=='string'||!x||
      x.length>160))return null;
    return [uid,storyId,id].join('::');
  }
  function openDb(){
    return new Promise((resolve,reject)=>{
      if(typeof indexedDB==='undefined')return reject(new Error('indexeddb-unavailable'));
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE);};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function saveUpload(uid,storyId,id,dataUrl){
    const key=keyFor(uid,storyId,id);
    if(!key||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)||
       dataUrl.length>180000)return false;
    const db=await openDb();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put({id,dataUrl,storyId,uid},key);
      tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);
    });}finally{db.close();}
  }
  async function readUpload(uid,storyId,id){
    const key=keyFor(uid,storyId,id);if(!key)return null;
    const db=await openDb();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(key);
      req.onsuccess=()=>resolve(req.result?.dataUrl||null);
      req.onerror=()=>reject(req.error);
    });}finally{db.close();}
  }
  async function deleteUpload(uid,storyId,id){
    const key=keyFor(uid,storyId,id);if(!key)return false;
    const db=await openDb();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error||new Error('delete-aborted'));
    });}finally{db.close();}
  }
  function makeId(){return 'own-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);}
  return Object.freeze({CATALOG,LEGACY,GENDERS,WORLDS,preset,search,sourceFor,keyFor,makeId,saveUpload,readUpload,deleteUpload});
});
