/* DUDU Arcade → System Xu exchange quote, PREVIEW ONLY.
 * No writes or wallet grants. A trusted, idempotent transaction is required
 * before any quote becomes a real transfer.
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
 const TENTHS_PER_GAME_XU=10;
 const validBalance=value=>Number.isSafeInteger(value)&&value>=0&&value<=1000000000;
 function remaining({availableTenths}={}){
  if(!validBalance(availableTenths))return {ok:false,maxGameXu:0};
  const availableWholeWallet=Math.floor(availableTenths/
   (GAME_XU_PER_WALLET_XU*TENTHS_PER_GAME_XU));
  return {ok:true,maxGameXu:availableWholeWallet*GAME_XU_PER_WALLET_XU};
 }
 function quote({availableTenths,requestedGameXu}={}){
  const allowance=remaining({availableTenths});
  const base={previewOnly:true,rate:GAME_XU_PER_WALLET_XU,
   maxGameXu:allowance.maxGameXu,gameXu:0,walletXu:0};
  if(!allowance.ok)return {...base,ok:false,reason:'invalid-balance'};
  if(!Number.isSafeInteger(requestedGameXu)||requestedGameXu<MIN_GAME_XU)
   return {...base,ok:false,reason:'minimum-10-game-xu'};
  if(requestedGameXu%GAME_XU_PER_WALLET_XU!==0)
   return {...base,ok:false,reason:'must-be-multiple-of-10'};
  if(requestedGameXu>allowance.maxGameXu)
   return {...base,ok:false,reason:'insufficient-balance'};
  return {...base,ok:true,reason:'preview-ready',gameXu:requestedGameXu,
   walletXu:requestedGameXu/GAME_XU_PER_WALLET_XU};
 }
 return Object.freeze({GAME_XU_PER_WALLET_XU,MIN_GAME_XU,
  TENTHS_PER_GAME_XU,remaining,quote});
});
