/* CASINO-SLOT1 — animated preview cabinet. NO wallet adapter is enabled.
 * This UI mounts only when explicitly called with {demo:true}; it cannot
 * purchase a spin, call Firestore, or update any real Xu account.
 */
(function(root){
 'use strict';
 const rules=root.DuduCasinoDesignV1;
 if(!rules)return;
 const initial=[['star','bell','dragon'],['peach','jade','star'],
  ['phoenix','bell','crown']];
 const sessions=new Map();
 const lookup=new Map(rules.SYMBOLS.map(s=>[s.id,s]));
 const $=(tag,cls,label)=>{
  const node=root.document.createElement(tag);
  if(cls)node.className=cls;
  if(label!==undefined)node.textContent=String(label);
  return node;
 };
 const summary=q=>!q?'Chọn tiền cược và nhấn QUAY MÁY.':
  q.lines.some(line=>line.kind==='triple'&&line.payout>=q.bet*70)?
   'NỔ HŨ THIÊN MIỆN! Lãi '+q.net+' Xu mẫu!':
  q.payout>q.bet?'TRÚNG THƯỞNG! Lãi '+q.net+' Xu mẫu!':
  q.payout===q.bet?'Hòa vốn · Trả lại '+q.payout+' Xu mẫu.':
  q.payout>0?'Nhận lại '+q.payout+' Xu mẫu · Lỗ '+(-q.net)+' Xu mẫu.':
  'Trượt giải · Không có thưởng ở lượt này.';
 function randomRolls(){
  if(!root.crypto?.getRandomValues)throw Error('random-unavailable');
  // Rejection sampling avoids modulo bias across the one-million roll space.
  const cap=Math.floor(4294967296/1000000)*1000000,rolls=[];
  while(rolls.length<9){
   const values=new Uint32Array(9-rolls.length);
   root.crypto.getRandomValues(values);
   for(const value of values){if(value<cap)rolls.push(value%1000000);}
  }
  return rolls;
 }
 function mount({host,demo,sessionKey}={}){
  if(!host||demo!==true)return false;
  // FUN swaps the stage node when changing tabs. Rebind the same preview
  // session so any precommitted spin survives navigation and rerenders.
  const key=typeof sessionKey==='string'&&sessionKey.length<=128?sessionKey:null;
  if(key&&sessions.has(key)){
   const previous=sessions.get(key);previous.attach(host);
   return previous.controller;
  }
  let target=host;
  const state={bet:10,rows:initial.map(row=>[...row]),busy:false,
   quote:null,spins:0,pending:null,stopped:0,error:''};
  function render(){
   const shell=$('section','dudu-slot-preview');
   shell.append($('div','dudu-slot-eyebrow','✦ DUDU FUN · CASINO FANTASY'),
    $('h1','dudu-slot-heading','MÁY QUAY VẠN TƯỢNG'),
    $('p','dudu-slot-caption','Ba cuộn phép thuật · Ba đường thắng · Bảy biểu tượng may mắn'));
   const badge=$('div','dudu-slot-demo-badge','BẢN XEM THỬ · KHÔNG TRỪ / CỘNG XU THẬT');
   shell.append(badge);
   const cabinet=$('div','dudu-slot-cabinet'+(state.busy?' is-spinning':''));
   cabinet.append($('div','dudu-slot-marquee','✧  ✦  VẠN TƯỢNG  ✦  ✧'));
   const screen=$('div','dudu-slot-screen');
   const cells=$('div','dudu-slot-reels');
   for(let row=0;row<3;row++){
    const entry=state.quote?.lines[row],lit=entry?.payout>0;
    for(let col=0;col<3;col++){
     const symbol=lookup.get(state.rows[row][col]);
     const tile=$('div','dudu-slot-tile'+(lit?' is-winning':'')+
      (state.busy&&col<state.stopped?' is-stopped':''));
     tile.style.setProperty('--col',String(col));
     tile.setAttribute('aria-label',symbol.name);
     tile.append($('span','dudu-slot-icon',symbol.icon));
     cells.append(tile);
    }
   }
   screen.append(cells);cabinet.append(screen);
   const payLines=$('div','dudu-slot-lines');
   for(let row=0;row<3;row++){
    const line=state.quote?.lines[row],payout=line?.payout||0;
    const label=$('span','dudu-slot-line'+(payout?' is-winning':''),
     'Hàng '+(row+1)+' · '+(payout?'+'+payout+' Xu mẫu':'—'));
    payLines.append(label);
   }
   cabinet.append(payLines);
   const jackpot=state.quote?.lines.some(line=>line.kind==='triple'&&
    line.payout>=state.bet*70);
   const result=$('div','dudu-slot-result'+(state.quote?
    (jackpot?' is-jackpot':state.quote.net>0?' is-win':' is-loss'):''));
   result.setAttribute('aria-live','polite');
   result.append($('strong','',state.busy?'✦ ĐANG QUAY ✦':summary(state.quote)),
    $('small','',state.busy?'Đã dừng '+state.stopped+'/3 cuộn…':
     'Đã xem '+state.spins+' lượt · Cược mẫu '+state.bet+' Xu'));
   cabinet.append(result);shell.append(cabinet);
   const control=$('div','dudu-slot-controls');
   control.append($('strong','dudu-slot-bet-label','🎟️ Chọn chip cược (mẫu)'));
   const chips=$('div','dudu-slot-chips');
   for(const bet of rules.BETS){
    const button=$('button','dudu-slot-chip'+(state.bet===bet?' is-selected':''),
     '🟡 '+bet);
    button.type='button';button.disabled=state.busy;
    button.setAttribute('aria-pressed',String(state.bet===bet));
    button.addEventListener('click',()=>{if(state.busy)return;
     state.bet=bet;render();});
    chips.append(button);
   }
   control.append(chips);
   const spin=$('button','dudu-slot-spin',state.busy?'✦ MÁY ĐANG QUAY…':'🎰 QUAY MÁY');
   spin.type='button';spin.disabled=state.busy;
   spin.addEventListener('click',()=>{void play();});
   control.append(spin);
   if(state.error)control.append($('p','dudu-slot-error',state.error));
   shell.append(control);
   const odds=$('details','dudu-slot-payouts');
   odds.append($('summary','','Bảng thưởng & tỷ lệ công khai ›'),
    $('p','','Mỗi hàng ngang tính riêng. Hai hình giống: 0,1× cược. Ba hình giống: hệ số dưới đây. Không tính đường chéo.'));
   const table=$('div','dudu-slot-odds-grid');
   for(const symbol of rules.SYMBOLS){
    table.append($('span','',symbol.icon+' '+symbol.name),
     $('span','',symbol.weight+'% · ×'+symbol.triple));
   }
   odds.append(table,$('small','','Giá trị kỳ vọng cơ sở: '+
    (rules.slotRtp()*100).toFixed(4).replace('.',',')+
    '%. Chưa gồm các vật phẩm đang thiết kế.'));
   shell.append(odds,$('p','dudu-slot-notice',
    'Chỉ xem hoạt ảnh và luật quay. Không kết nối Firebase, không nhận thưởng, không mua đồ. Khi Du duyệt Xu thật mới tích hợp vào DUDU FUN.'));
   target.replaceChildren(shell);
  }
  async function play(){
   if(state.busy)return false;
   try{
    const rows=rules.grid(randomRolls()),quote=rules.slotQuote({bet:state.bet,rows});
    if(!quote.ok)throw Error('invalid-spin');
    // Precommit the outcome BEFORE any animation. Never reroll during reveal.
    state.pending={rows,quote};state.busy=true;state.stopped=0;
    state.quote=null;state.error='';
    render();
    for(let col=0;col<3;col++){
     await new Promise(resolve=>root.setTimeout(resolve,250+col*100));
     for(let row=0;row<3;row++)state.rows[row][col]=state.pending.rows[row][col];
     state.stopped=col+1;render();
    }
    state.quote=state.pending.quote;
    state.pending=null;state.spins++;return true;
   }catch(_){state.error='Trình duyệt không tạo được lượt xem thử.';return false;}
   finally{state.busy=false;state.stopped=0;render();}
  }
  function attach(next){target=next;render();}
  const controller=Object.freeze({play,state:()=>({bet:state.bet,busy:state.busy,
   spins:state.spins,quote:state.quote})});
  render();
  if(key)sessions.set(key,{attach,controller});
  return controller;
 }
 root.DuduCasinoSlotUIV1=Object.freeze({mount});
})(typeof window!=='undefined'?window:{});
