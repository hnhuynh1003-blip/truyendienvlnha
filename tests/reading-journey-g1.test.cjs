const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const journey=require('../js/reading-journey-g1.js'),policy=require('../js/personal-reading-policy-p2c.js').policy;
const now=Date.parse('2026-11-27T12:00:00Z');
const data={level:2,exp:45,currency:90,inventory:[{},{}],storyStates:{__duduReadingP2B:{version:1,policyId:policy.id,expPerMinute:2,dailyMaxMinutes:180,lifetimeObservedMs:130000,days:{'2026-11-27':{bits:'f3'+'0'.repeat(2158)}}}}};
test('G1 derives reading slots and shared assets without modifying profile',()=>{
 const before=JSON.stringify(data),view=journey.summarize({ready:true,profile:data,policy,now});
 assert.deepEqual(view,{available:true,level:2,exp:45,coins:90,items:2,reading:{day:'2026-11-27',seconds:60,cap:10800,lifetime:130}});
 assert.equal(JSON.stringify(data),before);
});
test('G1 guest, pending and sandbox never project account assets',()=>{
 for(const input of [{ready:false},{ready:true,sandbox:true}])assert.equal(journey.summarize({...input,profile:data,policy,now}).available,false);
});
test('G1 invalid history fails closed; UTC rollover and missing history are distinct',()=>{
 const broken=structuredClone(data);broken.storyStates.__duduReadingP2B.days['2026-11-27'].bits='bad';
 assert.equal(journey.summarize({ready:true,profile:broken,policy,now}).reading,null);
 assert.equal(journey.summarize({ready:true,profile:data,policy,now:now+86400000}).reading.seconds,0);
 assert.equal(journey.summarize({ready:true,profile:{},policy,now}).reading.lifetime,0);
});
test('G1 render clears old values and disables personal links on session reset',()=>{
 const nodes=new Map(),buttons=[{},{}],host={querySelector(sel){if(!nodes.has(sel))nodes.set(sel,{});return nodes.get(sel);},querySelectorAll(){return buttons;}};
 const doc={getElementById:()=>host};journey.render(doc,{ready:true,profile:data,policy,now});
 assert.equal(nodes.get('[data-journey-coins]').textContent,'90');assert.equal(buttons[0].disabled,false);
 journey.clear(doc);assert.equal(nodes.get('[data-journey-coins]').textContent,'—');assert.equal(nodes.get('[data-journey-account]').hidden,true);assert.equal(buttons[0].disabled,true);
});
test('G1 wiring uses existing phone destinations, refresh and auth reset',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const auth=fs.readFileSync(require('node:path').join(__dirname,'../js/auth-v2.js'),'utf8');
 assert.match(html,/reading-journey-g1\.js\?v=1/);assert.match(html,/function refreshReadingJourneyG1\(/);
 for(const name of ['stories','inventory','quests','system'])assert.ok(html.includes("openPhoneApp('"+name+"')"));
 assert.match(auth,/DuduReadingJourneyG1\?\.clear\(document\)/);
});
