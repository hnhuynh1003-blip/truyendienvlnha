// G2K: V49 source preparation rehearsal guarded to one local Firestore Emulator.
// Never import this into Worker/HTTP. The in-memory operator and permit readers
// are synthetic test dependencies, NOT real IAM, Firestore Rules, or SQL rights.
import {createV49FirestoreTransactionReader} from './vangioi-v49-firestore-reader.mjs';
import {createV49StagingSnapshotReader} from './vangioi-v49-staging-source.mjs';
import {createLibrarySourcePreparer} from './vangioi-library-source.mjs';

export const G2K_EMULATOR_PROJECT='demo-vangioi-g2k';
export const G2K_EMULATOR_PORT=18081;

export function assertG2KLocalEmulator({emulatorHost,firestoreProjectId,
 credentialPath=null,activeProjectId=null}={}){
 if(!/^(127\.0\.0\.1|localhost):18081$/.test(emulatorHost||'')||
  firestoreProjectId!==G2K_EMULATOR_PROJECT||
  credentialPath!==null&&credentialPath!==''||
  activeProjectId!==null&&activeProjectId!==''&&activeProjectId!==G2K_EMULATOR_PROJECT)
  throw new TypeError('G2K refuses nonlocal or cross-project Firestore target');
 return Object.freeze({environment:'emulator',projectId:G2K_EMULATOR_PROJECT,emulatorHost});
}

export function createG2KEmulatorSourceRehearsal({firestore,emulatorHost,
 credentialPath=null,activeProjectId=null,verify,isOperator,readAdaptationPermit}={}){
 assertG2KLocalEmulator({emulatorHost,firestoreProjectId:firestore?.projectId,
  credentialPath,activeProjectId});
 if(typeof firestore?.runTransaction!=='function'||typeof firestore?.collection!=='function'||
  typeof verify!=='function'||typeof isOperator!=='function'||
  typeof readAdaptationPermit!=='function')
  throw new TypeError('G2K requires trusted synthetic emulator host callbacks');
 const readV49Snapshot=createV49FirestoreTransactionReader({firestore});
 const readSnapshot=createV49StagingSnapshotReader({readV49Snapshot,readAdaptationPermit});
 const prepare=createLibrarySourcePreparer({projectId:G2K_EMULATOR_PROJECT,
  verify,isOperator,readSnapshot});
 // Returns G1Q internal preparation data only; MUST NEVER become a public API.
 return Object.freeze({prepare});
}
