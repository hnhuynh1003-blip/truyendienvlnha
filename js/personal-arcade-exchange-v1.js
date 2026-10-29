/* DUDU Arcade → System Xu exchange quote, PREVIEW ONLY.
 * No writes, no wallet grants. Firestore authority and daily receipts are
 * required before converting any of these quotes into real transactions.
 * Arcade coin balances are stored in TENTHS of game Xu.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalArcadeExchangeV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const GAME_XU_PER_WALLET_XU=10;
 const MIN_GAME_XU=10;
 const DAILY_WALLET_XU_CAP=30;
 const TENTHS_PER_GAME_XU=10;
 const validBalance=value=>Number.isSafeInteger(value)&&value>=0&&value<=1000000000;
 function remaining({availableTenths,transferredToday=0}={}){
  if(!validBalance(availableTenths)||!Number.isSafeInteger(transferredToday)||
     transferredToday<0||transferredToday>DAILY_WALLET_XU_CAP)
   return {ok:false,maxGameXu:0,remainingDailyWalletXu:0};
  const daily=DAILY_WALLET_XU_CAP-transferredToday;
  const availableWholeWallet=Math.floor(availableTenths/
   (GAME_XU_PER_WALLET_XU*TENTHS_PER_GAME_XU));
  return {ok:true,maxGameXu:Math.min(daily,availableWholeWallet)*GAME_XU_PER_WALLET_XU,
   remainingDailyWalletXu:daily};
 }
 function quote({availableTenths,requestedGameXu,transferredToday=0}={}){
  const allowance=remaining({availableTenths,transferredToday});
  const base={previewOnly:true,rate:GAME_XU_PER_WALLET_XU,
   dailyWalletCap:DAILY_WALLET_XU_CAP,maxGameXu:allowance.maxGameXu,
   remainingDailyWalletXu:allowance.remainingDailyWalletXu,
   gameXu:0,walletXu:0};
  if(!allowance.ok)return {...base,ok:false,reason:'invalid-balance-or-day'};
  if(!Number.isSafeInteger(requestedGameXu)||requestedGameXu<MIN_GAME_XU)
   return {...base,ok:false,reason:'minimum-10-game-xu'};
  if(requestedGameXu%GAME_XU_PER_WALLET_XU!==0)
   return {...base,ok:false,reason:'must-be-multiple-of-10'};
  if(requestedGameXu>allowance.maxGameXu)
   return {...base,ok:false,reason:'insufficient-or-daily-cap'};
  return {...base,ok:true,reason:'preview-ready',gameXu:requestedGameXu,
   walletXu:requestedGameXu/GAME_XU_PER_WALLET_XU};
 }
 return Object.freeze({GAME_XU_PER_WALLET_XU,MIN_GAME_XU,
  DAILY_WALLET_XU_CAP,TENTHS_PER_GAME_XU,remaining,quote});
});
