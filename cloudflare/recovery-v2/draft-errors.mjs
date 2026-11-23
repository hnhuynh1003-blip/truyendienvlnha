// Fixed diagnostics only. Never attach upstream payloads, tokens or messages.
const outcomes=new Map([
 ['draft-service-auth-unavailable','not-dispatched'],
 ['draft-ticket-denied','not-dispatched'],
 ['draft-manifest-rejected','not-dispatched'],
 ['draft-firestore-http-400','rejected'],['draft-firestore-http-401','rejected'],
 ['draft-firestore-http-403','rejected'],['draft-firestore-http-429','rejected'],
 ['draft-firestore-http-500','unknown'],['draft-firestore-http-other','unknown'],
 ['draft-write-outcome-unknown','unknown'],['draft-write-response-unverifiable','unknown']
]);
export function draftFailure(code){const safe=outcomes.has(code)?code:'draft-write-outcome-unknown';return Object.assign(new Error('Draft operation unavailable'),{r2DraftCode:safe});}
export function draftHttpFailure(status){return draftFailure('draft-firestore-http-'+([400,401,403,429,500].includes(status)?status:'other'));}
export function draftCodeResponse(error){const code=error?.r2DraftCode;if(!outcomes.has(code))return null;return {status:code==='draft-firestore-http-429'?429:code==='draft-ticket-denied'||code==='draft-manifest-rejected'?403:503,code,writeOutcome:outcomes.get(code)};}
