'use strict';
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const g=require('../js/vanbao-puzzle-generator-f45.js'),m=require('../js/vanbao-puzzle-model-f45.js'),vectors=require('../tests/fixtures/vanbao-f45-seeds.json');
const dir=path.resolve(__dirname,'../docs/f45b2a/evidence');fs.mkdirSync(dir,{recursive:true});
const rows=[],keys=new Set(),cores=new Set();let maxHeap=0;
for(let i=0;i<vectors.seeds.length;i++)for(const difficulty of ['NOVICE','EASY']){
  const request={seed:vectors.seeds[i],difficulty,fallback:true,excludeCanonicalKeys:[...keys].sort()};
  const t=performance.now(),r=g.generate(request),ms=performance.now()-t;
  if(m.stable(r)!==m.stable(g.generate(request)))throw Error('Deterministic replay mismatch');
  if(r.puzzle){if(!m.verifyRecord(r.puzzle).ok)throw Error('Independent certificate failure');if(keys.has(r.puzzle.canonical))throw Error('Duplicate accepted in batch');keys.add(r.puzzle.canonical);cores.add(r.puzzle.coreKey);}
  maxHeap=Math.max(maxHeap,process.memoryUsage().heapUsed);
  rows.push({seed:request.seed,difficulty,status:r.status,ms,stats:r.stats,boardHash:r.puzzle?.boardHash,canonical:r.puzzle?.canonical,coreKey:r.puzzle?.coreKey,family:r.puzzle?.family,source:r.puzzle?.source,verifierEntries:r.puzzle?.metrics.verifierEntries});
}
const times=rows.map(r=>r.ms).sort((a,b)=>a-b),rejects={};for(const r of rows)for(const [key,n]of Object.entries(r.stats.rejected))rejects[key]=(rejects[key]||0)+n;
const summary={node:process.version,seeds:vectors.seeds.length,requests:rows.length,deterministicReplays:rows.length,config:g.DEFAULTS,counts:Object.fromEntries([...new Set(rows.map(r=>r.status))].map(s=>[s,rows.filter(r=>r.status===s).length])),uniqueCanonical:keys.size,uniqueCoreSignatures:cores.size,distinctFamilies:[...new Set(rows.map(r=>r.family).filter(Boolean))],rejected:rejects,workUnitsMax:Math.max(...rows.map(r=>r.stats.workUnits)),attemptsMax:Math.max(...rows.map(r=>r.stats.attempts)),p50Ms:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],maxMs:times.at(-1),heapUsedSnapshotMax:maxHeap,notes:'Desktop offline; synchronous pure generation with deterministic work cap. Core repetition is reported, not counted as new tactics. No Android/thermal or real-time guarantee.'};
fs.writeFileSync(path.join(dir,'batch-results.json'),JSON.stringify({summary,rows},null,2)+'\n');console.log(JSON.stringify(summary,null,2));
