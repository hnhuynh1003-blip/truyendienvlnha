"""Prepare a reviewable Tu Tien-only snapshot; never change refs or worktree index."""
import hashlib, io, json, pathlib, shutil, subprocess, zipfile
root=pathlib.Path(__file__).resolve().parents[2]
out=root/'tools/local-backups/tutien-main-candidate'
def git(*args): return subprocess.check_output(['git',*args],cwd=root)
assert not out.exists(), 'Candidate already exists; do not overwrite'
base=git('rev-parse','origin/main').decode().strip()
main=git('rev-parse','main').decode().strip()
merged=git('merge-tree','--write-tree','main','origin/main').decode().strip()
assert git('diff','--name-only','origin/main',merged).decode().splitlines()==['cloudflare/package-lock.json'], 'Unexpected local main delta: review first'
assert git('show',merged+':cloudflare/package-lock.json')==git('show','main:cloudflare/package-lock.json'), 'Existing main lockfile must remain unchanged'
out.mkdir(parents=True)
with zipfile.ZipFile(io.BytesIO(git('archive','--format=zip',merged))) as z: z.extractall(out)
files=[]
for folder in ['prototypes/tutien-combat-s','assets/tu-tien/vis-t1','assets/tu-tien/vis-t2/web','assets/tu-tien/vis-t2-nav/assets/webp','assets/tu-tien/vis-t2e/web']:
    files += [p.relative_to(root).as_posix() for p in (root/folder).rglob('*') if p.is_file()]
files += ['js/'+n for n in ['tutien-integ-t0.js','tutien-vis-t1.mjs','tutien-view-ux-r2.mjs','tutien-qiankun-vis-t2.mjs','tutien-nav-skin-r1.mjs','tutien-equipment-vis-t2e.mjs','cyber-phone-host-ui-r1.js']]
files += ['css/'+n for n in ['tutien-integ-t0.css','tutien-integ-t0-frame.css','tutien-qiankun-vis-t2.css','tutien-nav-skin-r1.css','tutien-equipment-vis-t2e.css','cyber-phone-host-ui-r1.css']]
files += ['tools/tutien-integ-t0/'+n for n in ['serve.mjs','offline-sdk.js','integration.test.mjs','ux-r2.test.mjs','qiankun-vis-t2.test.mjs','equipment-vis-t2e.test.mjs','README.md','VIS-T1.md','UX-R2-AUDIT.md','VIS-T2-QIANKUN-QA.md','VIS-T2-NAV-SKIN-R1-QA.md','VIS-T2-NAV-R2-QA.md','VIS-T2E-QA.md','VIS-T2E-R1-QA.md']]
for name in files:
    dest=out/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/name,dest)
# Scope host geometry to this app. Other applications retain upstream main CSS.
p=out/'css/cyber-phone-host-ui-r1.css'
p.write_text(p.read_text(encoding='utf8').replace('#cyber-phone','#cyber-phone.tutien-integ-open'),encoding='utf8')
# Select exactly the Tu Tien navigation hook, sandbox banner ID and app resources.
p=out/'index.html';s=p.read_text(encoding='utf8')
old='        window.DuduCultivationT0?.render();'
assert s.count(old)==1
s=s.replace(old,"        if(window.DuduTuTienIntegT0) window.DuduTuTienIntegT0.render();\n        else window.DuduCultivationT0?.render();")
needle='      document.body.prepend(banner);';assert s.count(needle)==1
s=s.replace(needle,"      banner.id = 'dudu-sandbox-banner';\n"+needle)
needle='<script src="js/cultivation-t0.js?v=final-1"></script>';assert s.count(needle)==1
s=s.replace(needle,needle+'\n<link rel="stylesheet" href="css/tutien-integ-t0.css?v=2">\n<link rel="stylesheet" href="css/cyber-phone-host-ui-r1.css?v=tutien-only-1">\n<script src="js/cyber-phone-host-ui-r1.js?v=1"></script>\n<script src="js/tutien-integ-t0.js?v=1"></script>')
p.write_text(s,encoding='utf8')
files.append('index.html')
# Reuse proven offline browser checks, independently of the Neon tool package.
p=out/'tools/tutien-main-integration';p.mkdir(parents=True)
runner=(root/'tools/neon-n20/run-tutien.mjs').read_text(encoding='utf8').replace("from './serve.mjs'","from '../tutien-integ-t0/serve.mjs'").replace('dudu-neon-tutien-','dudu-tutien-main-')
(p/'run-browser.mjs').write_text(runner,encoding='utf8')
files.append('tools/tutien-main-integration/run-browser.mjs')
# Avoid the inherited denied webmanifest request in this offline test server.
p=out/'tools/tutien-integ-t0/serve.mjs';s=p.read_text(encoding='utf8')
needle=" const p=raw==='/'?'/index.html':raw;"
assert needle in s
s=s.replace(needle," if(raw==='/manifest.webmanifest'){res.writeHead(200,{'content-type':'application/manifest+json'}).end(req.method==='HEAD'?undefined:JSON.stringify({name:'DUDU offline QA',start_url:'/?sandbox=1',display:'standalone',icons:[]}));return;}\n"+needle)
p.write_text(s,encoding='utf8')
manifest={'base':base,'localMainBefore':main,'mergedTree':merged,'sourceHead':git('rev-parse','HEAD').decode().strip(),'files':sorted(files),'candidate':str(out)}
(root/'tools/tutien-main-integration/selection.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
print(json.dumps({'candidate':str(out),'selected':len(files),'base':base}))
