/* DUDU NPC Memory v2.2 — local-first, per UID + story + NPC.
 * The author owns canonical NPC lore; player statements remain unverified chat.
 * No Firestore writes, Gemini calls, or cross-device synchronization.
 */
(function (root, factory) {
  'use strict';
  const api=factory();
  if (typeof module === 'object' && module.exports) module.exports=api;
  if (root) root.DuduNpcMemory=api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const VERSION=1, MAX_EVENTS=40, MAX_LOOKUP=3;
  const STOP=new Set(['toi','ban','chung','minh','chao','xin','cam','on','voi','cua','la','co','cai',
    'nay','kia','noi','nhe','nha','roi','thi','sao','nao','nhung','cho','dieu','nhieu','tung',
    'lan','qua','ve','mot','khi','hay','nho','nhat','tiep','ma','the','duoc','khong','vi']);
  function plain(value,max) {
    if (typeof value!=='string') return '';
    return value.trim().replace(/\s+/g,' ').slice(0,max);
  }
  function normalized(value) {
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
  }
  function tokens(value) {
    return new Set(normalized(value).split(/[^a-z0-9]+/)
      .filter(s=>s.length>=3&&!STOP.has(s)).slice(0,35));
  }
  function scopeKey(uid,storyId,npcId,sandbox) {
    const ids=[uid,storyId,npcId];
    if (ids.some(x=>typeof x!=='string'||!x||x.length>160)) return null;
    const prefix=sandbox?'dudu-sandbox-v3:npc-memory:':'dudu-v3:npc-memory:';
    return prefix+ids.map(encodeURIComponent).join(':');
  }
  function safeEvent(e) {
    if (!e || typeof e!=='object' || typeof e.id!=='string') return null;
    if (e.type==='exchange' && e.provenance==='chat-local') {
      const userText=plain(e.userText,240),replyText=plain(e.replyText,260);
      if (!userText||!replyText) return null;
      return {id:plain(e.id,70),type:'exchange',provenance:'chat-local',
        certainty:'reported',timestamp:Number(e.timestamp)||0,userText,replyText};
    }
    if (e.type==='gift' && e.provenance==='game-local') {
      const itemName=plain(e.itemName,100),itemRank=plain(e.itemRank,8);
      if (!itemName) return null;
      return {id:plain(e.id,70),type:'gift',provenance:'game-local',
        certainty:'client-observed',timestamp:Number(e.timestamp)||0,itemName,itemRank};
    }
    return null;
  }
  function open(storage,uid,storyId,npcId,sandbox=false) {
    const key=scopeKey(uid,storyId,npcId,sandbox);
    if (!key || !storage) return null;
    function load() {
      try {
        const value=JSON.parse(storage.getItem(key)||'null');
        if (!value || value.version!==VERSION || !Array.isArray(value.events)) return [];
        return value.events.slice(-MAX_EVENTS).map(safeEvent).filter(Boolean);
      } catch (_) {return [];}
    }
    function save(events) {
      const data={version:VERSION,events:events.slice(-MAX_EVENTS)};
      try {storage.setItem(key,JSON.stringify(data));return true;}
      catch (err) {console.warn('NPC memory local storage unavailable',err?.name||'unknown');return false;}
    }
    function insert(candidate) {
      const event=safeEvent(candidate);
      if (!event) return false;
      const events=load();
      if (events.some(e=>e.id===event.id)) return false;
      // Avoid duplicate event on double-click/retry in the same 10-second window.
      const last=events[events.length-1];
      if (last && last.type===event.type && event.timestamp-last.timestamp<10000 &&
          JSON.stringify({...last,id:0,timestamp:0})===JSON.stringify({...event,id:0,timestamp:0})) return false;
      return save([...events,event]);
    }
    function addExchange(userText,replyText,reference,now=Date.now()) {
      if (typeof reference!=='string'||!reference.trim()) return false;
      return insert({id:'chat:'+reference,type:'exchange',provenance:'chat-local',
        timestamp:now,userText,replyText});
    }
    function addGift(itemName,itemRank,reference,now=Date.now()) {
      if (typeof reference!=='string'||!reference.trim()) return false;
      return insert({id:'gift:'+reference,type:'gift',provenance:'game-local',
        timestamp:now,itemName,itemRank});
    }
    function relevant(query,limit=MAX_LOOKUP) {
      const words=tokens(query);
      if (!words.size) return [];
      const matches=[];
      for (const event of load()) {
        const hay=event.type==='exchange'
          ?event.userText+' '+event.replyText
          :'qua tang '+event.itemName+' '+event.itemRank;
        const common=[...words].filter(w=>tokens(hay).has(w)).length;
        if (common>0 && (event.type==='gift' || common>=2)) matches.push({event,score:common});
      }
      return matches.sort((a,b)=>b.score-a.score||b.event.timestamp-a.event.timestamp)
        .slice(0,Math.max(0,Math.min(3,Math.floor(limit)||0))).map(x=>x.event)
        .sort((a,b)=>a.timestamp-b.timestamp);
    }
    function list() {return load();}
    function forget() {
      try {storage.removeItem(key);return true;} catch(_){return false;}
    }
    return Object.freeze({key,addExchange,addGift,relevant,list,forget});
  }
  function describe(events,maxChars=500) {
    if (!Array.isArray(events)) return '';
    const lines=[];
    for (const event of events) {
      const clean=safeEvent(event);
      if (!clean) continue;
      if (clean.type==='gift') {
        lines.push('Tương tác trò chơi trên thiết bị (chưa xác minh máy chủ): Người chơi tặng '+clean.itemName+'.');
      } else {
        lines.push('Đã trao đổi (không phải sự thật chính thức): Người chơi nói "'+clean.userText+
          '"; NPC đã đáp "'+clean.replyText+'".');
      }
    }
    const text=lines.join('\n');
    return text.length<=maxChars?text:text.slice(0,maxChars).trimEnd()+'…';
  }
  function relationship(affinity) {
    const n=Math.max(0,Math.min(100,Number(affinity)||0));
    return n>=80?'gắn bó':n>=50?'tin cậy':n>=20?'quen biết':'xa lạ';
  }
  return Object.freeze({VERSION,MAX_EVENTS,scopeKey,open,describe,relationship});
});
