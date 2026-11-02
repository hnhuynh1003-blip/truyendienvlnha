/* DUDU V27 R4 — private per-device Cyber Phone wallpaper presets.
 * No uploaded imagery, external URL, Firebase writes or cross-account leaks.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduPhoneWallpaperV27=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const PRESETS=Object.freeze([
    Object.freeze({id:'midnight',name:'DUDU đêm',description:'Tím xanh dịu, nền mặc định'}),
    Object.freeze({id:'sakura',name:'Hoa anh đào',description:'Hồng tím êm dịu'}),
    Object.freeze({id:'astral',name:'Ngân hà',description:'Xanh tím huyền ảo'}),
    Object.freeze({id:'jade',name:'Thanh ngọc',description:'Xanh ngọc trầm ấm'}),
    Object.freeze({id:'world-xianxia',name:'Tiên hiệp',description:'Núi tiên và mây trăng'}),
    Object.freeze({id:'world-modern',name:'Hiện đại',description:'Hoàng hôn hoa anh đào'}),
    Object.freeze({id:'world-cyberpunk',name:'Cyberpunk',description:'Thành phố ánh neon'}),
    Object.freeze({id:'world-gothic',name:'Huyền bí',description:'Cung điện trong đêm'}),
    Object.freeze({id:'v34-night',name:'Ngân hà đêm',description:'Đêm trăng và những dãy núi'}),
    Object.freeze({id:'v34-room',name:'Phòng nhỏ',description:'Góc phòng hoàng hôn ấm áp'}),
    Object.freeze({id:'v34-sakura',name:'Lối hoa đào',description:'Đường hoa anh đào cuối chiều'}),
    Object.freeze({id:'v34-neon',name:'Thành phố neon',description:'Đô thị rực sáng về đêm'}),
    Object.freeze({id:'v37-sakura',name:'Thung lũng hoa',description:'Tranh anime phong cảnh hoa đào'}),
    Object.freeze({id:'v37-city-rain',name:'Phố đêm',description:'Tranh anime đường phố đêm'}),
    Object.freeze({id:'v37-city-night',name:'Đô thị neon',description:'Tranh anime đô thị hiện đại'}),
    Object.freeze({id:'v36-custom',name:'Ảnh của tôi',description:'Ảnh riêng trên thiết bị'}),
    Object.freeze({id:'v38-jade',name:'Thiên Cung',description:'Cung ngọc giữa biển mây'}),
    Object.freeze({id:'v38-moon',name:'Vườn Trăng',description:'Rừng bạc bên hồ sao'}),
    Object.freeze({id:'v38-neon',name:'Neon Vũ',description:'Thành phố trong màn mưa'}),
    Object.freeze({id:'v38-lantern',name:'Đế Đô',description:'Đèn lồng cổ thành'}),
    Object.freeze({id:'v38-fox',name:'Cửu Vĩ',description:'Linh thú giữa đêm ngọc'}),
    Object.freeze({id:'v38-abyss',name:'Hải Điện',description:'Thánh đường dưới đáy biển'}),
    Object.freeze({id:'v39-mage',name:'Nguyệt Sư',description:'Pháp sư ánh trăng'}),
    Object.freeze({id:'v39-swordsman',name:'Kiếm Khách',description:'Kiếm sĩ rừng trúc'}),
    Object.freeze({id:'v39-wanderer',name:'Dạ Hành',description:'Du khách phố neon'}),
    Object.freeze({id:'v39-whitefox',name:'Bạch Hồ',description:'Linh thú bạch ngọc'})
  ]);
  const IDS=new Set(PRESETS.map(p=>p.id));
  const PREFIX='dudu-sandbox:phone-wallpaper:v27-r4:';
  const DEFAULT='midnight';
  function validOwner(uid){
    return typeof uid==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(uid);
  }
  function keyFor(uid){return validOwner(uid)?PREFIX+uid:null;}
  function normalize(value){return typeof value==='string'&&IDS.has(value)?value:DEFAULT;}
  function read(storage,uid){
    const key=keyFor(uid);
    if(!key||!storage||typeof storage.getItem!=='function')return DEFAULT;
    try{return normalize(storage.getItem(key));}
    catch(_){return DEFAULT;}
  }
  function write(storage,uid,id){
    const key=keyFor(uid);
    if(!key||!storage||typeof storage.setItem!=='function'||!IDS.has(id))return false;
    try{storage.setItem(key,id);return true;}catch(_){return false;}
  }
  return Object.freeze({PRESETS,DEFAULT,keyFor,normalize,read,write});
});
