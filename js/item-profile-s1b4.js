/* S1-B4 P0/P1: read-only item profile and whole-character appearance manifest.
 * NO grants, purchases, profile saves, Firebase calls or item-ID migration.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduItemProfileS1B4=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const METHODS=Object.freeze({
    RANDOM:'Nguồn ngẫu nhiên theo danh mục (chưa xác nhận lượt nhặt)',
    SHOP:'Cửa hàng theo danh mục (chưa xác nhận giao dịch)',
    CHAPTER_EVENT:'Sự kiện chương theo danh mục (cần xác minh quyền nhận)',
    EVENT:'Hoạt động theo danh mục (cần biên nhận)',
    STARTER:'Khởi đầu theo danh mục',
    QUEST:'Nhiệm vụ theo danh mục (cần biên nhận)'
  });
  const RECEIPTS=Object.freeze({
    SHOP:'Mua từ cửa hàng',CHAPTER:'Nhặt theo chương',
    GLOBAL:'Nhặt qua Điện thoại',STARTER:'Vật phẩm khởi đầu',
    EVENT:'Nhận qua hoạt động'
  });
  const APPEARANCES=Object.freeze([
    Object.freeze({appearanceId:'avatar-current-preview',name:'Nhân vật hiện tại',
      assetId:null,assetSrc:null,visualStatus:'PLACEHOLDER',
      description:'Dùng giao diện Avatar hiện hữu để thay ảnh/khung. Chưa có sprite toàn thân được xác thực.',
      selectable:false}),
    Object.freeze({appearanceId:'shop-thanh-van-preview',name:'Đạo Bào Thanh Vân',
      assetId:'shop-r3/thanh-van',assetSrc:'assets/shop-r3/thanh-van.webp',
      visualStatus:'EXISTING',
      description:'Ảnh minh họa đã có trong Shop. Chưa phải ngoại hình toàn thân có thể trang bị.',
      selectable:false}),
    Object.freeze({appearanceId:'shop-van-nguyet-concept',name:'Đạo Bào Vân Nguyệt',
      assetId:null,assetSrc:null,visualStatus:'ART_PENDING',
      description:'Ý tưởng đã có trong Shop; chưa có hình ảnh hoặc quyền chọn.',
      selectable:false})
  ]);
  const str=x=>typeof x==='string'?x.trim():'';
  const itemId=x=>str(x?.id)||str(x?.itemId);
  function profile(item,{catalog=null,economy=null,model=null,inventory=[],saleIds=null,
    readOnly=true,record=null}={}){
    if(!item||typeof item!=='object'||Array.isArray(item))return null;
    const id=itemId(item);if(!id)return null;
    const canonical=catalog?.byId?.(id)||
      (Array.isArray(economy?.FUNCTIONAL_TOOLS)?
        economy.FUNCTIONAL_TOOLS.find(x=>x?.id===id):null)||null;
    const source=canonical||item;
    const selected=record&&typeof record==='object'?record:null;
    const origin=selected?.obtainedFrom&&typeof selected.obtainedFrom==='object'&&
      !Array.isArray(selected.obtainedFrom)?selected.obtainedFrom:null;
    const matched=Array.isArray(inventory)?inventory.filter(x=>itemId(x)===id):[];
    const method=str(source.acquisition?.method);
    const kind=str(origin?.kind);
    const actualSource=kind&&Object.hasOwn(RECEIPTS,kind)?
      RECEIPTS[kind]+(str(origin.source)?' · '+str(origin.source):'')+
      ' (bản ghi chưa đối soát máy chủ)':
      'Chưa có biên nhận nguồn nhận được xác minh';
    const inspected=selected&&model?.inspect?.(selected);
    const functional=Array.isArray(economy?.FUNCTIONAL_IDS)&&
      economy.FUNCTIONAL_IDS.includes(id);
    const usable=!!selected&&functional&&inspected?.usageStatus!=='NOT_IMPLEMENTED'&&
      !!inspected?.usageStatus;
    const listed=Array.isArray(saleIds)&&saleIds.includes(id)&&readOnly===false;
    const rank=str(source.rank)||str(item.rank)||'—';
    const description=str(source.desc)||str(source.description)||
      str(item.desc)||str(item.description)||'Chưa có mô tả được duyệt';
    return Object.freeze({
      id,originalId:itemId(selected)||id,
      instanceId:str(selected?.instanceId)||null,
      name:str(source.name)||str(item.name)||'Vật phẩm chưa xác định',
      rank,type:str(source.type)||str(item.type)||'ITEM',
      description,
      catalogSource:Object.hasOwn(METHODS,method)?METHODS[method]:
        'Chưa có nguồn nhận được mô tả bằng contract đã duyệt',
      receiptSource:actualSource,
      effect:functional?description:
        'Chưa có công dụng trực tiếp được xác thực trong Kho',
      conditions:usable?
        'Thao tác qua nút Sử dụng hiện có của Kho; không thực hiện từ hồ sơ':
        'Chưa có thao tác sử dụng được xác minh cho vật phẩm này',
      ownerStatus:matched.length?
        'Kho đang hiển thị '+matched.length+' bản (không xác nhận quyền sở hữu máy chủ)':
        'Chưa thấy trong Kho đang hiển thị; không suy ra chưa sở hữu trên máy chủ',
      saleStatus:listed?'Trong saleIds hiện hành; mua phải qua callback đã xác thực':
        'Chỉ xem thông tin; không mở bán từ hồ sơ này',
      ownershipVerified:false,
      usableInInventory:usable,
      saleListed:listed,
      locked:!!(selected?.locked||selected?.keep||selected?.kept||
        selected?.equipped||selected?.isEquipped)
    });
  }
  return Object.freeze({METHODS,RECEIPTS,APPEARANCES,itemId,profile});
});
