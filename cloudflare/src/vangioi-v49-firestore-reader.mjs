// G1T: server-only Firestore transaction reader for EPUB V49.
// The trusted host supplies a Firestore Admin-compatible instance. This file
// never initializes credentials, talks to an account or imports the live Worker.

const COLLECTION='epub_stories_v49';
const MAX_V49_CHAPTERS=160;
const MAX_V49_CHAPTER_CHARACTERS=220000;
const MAX_V49_CHAPTER_BYTES=420000;
const MAX_INTAKE_BYTES=1024*1024;
const READ_BATCH=8;
const documentId=value=>typeof value==='string'&&
 /^[a-zA-Z0-9][a-zA-Z0-9_-]{3,120}$/.test(value);
const title=value=>typeof value==='string'&&!!value.trim()&&value.length<=500&&
 !/[\p{C}]/u.test(value);
const uid=value=>typeof value==='string'&&!!value.trim()&&value.length<=128&&
 !/[\p{C}]/u.test(value);

/**
 * Returns the readV49Snapshot callback expected by G1S. All book/chapter
 * document reads occur inside one read-only Firestore transaction. Firestore
 * may serve a consistent but not newest snapshot; this does NOT fence edits
 * across Firestore and SQLite or authorize an import/publish.
 */
export function createV49FirestoreTransactionReader({firestore}={}){
 if(typeof firestore?.collection!=='function'||typeof firestore?.runTransaction!=='function')
  throw new TypeError('G1T requires a trusted Firestore server instance');
 return async function readV49Snapshot({storyId}={}){
  if(!documentId(storyId))throw Error('v49-firestore-unavailable');
  try{
   return await firestore.runTransaction(async transaction=>{
    if(typeof transaction?.get!=='function')throw Error('invalid-transaction');
    const bookRef=firestore.collection(COLLECTION).doc(storyId);
    const bookSnap=await transaction.get(bookRef);
    if(!bookSnap?.exists||bookSnap.id!==storyId)throw Error('missing-book');
    const data=bookSnap.data();
    if(!data||!title(data.title)||!uid(data.ownerUid)||
     !['draft','published'].includes(data.status)||
     !Number.isSafeInteger(data.chapterCount)||data.chapterCount<1||
     data.chapterCount>MAX_V49_CHAPTERS||!Array.isArray(data.chapterIndex)||
     data.chapterIndex.length!==data.chapterCount)
     throw Error('invalid-book');
    const ids=new Set(),index=[];
    for(const [order,item] of data.chapterIndex.entries()){
     if(!item||!documentId(item.id)||!title(item.title)||item.order!==order||ids.has(item.id))
      throw Error('invalid-index');
     ids.add(item.id);index.push({id:item.id,title:item.title,order});
    }
    // Validate every document ID before forming any Firestore child path.
    const chapterRefs=index.map(item=>bookRef.collection('chapters').doc(item.id));
    const chapters=[];let contentBytes=new TextEncoder().encode(data.title).byteLength;
    // Bound work in a large read transaction. G1S still applies the exact
    // canonical JSON 1 MiB check including all structural overhead.
    for(let start=0;start<chapterRefs.length;start+=READ_BATCH){
     const snapshots=await Promise.all(chapterRefs.slice(start,start+READ_BATCH)
      .map(ref=>transaction.get(ref)));
     for(const [offset,snapshot] of snapshots.entries()){
      const order=start+offset,expected=index[order],chapter=snapshot?.data?.();
      if(!snapshot?.exists||snapshot.id!==expected.id||!chapter||
       chapter.id!==expected.id||chapter.title!==expected.title||chapter.order!==order||
       typeof chapter.content!=='string'||!chapter.content.trim()||
       chapter.content.length>MAX_V49_CHAPTER_CHARACTERS)
       throw Error('invalid-chapter');
      const bytes=new TextEncoder().encode(chapter.content).byteLength;
      if(bytes>MAX_V49_CHAPTER_BYTES)throw Error('oversized-chapter');
      contentBytes+=bytes+new TextEncoder().encode(chapter.title).byteLength;
      if(contentBytes>MAX_INTAKE_BYTES)throw Error('oversized-source');
      chapters.push({id:expected.id,title:expected.title,order,content:chapter.content});
     }
    }
    // Firestore-only projection. No cover/fingerprint/owner claim is a permit.
    return {book:{id:storyId,title:data.title,ownerUid:data.ownerUid,
     status:data.status,chapterCount:data.chapterCount,chapterIndex:index},chapters};
   },{readOnly:true});
  }catch{
   // Do not expose Firestore path, account errors or book/chapter text.
   throw Error('v49-firestore-unavailable');
  }
 };
}
