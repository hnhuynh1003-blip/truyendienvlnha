'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const source=path=>readFileSync(join(root,path),'utf8');

test('C4.25A has distinct AI-painted WebP stages and a ten-material atlas',()=>{
 const assets=['neon-cafe.webp','mine-cavern.webp','ore-atlas.webp'];
 let bytes=0;
 for(const name of assets){
  const data=readFileSync(join(root,'assets/arcade-c425a',name));
  assert.equal(data.toString('ascii',8,12),'WEBP');
  assert.ok(data.byteLength>20000,`${name} must be real rendered art`);
  bytes+=data.byteLength;
 }
 assert.ok(bytes<750000,'Keep all first-wave artwork under 750 KB on Android');
 const styles=source('css/arcade-c425a-worlds.css');
 for(const asset of assets)assert.ok(styles.includes(asset));
 for(const ore of ['stone','coal','iron','copper','silver','gold','crystal','jade','meteor','relic'])
  assert.match(styles,new RegExp(`\\.ore-portrait-${ore}\\{background-position:`));
 assert.match(styles,/\.neon-computer\.is-locked/);
 assert.match(styles,/\.mine-dig-phase-3 \.mine-fracture-lines/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
});

test('C4.25A keeps actual Arcade actions under state-derived scenes',()=>{
 const ui=source('js/personal-arcade-ui-v1.js');
 const html=source('index.html');
 for(const control of ['toggle-neon','neon-turbo','mine','mine-burst','sell-ores',
  'repair-forge','mine-scanner','mine-probe-${i}','neon-order-${i}'])
  assert.ok(ui.includes(control),`${control} remains interactive`);
 assert.match(ui,/mine-dig-phase-\$\{m\.dug%4\}/);
 assert.match(ui,/neon-computer-\$\{i\+1\}/);
 assert.match(ui,/neon-coin-fountain/);
 assert.match(ui,/mine-inventory-slot mine-slot-\$\{ore\}/);
 assert.match(ui,/mine-seam-tunnel-\$\{i\}/);
 assert.match(ui,/orePortrait\(probeHit\.ore\)/);
 assert.match(html,/arcade-c425a-worlds\.css\?v=c425a-2/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=c424-1&amp;art=c425a-2/);
 assert.doesNotMatch(ui,/localStorage\.clear\(/);
 const core=require('../js/personal-arcade-core-v1.js');
 const time=1793440000000,starting=core.fresh(time);
 const result=core.act(starting,'mine',time,.2);
 assert.equal(result.ok,true);
 assert.equal(result.state.mine.dug,1);
 assert.equal(result.state.neon.running,true);
 const restored=core.norm(JSON.parse(JSON.stringify(result.state)),time);
 assert.deepEqual(restored.mine.ores,result.state.mine.ores);
 assert.equal(restored.neon.stations,result.state.neon.stations);
});
