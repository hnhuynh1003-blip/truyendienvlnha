/* Dedicated DUDU Library R2 preview Worker.
 * NO automatic deployment. The associated Wrangler config defaults to OFF.
 * This has no route inside the existing Game/NPC dudu-ai-staging Worker.
 */
import {verifyFirebaseIdToken} from './auth.mjs';
import {handleLibraryR2Private} from './library-r2-private-v1.mjs';
export default {
  async fetch(request,env){
    return handleLibraryR2Private(request,env,{verifyIdentity:verifyFirebaseIdToken});
  }
};
