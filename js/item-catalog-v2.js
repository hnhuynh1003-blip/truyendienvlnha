/* DUDU Studio item catalog v2 — PHASE 1, DEFINITION ONLY.
 * Canonical item metadata. This module never rolls loot, awards XP, mutates
 * inventories, publishes story rewards or writes to Firebase.
 * Original MASTER_LOOT_TABLE and old saves remain unchanged until Phase 2.
 */
(function (root, factory) {
  'use strict';
  const pack=typeof module==='object'&&module.exports?
    require('./world-items-v44-1.js'):root?.DuduWorldItemsV441;
  const catalog = factory(pack);
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  if (root) root.DuduItemCatalog = catalog;
})(typeof window !== 'undefined' ? window : null, function (worldPack) {
  'use strict';
  const VERSION = 3;
  const RANKS = Object.freeze(['F','E','D','C','B','A','S','SS','SSS']);
  const REALM_TAGS = Object.freeze(['URBAN','APOCALYPSE','CULTIVATION','FANTASY','SCIFI','HORROR']);

  // Each tuple: permanent ID, name, rank, old-compatible type, icon, description.
  const COMMON_SOURCE = [
  [
    "f1",
    "Mẩu Bánh Mì Mốc",
    "F",
    "FOOD",
    "🍞",
    "Khẩu phần cũ còn sót lại; dùng để chống đói trong tình huống thiếu thốn."
  ],
  [
    "f2",
    "Chai Nước Suối Dở",
    "F",
    "FOOD",
    "🧴",
    "Chai nước đã mở, chỉ còn một ít nước sạch."
  ],
  [
    "common-cloth",
    "Khăn Vải Cũ",
    "F",
    "ITEM",
    "🧣",
    "Mảnh khăn sờn có thể dùng để lau hoặc che chắn tạm."
  ],
  [
    "common-rope",
    "Dây Thừng Sờn",
    "F",
    "ITEM",
    "🪢",
    "Sợi dây cũ hữu dụng trong các công việc sinh tồn đơn giản."
  ],
  [
    "common-matches",
    "Bao Diêm Ẩm",
    "F",
    "ITEM",
    "🕯️",
    "Diêm bị ẩm, khó bắt lửa nhưng vẫn có thể tận dụng."
  ],
  [
    "common-gauze",
    "Băng Gạc Cũ",
    "F",
    "ITEM",
    "🩹",
    "Miếng gạc còn dùng được, cần kiểm tra trước khi sử dụng."
  ],
  [
    "common-weak-battery",
    "Pin Dự Phòng Yếu",
    "F",
    "ITEM",
    "🔋",
    "Nguồn điện dự phòng với dung lượng còn rất thấp."
  ],
  [
    "common-biscuit",
    "Bánh Quy Khô",
    "E",
    "FOOD",
    "🍪",
    "Bánh quy đóng gói đơn giản, tiện mang theo."
  ],
  [
    "common-bottled-water",
    "Nước Uống Đóng Chai",
    "E",
    "FOOD",
    "💧",
    "Chai nước đóng kín, phù hợp mang theo khi khám phá."
  ],
  [
    "e2",
    "Lon Cà Phê Đen",
    "E",
    "FOOD",
    "☕",
    "Một lon cà phê giúp tỉnh táo trong hành trình dài."
  ],
  [
    "e3",
    "Dao Gọt Trái Cây Cũ",
    "E",
    "WEAPON",
    "🔪",
    "Dao nhỏ đã cũ; chủ yếu là dụng cụ sinh hoạt."
  ],
  [
    "common-flashlight",
    "Đèn Pin Cũ",
    "E",
    "ITEM",
    "🔦",
    "Nguồn sáng cầm tay có độ sáng không ổn định."
  ],
  [
    "common-raincoat",
    "Áo Mưa Gấp",
    "E",
    "ITEM",
    "🧥",
    "Áo mưa gấp gọn cho những hành trình ẩm ướt."
  ],
  [
    "common-basic-medkit",
    "Bộ Cứu Thương Sơ Cấp",
    "D",
    "ITEM",
    "🧰",
    "Túi sơ cứu cơ bản để ứng phó sự cố trong chuyến đi."
  ],
  [
    "d1",
    "Hộp Bò Hầm Quân Dụng",
    "D",
    "FOOD",
    "🥫",
    "Khẩu phần đóng hộp có thời gian bảo quản dài."
  ],
  [
    "common-water-filter",
    "Bộ Lọc Nước Cầm Tay",
    "D",
    "ITEM",
    "🚰",
    "Thiết bị lọc nước nhỏ dùng trong môi trường thiếu nước sạch."
  ],
  [
    "common-repair-kit",
    "Bộ Dụng Cụ Sửa Chữa",
    "D",
    "ITEM",
    "🛠️",
    "Bộ đồ nghề đa năng để bảo dưỡng thiết bị thông dụng."
  ],
  [
    "common-compass",
    "Địa Bàn Cũ",
    "D",
    "ITEM",
    "🧭",
    "La bàn cơ khí đã cũ nhưng vẫn định hướng được."
  ],
  [
    "common-tent",
    "Lều Sinh Tồn Gấp",
    "D",
    "ITEM",
    "⛺",
    "Chỗ trú tạm thời có thể dựng và xếp nhanh."
  ],
  [
    "c1",
    "Dao Găm Quân Đội M9",
    "C",
    "WEAPON",
    "🗡️",
    "Dao găm chuyên dụng phù hợp các tình huống sinh tồn."
  ],
  [
    "common-torn-map",
    "Bản Đồ Rách",
    "C",
    "ITEM",
    "🗺️",
    "Mảnh bản đồ chưa đầy đủ; có thể hỗ trợ định hướng."
  ],
  [
    "common-health-box",
    "Hộp Thuốc Y Tế",
    "C",
    "ITEM",
    "💊",
    "Hộp thuốc và dụng cụ y tế được đóng gói cẩn thận."
  ],
  [
    "common-signal-device",
    "Máy Phát Tín Hiệu",
    "C",
    "ITEM",
    "📡",
    "Thiết bị phát tín hiệu tầm ngắn khi cần liên lạc."
  ],
  [
    "b1",
    "Súng Trường Tấn Công",
    "B",
    "WEAPON",
    "⚡",
    "Trang bị quân dụng hiếm gặp trong kho vật phẩm phổ thông."
  ],
  [
    "b2",
    "Kiếm Katana Thép Đen",
    "B",
    "WEAPON",
    "⚔️",
    "Thanh kiếm được rèn từ thép đen, phù hợp dùng làm trang bị."
  ]
];
  // Realm pools are templates chosen by author-assigned realm tag, NEVER guessed by AI.
  const REALM_SOURCE = {
  "URBAN": [
    [
      "urban-oneway-ticket",
      "Vé Tàu Một Chiều",
      "F",
      "ITEM",
      "🎫",
      "Tấm vé cũ gợi nhắc hành trình không có điểm quay lại."
    ],
    [
      "urban-coffee",
      "Cà Phê Máy Bán Hàng",
      "E",
      "FOOD",
      "🥤",
      "Lon cà phê mua từ máy bán hàng nơi góc phố."
    ],
    [
      "urban-keycard",
      "Thẻ Từ Tòa Nhà",
      "D",
      "ITEM",
      "💳",
      "Thẻ ra vào của một tòa nhà trong bối cảnh đô thị."
    ],
    [
      "urban-old-newspaper",
      "Bản Tin Báo Cũ",
      "D",
      "ITEM",
      "📰",
      "Tờ báo giữ những tin tức đã bị thời gian bỏ quên."
    ],
    [
      "urban-recorder",
      "Máy Ghi Âm Cũ",
      "C",
      "ITEM",
      "🎙️",
      "Máy ghi âm lưu lại những lời kể trong đô thị."
    ]
  ],
  "APOCALYPSE": [
    [
      "apoc-mask",
      "Khẩu Trang Lọc Bụi",
      "F",
      "ITEM",
      "😷",
      "Khẩu trang bụi đơn giản giữa môi trường đổ nát."
    ],
    [
      "apoc-ration",
      "Lương Khô Niêm Phong",
      "E",
      "FOOD",
      "🥫",
      "Khẩu phần sinh tồn niêm phong cho chuyến đi xa."
    ],
    [
      "apoc-battery-core",
      "Lõi Pin Tái Chế",
      "D",
      "ITEM",
      "🔋",
      "Lõi pin thu hồi từ thiết bị bỏ hoang."
    ],
    [
      "apoc-bio-sample",
      "Mẫu Thử Sinh Học",
      "C",
      "ITEM",
      "🧪",
      "Ống nghiệm được niêm phong để phục vụ nghiên cứu."
    ],
    [
      "apoc-rescue-radio",
      "Radio Cứu Nạn",
      "B",
      "ITEM",
      "📻",
      "Máy thu phát có khả năng nhận tín hiệu khẩn cấp."
    ]
  ],
  "CULTIVATION": [
    [
      "cult-spirit-fragment",
      "Linh Thạch Vụn",
      "F",
      "ITEM",
      "💎",
      "Mảnh linh thạch nhỏ còn vương chút linh khí."
    ],
    [
      "cult-dew-herb",
      "Dược Thảo Đọng Sương",
      "E",
      "ITEM",
      "🌿",
      "Cây thuốc được thu hái trước khi sương tan."
    ],
    [
      "cult-ward-talisman",
      "Phù Hộ Thân",
      "D",
      "ITEM",
      "📜",
      "Lá phù được khắc dấu bảo hộ cơ bản."
    ],
    [
      "cult-blank-jade-slip",
      "Ngọc Giản Trống",
      "C",
      "ITEM",
      "🟩",
      "Thẻ ngọc chưa lưu tâm pháp hay ghi chép nào."
    ],
    [
      "cult-ancient-relic-shard",
      "Mảnh Pháp Bảo Cổ",
      "B",
      "ITEM",
      "🪬",
      "Mảnh vỡ từ một pháp bảo không rõ xuất xứ."
    ]
  ],
  "FANTASY": [
    [
      "fantasy-feather",
      "Lông Vũ Huyễn Thú",
      "F",
      "ITEM",
      "🪶",
      "Sợi lông lấp lánh rơi từ sinh vật huyễn giới."
    ],
    [
      "fantasy-moon-sand",
      "Tinh Cát Ánh Trăng",
      "E",
      "ITEM",
      "✨",
      "Hạt cát phản chiếu ánh trăng trong bóng tối."
    ],
    [
      "fantasy-blood-gem",
      "Huyết Tinh Thạch",
      "D",
      "ITEM",
      "🔴",
      "Tinh thể đỏ thường thấy trong phế tích huyền huyễn."
    ],
    [
      "fantasy-ancient-armor",
      "Mảnh Giáp Cổ",
      "C",
      "ITEM",
      "🛡️",
      "Một mảnh giáp chạm khắc họa tiết cổ xưa."
    ],
    [
      "fantasy-ruins-seal",
      "Ấn Chú Phế Tích",
      "A",
      "ITEM",
      "🔰",
      "Ấn phù hiếm được tìm thấy tại di tích thất lạc."
    ]
  ],
  "SCIFI": [
    [
      "scifi-data-disk",
      "Đĩa Dữ Liệu Cũ",
      "F",
      "ITEM",
      "💽",
      "Thiết bị lưu trữ kỹ thuật số lỗi thời."
    ],
    [
      "scifi-plasma-cell",
      "Pin Plasma Mini",
      "E",
      "ITEM",
      "🔋",
      "Viên pin cung cấp điện cho thiết bị năng lượng nhỏ."
    ],
    [
      "scifi-robot-card",
      "Thẻ Định Danh Robot",
      "D",
      "ITEM",
      "🤖",
      "Thẻ ghi mã của một đơn vị máy móc."
    ],
    [
      "scifi-quantum-chip",
      "Vi Mạch Lượng Tử",
      "C",
      "ITEM",
      "🧩",
      "Linh kiện xử lý dữ liệu hiếm trong phòng thí nghiệm."
    ],
    [
      "s1",
      "Súng Bắn Tỉa Phân Rã",
      "S",
      "WEAPON",
      "🔭",
      "Thiết bị vũ khí công nghệ cao có cơ chế phân rã giả tưởng."
    ]
  ],
  "HORROR": [
    [
      "horror-unlit-candle",
      "Nến Chưa Cháy",
      "F",
      "ITEM",
      "🕯️",
      "Cây nến chưa thắp trong căn phòng tối."
    ],
    [
      "horror-blurred-photo",
      "Ảnh Mờ Không Mặt",
      "E",
      "ITEM",
      "🖼️",
      "Bức ảnh không rõ khuôn mặt của người trong ảnh."
    ],
    [
      "horror-cracked-bell",
      "Chuông Đồng Nứt",
      "D",
      "ITEM",
      "🔔",
      "Chuông đồng cũ phát ra âm thanh khác lạ."
    ],
    [
      "horror-unnamed-key",
      "Chìa Khóa Không Tên",
      "C",
      "ITEM",
      "🗝️",
      "Chiếc chìa khóa không ai biết mở cánh cửa nào."
    ],
    [
      "horror-ink-journal",
      "Trang Nhật Ký Nhuốm Mực",
      "B",
      "ITEM",
      "📓",
      "Trang giấy chứa nét chữ đã bị mực che mờ."
    ]
  ]
};
  // Each tuple: permanent ID, name, rank, icon, description, acquisition method.
  const DUDU_SOURCE = [
  [
    "dudu-new-reader",
    "Thẻ Độc Giả Mới",
    "F",
    "🪪",
    "Hoàn tất hồ sơ để nhận thẻ chào mừng.",
    "MILESTONE"
  ],
  [
    "dudu-first-chapter",
    "Dấu Mốc Chương Đầu",
    "E",
    "📖",
    "Kỷ niệm lần đầu hoàn thành một chương truyện.",
    "MILESTONE"
  ],
  [
    "dudu-first-npc",
    "Huy Hiệu Tín Hiệu Đầu Tiên",
    "E",
    "📡",
    "Dấu ấn lần đầu kết nối với một NPC.",
    "MILESTONE"
  ],
  [
    "dudu-archive-ticket",
    "Vé Vào Kho Lưu Trữ",
    "D",
    "🎟️",
    "Tấm vé ghi nhận lần đầu khám phá khu lưu trữ.",
    "MILESTONE"
  ],
  [
    "dudu-realm-footprint",
    "Dấu Chân Vị Diện",
    "D",
    "👣",
    "Dấu ấn đã khám phá nhiều bối cảnh truyện.",
    "MILESTONE"
  ],
  [
    "dudu-infinite-map",
    "Mảnh Bản Đồ Vô Hạn",
    "C",
    "🗺️",
    "Một mảnh ký hiệu cho hành trình khám phá chưa có điểm dừng.",
    "MILESTONE"
  ],
  [
    "dudu-enduring-reader",
    "Huy Hiệu Đọc Không Bỏ Cuộc",
    "C",
    "🏅",
    "Kỷ vật dành cho hành trình đọc nhiều chương khác nhau.",
    "MILESTONE"
  ],
  [
    "dudu-memory-keeper",
    "Thẻ Người Gìn Giữ Ký Ức",
    "B",
    "💌",
    "Tôn vinh người trân trọng những cuộc gặp gỡ trong truyện.",
    "MILESTONE"
  ],
  [
    "dudu-superfan",
    "Huy Hiệu Fan Cứng",
    "B",
    "⭐",
    "Huy hiệu ghi nhận chuỗi thành tựu của độc giả trung thành.",
    "MILESTONE"
  ],
  [
    "dudu-mailbox",
    "Hộp Thư DUDU",
    "B",
    "📮",
    "Món quà lưu niệm của sự kiện cộng đồng.",
    "EVENT"
  ],
  [
    "dudu-meteor-data",
    "Mảnh Dữ Liệu Sao Băng",
    "A",
    "🌠",
    "Mảnh dữ liệu lấp lánh dành cho thành tựu hiếm.",
    "MILESTONE"
  ],
  [
    "dudu-multiverse-seal",
    "Ấn Ký Du Hành Đa Thế Giới",
    "A",
    "🌀",
    "Ấn ký ghi nhận hành trình khám phá nhiều tác phẩm.",
    "MILESTONE"
  ],
  [
    "dudu-first-season",
    "Thẻ Kỷ Niệm Mùa Truyện Đầu",
    "S",
    "🎴",
    "Thẻ giới hạn của sự kiện mùa truyện đầu tiên.",
    "EVENT"
  ],
  [
    "dudu-founders-badge",
    "Huy Hiệu Cộng Đồng Khai Mở",
    "SS",
    "👑",
    "Huy hiệu kỷ niệm những ngày cộng đồng DUDU hình thành.",
    "EVENT"
  ],
  [
    "sss1",
    "Mã Nguồn SYS_ERR_0x000F89",
    "SSS",
    "🌌",
    "Mã nguồn di sản gắn với thế giới Truyện Điên VL; nguồn gốc cuối cùng cần tác giả xác nhận.",
    "EVENT"
  ]
];

  function item(id,name,rank,type,icon,desc,scope,realmTag,method,extras={}) {
    const isMemorial = scope === 'DUDU';
    return Object.freeze({
      id, itemId:id, name, rank, type, icon, desc,
      description: desc,
      scope,
      realmTag:realmTag||null,
      storyId:null, chapterId:null, npcId:null,
      acquisition:Object.freeze({method}),
      unique:isMemorial,
      maxOwned:isMemorial?1:null,
      giftable:!isMemorial,
      tradeable:!isMemorial,
      discardable:!isMemorial,
      published:true,
      ...extras,
      schemaVersion:VERSION
    });
  }
  const common = COMMON_SOURCE.map(row => item(...row,'COMMON',null,'RANDOM'));
  const legacyRealms = REALM_TAGS.flatMap(tag =>
    REALM_SOURCE[tag].map(row => item(...row,'REALM',tag,'RANDOM')));
  // New world pack is additive; legacy 70 IDs and their metadata are unchanged.
  const additions=(worldPack?.items||[]).map(x=>item(
    x.id,x.name,x.rank,x.type,x.icon,x.description,
    'REALM',x.realmTag,x.method,{rpgRole:x.rpgRole,worldPack:'V44.1'}
  ));
  const realms = [...legacyRealms,...additions];
  const souvenirs = DUDU_SOURCE.map(row => {
    const [id,name,rank,icon,desc,method] = row;
    return item(id,name,rank,'ITEM',icon,desc,'DUDU',null,method,
      id === 'sss1' ? {
        originStoryId:'truyen-dien-vl',
        loreReviewRequired:true
      } : {});
  });
  const items = Object.freeze([...common,...realms,...souvenirs]);
  const index = new Map(items.map(record=>[record.id,record]));

  // Archived legacy item in the old random pool but not part of the approved
  // 70-record catalog. It must remain available to old inventory owners.
  const legacy = Object.freeze({
    e1:Object.freeze({
      id:'e1',itemId:'e1',name:'Mì Tôm Cay Dung Thành',rank:'E',
      type:'FOOD',icon:'🍜',desc:'Món ăn quen thuộc thời còn ở phòng net.',
      scope:'LEGACY',archived:true
    })
  });
  function byId(id){ return index.get(id) || legacy[id] || null; }
  function list({scope,realmTag}={}) {
    if (scope && !['COMMON','REALM','DUDU'].includes(scope)) return [];
    if (realmTag && !REALM_TAGS.includes(realmTag)) return [];
    return items.filter(x=>(!scope||x.scope===scope)&&
      (!realmTag || (x.scope==='REALM' && x.realmTag===realmTag)));
  }
  // Preview-only until Phase 2: no gameplay random generator uses this yet.
  // An unknown realm tag fails CLOSED rather than leaking another world's items.
  function previewDropPool({realmTag=null,rank=null}={}) {
    if (realmTag!==null && !REALM_TAGS.includes(realmTag)) return [];
    if (rank!==null && !RANKS.includes(rank)) return [];
    return items.filter(x=>x.acquisition.method==='RANDOM' &&
      (x.scope==='COMMON' || (realmTag && x.scope==='REALM' && x.realmTag===realmTag)) &&
      (!rank || x.rank===rank));
  }
  function validate() {
    const errors=[];
    const seen=new Set();
    const scopes={COMMON:0,REALM:0,DUDU:0};
    for(const x of items){
      if(seen.has(x.id))errors.push('Duplicate item id: '+x.id);
      seen.add(x.id);
      scopes[x.scope]=(scopes[x.scope]||0)+1;
      if(!x.id||x.itemId!==x.id||!x.name||!x.desc||!x.icon)errors.push('Missing item field: '+x.id);
      if(!RANKS.includes(x.rank)||!['FOOD','WEAPON','ITEM'].includes(x.type))errors.push('Invalid rank or type: '+x.id);
      if(x.scope==='REALM'&&!REALM_TAGS.includes(x.realmTag))errors.push('Missing realm tag: '+x.id);
      if(x.scope!=='REALM'&&x.realmTag!==null)errors.push('Unexpected realm tag: '+x.id);
      if(x.scope==='DUDU'&&(x.acquisition.method==='RANDOM'||x.giftable||x.discardable||!x.unique))errors.push('Invalid collector guard: '+x.id);
    }
    if(scopes.COMMON!==25||scopes.REALM!==120||scopes.DUDU!==15)errors.push('Unexpected catalog counts: '+JSON.stringify(scopes));
    if(items.length!==160)errors.push('Expected exactly 160 records');
    for(const tag of REALM_TAGS){
      const inRealm=realms.filter(x=>x.realmTag===tag);
      if(inRealm.length!==20)errors.push('Unexpected realm size: '+tag);
      if(inRealm.filter(x=>x.worldPack==='V44.1'&&x.acquisition.method==='CHAPTER_EVENT').length!==2)
        errors.push('Invalid chapter-gated count: '+tag);
    }
    return Object.freeze(errors);
  }
  return Object.freeze({VERSION,RANKS,REALM_TAGS,items,common:Object.freeze(common),
    realms:Object.freeze(realms),souvenirs:Object.freeze(souvenirs),
    legacyItemCount:70,worldExpansionCount:additions.length,
    byId,list,previewDropPool,validate});
});
