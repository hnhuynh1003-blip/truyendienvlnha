// R3.2-D3-07: deterministic MOCK_ONLY tuning, not production balance.
export const MOCK_CONFIG=Object.freeze({forceMin:40,forceMax:70,timingMin:.38,timingMax:.62,staminaCost:5,capacity:6,hazards:[1,7,8],lightningHp:8});
export const SEAMS=Object.freeze([
 Object.freeze({min:25,max:40,hint:'Vân mảnh, mép đá dễ vụn',mark:'Mảnh'}),
 Object.freeze({min:45,max:65,hint:'Mạch liền, ánh sáng đều',mark:'Liền'}),
 Object.freeze({min:70,max:85,hint:'Mạch sâu, lớp đá dày',mark:'Sâu'})
]);
export function herbProfile(seed=17){const k=((seed%3)+3)%3;return {target:45+k*5,tolerance:10,hint:['Cuống mảnh, rễ nông: kéo nhẹ tay.','Thân mềm, rễ bám vừa: giữ lực đều.','Thân rễ chắc, lá rung chậm: cần lực chắc tay.'][k]};}
export function createState(seed=17){return {hp:100,stamina:60,injury:null,scene:null,status:'intact',charged:false,point:null,position:6,bag:[],warehouse:[],pending:[],serial:0,ended:true,seed:Number.isSafeInteger(seed)?seed:17,lastResult:null};}
export function enter(s,scene){if(!['herb','mineral','egg'].includes(scene)||!s.ended)return false;Object.assign(s,{scene,status:'intact',charged:false,point:null,position:6,bag:[],ended:false,lastResult:null});return true;}
const terminal=s=>s.ended||['success','damaged'].includes(s.status);
// Looking, adjusting and safe walking are preparation, not a confirmed collection.
export function begin(s){if(terminal(s))return false;s.status='active';return true;}
export function selectPoint(s,p){if(s.scene!=='mineral'||![0,1,2].includes(p)||!begin(s))return false;s.point=p;return true;}
function charge(s){if(terminal(s)||s.stamina<MOCK_CONFIG.staminaCost)return false;if(!s.charged){s.stamina-=MOCK_CONFIG.staminaCost;s.charged=true;}return true;}
function finish(s,success,reason){s.status=success?'success':'damaged';if(success)s.bag.push({id:'mock-'+(++s.serial),scene:s.scene});else{s.hp=Math.max(0,s.hp-MOCK_CONFIG.lightningHp);s.injury='Nhẹ';}s.lastResult={valid:true,success,lightning:!success,reason,integrity:success?'intact':reason==='force_high'?'broken':'uncollected'};return {...s.lastResult};}
export function move(s,p){if(s.scene!=='egg'||terminal(s)||!Number.isInteger(p)||p<0||p>8||Math.abs(Math.floor(p/3)-Math.floor(s.position/3))+Math.abs(p%3-s.position%3)!==1)return {valid:false,reason:'not_adjacent'};if(MOCK_CONFIG.hazards.includes(p)){if(!charge(s))return {valid:false,reason:'stamina'};s.position=p;return finish(s,false,'hazard');}begin(s);s.position=p;return {valid:true,nest:p===2};}
export function resolve(s,{force,timing}={}){
 if(terminal(s))return {valid:false,reason:'terminal'};
 if(s.scene==='egg'&&s.position!==2||s.scene==='mineral'&&s.point===null||!['herb','mineral','egg'].includes(s.scene))return {valid:false,reason:'preparation'};
 if(s.scene!=='egg'&&(!Number.isFinite(force)||force<0||force>100)||s.scene!=='mineral'&&(!Number.isFinite(timing)||timing<0||timing>=1))return {valid:false,reason:'input'};
 if(!charge(s))return {valid:false,reason:'stamina'};
 const h=herbProfile(s.seed),band=s.scene==='mineral'?SEAMS[s.point]:{min:h.target-h.tolerance,max:h.target+h.tolerance};
 const forceReason=s.scene==='egg'?null:force<band.min?'force_low':force>band.max?'force_high':null;
 const inTime=timing>=MOCK_CONFIG.timingMin&&timing<=MOCK_CONFIG.timingMax;
 const reason=forceReason||(s.scene!=='mineral'&&!inTime?'timing_miss':'success');
 const r=finish(s,reason==='success',reason);s.lastResult.force=s.scene==='egg'?null:force;s.lastResult.timing=s.scene==='mineral'?null:timing;s.lastResult.forceFeedback=s.scene==='egg'?null:forceReason||'force_ok';s.lastResult.timingFeedback=s.scene==='mineral'?null:inTime?'timing_hit':'timing_miss';return {...r,...s.lastResult};
}
export function claim(s){const room=Math.max(0,MOCK_CONFIG.capacity-s.warehouse.length);s.warehouse.push(...s.pending.splice(0,room));}
export function leave(s){if(!s.ended){s.pending.push(...s.bag.splice(0));s.ended=true;}claim(s);s.scene=null;}
