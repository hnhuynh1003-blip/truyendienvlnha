// Read-only presentation projections: never change battle/result/reward state.
export function battlePresentation(state) {
  const b=state.battle,active=b?.state==='ACTIVE';
  const outcome=b?.result?.outcome||b?.state;
  const outcomeLabels={WON:'Chiến thắng',LOST:'Chiến bại',RETREATED:'Đã rút lui'};
  let context='Chưa có trận. Nhấn Bắt đầu trận mới khi sẵn sàng.';
  if(b&&!active)context=`${outcomeLabels[outcome]||'Trận đã kết thúc'}. Bạn đang ở điểm an toàn. ${state.hp===0?'Sinh Mệnh còn 0 từ trận trước; nhấn Nghỉ mock để hồi phục.':'HP/LL bên dưới là tài nguyên hiện tại, không phải trận đang chạy.'}`;
  return {active:!!active,enemyVisible:!!active,controlsVisible:!!active,
    location:active?'CHIẾN CẢNH · MOCK':'ĐIỂM AN TOÀN',context,
    resultTitle:outcomeLabels[outcome]||'',hasResult:!!b&&!active};
}
export function cooldownRemaining(battle,skillId) {
  if(!battle||battle.state!=='ACTIVE'||!Number.isInteger(battle.readyAt?.[skillId]))return 0;
  return Math.max(0,battle.readyAt[skillId]-battle.turn);
}
