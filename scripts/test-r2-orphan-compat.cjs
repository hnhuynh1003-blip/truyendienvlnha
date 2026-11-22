// Apply reviewed test adaptations in an isolated integration tree. Never merge/push dependencies.
'use strict';
const cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function run(command,args,cwd=root,input){const r=cp.spawnSync(command,args,{cwd,input,encoding:'utf8',maxBuffer:8000000,env:{...process.env,GIT_AUTHOR_NAME:'Local compatibility QA',GIT_AUTHOR_EMAIL:'qa@example.invalid',GIT_COMMITTER_NAME:'Local compatibility QA',GIT_COMMITTER_EMAIL:'qa@example.invalid'}});if(r.status!==0){console.error((r.stdout||'').split('\n').filter(l=>/^not ok |^# (tests|pass|fail|skipped) /.test(l)).join('\n'));throw Error('COMPATIBILITY_CHECK_FAILED: '+command+' '+args.slice(0,2).join(' '));}return r.stdout.trim();}
let parent=run('git',['rev-parse','HEAD']);
for(const ref of ['origin/perf/firestore-read-quota','origin/hotfix/r2-epub-safe-diagnostics']){
 const sha=run('git',['rev-parse',ref]);console.log(JSON.stringify({dependency:ref,sha}));
 const tree=run('git',['merge-tree','--write-tree',parent,sha]).split('\n')[0];parent=run('git',['commit-tree',tree,'-p',parent,'-p',sha],root,'LOCAL QA ONLY\n');
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dudu-orphan-compat-'));
run('git',['worktree','add','--detach',temp,parent]);
run('git',['apply','--unidiff-zero',path.join(root,'docs/r2-orphan-recovery/PR41_PR42_TEST_COMPAT.patch')],temp);
for(const files of [
 ['tests/firestore-read-quota-r1.test.cjs','tests/r2-epub-diagnostics-safety.test.cjs','tests/firebase-owner-clock-skew-c13b6d.test.cjs'],
 ['tests/r2-orphan-guard.test.mjs','tests/r2-orphan-client.test.cjs','tests/r2-pending-recovery-r1.test.cjs','tests/r2-published-preflight-r1.test.cjs','tests/auth-v2.test.cjs','tests/profile-save-c23.test.cjs'],
 fs.readdirSync(path.join(temp,'tests')).filter(f=>/^(library|epub).*\.test\.cjs$/.test(f)).map(f=>'tests/'+f)
]){const output=run(process.execPath,['--test','--test-reporter=tap',...files],temp);console.log(output.split('\n').filter(l=>/^# (tests|pass|fail|skipped) /.test(l)).join('\n'));}
console.log('COMPATIBILITY_PASS_PATCH_APPLIED_NO_UPSTREAM_CHANGES');
// Keep the isolated tree for review; do not recursively remove a computed filesystem path.
