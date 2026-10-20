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
  scenarioId:'pilot-quan-dao-investigation-v4',scenarioVersion:4,
  missionId:'dudu-m-an-f01',worldId:world.worldId,genreId:world.genreId,
  title:'Đêm mưa ở Quan Đạo',tier:'F',world,worldCover:world.places.gate.background,
  startSceneId:'prologue',
  places:Object.fromEntries(Object.entries(world.places).map(([id,p])=>[id,{label:p.publicName,background:p.background,photo:p.photo}])),
  scenes:{
  "prologue": {
    "placeId": "gate",
    "phase": "DẪN TRUYỆN",
    "title": "Mưa trên đường Quan Đạo",
    "text": "Trời tối nhanh hơn bạn dự tính. Đường qua đèo ngập bùn; cách xa vài chục bước, ánh đèn lồng dưới mái ngói nhỏ đang chao nghiêng.\n\nBạn chỉ định tìm một chỗ nghỉ qua đêm rồi tiếp tục về Phủ Nam. Chẳng ai chờ bạn tới để giải quyết chuyện gì cả.",
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
        "label": "Ngồi lại và tự suy luận",
        "to": "notes",
        "kind": "deduction",
        "visibleIfEvidence": [
          "key_log",
          "broken_seal",
          "maid_statement"
        ]
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
    "text": "Hà chưởng quầy lau mắt kính. Ông giận vì đồ ký gửi mất ngay trong quán, nhưng nhất định không muốn ai bị lục soát vô cớ.\n\n“Muốn biết ai ra vào kho thì phải xem quyển sổ. Tôi còn giữ nó đây.”",
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
    "npcId": "keeper"
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
    "text": "A Liên vặn chiếc khăn ẩm, không ngẩng đầu ngay. “Em có đi qua hành lang đêm qua. Họ nghe vậy rồi bảo em biết chuyện.”\n\nCô chưa kể mình nhìn thấy điều gì. Bạn có thể hỏi rõ, hoặc để cô lấy lại bình tĩnh.",
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
    "npcId": "maid"
  },
  "maid_memory": {
    "placeId": "hall",
    "phase": "LỜI CHỨNG",
    "title": "Dưới ánh đèn hành lang",
    "text": "“Em đi lấy nước lúc canh hai. Có bóng áo sẫm bước qua hành lang. Đèn bị mưa tạt, em không thấy rõ mặt người ấy.”\n\nA Liên dừng lại. Cô nhất quyết không gọi tên một người chỉ dựa vào bóng lưng.",
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
    "npcId": "maid"
  },
  "guard": {
    "placeId": "hall",
    "phase": "TRÒ CHUYỆN",
    "title": "Người lính bên cửa",
    "text": "Người lính trẻ giới thiệu mình tên Lục Tam. Anh nhìn mưa ngoài sân lâu hơn nhìn bạn.\n\n“Đội tôi có người đang ở trạm gác bên kia đèo. Tôi cũng đang lo chuyện của mình.” Anh nói rồi im lặng.",
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
    "npcId": "guard"
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
    "text": "“Tôi có rời vị trí vì nghe tiếng kêu cứu,” Lục Tam nói. “Tôi đã trở lại sau đó. Chuyện ấy tôi nhận.”\n\nBạn nhận ra anh chỉ thừa nhận việc rời chốt, không nhắc đến chiếc hòm. Cần ghi lại chính xác thay vì tự bổ sung phần anh chưa nói.",
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
    "npcId": "guard"
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
    "text": "Bạn trải những ghi chép ra bàn. Một người mượn chìa, một bóng người qua hành lang, một dấu niêm phong bị mở. Mỗi manh mối chỉ nói một phần.\n\nĐến lúc tự đưa ra giả thuyết. Đây là suy đoán của bạn, chưa phải lời phán quyết của Chủ Thần.",
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
        "label": "Nhìn lại bản ghi đã kiểm chứng",
        "to": "resolution",
        "kind": "deduction",
        "visibleIfEvidence": [
          "care_receipt"
        ],
        "visibleIfFlags": [
          "guard_confronted"
        ]
      }
    ]
  },
  "claim_maid": {
    "placeId": "hall",
    "phase": "ĐƯA RA NHẬN ĐỊNH",
    "title": "Bạn dựa vào đâu?",
    "text": "A Liên có thể ra vào hành lang, nhưng bạn chưa nhìn thấy cô lấy thuốc. Nêu nghi ngờ trước mặt mọi người sẽ ảnh hưởng tới cô.",
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
    "text": "Chưởng quầy là người quản kho. Địa vị ấy tạo cơ hội, nhưng bản ghi chưa chứng minh ông lấy bất cứ thứ gì.",
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
    "text": "Lục Tam có chìa kho, nhưng người có chìa chưa chắc là người lấy thuốc. Anh cũng có lời khai về việc rời trạm. Bạn sẽ dùng dữ kiện nào để hỏi tiếp?",
    "choices": [
      {
        "id": "only_uniform",
        "label": "Vì A Liên nhìn thấy áo giống lính",
        "to": "weak_reason",
        "kind": "deduction"
      },
      {
        "id": "show_ledger_and_seal",
        "label": "Đối chiếu sổ chìa và dấu niêm phong",
        "to": "confront_guard",
        "kind": "deduction",
        "visibleIfEvidence": [
          "guard_statement"
        ],
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
    "text": "Bạn mở sổ chìa kho, đặt ghi chép về mẩu sáp bên cạnh và hỏi Lục Tam vì sao hai việc xảy ra đúng lúc anh rời trạm. Anh nắm chặt quai mũ, không trả lời ngay.\n\nBạn có thể hỏi rõ một lần nữa hoặc dừng lại. Chứng cứ tạo quyền hỏi, không tự tạo ra lời thú nhận.",
    "choices": [
      {
        "id": "ask_for_full_account",
        "label": "Giữ bình tĩnh, đề nghị anh kể từ đầu",
        "to": "guard_truth",
        "kind": "dialogue",
        "addFlags": [
          "guard_confronted"
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
    "text": "Lục Tam nhìn dấu sáp rồi nhận đã tự mở hòm. Tối qua ở trạm gác có người bị đá lở làm bị thương. Anh mang túi thuốc đến cứu người mà chưa xin phép, sau đó sợ bị phạt nên giấu chuyện.\n\nAnh lấy ra một tờ giấy ghi lượng thuốc đã dùng. Lời kể và tờ giấy có thể đúng, nhưng bạn cần tự kiểm tra thay vì lập tức xem mọi việc đã xong.",
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
    "npcId": "guard"
  },
  "receipt": {
    "placeId": "hall",
    "phase": "KIỂM CHỨNG",
    "title": "Tờ biên nhận đã nhàu",
    "text": "Ngày giờ trên giấy phù hợp với quãng thời gian Lục Tam nhận chìa; tên thuốc và số lượng cũng khớp với sổ ký gửi. Chưởng quầy nhận ra ký hiệu người trực trạm mà ông từng gặp.\n\nGiấy tờ chưa xóa lỗi của Lục Tam, nhưng giải thích được thuốc đã đi đâu và vì sao A Liên không liên quan.",
    "choices": [
      {
        "id": "record_care_receipt_v2b",
        "label": "Ghi phần đã kiểm chứng, trở lại suy luận",
        "to": "notes",
        "kind": "observation",
        "gainEvidence": [
          "care_receipt"
        ],
        "addFlags": [
          "guard_confessed"
        ],
        "once": true
      },
      {
        "id": "receipt_back",
        "label": "Chưa ghi, trở về đại sảnh",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "resolution": {
    "placeId": "hall",
    "phase": "QUYẾT ĐỊNH",
    "title": "Đêm mưa phải khép lại thế nào?",
    "text": "Bạn đã có căn cứ để nói rõ chuyện xảy ra. Người bị thương cần thuốc, người tự lấy thuốc phải nhận trách nhiệm, người bị nghi oan phải được minh oan.\n\nBạn muốn đưa sự thật ra trước mọi người bằng cách nào?",
    "choices": [
      {
        "id": "report_guard_v2b",
        "label": "Đề nghị lập biên bản và nhận trách nhiệm",
        "ending": "accountability",
        "kind": "conclusion",
        "requires": [
          "key_log",
          "broken_seal",
          "care_receipt"
        ]
      },
      {
        "id": "seek_mediation_v2b",
        "label": "Mời các bên ngồi lại, lắng nghe và đối thoại",
        "ending": "reconcile",
        "kind": "conclusion",
        "requires": [
          "key_log",
          "maid_statement",
          "guard_statement",
          "care_receipt"
        ]
      },
      {
        "id": "resolution_back",
        "label": "Kiểm tra lại trước khi nói với mọi người",
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
    "text": "Bạn đề nghị mọi người ngồi xuống. Sổ chìa, dấu sáp, lời người chứng kiến và biên nhận được đối chiếu trước từng người.\n\nLục Tam nhận trách nhiệm và xin lỗi A Liên. Chưởng quầy hứa ghi sổ minh bạch. Sáng hôm sau, A Liên tiễn bạn bằng một chén trà nóng; đêm mưa vẫn còn vết xước, nhưng mọi người đã bắt đầu nói thật."
  }
}
 };
 function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 return freeze(story);
});