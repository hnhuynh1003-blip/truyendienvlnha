const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css/phone-identity-art-v1.css'),'utf8');

test('Identity Atelier loads after compact phone styles and retains the existing home cards',()=>{
 const compact=html.indexOf('css/phone-compact-v50.css');
 const art=html.indexOf('css/phone-identity-art-v1.css');
 assert.ok(compact>0&&art>compact,'Custom identity layer loads after the compact card');
 for(const id of ['player-avatar-home-v16','dudu-honor-home-title','player-avatar-v16-frames']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(css,/\.dudu-honor-identity-frame/);
 assert.match(css,/\.dudu-honor-home-chip/);
 assert.match(css,/\.dudu-honor-identity-frame::after/,'One illustrated perimeter encloses player and Honor');
 assert.match(css,/border-image-source:var\(--identity-border-art\)/,'AI assets only decorate the outer perimeter');
 assert.match(css,/\.dudu-honor-home-chip::before\{\s*content:none!important/,'Honor title cannot be crossed by artwork');
 assert.match(css,/\.dudu-honor-identity-frame::before\{\s*content:none!important/,'No old nested CSS outline');
 assert.match(css,/\.dudu-honor-identity-frame\{[^}]*border:0!important/s,'No duplicate CSS outer rim');
 assert.match(css,/backdrop-filter:blur\(2px\)/,'Wallpaper remains perceptible through glass cards');
 assert.match(css,/honor-glass-first/,'Rarity title plates preserve translucent backgrounds');
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('Combined identity card uses the existing transparent AI assets for each earned rank',()=>{
 for(const id of ['player-panel','honor-common','honor-rare','honor-epic','honor-mythic']){
  const asset='assets/identity-frames/v1/'+id+'.webp';
  const buffer=fs.readFileSync(path.join(root,asset));
  assert.equal(buffer.toString('ascii',0,4),'RIFF');
  assert.equal(buffer.toString('ascii',8,12),'WEBP');
  assert.ok(buffer.length>1000&&buffer.length<150_000,id+' should load quickly on phone');
  assert.ok(css.includes(id+'.webp'),id+' is referenced');
 }
 for(const rarity of ['rare','epic','mythic']){
  assert.ok(css.includes('data-rarity="'+rarity+'"'),'The earned title rarity is displayed on the card');
 }
});

test('Six original transparent AI WebP frames are small enough for phone and are all referenced',()=>{
 for(const id of ['nebula','jadecrest','frostwing','legend','soulbond','author']){
  const asset='assets/avatar-frames/v1/'+id+'.webp';
  const buffer=fs.readFileSync(path.join(root,asset));
  assert.equal(buffer.toString('ascii',0,4),'RIFF',id+' should be WebP');
  assert.equal(buffer.toString('ascii',8,12),'WEBP',id+' should be WebP');
  assert.ok(buffer.length>2000&&buffer.length<500_000,id+' should load quickly on phones');
  assert.ok(css.includes(id+'.webp'),id+' is used by style');
 }
 assert.match(css,/data-frame-preview="legend"/);
 assert.match(css,/data-frame-preview="soulbond"/);
 assert.match(css,/data-frame-preview="author"/);
});
