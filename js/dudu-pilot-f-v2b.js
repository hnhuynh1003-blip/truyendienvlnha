/* Quan Đạo V2B: standalone branching F pilot, no real rewards. */
(function(root,factory){
 'use strict';
 const world=(typeof module==='object'&&module.exports)?require('./dudu-pilot-world-v2b.js'):root.DuduQuanDaoWorldV2B;
 const result=factory(world);
 if(typeof module==='object'&&module.exports)module.exports=result;
 if(root)root.DuduPilotFStoryV2B=result;
})(typeof window!=='undefined'?window:null,function(world){
 'use strict';
 if(!world)throw Error('World Bible V2B missing');
 const story={
  schemaVersion:1,status:'pilot_only',released:false,rewardsEnabled:false,
  scenarioId:'pilot-quan-dao-casefile-v8',scenarioVersion:9,
  missionId:'dudu-m-an-f01',worldId:world.worldId,genreId:world.genreId,
  title:'Đêm mưa ở Quan Đạo',tier:'F',world,worldCover:world.places.gate.background,
  startSceneId:'prologue',
  places:Object.fromEntries(Object.entries(world.places).map(([id,p])=>[id,{label:p.publicName,background:p.background,photo:p.photo}])),
  scenes:{
  "prologue": {
    "placeId": "gate",
    "title": "Hồ sơ F · Đêm mưa",
    "text": "Mưa lạnh tạt vào mặt. Bạn vừa bước qua cánh cửa Quan Đạo của Vạn Giới thì đã đứng trước một quán trọ sáng đèn.\n\nDUDU // Khảo nghiệm F: **Tìm túi thuốc bị mất, xác định người lấy và nguyên nhân.** Không cần thu đủ mọi manh mối. Suy luận đúng là kết thúc cuộc truyện; bản thử không cấp thưởng.",
    "phase": "DẪN NHẬP",
    "choices": [
      {
        "id": "enter_case",
        "label": "Đẩy cửa bước vào quán",
        "to": "incident",
        "kind": "travel"
      }
    ]
  },
  "incident": {
    "placeId": "hall",
    "title": "Tiếng hòm gỗ bật mở",
    "text": "Chưởng quầy vừa phát hiện túi thuốc ký gửi cho đoàn xe sáng mai biến mất khỏi hòm có niêm phong. A Liên nói tối qua nghe tiếng chân ở kho; Lục Tam đứng lặng gần cửa. Chính chưởng quầy cũng giữ chìa khóa phụ.\n\nBa người nhìn nhau. Không ai có lời giải thích trọn vẹn. Bạn có thể tự chọn người cần hỏi hoặc nơi cần xem.",
    "phase": "BIẾN CỐ",
    "choices": [
      {
        "id": "take_case",
        "label": "Quan sát mọi người và bắt đầu điều tra",
        "to": "hub",
        "kind": "interaction"
      },
      {
        "id": "refuse_case",
        "label": "Không can dự, rời quán",
        "ending": "withdraw",
        "kind": "travel"
      }
    ]
  },
  "hub": {
    "placeId": "hall",
    "title": "Đại sảnh · Chọn hướng điều tra",
    "text": "A Liên đứng bên bếp, chưởng quầy giữ cuốn sổ trực, Lục Tam nhìn ra cửa mưa. Lối vào kho ở cuối hành lang.\n\nBạn muốn hỏi ai, tìm thứ gì, hay thử suy luận ngay?",
    "phase": "ĐIỀU TRA",
    "choices": [
      {
        "id": "talk_maid",
        "label": "Gặp A Liên",
        "to": "maid",
        "kind": "dialogue"
      },
      {
        "id": "talk_keeper",
        "label": "Hỏi chưởng quầy",
        "to": "keeper",
        "kind": "dialogue"
      },
      {
        "id": "talk_guard",
        "label": "Đến chỗ Lục Tam",
        "to": "guard",
        "kind": "dialogue"
      },
      {
        "id": "visit_store",
        "label": "Khám kho thuốc cùng chưởng quầy",
        "to": "store",
        "kind": "travel"
      },
      {
        "id": "visit_kitchen",
        "label": "Xem góc bếp nơi có vệt than",
        "to": "kitchen",
        "kind": "observation",
        "visibleAnyEvidence": [
          "coal_trace",
          "maid_statement"
        ]
      },
      {
        "id": "open_theories",
        "label": "Tự ghép các manh mối",
        "to": "deduce",
        "kind": "deduction"
      }
    ]
  },
  "keeper": {
    "placeId": "hall",
    "title": "Người có cả hai chìa khóa",
    "text": "Chưởng quầy quản kho và cuốn sổ giao chìa. Trên đầu ngón tay ông còn một vệt mực mới, dù sổ ghi chép đã qua nhiều canh giờ.",
    "phase": "LỜI KHAI",
    "choices": [
      {
        "id": "inspect_register",
        "label": "Xin xem sổ giao chìa",
        "to": "ledger",
        "kind": "observation"
      },
      {
        "id": "ask_corrected_ink",
        "label": "Hỏi vì sao sổ có nét mực vừa sửa",
        "to": "keeper_ink",
        "kind": "dialogue"
      },
      {
        "id": "keeper_leave",
        "label": "Trở lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "keeper",
    "speech": "“Mất thuốc ngay trong quán, tôi là người phải giải trình trước tiên.”"
  },
  "ledger": {
    "placeId": "hall",
    "title": "Một cái tên ở canh hai",
    "text": "Bạn thấy Lục Tam nhận chìa kho vào canh hai; cạnh dòng đó còn một nét mực sửa. Chưởng quầy bảo việc giao chìa có ghi chép, nhưng không vội giải thích dòng sửa.",
    "phase": "MANH MỐI",
    "choices": [
      {
        "id": "note_key_log",
        "label": "Chép lại tên người nhận chìa",
        "to": "hub",
        "kind": "observation",
        "gainEvidence": [
          "key_log"
        ],
        "once": true
      },
      {
        "id": "ledger_ink",
        "label": "Đọc kỹ chỗ sửa mực",
        "to": "keeper_ink",
        "kind": "observation"
      },
      {
        "id": "ledger_back",
        "label": "Khép sổ, trở lại",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "keeper_ink": {
    "placeId": "hall",
    "title": "Dòng mực mới",
    "text": "Một nét mực xanh đè lên giờ ghi trong sổ. Chưởng quầy nói mình sửa vì nhầm giờ đổi ca, nhưng tay ông siết chặt mép giấy khi trả lời.\n\nBạn ghi nhận sự bất thường; nó chưa đủ chỉ ra ông có lấy thuốc hay không.",
    "phase": "MANH MỐI",
    "choices": [
      {
        "id": "note_ink",
        "label": "Ghi lại vết sửa sổ",
        "to": "hub",
        "kind": "observation",
        "gainEvidence": [
          "changed_ledger"
        ],
        "once": true
      },
      {
        "id": "ink_back",
        "label": "Tạm gác câu hỏi",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "maid": {
    "placeId": "hall",
    "title": "Sáp đỏ ở cổ tay",
    "text": "A Liên ôm bó củi, cổ tay dính sáp đỏ. Cô ra vào bếp và hành lang sau quán thường xuyên; thấy bạn nhìn tay áo, cô lập tức kéo tay vào trong.",
    "phase": "LỜI KHAI",
    "choices": [
      {
        "id": "check_maid_wax",
        "label": "Hỏi về vết sáp đỏ",
        "to": "maid_wax",
        "kind": "dialogue"
      },
      {
        "id": "ask_maid_steps",
        "label": "Hỏi đêm qua cô thấy gì",
        "to": "maid_memory",
        "kind": "dialogue"
      },
      {
        "id": "maid_leave",
        "label": "Trở lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "maid",
    "speech": "“Em đã qua hành lang, nhưng em không lấy thuốc.”"
  },
  "maid_wax": {
    "placeId": "hall",
    "title": "Vệt sáp chưa khô",
    "text": "A Liên nói đã đỡ chiếc đèn lồng bị nghiêng trong mưa. Vết sáp trên tay áo có thể từ chiếc đèn, cũng có thể khiến người khác nghĩ đến niêm phong chiếc hòm.",
    "phase": "MANH MỐI",
    "choices": [
      {
        "id": "note_wax",
        "label": "Ghi vết sáp để đối chiếu",
        "to": "hub",
        "kind": "observation",
        "gainEvidence": [
          "wax_cuff"
        ],
        "once": true
      },
      {
        "id": "wax_back",
        "label": "Trở lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "maid",
    "speech": "“Em giữ đèn khỏi rơi. Khách quan có tin hay không thì tùy.”"
  },
  "maid_memory": {
    "placeId": "hall",
    "title": "Một bóng người qua bếp",
    "text": "A Liên kể khi thêm củi lúc canh hai, cô nghe tiếng cửa kho và thấy bóng người đi vội qua hành lang. Không nhìn rõ mặt, nhưng cô nhớ có một vệt than mới trên nền gạch.\n\nCô không dám nói đó là ai.",
    "phase": "LỜI CHỨNG",
    "choices": [
      {
        "id": "note_maid_statement",
        "label": "Ghi đúng lời A Liên đã thấy",
        "to": "hub",
        "kind": "observation",
        "gainEvidence": [
          "maid_statement"
        ],
        "once": true
      },
      {
        "id": "follow_maid_observation",
        "label": "Theo lời cô tới khu bếp",
        "to": "kitchen",
        "kind": "travel",
        "gainEvidence": [
          "maid_statement"
        ]
      },
      {
        "id": "maid_memory_leave",
        "label": "Tạm ngừng hỏi",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "maid",
    "speech": "“Em chỉ thấy bóng người, không thấy mặt.”"
  },
  "guard": {
    "placeId": "hall",
    "title": "Tay áo người lính",
    "text": "Lục Tam mang áo đội áp tải, gấu áo lấm than và dây buộc cổ tay màu lam. Anh từng trực ở trạm gác bên kia đèo, nhưng câu trả lời về đêm qua rất dè chừng.",
    "phase": "LỜI KHAI",
    "choices": [
      {
        "id": "ask_guard_time",
        "label": "Hỏi anh ở đâu canh hai",
        "to": "guard_memory",
        "kind": "dialogue"
      },
      {
        "id": "ask_guard_cord",
        "label": "Hỏi sợi dây trên cổ tay",
        "to": "guard_cord",
        "kind": "observation"
      },
      {
        "id": "guard_leave",
        "label": "Trở lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "guard",
    "speech": "“Tôi rời trạm một lúc. Không thể vì vậy nói tôi lấy túi thuốc.”"
  },
  "guard_memory": {
    "placeId": "hall",
    "title": "Một lời khai không trọn vẹn",
    "text": "Lục Tam nhận mình rời vị trí khi có người kêu cứu, nhưng không nói đã đến đâu sau đó. Anh nhìn chỗ cửa kho rồi im bặt.",
    "phase": "LỜI CHỨNG",
    "choices": [
      {
        "id": "note_guard_account",
        "label": "Ghi lời khai về tiếng kêu cứu",
        "to": "hub",
        "kind": "observation",
        "gainEvidence": [
          "guard_statement"
        ],
        "once": true
      },
      {
        "id": "guard_memory_leave",
        "label": "Để anh suy nghĩ thêm",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "guard",
    "speech": "“Có người bị thương ở trạm. Tôi chỉ có thể nói vậy.”"
  },
  "guard_cord": {
    "placeId": "hall",
    "title": "Nút dây quân nhu",
    "text": "Sợi dây lam buộc cổ tay lính áp tải có nút thắt hai vòng rất đặc trưng. Lục Tam vô thức kéo sợi dây giấu dưới tay áo khi thấy bạn nhìn.",
    "phase": "QUAN SÁT",
    "choices": [
      {
        "id": "cord_keep_in_mind",
        "label": "Ghi nhớ kiểu nút dây, chưa kết luận",
        "to": "hub",
        "kind": "observation",
        "gainEvidence": [
          "guard_statement"
        ],
        "once": true
      },
      {
        "id": "cord_back",
        "label": "Trở lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "store": {
    "placeId": "store",
    "title": "Hòm thuốc trống",
    "text": "Hòm gỗ đặt giữa kho, sáp niêm phong rơi dưới nền. Một vệt bụi than chạy từ góc hòm hướng ra cửa bếp. Trên giá, các lọ thuốc khác vẫn nguyên.",
    "phase": "KHÁM NGHIỆM",
    "choices": [
      {
        "id": "look_broken_seal",
        "label": "Xem mảnh niêm phong",
        "to": "seal",
        "kind": "observation"
      },
      {
        "id": "look_coal_marks",
        "label": "Theo dấu than cạnh chân hòm",
        "to": "coal_path",
        "kind": "observation"
      },
      {
        "id": "store_leave",
        "label": "Đóng cửa kho, về đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "seal": {
    "placeId": "store",
    "title": "Vết sáp vỡ",
    "text": "Mảnh sáp bị bẻ từ phía ngoài. Ai có chìa đều có thể mở hòm mà không cần phá khóa. Phần sáp ở chân hòm có màu tương tự sáp đèn lồng.",
    "phase": "VẬT CHỨNG",
    "choices": [
      {
        "id": "record_seal",
        "label": "Ghi vết niêm phong",
        "to": "store",
        "kind": "observation",
        "gainEvidence": [
          "broken_seal"
        ],
        "once": true
      },
      {
        "id": "seal_back",
        "label": "Đứng dậy quan sát nơi khác",
        "to": "store",
        "kind": "travel"
      }
    ]
  },
  "coal_path": {
    "placeId": "store",
    "title": "Một vệt than lạ",
    "text": "Than vụn kéo từ dưới chân hòm ra bậc cửa phía bếp, không phải vết giày bùn thông thường. Túi thuốc có thể đã đi qua đây, nhưng ai mang nó vẫn chưa rõ.",
    "phase": "DẤU VẾT",
    "choices": [
      {
        "id": "trace_to_kitchen",
        "label": "Theo vệt than tới góc bếp",
        "to": "kitchen",
        "kind": "travel",
        "gainEvidence": [
          "coal_trace"
        ]
      },
      {
        "id": "record_coal_then_back",
        "label": "Đánh dấu vệt than rồi trở lại quán",
        "to": "hub",
        "kind": "observation",
        "gainEvidence": [
          "coal_trace"
        ]
      }
    ]
  },
  "kitchen": {
    "placeId": "hall",
    "title": "Góc bếp tối",
    "text": "Bên bếp lửa gần tàn có chiếc thùng than, giá treo đèn và bó củi mới. Vài hạt than vương dưới miệng thùng; chẳng ai để ý chúng giữa đêm mưa.",
    "phase": "TÌM VẬT CHỨNG",
    "choices": [
      {
        "id": "check_coal_bin",
        "label": "Mở thùng than nơi vệt bụi dừng lại",
        "to": "bundle",
        "kind": "observation",
        "gainEvidence": [
          "medicine_bundle"
        ]
      },
      {
        "id": "inspect_lantern",
        "label": "Xem chiếc đèn lồng bị nghiêng",
        "to": "lantern",
        "kind": "observation"
      },
      {
        "id": "kitchen_back",
        "label": "Trở về đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "lantern": {
    "placeId": "hall",
    "title": "Chiếc đèn lồng",
    "text": "Trên móc đèn là những giọt sáp đỏ chảy ra khi đèn nghiêng. Chúng cùng màu với thứ bạn có thể thấy trên tay áo A Liên; sáp là dấu vết cần kiểm tra, không tự chứng minh ai mở hòm.",
    "phase": "ĐỐI CHIẾU",
    "choices": [
      {
        "id": "lantern_note",
        "label": "Ghi vị trí đèn và vệt sáp",
        "to": "kitchen",
        "kind": "observation",
        "gainEvidence": [
          "wax_cuff"
        ]
      },
      {
        "id": "lantern_back",
        "label": "Quay lại góc bếp",
        "to": "kitchen",
        "kind": "travel"
      }
    ]
  },
  "bundle": {
    "placeId": "hall",
    "title": "Túi thuốc đã được tìm thấy",
    "text": "Dưới lớp than là chiếc túi cứu thương còn nhiều gói nguyên niêm. Dây buộc màu lam, mép túi ẩm như vừa đi qua mưa. Một tờ giấy gấp nhỏ thò ra trong lớp vải.\n\nBạn đã tìm ra thứ bị mất. Giờ câu hỏi khó nhất là ai đặt nó ở đây và vì sao.",
    "phase": "BƯỚC NGOẶT",
    "choices": [
      {
        "id": "inspect_blue_knot",
        "label": "Kiểm tra nút dây màu lam",
        "to": "knot",
        "kind": "observation"
      },
      {
        "id": "open_hidden_note",
        "label": "Mở tờ giấy trong túi",
        "to": "receipt",
        "kind": "observation"
      },
      {
        "id": "bundle_to_deduce",
        "label": "Đem túi thuốc ra làm vật chứng, suy luận",
        "to": "deduce",
        "kind": "deduction"
      }
    ]
  },
  "knot": {
    "placeId": "hall",
    "title": "Nút thắt có chủ",
    "text": "Dây màu lam được thắt thành hai vòng chéo như kiểu buộc trên quân nhu đoàn áp tải. Bạn nhớ một người trong quán cũng có loại dây tương tự, nhưng vẫn cần đối chiếu cùng những dấu vết khác.",
    "phase": "CHỨNG CỨ THEN CHỐT",
    "choices": [
      {
        "id": "record_knot",
        "label": "Ghi dấu nút dây",
        "to": "bundle",
        "kind": "observation",
        "gainEvidence": [
          "military_knot"
        ],
        "once": true
      },
      {
        "id": "knot_back",
        "label": "Gấp lại mép túi",
        "to": "bundle",
        "kind": "travel"
      }
    ]
  },
  "receipt": {
    "placeId": "hall",
    "title": "Tờ giấy không có tên người mang",
    "text": "Dấu y tá trạm gác cùng mốc giờ canh hai xác nhận có người bị thương được dùng một phần thuốc cứu thương. Phiếu không ghi ai đưa túi đến. Lượng thuốc còn nguyên trong túi phù hợp phần chưa sử dụng.\n\nĐây là nguyên nhân khả dĩ của việc túi rời kho, chưa phải tên người cầm nó.",
    "phase": "CHỨNG CỨ THEN CHỐT",
    "choices": [
      {
        "id": "record_receipt",
        "label": "Ghi phiếu cấp cứu và thời điểm",
        "to": "bundle",
        "kind": "observation",
        "gainEvidence": [
          "care_receipt"
        ],
        "once": true
      },
      {
        "id": "receipt_back",
        "label": "Cất phiếu trở lại",
        "to": "bundle",
        "kind": "travel"
      }
    ]
  },
  "deduce": {
    "placeId": "hall",
    "title": "Ai đã mang túi thuốc đi?",
    "text": "Bạn nhìn lại lời khai và dấu vết. Mỗi người có một lý do để bị nghi; một dấu lạ không đủ kết tội.\n\nBạn có thể suy luận ngay, hoặc quay lại tìm thêm điều có thể chứng minh giả thuyết.",
    "phase": "SUY LUẬN",
    "choices": [
      {
        "id": "theory_maid",
        "label": "Nghi A Liên",
        "to": "claim_maid",
        "kind": "deduction"
      },
      {
        "id": "theory_keeper",
        "label": "Nghi Hà chưởng quầy",
        "to": "claim_keeper",
        "kind": "deduction"
      },
      {
        "id": "theory_guard",
        "label": "Nghi Lục Tam",
        "to": "claim_guard",
        "kind": "deduction"
      },
      {
        "id": "theory_back",
        "label": "Tiếp tục xem xét hiện trường",
        "to": "hub",
        "kind": "travel"
      },
      {
        "id": "cannot_find_bundle",
        "label": "Bỏ cuộc khi chưa làm rõ",
        "ending": "unsolved",
        "kind": "conclusion"
      }
    ]
  },
  "claim_maid": {
    "placeId": "hall",
    "title": "Nghi A Liên",
    "text": "A Liên có mặt gần kho và có dấu sáp trên tay áo. Nhưng những điều ấy có thể xuất phát từ nhiều hành động khác nhau. Bạn có chứng cứ trực tiếp nào nối cô với túi thuốc?",
    "phase": "ĐÁNH GIÁ",
    "choices": [
      {
        "id": "accuse_maid",
        "label": "Công bố A Liên đã lấy túi dù chưa có vật chứng quyết định",
        "ending": "wrong_maid",
        "kind": "conclusion"
      },
      {
        "id": "rethink_maid",
        "label": "Tạm rút giả thuyết và điều tra thêm",
        "to": "deduce",
        "kind": "deduction"
      }
    ]
  },
  "claim_keeper": {
    "placeId": "hall",
    "title": "Nghi chưởng quầy",
    "text": "Ông quản chìa, sổ lại có một nét mực sửa. Vết sửa có thể đáng ngờ, nhưng chưa chứng minh ông đã mang túi thuốc đi. Bạn muốn kết luận ngay hay tiếp tục kiểm chứng?",
    "phase": "ĐÁNH GIÁ",
    "choices": [
      {
        "id": "accuse_keeper",
        "label": "Công bố chưởng quầy đã lấy túi khi chưa có căn cứ quyết định",
        "ending": "wrong_keeper",
        "kind": "conclusion"
      },
      {
        "id": "rethink_keeper",
        "label": "Trở lại bàn suy luận",
        "to": "deduce",
        "kind": "deduction"
      }
    ]
  },
  "claim_guard": {
    "placeId": "hall",
    "title": "Nghi người lính",
    "text": "Lục Tam có lời khai chưa đầy đủ. Nhưng nghi ngờ không phải lời giải; phải nối được con người, chiếc túi đã tìm và nguyên nhân biến mất.",
    "phase": "ĐỐI CHẤT",
    "choices": [
      {
        "id": "present_guard_proof",
        "label": "Đưa túi thuốc, phiếu cấp cứu và dấu liên quan để đối chất",
        "to": "motive",
        "kind": "deduction",
        "requires": [
          "medicine_bundle",
          "care_receipt"
        ],
        "visibleAnyEvidence": [
          "key_log",
          "military_knot"
        ]
      },
      {
        "id": "accuse_guard_unverified",
        "label": "Vội tuyên bố Lục Tam lấy thuốc mà không đối chiếu",
        "ending": "wrong_guard",
        "kind": "conclusion"
      },
      {
        "id": "rethink_guard",
        "label": "Tiếp tục tìm chứng cứ quyết định",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "motive": {
    "placeId": "hall",
    "title": "Đối chất · Vì sao lại giấu túi?",
    "text": "Bạn đặt túi thuốc tìm được cùng phiếu cấp cứu trước mặt Lục Tam. Anh nhìn sợi dây buộc, im lặng rất lâu. Chưởng quầy và A Liên đứng ở đầu bàn.\n\nMột lời giải thích đúng phải nối được mốc thời gian, vật chứng và hành vi che giấu.",
    "phase": "CAO TRÀO",
    "choices": [
      {
        "id": "motive_sale",
        "label": "Anh lấy thuốc để bán kiếm tiền",
        "to": "motive_mistake",
        "kind": "deduction"
      },
      {
        "id": "motive_emergency",
        "label": "Anh lấy cứu người ở trạm, mang phần còn lại về rồi giấu vì sợ bị phạt",
        "to": "reveal",
        "kind": "deduction",
        "addFlags": [
          "case_reasoned"
        ]
      },
      {
        "id": "motive_keeper_order",
        "label": "Anh làm theo lời chưởng quầy để giấu hàng",
        "to": "motive_mistake",
        "kind": "deduction"
      },
      {
        "id": "motive_back",
        "label": "Chưa chắc, quay lại xem chứng cứ",
        "to": "deduce",
        "kind": "deduction"
      }
    ]
  },
  "motive_mistake": {
    "placeId": "hall",
    "title": "Giả thuyết bị phản bác",
    "text": "Tờ phiếu và lượng thuốc còn lại không hỗ trợ cách giải thích ấy. Bạn chưa thể khẳng định động cơ chỉ bằng suy đoán.\n\nBạn có thể đối chiếu lại, hoặc cố giữ lời buộc tội thiếu căn cứ.",
    "phase": "PHẢN BIỆN",
    "choices": [
      {
        "id": "motive_rethink",
        "label": "Xem lại thời gian và túi thuốc",
        "to": "motive",
        "kind": "deduction"
      },
      {
        "id": "insist_wrong_motive",
        "label": "Vẫn công bố giả thuyết chưa chứng minh",
        "ending": "wrong_motive",
        "kind": "conclusion"
      }
    ]
  },
  "reveal": {
    "placeId": "hall",
    "title": "Người mở hòm lên tiếng",
    "text": "Lục Tam cúi đầu. Anh nhận đã mượn chìa, lấy thuốc cứu một người bị thương ở trạm gác. Đêm ấy anh mang túi còn lại về định lén trả, nhưng nghe tiếng mọi người kiểm kho nên giấu vội trong thùng than.\n\nHà chưởng quầy thú nhận đã sửa giờ trong sổ vì sợ bị truy trách nhiệm giao chìa; A Liên chỉ giữ chiếc đèn lồng chảy sáp. Mọi vết đáng nghi giờ có lời giải thích có thể đối chiếu. Bạn đã tìm được túi, xác định người mang đi và nguyên nhân.",
    "phase": "SỰ THẬT",
    "choices": [
      {
        "id": "close_case_publicly",
        "label": "Công bố chứng cứ, minh oan A Liên, yêu cầu Lục Tam nhận trách nhiệm",
        "ending": "solved",
        "kind": "conclusion",
        "requiresFlags": [
          "case_reasoned"
        ]
      },
      {
        "id": "close_case_with_mercy",
        "label": "Trình rõ sự thật, đề nghị xem xét việc cứu người khi xử lý lỗi",
        "ending": "solved_mercy",
        "kind": "conclusion",
        "requiresFlags": [
          "case_reasoned"
        ]
      },
      {
        "id": "keep_all_secret",
        "label": "Giữ kín tất cả, để lời đồn về A Liên tiếp tục",
        "ending": "unresolved",
        "kind": "conclusion"
      }
    ],
    "npcId": "guard",
    "speech": "“Tôi mang túi về nhưng không dám nói. Khi thấy A Liên bị nghi oan, tôi càng không biết mở lời thế nào.”"
  }
},
  endings:{
  "solved": {
    "status": "success",
    "title": "Hồ sơ khép lại trước bình minh",
    "text": "Bạn đưa chiếc túi đã tìm lại lên bàn, đặt bên cạnh sổ chìa và phiếu cấp cứu. Lục Tam nhận lỗi trước chưởng quầy; A Liên được minh oan, còn thuốc chưa dùng vẫn kịp bàn giao cho đoàn xe sáng mai.\n\nDUDU // KHẢO NGHIỆM F HOÀN TẤT: Tìm được vật chứng, xác định đúng người và nguyên nhân. Bản thử không cấp EXP, Xu hoặc vật phẩm."
  },
  "solved_mercy": {
    "status": "success",
    "title": "Một sự thật, hai trách nhiệm",
    "text": "Chiếc túi thuốc trở về đúng chỗ. Lục Tam thừa nhận đã tự ý lấy để cứu người rồi giấu phần còn lại; chưởng quầy đồng ý ghi nhận tình huống cấp cứu nhưng vẫn yêu cầu giải trình. A Liên được xin lỗi công khai.\n\nDUDU // KHẢO NGHIỆM F HOÀN TẤT: Bạn tìm ra người lấy, vật chứng và động cơ. Bản thử không cấp EXP, Xu hoặc vật phẩm."
  },
  "wrong_maid": {
    "status": "failure",
    "title": "Dấu sáp không đủ kết án",
    "text": "Bạn chỉ vào A Liên, nhưng vết sáp trên tay cô đến từ chiếc đèn lồng. Túi thuốc vẫn chưa được giải thích thỏa đáng; lời buộc tội khiến cô bật khóc.\n\nDUDU // Giả thuyết thiếu chứng cứ quyết định. Đây là kết cục thử nghiệm."
  },
  "wrong_keeper": {
    "status": "failure",
    "title": "Một nét mực, một lời kết tội",
    "text": "Chưởng quầy đã sửa giờ trong sổ để tránh bị khiển trách vì giao chìa, nhưng không tự mang túi thuốc khỏi kho. Việc bạn kết luận từ vết sửa khiến người trong quán tranh cãi, còn sự thật chưa được làm rõ.\n\nDUDU // Giả thuyết chưa chứng minh người lấy thuốc."
  },
  "wrong_guard": {
    "status": "failure",
    "title": "Đoán đúng chưa phải phá án",
    "text": "Bạn gọi tên Lục Tam nhưng không thể giải thích túi thuốc nằm đâu, chứng cứ nào nối anh với nó và anh lấy vì sao. Trước mặt mọi người, một lời đoán chưa thể thay thế kết luận.\n\nDUDU // Thiếu vật chứng và lời giải thích. Thử một tuyến khác."
  },
  "wrong_motive": {
    "status": "failure",
    "title": "Chỉ đúng người, sai nguyên nhân",
    "text": "Bạn đã tìm được túi thuốc và nghi đúng người, nhưng lại khẳng định động cơ không phù hợp phiếu cấp cứu. Lục Tam không đồng ý với lời kết tội ấy.\n\nDUDU // Phá án cần cả người thực hiện lẫn nguyên nhân, không chỉ một cái tên."
  },
  "unresolved": {
    "status": "failure",
    "title": "Thuốc đã thấy, lời đồn còn đó",
    "text": "Bạn giữ kín sự thật. Túi thuốc trở về kho, nhưng A Liên tiếp tục chịu ánh nhìn nghi ngờ. Lục Tam vẫn không bị yêu cầu giải trình.\n\nDUDU // Hồ sơ chưa được khép lại công khai."
  },
  "withdraw": {
    "status": "failure",
    "title": "Đêm mưa chưa có lời giải",
    "text": "Bạn rời quán trong tiếng mưa. Người trong quán vẫn tìm túi thuốc, mỗi người mang theo một nghi ngờ.\n\nDUDU // Kết thúc tuyến không tham gia."
  },
  "unsolved": {
    "status": "failure",
    "title": "Một hồ sơ còn bỏ ngỏ",
    "text": "Bạn chưa tìm thấy túi thuốc hoặc chưa nối được các chứng cứ. Đêm mưa trôi qua cùng những lời nghi ngờ chưa được kiểm chứng.\n\nDUDU // Hồ sơ chưa hoàn thành."
  }
}
 };
 function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 return freeze(story);
});