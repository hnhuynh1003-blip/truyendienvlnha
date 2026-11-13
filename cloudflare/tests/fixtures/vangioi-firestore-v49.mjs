// In-memory Firestore Admin transaction-shape fixture. No SDK or network.
export function createV49TransactionFixture(storyId='epub-staging'){
 const bookPath='epub_stories_v49/'+storyId;
 const paths=[bookPath+'/chapters/chapter-0010',bookPath+'/chapters/chapter-0002'];
 const documents=new Map([
  [bookPath,{id:storyId,title:'Staging V49',ownerUid:'book-owner',status:'published',chapterCount:2,
   chapterIndex:[{id:'chapter-0010',title:'First',order:0,wordCount:1},
    {id:'chapter-0002',title:'Second',order:1,wordCount:1}],
   coverImage:'PRIVATE_COVER',importFingerprint:'v57-private'}],
  [paths[0],{id:'chapter-0010',title:'First',order:0,content:'PRIVATE_FIRST',wordCount:1}],
  [paths[1],{id:'chapter-0002',title:'Second',order:1,content:'PRIVATE_SECOND',wordCount:1}]
 ]);
 const stats={transactions:0,reads:[],options:[],onRead:null};
 const reference=path=>({path,id:path.split('/').at(-1),collection:name=>({doc:id=>reference(path+'/'+name+'/'+id)})});
 const firestore={collection:name=>({doc:id=>reference(name+'/'+id)}),
  async runTransaction(callback,options){
   if(options?.readOnly!==true)throw Error('TEST_REJECTS_NON_READONLY_TRANSACTION');
   stats.transactions++;stats.options.push(structuredClone(options));
   const snapshot=structuredClone(documents);let count=0;
   const transaction={async get(ref){
    count++;stats.reads.push(ref.path);stats.onRead?.({count,path:ref.path});
    const data=snapshot.get(ref.path);
    return {id:ref.id,exists:data!==undefined,data:()=>data===undefined?undefined:structuredClone(data)};
   }};
   return callback(transaction);
  }};
 const set=(path,data)=>documents.set(path,structuredClone(data));
 const patch=(path,changes)=>set(path,{...documents.get(path),...changes});
 return {storyId,bookPath,paths,documents,stats,firestore,set,patch,remove:path=>documents.delete(path)};
}
