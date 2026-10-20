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
  scenarioId:'pilot-quan-dao-reasoning-v5',scenarioVersion:5,
  missionId:'dudu-m-an-f01',worldId:world.worldId,genreId:world.genreId,
  title:'Đêm mưa ở Quan Đạo',tier:'F',world,worldCover:world.places.gate.background,
  startSceneId:'prologue',
  places:Object.fromEntries(Object.entries(world.places).map(([id,p])=>[id,{label:p.publicName,background:p.background,photo:p.photo}])),
  scenes:{
  "prologue": {
    "placeId": "gate",
    "phase": "DẪN TRUYỆN",
    "title": "Mưa trên đường Quan Đạo",
    "text": "Khoảnh khắc trước, bạn còn nhìn cánh cửa mang tên Quan Đạo trong Vạn Giới. Khi định thần, chân bạn đã giẫm xuống mặt đường đèo lầy bùn. Mưa lạnh tạt qua má, mùi đất ướt chân thật đến mức chẳng giống một trang sách.\n\nPhía trước có ánh đèn lồng chao dưới mái ngói. Bạn chưa biết mình là ai trong mắt những người ở đây; trước hết, bạn cần tìm chỗ trú mưa. Không có dòng chữ nào báo trước điều sắp xảy ra.",
    "choices": [
      {
        "id": "approach_inn_v3",
        "label": "Đến quán trọ xin trú mưa",
        "to": "arrival",
        "kind": "travel"
      }
    ]
  },
  "arrival": {
    "placeId": "gate",
    "phase": "GẶP GỠ",
    "title": "Dưới mái hiên",
    "text": "Một cô gái đang cố giữ tấm phên tre khỏi bị gió cuốn. Cô mời bạn vào quán, giọng nói vui vẻ dù vạt áo đã ướt.\n\n“Khách quan vào trong đi, không khéo ốm mất.” Cô tự giới thiệu tên A Liên. Bạn có thể giúp cô một tay, hoặc vào trước để tìm nơi hong áo.",
    "choices": [
      {
        "id": "help_maid_v3",
        "label": "Giữ giúp A Liên tấm phên tre",
        "to": "resting",
        "kind": "interaction",
        "addFlags": [
          "helped_maid"
        ],
        "relations": {
          "maid": 1
        },
        "reaction": "A Liên bật cười cảm ơn và đưa bạn một chiếc khăn sạch."
      },
      {
        "id": "enter_inn_v2b",
        "label": "Gật đầu cảm ơn rồi vào quán",
        "to": "resting",
        "kind": "travel",
        "reaction": "A Liên nhường bạn bước qua cửa, còn cô ở lại khóa phên."
      }
    ]
  },
  "resting": {
    "placeId": "hall",
    "phase": "TRƯỚC BIẾN CỐ",
    "title": "Một chén trà nóng",
    "text": "Hà chưởng quầy đặt lên bàn chén trà gừng bốc khói. Bên kia phòng, một người lính trẻ ăn cơm một mình, thi thoảng nhìn về cửa sau. Trong quán chỉ có tiếng mưa và những câu chuyện vụn vặt về đường sá.\n\nBạn không vội ngủ. Một bữa tối ở nơi xa lạ vẫn có thể mở đầu bằng một lời hỏi thăm.",
    "choices": [
      {
        "id": "ask_about_inn",
        "label": "Hỏi chưởng quầy về con đường qua đèo",
        "to": "table_talk",
        "kind": "dialogue",
        "addFlags": [
          "heard_local_story"
        ],
        "reaction": "Ông bảo con đèo thường sạt lở vào mùa này, ai qua đường đều phải nương nhờ nhau."
      },
      {
        "id": "watch_the_room",
        "label": "Ngồi yên quan sát mọi người",
        "to": "table_talk",
        "kind": "observation",
        "addFlags": [
          "noticed_guard_restless"
        ],
        "reaction": "Người lính vội giấu một mẩu giấy vào áo mỗi khi tiếng cửa sau bật mở."
      }
    ]
  },
  "table_talk": {
    "placeId": "hall",
    "phase": "BIẾN CỐ",
    "title": "Tiếng động sau bếp",
    "text": "Một tiếng gỗ va mạnh vang lên từ phía nhà kho. Hà chưởng quầy bỏ dở chén trà, vội chạy qua hành lang. Khi trở lại, ông tái mặt: chiếc hòm thuốc được đoàn áp tải gửi giữ đã mở, túi thuốc không còn.\n\nMột người khách nói nhỏ rằng A Liên thường giữ chìa bếp. Cô gái sững người. Người lính trẻ vừa đứng dậy lại ngồi xuống. Cả quán bắt đầu xôn xao.",
    "choices": [
      {
        "id": "stay_to_listen",
        "label": "Ở lại, đề nghị mọi người nói lần lượt",
        "to": "hub",
        "kind": "interaction",
        "addFlags": [
          "stayed_for_truth"
        ],
        "reaction": "Hà chưởng quầy yêu cầu mọi người chưa được buộc tội khi chưa rõ chuyện."
      },
      {
        "id": "stand_back",
        "label": "Đứng ở góc quán, quan sát trước",
        "to": "hub",
        "kind": "observation",
        "reaction": "Bạn chọn không đứng về phía ai khi vẫn chưa biết rõ tình hình."
      },
      {
        "id": "leave_inn_v2b",
        "label": "Rời quán trước khi rắc rối kéo dài",
        "ending": "withdraw",
        "kind": "travel"
      }
    ]
  },
  "hub": {
    "placeId": "hall",
    "phase": "TỰ DO KHÁM PHÁ",
    "title": "Đại sảnh Quan Đạo",
    "text": "Mưa vẫn rơi ngoài hiên. Chưởng quầy đang tìm sổ, A Liên đứng gần bếp, người lính lặng lẽ bên cửa. Lối nhỏ dẫn ra kho nằm sau bức rèm.\n\nBạn muốn tiếp cận ai hoặc kiểm tra nơi nào trước?",
    "choices": [
      {
        "id": "keeper_visit_v2b",
        "label": "Đến bàn chưởng quầy",
        "to": "keeper",
        "kind": "dialogue"
      },
      {
        "id": "maid_visit_v2b",
        "label": "Tới bên bếp gặp A Liên",
        "to": "maid",
        "kind": "dialogue"
      },
      {
        "id": "guard_visit_v2b",
        "label": "Đến chỗ người lính",
        "to": "guard",
        "kind": "dialogue"
      },
      {
        "id": "corridor_visit",
        "label": "Kiểm tra hành lang ra kho",
        "to": "corridor",
        "kind": "travel"
      },
      {
        "id": "store_visit_v2b",
        "label": "Theo chưởng quầy vào kho",
        "to": "store",
        "kind": "travel",
        "visibleIfFlags": [
          "store_access"
        ]
      },
      {
        "id": "assemble_clues",
        "label": "Ngồi lại suy nghĩ về những gì đã biết",
        "to": "notes",
        "kind": "deduction"
      },
      {
        "id": "step_away",
        "label": "Rời đi, để mọi người tự giải quyết",
        "ending": "withdraw",
        "kind": "travel"
      }
    ]
  },
  "keeper": {
    "placeId": "hall",
    "phase": "TRÒ CHUYỆN",
    "title": "Chuyện chiếc chìa kho",
    "text": "Hà chưởng quầy lau mắt kính. Ông giận vì đồ ký gửi biến mất nhưng nhất định không muốn ai bị lục soát vô cớ.\n\nÔng kéo quyển sổ trực đêm ra trước mặt bạn. Những trang giấy sờn mép cho thấy mỗi lần giao chìa đều được ghi lại.",
    "choices": [
      {
        "id": "keeper_ask_register",
        "label": "Xin xem trang sổ giao chìa đêm qua",
        "to": "ledger",
        "kind": "observation"
      },
      {
        "id": "keeper_ask_people",
        "label": "Hỏi ông tin A Liên đến mức nào",
        "to": "keeper_people",
        "kind": "dialogue"
      },
      {
        "id": "keeper_back",
        "label": "Trở lại giữa đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "keeper",
    "speech": "“Muốn biết ai ra vào kho, khách quan cứ xem sổ. Đừng vội kết tội ai.”"
  },
  "keeper_people": {
    "placeId": "hall",
    "phase": "TRÒ CHUYỆN",
    "title": "Lời chưởng quầy",
    "text": "“Con bé ở đây đã ba năm, có lúc vụng về nhưng chưa ai bắt gặp nó lấy của người khác. Thương thì thương, ta vẫn phải kiểm chứng.” Ông khép sổ lại, chờ bạn hỏi điều cần biết.",
    "choices": [
      {
        "id": "people_see_ledger",
        "label": "Xin mở sổ giao chìa",
        "to": "ledger",
        "kind": "observation"
      },
      {
        "id": "people_back",
        "label": "Quay lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "keeper"
  },
  "ledger": {
    "placeId": "hall",
    "phase": "TÌM MANH MỐI",
    "title": "Trang sổ canh hai",
    "text": "Bạn lần theo giờ nhận chìa của từng người. Một hàng mực ghi Lục Tam nhận chìa kho lúc canh hai, chưa có giờ trả rõ ràng. Ông chưởng quầy xác nhận đây là nét chữ của mình.\n\nĐiều này cho thấy người lính có thể ra vào kho, chưa chứng minh anh đã lấy thuốc.",
    "choices": [
      {
        "id": "copy_key_log_v2b",
        "label": "Ghi lại trang sổ, xin phép xem kho",
        "to": "hub",
        "kind": "observation",
        "gainEvidence": [
          "key_log"
        ],
        "addFlags": [
          "store_access"
        ],
        "once": true,
        "reaction": "Chưởng quầy cầm đèn, hứa sẽ đi cùng bạn khi mở kho."
      },
      {
        "id": "leave_ledger",
        "label": "Chưa ghi lại, trở về đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "maid": {
    "placeId": "hall",
    "phase": "TRÒ CHUYỆN",
    "title": "Cô gái bên bếp",
    "text": "A Liên vặn chiếc khăn ẩm, không ngẩng đầu ngay. Cô bảo mình có đi qua hành lang trong đêm, nhưng không hiểu vì sao mọi người lại coi đó là bằng chứng chống lại mình.\n\nBạn có thể hỏi kỹ về điều cô nhìn thấy, hoặc để cô lấy lại bình tĩnh.",
    "choices": [
      {
        "id": "ask_maid_last_night",
        "label": "Hỏi A Liên đã nhìn thấy gì",
        "to": "maid_memory",
        "kind": "dialogue"
      },
      {
        "id": "comfort_maid",
        "label": "Nói rằng chưa ai nên bị kết tội lúc này",
        "to": "hub",
        "kind": "interaction",
        "addFlags": [
          "comforted_maid"
        ],
        "relations": {
          "maid": 1
        },
        "reaction": "Vai A Liên bớt căng, cô cảm ơn vì bạn chịu nghe."
      },
      {
        "id": "maid_back",
        "label": "Để cô nghỉ, quay lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "maid",
    "speech": "“Em mong khách quan nghe em nói cho rõ, chứ đừng nghe họ đoán.”"
  },
  "maid_memory": {
    "placeId": "hall",
    "phase": "LỜI CHỨNG",
    "title": "Dưới ánh đèn hành lang",
    "text": "A Liên nhớ mình đi lấy nước vào canh hai. Trời tối, ngọn đèn bị mưa tạt nên cô chỉ nhìn thấy một bóng áo sẫm đi qua hành lang; khuôn mặt người đó bị bóng tối che khuất.\n\nCô không dám gọi tên một người mà mình chưa từng nhìn rõ.",
    "choices": [
      {
        "id": "write_maid_testimony_v2b",
        "label": "Ghi đúng những gì cô đã thấy",
        "to": "hub",
        "kind": "observation",
        "gainEvidence": [
          "maid_statement"
        ],
        "once": true
      },
      {
        "id": "maid_memory_back",
        "label": "Suy nghĩ thêm rồi quay lại",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "maid",
    "speech": "“Em chỉ thấy bóng người thôi. Em không biết đó là ai.”"
  },
  "guard": {
    "placeId": "hall",
    "phase": "TRÒ CHUYỆN",
    "title": "Người lính bên cửa",
    "text": "Người lính trẻ tự giới thiệu tên Lục Tam rồi nhìn về sân ướt mưa. Anh nói đội áp tải đang dừng chân gần đèo, nhưng không muốn kể thêm lúc này.\n\nBạn chọn một câu hỏi cụ thể thay vì ép anh khai toàn bộ ngay.",
    "choices": [
      {
        "id": "ask_guard_where",
        "label": "Hỏi anh đã ở đâu vào canh hai",
        "to": "guard_memory",
        "kind": "dialogue"
      },
      {
        "id": "ask_guard_duty",
        "label": "Hỏi về đoàn áp tải và túi thuốc",
        "to": "guard_duty",
        "kind": "dialogue"
      },
      {
        "id": "guard_back",
        "label": "Trở lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "guard",
    "speech": "“Có những việc tôi đang lo. Khách quan muốn hỏi điều gì?”"
  },
  "guard_duty": {
    "placeId": "hall",
    "phase": "TRÒ CHUYỆN",
    "title": "Điều người lính tránh nói",
    "text": "“Chúng tôi đưa hàng y dược về đồn. Nếu thiếu một thứ, người ký nhận phải giải trình.” Anh kéo kín cổ áo. Không có câu nào trong đó nói anh là người lấy túi thuốc.",
    "choices": [
      {
        "id": "guard_duty_ask_where",
        "label": "Hỏi về thời gian anh rời trạm",
        "to": "guard_memory",
        "kind": "dialogue"
      },
      {
        "id": "guard_duty_back",
        "label": "Trở lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "guard"
  },
  "guard_memory": {
    "placeId": "hall",
    "phase": "LỜI CHỨNG",
    "title": "Canh hai ở trạm gác",
    "text": "Bạn hỏi anh về thời điểm canh hai. Lục Tam xác nhận đã rời chốt khi nghe tiếng kêu cứu, sau đó trở về. Anh không tự nhắc đến chiếc hòm thuốc.\n\nCần ghi nguyên lời anh nói, không được tự thêm điều mình nghi ngờ.",
    "choices": [
      {
        "id": "write_guard_testimony_v2b",
        "label": "Ghi lại thời điểm anh rời trạm",
        "to": "hub",
        "kind": "observation",
        "gainEvidence": [
          "guard_statement"
        ],
        "once": true
      },
      {
        "id": "guard_memory_back",
        "label": "Không hỏi thêm, quay lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "guard",
    "speech": "“Tôi có rời vị trí một lúc. Chuyện ấy tôi nhận.”"
  },
  "corridor": {
    "placeId": "hall",
    "phase": "KHÁM PHÁ",
    "title": "Hành lang sau bếp",
    "text": "Một luồng khí lạnh tràn từ cánh cửa sau. Hành lang tối và vắng; nền gạch có vệt bùn dẫn đến kho. Cửa kho đang khóa, không nên tự ý phá niêm phong hoặc xông vào.",
    "choices": [
      {
        "id": "inspect_corridor",
        "label": "Cúi xuống xem vệt bùn",
        "to": "corridor_detail",
        "kind": "observation"
      },
      {
        "id": "corridor_return",
        "label": "Quay lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "corridor_detail": {
    "placeId": "hall",
    "phase": "QUAN SÁT",
    "title": "Những dấu chân lẫn nhau",
    "text": "Vệt bùn đã bị nhiều người giẫm lên trong lúc mưa. Bạn chỉ có thể xác định có người đi qua hành lang, không thể từ đó gọi ra một cái tên.\n\nNếu muốn vào kho, bạn cần chưởng quầy chứng kiến và mở cửa.",
    "choices": [
      {
        "id": "mark_corridor",
        "label": "Ghi lại tình trạng hành lang",
        "to": "hub",
        "kind": "observation",
        "addFlags": [
          "saw_footprints"
        ],
        "reaction": "Bạn ghi nhận dấu chân bị chồng lấp, không dùng nó để buộc tội ai."
      },
      {
        "id": "corridor_detail_back",
        "label": "Trở về đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "store": {
    "placeId": "store",
    "phase": "KHÁM PHÁ",
    "title": "Trong nhà kho",
    "text": "Hà chưởng quầy mở cửa rồi đứng chờ bên ngoài. Mùi gỗ ẩm và thảo dược quyện trong bóng tối; chiếc hòm đặt giữa phòng, trên giá còn nhiều lọ thuốc khác.\n\nBạn tự quyết định cần xem xét thứ gì trước.",
    "choices": [
      {
        "id": "check_seal_v2b",
        "label": "Kiểm tra chiếc hòm gỗ",
        "to": "store_detail",
        "kind": "observation"
      },
      {
        "id": "inspect_shelves",
        "label": "Quan sát các giá thuốc",
        "to": "shelves",
        "kind": "observation"
      },
      {
        "id": "return_from_store_v2b",
        "label": "Theo lối cũ về đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "shelves": {
    "placeId": "store",
    "phase": "QUAN SÁT",
    "title": "Các lọ thuốc",
    "text": "Phần lớn lọ trên giá vẫn nguyên. Danh sách ký gửi dán ở mặt sau cửa ghi rõ một túi thuốc cầm máu riêng được cất trong hòm, không phải toàn bộ số thuốc của quán.\n\nCó thể ai đó cần riêng loại thuốc ấy, hoặc đó là sự trùng hợp. Bạn chưa có cách xác nhận.",
    "choices": [
      {
        "id": "note_shelves",
        "label": "Ghi nhớ danh sách thuốc",
        "to": "store",
        "kind": "observation",
        "addFlags": [
          "saw_medicine_list"
        ]
      },
      {
        "id": "shelves_back",
        "label": "Quay lại cạnh hòm",
        "to": "store",
        "kind": "travel"
      }
    ]
  },
  "store_detail": {
    "placeId": "store",
    "phase": "VẬT CHỨNG",
    "title": "Dấu sáp bị vỡ",
    "text": "Bạn cúi sát khóa. Một mảnh niêm phong đỏ còn trong khe gỗ, mảnh kia nằm trên nền. Có dấu hiệu nắp hòm bị mở từ ngoài, nhưng không tìm được dấu tay rõ ràng.\n\nNếu ghi vật chứng này, bạn có thêm dữ kiện để đối chiếu với lời kể của những người ở đại sảnh.",
    "choices": [
      {
        "id": "collect_seal_v2b",
        "label": "Ghi nhận mẩu niêm phong",
        "to": "store",
        "kind": "observation",
        "gainEvidence": [
          "broken_seal"
        ],
        "once": true
      },
      {
        "id": "step_back_store_v2b",
        "label": "Chưa ghi, quay lại quan sát kho",
        "to": "store",
        "kind": "travel"
      }
    ]
  },
  "notes": {
    "placeId": "hall",
    "phase": "SUY LUẬN",
    "title": "Bạn nghĩ điều gì đã xảy ra?",
    "text": "Bạn ngồi xuống chiếc bàn sát cửa sổ. Chuyện xảy ra quá nhanh, còn mỗi người chỉ nhìn thấy một phần. Có khi bạn chỉ mới nghe được một câu, hoặc nhặt được một dấu vết vụn.\n\nBạn có thể hình thành giả thuyết ngay bây giờ. Nhưng nghi ngờ là một chuyện, chứng minh trước mặt người khác lại là chuyện khác. Không ai bắt bạn phải thu đủ mọi manh mối mới được suy nghĩ.",
    "choices": [
      {
        "id": "suspect_maid",
        "label": "Tôi nghi A Liên",
        "to": "claim_maid",
        "kind": "deduction"
      },
      {
        "id": "suspect_keeper",
        "label": "Tôi nghi Hà chưởng quầy",
        "to": "claim_keeper",
        "kind": "deduction"
      },
      {
        "id": "suspect_guard",
        "label": "Tôi nghi Lục Tam",
        "to": "claim_guard",
        "kind": "deduction"
      },
      {
        "id": "keep_searching",
        "label": "Chưa đủ chắc chắn; tiếp tục kiểm tra",
        "to": "hub",
        "kind": "travel"
      },
      {
        "id": "revisit_resolution",
        "label": "Xem lại điều đã kiểm chứng để quyết định",
        "to": "resolution",
        "kind": "deduction",
        "visibleIfEvidence": [
          "care_receipt"
        ],
        "visibleIfFlags": [
          "receipt_checked",
          "private_admission"
        ]
      }
    ]
  },
  "claim_maid": {
    "placeId": "hall",
    "phase": "ĐƯA RA NHẬN ĐỊNH",
    "title": "Bạn dựa vào đâu?",
    "text": "Bạn nhớ tới A Liên, người làm việc ở quán và có thể đi qua khu vực nhà kho. Nhưng bạn đã thực sự nhìn thấy chứng cứ nào buộc cô lấy thuốc chưa?\n\nNói ra một lời buộc tội lúc này có thể khiến cô không còn cơ hội tự giải thích.",
    "choices": [
      {
        "id": "blame_maid",
        "label": "Tôi vẫn công khai buộc tội cô ấy",
        "ending": "wrong",
        "kind": "conclusion"
      },
      {
        "id": "undo_maid",
        "label": "Không thể dựa vào phỏng đoán; nghĩ lại",
        "to": "notes",
        "kind": "travel"
      }
    ]
  },
  "claim_keeper": {
    "placeId": "hall",
    "phase": "ĐƯA RA NHẬN ĐỊNH",
    "title": "Bạn dựa vào đâu?",
    "text": "Chưởng quầy nắm chìa và chịu trách nhiệm đối với đồ ký gửi. Quyền giữ kho cho ông cơ hội tiếp cận hòm, nhưng cơ hội chưa phải bằng chứng.\n\nBạn muốn giữ giả thuyết trong đầu hay công khai kết luận?",
    "choices": [
      {
        "id": "blame_keeper",
        "label": "Tôi vẫn quy trách nhiệm cho chưởng quầy",
        "ending": "wrong_keeper",
        "kind": "conclusion"
      },
      {
        "id": "undo_keeper",
        "label": "Cần kiểm tra thêm; quay lại suy luận",
        "to": "notes",
        "kind": "travel"
      }
    ]
  },
  "claim_guard": {
    "placeId": "hall",
    "phase": "ĐỐI CHIẾU",
    "title": "Điều nào khiến bạn nghi Lục Tam?",
    "text": "Bạn nghĩ tới người lính trẻ, nhưng không thể chỉ dựa vào một dáng vẻ bồn chồn để khẳng định điều gì.\n\nCó dữ kiện đủ độc lập để hỏi thẳng anh không, hay bạn mới chỉ suy đoán?",
    "choices": [
      {
        "id": "only_uniform",
        "label": "Vì A Liên nhìn thấy áo giống lính",
        "to": "weak_reason",
        "kind": "deduction"
      },
      {
        "id": "show_ledger_and_seal",
        "label": "Đưa sổ giao chìa và dấu niêm phong ra đối chiếu",
        "to": "confront_guard",
        "kind": "deduction",
        "requires": [
          "key_log",
          "broken_seal"
        ]
      },
      {
        "id": "ask_guard_first",
        "label": "Chưa nghe lời người lính: đến hỏi anh",
        "to": "guard",
        "kind": "dialogue",
        "hiddenIfFlags": [
          "guard_confronted"
        ]
      },
      {
        "id": "claim_guard_back",
        "label": "Quay lại bàn ghi chép",
        "to": "notes",
        "kind": "travel"
      }
    ]
  },
  "weak_reason": {
    "placeId": "hall",
    "phase": "ĐỐI CHIẾU",
    "title": "Một lời kể chưa đủ",
    "text": "Bạn thử hỏi bằng câu chuyện bóng áo lính. Lục Tam chỉ đáp rằng quanh trạm có nhiều người mặc loại áo ấy. Bạn không thể buộc anh nhận điều mà mình chưa chứng minh.\n\nCó lẽ cần đối chiếu thời gian, chiếc chìa và tình trạng hòm.",
    "choices": [
      {
        "id": "weak_back",
        "label": "Xem lại các manh mối khác",
        "to": "notes",
        "kind": "travel"
      }
    ]
  },
  "confront_guard": {
    "placeId": "hall",
    "phase": "CAO TRÀO",
    "title": "Đặt chứng cứ lên bàn",
    "text": "Bạn đặt trước Lục Tam hai ghi chép độc lập: sổ giao chìa và dấu sáp của chiếc hòm bị mở. Chúng cho thấy anh có cơ hội tiếp cận hòm, nhưng vẫn chưa chứng minh động cơ.\n\nLục Tam lặng đi. Bạn muốn hỏi anh từ đầu hay quay lại tìm hiểu thêm?",
    "choices": [
      {
        "id": "ask_for_full_account",
        "label": "Giữ bình tĩnh, đề nghị anh kể từ đầu",
        "to": "guard_truth",
        "kind": "dialogue",
        "addFlags": [
          "guard_confronted",
          "private_admission"
        ]
      },
      {
        "id": "confront_back",
        "label": "Dừng đối chất để kiểm tra thêm",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "guard"
  },
  "guard_truth": {
    "placeId": "hall",
    "phase": "TIẾT LỘ",
    "title": "Lời nói khi không thể im lặng",
    "text": "Lục Tam nhìn hai tờ ghi chép và thừa nhận đã tự lấy thuốc khỏi hòm trong đêm. Anh kể có người bị thương ở trạm gác, nhưng sợ bị kỷ luật vì chưa xin phép nên định giấu sự việc.\n\nAnh rút trong áo một tờ biên nhận viết vội. Đây mới là lời kể và một tờ giấy chưa kiểm tra. Bạn cần xác minh trước khi nói thay bất kỳ ai.",
    "choices": [
      {
        "id": "inspect_receipt",
        "label": "Đọc kỹ biên nhận từ trạm gác",
        "to": "receipt",
        "kind": "observation"
      },
      {
        "id": "truth_back",
        "label": "Tạm dừng đối chất, quay lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "guard",
    "speech": "“Tôi đã mở hòm. Tôi muốn cứu người, nhưng lẽ ra không được để A Liên mang tiếng oan.”"
  },
  "receipt": {
    "placeId": "hall",
    "phase": "KIỂM CHỨNG",
    "title": "Tờ biên nhận đã nhàu",
    "text": "Lục Tam đưa ra một tờ giấy nhàu, có ghi tên thuốc và thời điểm dùng. Nét chữ khó đọc, dấu ký ở cuối tờ giấy nhòe vì mưa.\n\nMột tờ biên nhận có thể giúp giải thích số thuốc đã biến mất. Nhưng nếu chỉ nghe người đưa giấy tự giải thích, bạn vẫn chưa thật sự kiểm chứng.",
    "choices": [
      {
        "id": "review_receipt",
        "label": "Đối chiếu giấy với sổ trực và danh sách thuốc",
        "to": "receipt_review",
        "kind": "observation"
      },
      {
        "id": "postpone_receipt",
        "label": "Cất câu hỏi lại, trở về đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "resolution": {
    "placeId": "hall",
    "phase": "QUYẾT ĐỊNH",
    "title": "Đêm mưa phải khép lại thế nào?",
    "text": "Bạn đã có lời thừa nhận riêng từ người lính và đã đối chiếu giấy tờ. Sự thật này không tự xuất hiện trước tất cả người trong quán.\n\nBạn muốn đề nghị cách xử lý nào? Nếu mời mọi người ngồi lại, từng người vẫn phải được hỏi và phải tự xác nhận điều họ nói.",
    "choices": [
      {
        "id": "choose_formal_record",
        "label": "Trao đổi trước với chưởng quầy về trách nhiệm",
        "to": "formal_report",
        "kind": "dialogue",
        "requires": [
          "care_receipt"
        ],
        "requiresFlags": [
          "private_admission",
          "receipt_checked"
        ]
      },
      {
        "id": "invite_hearing",
        "label": "Mời mọi người tới bàn để nghe các phía",
        "to": "hearing",
        "kind": "dialogue",
        "requires": [
          "care_receipt"
        ],
        "requiresFlags": [
          "private_admission",
          "receipt_checked"
        ]
      },
      {
        "id": "resolution_back",
        "label": "Quay lại kiểm tra thêm",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "receipt_review": {
    "placeId": "hall",
    "phase": "ĐỐI CHIẾU",
    "title": "Một tờ giấy, hai cách kiểm tra",
    "text": "Tờ giấy ghi ngày giờ và lượng thuốc đã cấp. Bên cạnh bạn là sổ chìa có thời điểm Lục Tam vào kho.\n\nBạn sẽ coi con dấu đã đủ để tin, hay đối chiếu các mốc thời gian và lượng thuốc trước?",
    "choices": [
      {
        "id": "trust_stamp_only",
        "label": "Chỉ nhìn con dấu, coi như đủ",
        "to": "receipt_doubt",
        "kind": "deduction"
      },
      {
        "id": "match_receipt_entries",
        "label": "Đối chiếu giờ, loại thuốc và số lượng",
        "to": "receipt_verified",
        "kind": "observation",
        "gainEvidence": [
          "care_receipt"
        ],
        "addFlags": [
          "receipt_checked"
        ],
        "once": true
      },
      {
        "id": "return_receipt_to_hub",
        "label": "Tạm thời chưa kiểm, quay lại đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "receipt_doubt": {
    "placeId": "hall",
    "phase": "ĐỐI CHIẾU",
    "title": "Con dấu chưa nói hết",
    "text": "Hà chưởng quầy khẽ lắc đầu. Một dấu mực nhòe không đủ chứng minh thuốc đã được dùng như lời kể. Người đang bị nghi oan cũng không thể nhận công bằng chỉ từ phỏng đoán.\n\nBạn có thể xem lại các con số hoặc trở về thu thêm dữ kiện.",
    "choices": [
      {
        "id": "recheck_receipt",
        "label": "Đọc lại giờ và lượng thuốc",
        "to": "receipt_review",
        "kind": "observation"
      },
      {
        "id": "leave_receipt_doubt",
        "label": "Quay về đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "receipt_verified": {
    "placeId": "hall",
    "phase": "KIỂM CHỨNG",
    "title": "Những con số khớp nhau",
    "text": "Bạn đối chiếu giờ cấp thuốc với giờ nhận chìa, kiểm tra tên và số lượng thuốc trên tờ giấy với danh sách ký gửi. Các chi tiết quan trọng phù hợp nhau.\n\nLời thú nhận của Lục Tam giờ có bằng chứng hỗ trợ. Điều đó giải thích một phần sự việc nhưng không thay thế lời xin lỗi, việc ghi nhận trách nhiệm và quyền được lên tiếng của A Liên.",
    "choices": [
      {
        "id": "verified_back_to_notes",
        "label": "Ghi lại cách kiểm chứng rồi suy nghĩ tiếp",
        "to": "notes",
        "kind": "deduction"
      },
      {
        "id": "verified_more_search",
        "label": "Quay lại các địa điểm kiểm tra thêm",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "formal_report": {
    "placeId": "hall",
    "phase": "LẬP BIÊN BẢN",
    "title": "Lời thú nhận cần được ghi nhận",
    "text": "Hà chưởng quầy yêu cầu bạn trình bày riêng các điểm đã xác minh. Ông không chấp nhận việc Lục Tam cứu người là lý do để giấu việc tự ý lấy thuốc, cũng không cho phép tiếp tục đổ lỗi cho A Liên.\n\nBạn có thể đề nghị lập biên bản ngay, hoặc quay lại gặp các bên trước khi chốt.",
    "choices": [
      {
        "id": "report_guard_v2b",
        "label": "Trình bằng chứng và lập biên bản trách nhiệm",
        "ending": "accountability",
        "kind": "conclusion",
        "requires": [
          "care_receipt"
        ],
        "requiresFlags": [
          "private_admission",
          "receipt_checked"
        ]
      },
      {
        "id": "formal_hearing",
        "label": "Muốn nghe A Liên trước, mời mọi người tới bàn",
        "to": "hearing",
        "kind": "dialogue"
      },
      {
        "id": "formal_back",
        "label": "Chưa quyết định, trở lại tìm hiểu",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "hearing": {
    "placeId": "hall",
    "phase": "ĐỐI THOẠI",
    "title": "Mọi người đã ngồi lại",
    "text": "Hà chưởng quầy kéo các ghế vào gần chiếc bàn dài. A Liên đứng phía bếp, Lục Tam giữ mũ trong tay. Không ai tự nhận tội chỉ vì được mời ngồi xuống.\n\nNếu muốn chuyện đi tới một kết quả công bằng, bạn cần quyết định hỏi ai trước và đưa điều gì ra công khai.",
    "choices": [
      {
        "id": "ask_for_public_confession",
        "label": "Yêu cầu ai có lỗi tự đứng lên nhận",
        "to": "hearing_silence",
        "kind": "dialogue"
      },
      {
        "id": "invite_maid_statement",
        "label": "Để A Liên kể điều cô biết trước mọi người",
        "to": "hearing_witness",
        "kind": "dialogue"
      },
      {
        "id": "show_verified_receipt_publicly",
        "label": "Đưa biên nhận đã kiểm chứng và hỏi Lục Tam",
        "to": "hearing_proof",
        "kind": "deduction",
        "requires": [
          "care_receipt"
        ],
        "requiresFlags": [
          "receipt_checked",
          "private_admission"
        ],
        "addFlags": [
          "public_confirmed"
        ]
      },
      {
        "id": "hearing_pause",
        "label": "Tạm dừng cuộc họp, tiếp tục tìm hiểu",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "hearing_silence": {
    "placeId": "hall",
    "phase": "ĐỐI THOẠI",
    "title": "Sự im lặng giữa bàn",
    "text": "Mọi người nhìn nhau. Chẳng ai đứng dậy chỉ vì bạn bảo người có lỗi hãy nhận tội. Lục Tam cúi đầu, A Liên nắm chặt gấu áo.\n\nHà chưởng quầy khẽ nói: “Có điều muốn hỏi thì phải hỏi cụ thể. Chúng ta không thể tìm sự thật bằng việc chờ ai đó tự mở miệng.”",
    "choices": [
      {
        "id": "silence_reframe",
        "label": "Đưa một câu hỏi cụ thể",
        "to": "hearing",
        "kind": "dialogue"
      },
      {
        "id": "silence_leave",
        "label": "Tạm ngừng cuộc họp",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "hearing_witness": {
    "placeId": "hall",
    "phase": "LỜI CHỨNG",
    "title": "A Liên được nói trọn lời",
    "text": "A Liên nhìn từng người quanh bàn. Cô xác nhận chỉ thấy bóng áo sẫm đi qua hành lang; cô không thể gọi tên người đó và chưa từng nhìn thấy ai lấy thuốc.\n\nChưởng quầy nhắc mọi người rằng việc nhìn thấy một bóng người không đủ buộc tội người khác. Cuộc họp còn cần hỏi người có liên quan tới hòm thuốc.",
    "choices": [
      {
        "id": "record_public_witness",
        "label": "Ghi lời cô và tiếp tục cuộc họp",
        "to": "hearing",
        "kind": "observation",
        "addFlags": [
          "public_witness_heard"
        ]
      },
      {
        "id": "hear_guard_after_maid",
        "label": "Quay về bàn để kiểm tra lời người lính",
        "to": "hearing",
        "kind": "dialogue",
        "addFlags": [
          "public_witness_heard"
        ]
      }
    ],
    "npcId": "maid",
    "speech": "“Em chỉ muốn mọi người biết em không thấy tận mắt người lấy thuốc.”"
  },
  "hearing_proof": {
    "placeId": "hall",
    "phase": "ĐỐI CHỨNG",
    "title": "Lục Tam xác nhận trước mọi người",
    "text": "Bạn đặt biên nhận đã đối chiếu và bản ghi về chiếc hòm lên bàn, chỉ rõ những điều đã được kiểm chứng. Lục Tam xác nhận mình tự ý lấy thuốc cho người bị thương, đồng thời đã che giấu khiến A Liên bị nghi oan.\n\nChưởng quầy đề nghị ghi nhận trách nhiệm. A Liên có thể được mời lên tiếng trước khi quyết định cách khép lại chuyện này.",
    "choices": [
      {
        "id": "confirm_public_report",
        "label": "Lập biên bản, công bố việc minh oan",
        "ending": "accountability",
        "kind": "conclusion",
        "requires": [
          "care_receipt"
        ],
        "requiresFlags": [
          "public_confirmed",
          "receipt_checked"
        ]
      },
      {
        "id": "listen_maid_again",
        "label": "Mời A Liên phát biểu trước khi hòa giải",
        "to": "hearing_witness",
        "kind": "dialogue",
        "hiddenIfFlags": [
          "public_witness_heard"
        ]
      },
      {
        "id": "move_to_joint_resolution",
        "label": "Đề nghị các bên tự thống nhất cách giải quyết",
        "to": "hearing_resolution",
        "kind": "dialogue",
        "visibleIfFlags": [
          "public_witness_heard"
        ]
      },
      {
        "id": "hearing_proof_back",
        "label": "Trở lại bàn, chưa đưa ra kết luận",
        "to": "hearing",
        "kind": "travel"
      }
    ],
    "npcId": "guard",
    "speech": "“Tôi tự lấy thuốc. Để A Liên chịu nghi ngờ thay mình là lỗi của tôi.”"
  },
  "hearing_resolution": {
    "placeId": "hall",
    "phase": "HÒA GIẢI",
    "title": "Từng người tự nói điều cần nói",
    "text": "A Liên nói việc bị nghi oan khiến cô sợ hãi, nhưng cô không muốn giấu đi chuyện có người được cứu sống. Lục Tam đồng ý nhận trách nhiệm bằng văn bản và xin lỗi cô.\n\nBạn có thể khép lại bằng thỏa thuận minh bạch, hoặc tạm dừng nếu còn thấy thiếu điều cần đối chiếu.",
    "choices": [
      {
        "id": "seek_mediation_v2b",
        "label": "Ghi lời xin lỗi, trách nhiệm và phương án bồi hoàn",
        "ending": "reconcile",
        "kind": "conclusion",
        "requiresFlags": [
          "public_witness_heard",
          "public_confirmed",
          "receipt_checked"
        ],
        "requires": [
          "care_receipt"
        ]
      },
      {
        "id": "mediated_pause",
        "label": "Chưa chốt, trở lại tìm hiểu",
        "to": "hub",
        "kind": "travel"
      }
    ]
  }
},
  endings:{
  "withdraw": {
    "status": "failure",
    "title": "Bạn rời quán trước bình minh",
    "text": "Bạn rời mái hiên khi mưa chưa tạnh. Trên đường về, ánh đèn của Quan Đạo khuất dần sau đèo.\n\nNhững người ở lại vẫn phải đối diện với chuyện mất thuốc. Đôi khi không can dự cũng là một lựa chọn có hậu quả."
  },
  "wrong": {
    "status": "failure",
    "title": "Một lời kết tội vội vàng",
    "text": "A Liên đứng sững trước những ánh nhìn. Chưởng quầy không tìm thấy thuốc trong đồ của cô, nhưng lời đồn đã lan khỏi quán.\n\nBạn đưa ra một câu trả lời, không phải sự thật. Lục Tam vẫn không nói hết điều mình biết."
  },
  "wrong_keeper": {
    "status": "failure",
    "title": "Suy đoán thành phán xét",
    "text": "Chưởng quầy bị buộc tội chỉ vì là người quản kho. Khi không có chứng cứ rõ ràng, ông không thể giải thích với tất cả khách trọ.\n\nCơn mưa dứt nhưng sự nghi ngờ vẫn ở lại. Một người có cơ hội không đồng nghĩa với một người có tội."
  },
  "accountability": {
    "status": "success",
    "title": "Sổ ghi chép dưới ánh đèn",
    "text": "Lục Tam kể rõ việc lấy thuốc cứu người và chấp nhận để chưởng quầy lập biên bản về số thuốc đã dùng. Trạm gác gửi lời xác nhận; người bị thương đã qua nguy hiểm.\n\nA Liên được minh oan công khai. Việc cứu người không xóa lỗi che giấu, nhưng cũng không biến Lục Tam thành kẻ chỉ biết gây hại."
  },
  "reconcile": {
    "status": "success",
    "title": "Chén trà sau cơn mưa",
    "text": "Sau khi từng người được trình bày, Hà chưởng quầy viết rõ việc Lục Tam tự lấy thuốc, lý do cấp cứu, cách bồi hoàn và lời minh oan cho A Liên. Lục Tam nhận lỗi trước mọi người, không đổ phần trách nhiệm cho cô nữa.\n\nTrời sáng, A Liên mời bạn một chén trà. Bạn không buộc mọi người trở thành bạn bè chỉ sau một đêm; bạn đã giúp họ có cơ hội nói thật và tự chọn cách tiếp tục."
  }
}
 };
 function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 return freeze(story);
});