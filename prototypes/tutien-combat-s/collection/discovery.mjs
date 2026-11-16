// MOCK_ONLY discovery metadata. No rewards, entry debit or production RNG policy.
export const DESTINATIONS=Object.freeze(['herb','mineral','egg']);
export function discoverOnce(state,index){
 if(state.explorationDiscovery){validateDiscovery(state.explorationDiscovery);return state.explorationDiscovery.scene;}
 if(!Number.isInteger(index)||index<0||index>2)throw Error('Invalid mock draw');
 state.explorationDiscovery={version:1,environment:'MOCK_ONLY',scene:DESTINATIONS[index],view:'result'};return state.explorationDiscovery.scene;
}
export function validateDiscovery(value){
 if(!value||![1,2].includes(value.version)||value.environment!=='MOCK_ONLY'||!DESTINATIONS.includes(value.scene)||!['portal','result','area'].includes(value.view))throw Error('Invalid discovery');
 if(value.version===2&&(typeof value.id!=='string'||!value.id.startsWith('mock-search-')||!['RESULT','ENTERED','ENDED'].includes(value.phase)||![0,2].includes(value.costPaid)||value.phase==='ENDED'&&!['CANCELLED','COMPLETED','FAILED','RETREATED','TRIP_ENDED'].includes(value.endReason)))throw Error('Invalid search lifecycle');
}

export function mockDrawIndex(crypto){const a=new Uint32Array(1);do{crypto.getRandomValues(a)}while(a[0]===0xffffffff);return a[0]%3;}
