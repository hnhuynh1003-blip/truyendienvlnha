// Read-only presentation of the engine cost. Unknown is never converted to zero.
export function entryCostView(cost){return {hidden:!Number.isFinite(cost)||cost<=0,text:Number.isFinite(cost)&&cost>0?cost+' Th\u1ec3 L\u1ef1c':''};}
