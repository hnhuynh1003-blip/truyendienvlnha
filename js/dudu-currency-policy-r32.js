/* DUDU R3.2 — Xu / Linh Thach exchange quotations only.
 * Currency metadata, NOT a wallet or a transaction authority.
 * Never calls Firebase, mutates a profile, or migrates Arcade balances.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduCurrencyPolicyR32=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const XU_PER_LINH_THACH=100;
 const MAX_BALANCE=1000000000;
 const DIRECTIONS=Object.freeze({XU_TO_STONE:'XU_TO_STONE',STONE_TO_XU:'STONE_TO_XU'});
 const valid=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_BALANCE;
 const denomination=Object.freeze({XU:'Xu',LINH_THACH:'Linh Thạch'});
 const base=(direction)=>({ok:false,previewOnly:true,direction,rate:XU_PER_LINH_THACH,
  amountSpent:0,amountReceived:0,spendUnit:direction===DIRECTIONS.STONE_TO_XU?'LINH_THACH':'XU',
  receiveUnit:direction===DIRECTIONS.STONE_TO_XU?'XU':'LINH_THACH'});
 function quote({direction,xuBalance,linhThachBalance,amount}={}){
  const response=base(direction);
  if(!Object.values(DIRECTIONS).includes(direction)||!valid(xuBalance)||
     !valid(linhThachBalance)||!Number.isSafeInteger(amount)||amount<=0)
   return Object.freeze({...response,reason:'invalid-input'});
  const xuToStone=direction===DIRECTIONS.XU_TO_STONE;
  if(xuToStone&&amount%XU_PER_LINH_THACH!==0)
   return Object.freeze({...response,reason:'must-be-multiple-of-100-xu'});
  const received=xuToStone?amount/XU_PER_LINH_THACH:amount*XU_PER_LINH_THACH;
  const from=xuToStone?xuBalance:linhThachBalance;
  const to=xuToStone?linhThachBalance:xuBalance;
  if(amount>from)return Object.freeze({...response,reason:'insufficient-balance'});
  if(!Number.isSafeInteger(received)||received>MAX_BALANCE||to>MAX_BALANCE-received)
   return Object.freeze({...response,reason:'destination-cap'});
  return Object.freeze({...response,ok:true,reason:'preview-ready',
   amountSpent:amount,amountReceived:received,
   remainingSource:from-amount,resultingDestination:to+received});
 }
 return Object.freeze({XU_PER_LINH_THACH,MAX_BALANCE,DIRECTIONS,denomination,quote});
});