/* DUDU V45 — fail-closed staging pilot boundary.
 * Uses ONLY the server-verified Firebase UID. No client role, query string,
 * profile field, author display name or in-browser inventory grants access.
 * This module creates no entitlements and performs no storage writes.
 */
const UID=/^[A-Za-z0-9_-]{6,128}$/;
const NAMESPACE=/^v45-[a-z0-9][a-z0-9-]{2,31}$/;
const SLOTS=Object.freeze([
  Object.freeze({role:'READER_A',key:'PILOT_READER_A_UID'}),
  Object.freeze({role:'READER_B',key:'PILOT_READER_B_UID'}),
  Object.freeze({role:'AUTHOR',key:'PILOT_AUTHOR_UID'})
]);
const deny=(code,status)=>Object.freeze({ok:false,code,status});
export function pilotConfig(env={}){
  if(env.PILOT_ENABLED!=='true')return deny('pilot-disabled',503);
  const namespace=env.PILOT_NAMESPACE;
  if(typeof namespace!=='string'||!NAMESPACE.test(namespace))
    return deny('pilot-config-incomplete',503);
  const roles=SLOTS.map(slot=>({
    role:slot.role,uid:env[slot.key]
  }));
  if(roles.some(row=>typeof row.uid!=='string'||!UID.test(row.uid))||
    new Set(roles.map(row=>row.uid)).size!==roles.length)
    return deny('pilot-config-incomplete',503);
  return Object.freeze({ok:true,namespace,roles});
}
export function pilotAccess(env={},identity=null){
  const config=pilotConfig(env);
  if(!config.ok)return config;
  if(!identity||typeof identity.uid!=='string'||!UID.test(identity.uid))
    return deny('unauthenticated',401);
  const entry=config.roles.find(row=>row.uid===identity.uid);
  if(!entry)return deny('pilot-forbidden',403);
  return Object.freeze({ok:true,role:entry.role,
    // Distinct DO names: never reuse gift-global-v1/comments-global-v1.
    giftStore:'gift-pilot-'+config.namespace,
    commentStore:'comments-pilot-'+config.namespace
  });
}
