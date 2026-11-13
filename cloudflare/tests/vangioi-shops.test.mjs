import {test} from 'node:test';
import assert from 'node:assert/strict';
import {content} from './fixtures/vangioi-content.mjs';
import {inspectContent,validateDraftContent,createContentValidator,CONTENT_VALIDATOR_VERSION} from '../src/vangioi-content.mjs';
function shopWorld(){
 const c=content();c.items=[
  {itemId:'item-coins',name:'Coins',category:'currency',transferPolicy:'world_only',stackLimit:1000,acquisitionMethods:[{type:'starting'}]},
  {itemId:'item-letter',name:'Letter',category:'quest',transferPolicy:'world_only',stackLimit:10,acquisitionMethods:[{type:'shop',shopId:'shop-stall'}]}];
 c.shops=[{shopId:'shop-stall',name:'Stall',placeId:'place-room',currencyItemId:'item-coins',stock:[{itemId:'item-letter',price:10,quantity:3}]}];
 c.missions[0].objectives=[{objectiveId:'objective-buy',verb:'purchase',targetId:'item-letter',requiredCount:1}];return c;
}
const has=(r,code)=>[...r.errors,...r.warnings].some(x=>x.code===code);
test('G1J coherent shop/item/purchase links pass without granting trading rights',()=>{
 const c=shopWorld(),before=structuredClone(c),r=inspectContent(c);
 assert.equal(r.valid,true);assert.equal(r.warnings.length,0);assert.deepEqual(c,before);
 assert.equal(CONTENT_VALIDATOR_VERSION,'world-content-1-semantic-2');assert.equal('canPublish' in r,false);
});
test('G1J duplicate stock rows are ambiguous even with different prices',()=>{
 const c=shopWorld();c.shops[0].stock.push({...c.shops[0].stock[0],price:20});
 assert.equal(validateDraftContent(c).valid,true);
 const r=inspectContent(c);assert.equal(r.valid,false);assert.equal(has(r,'duplicate-shop-stock'),true);
 assert.equal(r.errors.find(x=>x.code==='duplicate-shop-stock').path,'/shops/0/stock/1');
});
test('G1J declared shop acquisition must reference a listing for that item',()=>{
 const c=shopWorld();c.shops[0].stock=[];const r=inspectContent(c);
 assert.equal(r.valid,false);assert.equal(has(r,'shop-acquisition-stock-mismatch'),true);
});
test('G1J listed stock without a declared acquisition source stays reviewable with warnings',()=>{
 const c=shopWorld();c.items[1].acquisitionMethods=[];const r=inspectContent(c);
 assert.equal(r.valid,true);assert.equal(has(r,'shop-stock-no-acquisition'),true);assert.equal(has(r,'purchase-source-review'),true);
});
test('G1J zero stock and insufficient purchase quantity are warnings rather than fabricated playability',()=>{
 const c=shopWorld();c.shops[0].stock[0].quantity=0;c.missions[0].objectives[0].requiredCount=5;
 const r=inspectContent(c);assert.equal(r.valid,true);assert.equal(has(r,'shop-stock-empty'),true);assert.equal(has(r,'purchase-stock-review'),true);
});
test('G1J shop currency still requires an actual currency item category',()=>{
 const c=shopWorld();c.items[0].category='quest';const r=inspectContent(c);
 assert.equal(r.valid,false);assert.equal(has(r,'shop-currency-kind'),true);
});
test('G1J a priced shop warns when no way of acquiring its currency is declared',()=>{
 const c=shopWorld();c.items[0].acquisitionMethods=[];const r=inspectContent(c);
 assert.equal(r.valid,true);assert.equal(has(r,'shop-currency-source-review'),true);
});
test('G1J price/quantity retain nonnegative safe integer types, including valid zero prices',()=>{
 for(const patch of [{price:-1},{quantity:-1},{price:true},{quantity:Number.MAX_SAFE_INTEGER+1}]){
  const c=shopWorld();Object.assign(c.shops[0].stock[0],patch);assert.equal(validateDraftContent(c).valid,false);assert.equal(inspectContent(c).valid,false);
 }
 const c=shopWorld();c.shops[0].stock[0].price=0;c.shops[0].stock[0].quantity=0;assert.equal(inspectContent(c).valid,true);
});
test('G1J missing purchase item remains an error and reports do not include private prose',()=>{
 const c=shopWorld();c.story.secretTruth='PRIVATE_SHOP_TRUTH';c.missions[0].objectives[0].targetId='item-missing';
 const r=inspectContent(c);assert.equal(r.valid,false);assert.equal(has(r,'missing-reference'),true);
 assert.equal(JSON.stringify(r).includes('PRIVATE_SHOP_TRUTH'),false);
});
test('G1J server content gate rejects incoherent shop data before registry approval can be considered',async()=>{
 const c=shopWorld();c.shops[0].stock=[];let reads=0;
 const validate=createContentValidator({readStorySource:async()=>{reads++;throw Error('not expected');},readAsset:async()=>{reads++;throw Error('not expected');}});
 const r=await validate(c,{worldId:'world-shop-test',actorUid:'shop-test-owner'});
 assert.equal(r.readyForReview,false);assert.equal(r.canPublish,false);assert.equal(reads,0);
 assert.equal(r.errors.some(e=>e.code==='shop-acquisition-stock-mismatch'),true);
});
