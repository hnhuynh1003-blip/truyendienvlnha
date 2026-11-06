'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{performance}=require('node:perf_hooks');
const g=require('../js/vanbao-motif-generator-f45b2b'),m=require('../js/vanbao-puzzle-model-f45'),t=require('../js/vanbao-tactics-f45b2b'),{JobQueue}=require('../js/vanbao-job-queue-f45b2b'),vectors=require('../tests/fixtures/vanbao-b2b-seeds.json');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/f45b2b/evidence'),phase=process.argv.find(x=>x.startsWith('--phase='))?.slice(8);fs.mkdirSync(out,{recursive:true});
const measuredFiles=['js/vanbao-tactics-f45b2b.js','js/vanbao-motif-generator-f45b2b.js','js/vanbao-job-queue-f45b2b.js','tests/vanbao-b2b.test.cjs','tests/fixtures/vanbao-b2b-seeds.json','scripts/benchmark-vanbao-b2b.cjs'];
const hashes=()=>Object.fromEntries(measuredFiles.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
const percentiles=xs=>{const a=xs.filter(x=>Number.isFinite(x)).sort((a,b)=>a-b);return{count:a.length,p50:a[Math.ceil(a.length*.5)-1],p95:a[Math.ceil(a.length*.95)-1],p99:a[Math.ceil(a.length*.99)-1],max:a.at(-1)};};
const save=(name,x)=>fs.writeFileSync(path.join(out,name),JSON.stringify(x,null,2)+'\n');
function corpus(seeds){const keys=new Set(),cores=new Set(),fps=new Set(),examples={},rows=[],rejected={},distribution={};let replayed=0;
  for(const seed of seeds)for(const motif of Object.keys(g.STEMS)){
    const request={seed,motif,excludeCanonicalKeys:[...keys].sort()},start=performance.now(),r=g.generate(request),ms=performance.now()-start;
    if(m.stable(r)!==m.stable(g.generate(request)))throw Error('replay mismatch');replayed++;
    for(const [k,n]of Object.entries(r.stats))if(!['attempts','workUnits'].includes(k))rejected[k]=(rejected[k]||0)+n;
    if(r.puzzle){if(!g.verifyRecord(r.puzzle).ok||keys.has(r.puzzle.canonical))throw Error('bad certificate/duplicate');keys.add(r.puzzle.canonical);cores.add(r.puzzle.coreKey);fps.add(r.puzzle.tactical.key);examples[motif]??=r.puzzle;const band=r.puzzle.experimentalBand;distribution[band]??={};distribution[band][motif]=(distribution[band][motif]||0)+1;}
    rows.push({seed,motif,status:r.status,ms,stats:r.stats,boardHash:r.puzzle?.boardHash,fingerprint:r.puzzle?.tactical.key,band:r.puzzle?.experimentalBand});
  }
  // Separate policy-similarity rejection experiment; does not pad the accepted corpus.
  const strictSeen=new Set(),strict=[];for(const seed of seeds.slice(0,4))for(const motif of Object.keys(g.STEMS)){const r=g.generate({seed,motif,excludeFingerprints:[...strictSeen].sort()});if(r.puzzle)strictSeen.add(r.puzzle.tactical.key);strict.push({seed,motif,status:r.status,rejected:r.stats.tacticalDuplicate});}
  return{summary:{phase,seeds:seeds.length,requests:rows.length,version:g.VERSION,config:{attemptLimit:8,nodeBudget:50000},counts:Object.fromEntries([...new Set(rows.map(r=>r.status))].map(s=>[s,rows.filter(r=>r.status===s).length])),fallback:0,uniqueCanonical:keys.size,uniqueCore:cores.size,uniqueTacticalFingerprints:fps.size,motifs:Object.keys(examples),distribution,rejected,deterministicReplays:replayed,timeMs:percentiles(rows.map(r=>r.ms)),strictTacticalDedup:{requests:strict.length,certified:strict.filter(r=>r.status==='CERTIFIED').length,tacticalRejectedCandidates:strict.reduce((n,r)=>n+r.rejected,0)}},rows,examples,strict};
}
(async()=>{
  if(phase==='freeze'){if(fs.existsSync(path.join(out,'heldout.json')))throw Error('held-out already used; no silent re-freeze');save('freeze.json',{version:g.VERSION,hashes:hashes(),protocol:vectors.protocol,holdoutNotRun:true});console.log('Frozen source/config before held-out evaluation.');return;}
  if(['heldout','resources'].includes(phase)){const frozen=JSON.parse(fs.readFileSync(path.join(out,'freeze.json'),'utf8'));if(m.stable(frozen.hashes)!==m.stable(hashes()))throw Error('Frozen code changed: held-out invalidated');}
  if(phase==='development'||phase==='heldout'){
    const result=corpus(phase==='development'?vectors.developmentSeeds:vectors.heldOutSeeds);result.sourceHashes=hashes();save(phase+'.json',result);
    if(phase==='development'){const census=Object.fromEntries(Object.entries(result.examples).map(([k,p])=>[k,t.census(p.board,{horizon:p.horizon,nodeBudget:50000})]));save('census.json',census);}
    console.log(JSON.stringify(result.summary,null,2));return;
  }
  if(phase==='resources'){
    const queue=new JobQueue(),jobs=[];
    for(let round=0;round<3;round++)for(let i=0;i<10;i++){const motif=Object.keys(g.STEMS)[i%5],request={seed:vectors.developmentSeeds[(round*10+i)%vectors.developmentSeeds.length],motif};const r=await queue.submit({kind:'generate',request},{timeoutMs:10000});if(r.status!=='CERTIFIED'||!r.jobMetrics.telemetry.verified)throw Error('resource sample failed');jobs.push({round,motif,status:r.status,stats:r.stats,jobMetrics:r.jobMetrics});}
    const cancellation=[];for(let i=0;i<8;i++){const controller=new AbortController(),promise=queue.submit({kind:'generate',request:{seed:vectors.developmentSeeds[i],motif:'FORCING_CHAIN'}},{signal:controller.signal,timeoutMs:i%2?10000:0,onProgress:()=>controller.abort()});const r=await promise;if(r.puzzle)throw Error('late successful puzzle');cancellation.push(r);}
    await queue.close();const tel=jobs.map(j=>j.jobMetrics.telemetry),workerSamples=tel.flatMap(x=>x.samples),parentSamples=jobs.flatMap(j=>j.jobMetrics.parentSamples);
    const summary={jobs:jobs.length,rounds:3,queue:queue.state,statuses:{CERTIFIED:jobs.length},startupMs:percentiles(jobs.map(j=>j.jobMetrics.startupMs)),generateMs:percentiles(tel.map(j=>j.generateMs)),verifyMs:percentiles(tel.map(j=>j.verifyMs)),totalMs:percentiles(jobs.map(j=>j.jobMetrics.totalMs)),workerHeapSampledMaximum:Math.max(...workerSamples.map(s=>s.heapUsed)),processRssSampledMaximum:Math.max(...parentSamples.map(s=>s.rss)),rssAfterTerminate:jobs.map(j=>j.jobMetrics.parentSamples.at(-1).rss),cancellation:cancellation.map(r=>r.status),measurement:'Heap: isolate-local boundary/every32 work units; parent RSS poll target5ms. Sampled maxima can miss short spikes; RSS shared process not per-isolate, no true peak claim. No forced GC. Sequential workers terminated before next job.'};
    save('resources.json',{summary,jobs,cancellation});console.log(JSON.stringify(summary,null,2));return;
  }
  throw Error('Use --phase=development|freeze|heldout|resources');
})().catch(e=>{console.error(e);process.exitCode=1;});
