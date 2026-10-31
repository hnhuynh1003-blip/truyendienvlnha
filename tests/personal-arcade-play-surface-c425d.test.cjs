'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const core=require('../js/personal-arcade-core-v1.js');
const root=join(__dirname,'..');
const source=name=>readFileSync(join(root,name),'utf8');
const time=1793440000000;

test('C4.25D provides a lightweight transparent illustrated three-PC pod atlas',()=>{
 const image=readFileSync(join(root,'assets/arcade-c425d/neon-pod-states.webp'));
 assert.equal(image.toString('ascii',8,12),'WEBP');
 assert.ok(image.length>40000,'The gaming pod is a rendered artwork, not a placeholder');
 assert.ok(image.length<300000,'Keep the sprite atlas economical on 320px phones');
 const css=source('css/arcade-c425d-play-surface.css');
 const html=source('index.html');
 assert.match(css,/neon-pod-states\.webp/);
 assert.match(css,/\.neon-gaming-bay\.is-locked/);
 assert.match(css,/\.neon-gaming-bay\.is-occupied/);
 assert.match(css,/\.neon-floor-capacity-5/);
 assert.match(css,/\.neon-floor-capacity-7/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(html,/arcade-c425d-play-surface\.css\?v=c425d-1/);
 assert.ok(html.indexOf('arcade-c425d-play-surface.css')>html.indexOf('arcade-c425c-materiality.css'));
});

test('Jade stock uses a one-line summary and two compact real actions',()=>{
 const context={window:{DuduPersonalArcadeCoreV1:core}};
 vm.runInNewContext(source('js/personal-jade-ui-v1.js'),context);
 let s=core.fresh(time);s.coins=5000;
 const result=core.act(s,'jade-buy-pack-0-3',time,.4);
 assert.equal(result.ok,true);
 s=result.state;
 assert.equal(s.jade.stash.length,3);
 assert.equal(s.jade.active,null);
 const panel=context.window.DuduPersonalJadeUIV1.panel(s);
 const dock=panel.match(/<div class="jade-welcome jade-welcome-stock jade-stock-dock">([\s\S]*?)<\/div><\/div>/);
 assert.ok(dock,'The queued stones have a compact action dock');
 assert.match(dock[0],/3 viên đá chờ soi/);
 assert.match(dock[0],/data-arcade-action="jade-select-0"/);
 assert.match(dock[0],/data-arcade-action="jade-open-market"/);
 assert.doesNotMatch(dock[0],/<p>/);
 assert.doesNotMatch(dock[0],/jade-open-vault/);
 const selected=core.act(s,'jade-select-0',time,.4);
 assert.equal(selected.ok,true);
 assert.equal(selected.state.jade.stash.length,2);
 assert.equal(selected.state.jade.active.id,s.jade.stash[0].id);
});

test('Neon stage displays physical pods with the existing capacity and economics',()=>{
 const ui=source('js/personal-arcade-ui-v1.js');
 assert.match(ui,/neon-gaming-floor neon-floor-capacity-\$\{capacity\}/);
 assert.match(ui,/Cụm máy \$\{i\+1\}/);
 assert.match(ui,/neon-bay-art/);
 assert.match(ui,/i>=n\.stations/);
 assert.match(ui,/i<service\.guests&&n\.running/);
 assert.doesNotMatch(ui,/neon-computer-rack/);
 const n=core.fresh(time).neon;
 assert.equal(core.neonCapacity(n),3);
 n.roomTier=2;assert.equal(core.neonCapacity(n),5);
 n.roomTier=3;assert.equal(core.neonCapacity(n),7);
 assert.match(source('index.html'),/pods=c425d-1/);
});
