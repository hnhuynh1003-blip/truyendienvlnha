const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const policy=require('../js/player-avatar-compress-v41.js');
const player=require('../js/player-avatar-v16.js');
const portraits=require('../js/npc-portrait-library-v1.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../js/player-avatar-ui-v16.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../css/player-avatar-v41.css'),'utf8');
const atlas=fs.readFileSync(path.join(__dirname,'../js/npc-premium-v40.js'),'utf8');

test('V41: personal avatar gallery shares exactly 60 women and 12 men premium IDs',()=>{
  const female=portraits.CATALOG.filter(p=>/^portrait-f-\d{2}$/.test(p.id));
  const male=portraits.CATALOG.filter(p=>/^portrait-m-\d{2}$/.test(p.id));
  assert.equal(female.length,60);
  assert.equal(male.length,12);
  assert.equal(new Set([...female,...male].map(p=>p.id)).size,72);
  const choices=portraits.CATALOG.map(p=>p.id);
  for(const id of ['portrait-f-01','portrait-f-60','portrait-m-01','portrait-m-12']){
    const safe=player.validate({kind:'vector',presetId:id,frameId:'moon'},{vectorIds:choices});
    assert.equal(safe.presetId,id);
  }
  assert.match(ui,/DuduNpcPremiumV40\?\.styleFor\(safe\.presetId\)/);
  assert.match(ui,/DuduNpcPremiumV40\?\.styleFor\(item\.id\)/);
  assert.match(atlas,/assets\/npc\/premium\/sheets/);
  assert.match(ui,/playerAvatarVisibleCountV41=12/);
  assert.match(html,/id="player-avatar-v41-gender"/);
  assert.match(html,/id="player-avatar-v41-search"/);
  assert.match(css,/player-avatar-v41-more/);
});

test('V41: existing image selection schema, initials and frames remain compatible',()=>{
  const original={playerAvatar:{kind:'vector',presetId:'portrait-f-37',frameId:'sakura'}};
  assert.deepEqual(player.safeState(original,{vectorIds:portraits.CATALOG.map(p=>p.id)}),
    {kind:'vector',presetId:'portrait-f-37',uploadId:'',frameId:'sakura'});
  assert.equal(player.safeState({playerAvatar:{kind:'initials',frameId:'none'}}).kind,'initials');
  assert.equal(player.validate({kind:'upload',frameId:'none',uploadId:'own-test-22'}).kind,'upload');
  assert.equal(player.canChooseFrame('legend'),false);
  assert.match(ui,/DuduPlayerAvatarV16\.SCOPE/);
});

test('V41: 6–40 MiB originals accepted for local compression; invalid inputs rejected',()=>{
  assert.equal(policy.validateFile({type:'image/jpeg',size:6*1048576}),null);
  assert.equal(policy.validateFile({type:'image/png',size:40*1048576}),null);
  assert.equal(policy.validateFile({type:'image/webp',size:10*1048576}),null);
  assert.equal(policy.validateFile({type:'image/jpeg',size:41*1048576}),'too-large');
  assert.equal(policy.validateFile({type:'image/svg+xml',size:1000}),'invalid-type');
  assert.equal(policy.validateFile({type:'image/jpeg',size:0}),'invalid-size');
  assert.equal(policy.dimensions({naturalWidth:6000,naturalHeight:6000}).width,6000);
  assert.equal(policy.dimensions({naturalWidth:10000,naturalHeight:10000}),null);
});

test('V41: progressively rescales and produces a locally storable JPEG',()=>{
  const attempted=[];
  function canvas(){
    return {
      width:0,height:0,
      getContext(){
        return {fillRect(){},drawImage(){},imageSmoothingEnabled:false,imageSmoothingQuality:'',fillStyle:''};
      },
      toDataURL(mime){
        assert.equal(mime,'image/jpeg');
        attempted.push(this.width);
        const count=this.width>576?220000:120000;
        return 'data:image/jpeg;base64,'+'A'.repeat(count);
      }
    };
  }
  const out=policy.resize({naturalWidth:9000,naturalHeight:5000},{
    createCanvas:canvas,checkUrl:player.isValidImageDataURL
  });
  assert.equal(out.edge,576);
  assert.equal(attempted[0],960);
  assert.ok(attempted.includes(768));
  assert.equal(out.dataUrl.length<=180000,true);
  assert.equal(player.isValidImageDataURL(out.dataUrl),true);
  assert.ok(out.bytes>0);
  assert.throws(()=>policy.resize({naturalWidth:0,naturalHeight:0},{
    createCanvas:canvas,checkUrl:player.isValidImageDataURL
  }),/unsupported-dimensions/);
});

test('V41: scripts, upload interface, and owner safety are wired',()=>{
  const before=html.indexOf('src="js/player-avatar-compress-v41.js');
  const premium=html.indexOf('src="js/npc-premium-v40.js');
  const editor=html.indexOf('src="js/player-avatar-ui-v16.js');
  assert.ok(before>0&&before<editor);
  assert.ok(premium>0&&premium<editor);
  assert.equal(html.split('src="js/npc-premium-v40.js').length-1,1);
  assert.match(html,/player-avatar-v41.css/);
  assert.match(html,/tệp gốc tối đa 40 MB/);
  assert.match(ui,/policy\.resize\(image/);
  assert.doesNotMatch(ui,/file\.size>5\*1024\*1024/);
  assert.match(ui,/generation===playerAvatarUploadGenerationV16/);
  assert.match(ui,/DuduNpcPortraitLibrary\.deleteUpload\(/);
  assert.doesNotMatch(ui,/fetch\(|firebase\.storage\(|db\.collection\(/);
});
