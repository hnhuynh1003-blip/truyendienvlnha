/* AUTH-A1 — Firebase Auth identity is NOT a DUDU gameplay account.
 * Candidate approval flow; activated only after owner-reviewed Rules rollout.
 * No wallet/role/profile migration. Client guards are UX; Firestore Rules
 * must independently enforce an approved UID or R1.2 legacy-profile access.
 */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduAccountApprovalV1=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const REQUESTS='account_requests_v1',APPROVED='approved_accounts_v1';
 const validUid=uid=>typeof uid==='string'&&uid.length>0&&uid.length<=128;
 const fail=reason=>Object.assign(new Error(reason),{reason});
 const cleanName=name=>String(name||'Người chơi').trim().slice(0,140);
 function stamp(){
  const value=root?.firebase?.firestore?.FieldValue?.serverTimestamp?.();
  if(!value)throw fail('server-timestamp-unavailable');
  return value;
 }
 function session(auth,uid){
  const user=auth?.currentUser;
  if(!validUid(uid)||!user||user.uid!==uid||!user.email||
   user.email.length>254)throw fail('invalid-account');
  return user;
 }
 function unchanged(auth,user){
  if(auth?.currentUser!==user)throw fail('account-changed');
 }
 function requestStatus(data){
  return data?.status==='rejected'?'rejected':
   data?.status==='approved'?'awaiting-access':'pending';
 }
 async function check({db,auth,uid,claims,inviteOnly=false}={}){
  const user=session(auth,uid);
  if(!db?.collection||!db?.runTransaction)throw fail('invalid-firestore');
  // The actual `admin` claim is checked by Firebase Rules on every write.
  if(claims?.admin===true)return {approved:true,status:'approved',source:'admin'};
  const approved=await db.collection(APPROVED).doc(uid).get();
  unchanged(auth,user);
  if(approved.exists)return approved.data()?.enabled===true?
   {approved:true,status:'approved',source:'allowlist'}:
   {approved:false,status:'revoked'};
  // R1.2: an existing *self-owned* profile predates the approval collection.
  // Probe only after explicit allowlist revocation has been checked. A fresh
  // identity may receive permission-denied when its profile does not exist:
  // this is NEVER treated as approval, and still requires an invitation.
  let existingProfile=null;
  try{
   existingProfile=await db.collection('profiles_v2').doc(uid).get();
  }catch(error){
   if(error?.code!=='permission-denied')throw error;
  }
  unchanged(auth,user);
  if(existingProfile?.exists)return {approved:true,status:'approved',
   source:'legacy-profile'};
  // R1.1 invitation mode remains the default for NEW identities: no pending
  // request or profile bootstrap until an invite is atomically redeemed.
  if(inviteOnly)return {approved:false,status:'invite-required'};
  const requestRef=db.collection(REQUESTS).doc(uid);
  const request=await db.runTransaction(async tx=>{
   const snap=await tx.get(requestRef);
   unchanged(auth,user);
   if(snap.exists)return snap.data();
   const data={uid,email:user.email,name:cleanName(user.displayName||user.email),
    status:'pending',createdAt:stamp()};
   tx.set(requestRef,data);
   return data;
  });
  unchanged(auth,user);
  return {approved:false,status:requestStatus(request)};
 }
 async function owner(auth){
  const user=auth?.currentUser;
  if(!user?.getIdTokenResult)throw fail('admin-required');
  const result=await user.getIdTokenResult();
  unchanged(auth,user);
  if(result?.claims?.admin!==true)throw fail('admin-required');
  return user;
 }
 async function pending({db,auth}={}){
  const user=await owner(auth);
  if(!db?.collection)throw fail('invalid-firestore');
  const snap=await db.collection(REQUESTS).where('status','==','pending').limit(50).get();
  unchanged(auth,user);
  return snap.docs.filter(doc=>doc?.data()?.uid===doc.id)
   .map(doc=>({uid:doc.id,name:cleanName(doc.data().name),
    email:String(doc.data().email||'').slice(0,254)}));
 }
 async function decide({db,auth,uid,approve}={}){
  if(!validUid(uid)||typeof approve!=='boolean'||!db?.collection||
   !db?.runTransaction)throw fail('invalid-review');
  const user=await owner(auth),requestRef=db.collection(REQUESTS).doc(uid),
   accessRef=db.collection(APPROVED).doc(uid);
  await db.runTransaction(async tx=>{
   const request=await tx.get(requestRef);
   unchanged(auth,user);
   if(!request.exists||request.data()?.uid!==uid||
    request.data()?.status!=='pending')throw fail('request-not-pending');
   const reviewedAt=stamp();
   // Both documents change in one transaction. Repeated reviews cannot
   // create additional approvals or any monetary reward.
   if(approve)tx.set(accessRef,{uid,enabled:true,
    approvedAt:reviewedAt,approvedBy:user.uid});
   tx.update(requestRef,{status:approve?'approved':'rejected',
    reviewedAt,reviewedBy:user.uid});
  });
  unchanged(auth,user);
  return {uid,status:approve?'approved':'rejected'};
 }
 function mountOwnerPanel({db,auth,host}={}){
  if(!host||host.dataset?.approvalMounted==='true')return false;
  host.dataset.approvalMounted='true';host.hidden=false;
  const doc=host.ownerDocument||root.document;
  const make=(tag,label)=>{const node=doc.createElement(tag);
   if(label!==undefined)node.textContent=label;return node;};
  const title=make('strong','✦ Duyệt tài khoản DUDU');
  const refresh=make('button','Xem yêu cầu chờ duyệt');
  refresh.type='button';refresh.className='btn';
  const note=make('p','Chỉ chủ sở hữu có quyền admin mới được duyệt.');
  const list=make('div');list.className='dudu-approval-list';
  async function reload(){
   refresh.disabled=true;list.replaceChildren();
   try{
    const requests=await pending({db,auth});
    if(!requests.length)list.append(make('small','Chưa có yêu cầu mới.'));
    for(const request of requests){
     const row=make('div');row.className='dudu-approval-row';
     const label=make('span');label.append(make('b',request.name),
      make('small',request.email+' · '+request.uid.slice(0,10)+'…'));
     const yes=make('button','Duyệt'),no=make('button','Từ chối');
     for(const [button,approve] of [[yes,true],[no,false]]){
      button.type='button';button.className='btn';
      button.addEventListener('click',async()=>{
       yes.disabled=no.disabled=true;
       try{await decide({db,auth,uid:request.uid,approve});await reload();}
       catch(error){note.textContent='Chưa duyệt được: '+(error.reason||error.code||'Kiểm tra quyền Firebase');
        yes.disabled=no.disabled=false;}
      });
     }
     row.append(label,yes,no);list.append(row);
    }
   }catch(error){note.textContent='Chưa tải được danh sách: '+
    (error.reason||error.code||'Kiểm tra kết nối Firebase');}
   finally{refresh.disabled=false;}
  }
  refresh.addEventListener('click',()=>{void reload();});
  host.replaceChildren(title,refresh,note,list);
  return true;
 }
 return Object.freeze({REQUESTS,APPROVED,check,pending,decide,mountOwnerPanel});
});
