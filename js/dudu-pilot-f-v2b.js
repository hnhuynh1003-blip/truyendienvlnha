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
  scenarioId:'pilot-quan-dao-dawn-rescue-v7',scenarioVersion:8,
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
    "text": "Hà chưởng quầy mang ra một chén trà gừng. Ông kể sáng mai có đoàn xe chở người bị thương phải qua đèo; quán được nhờ giữ một túi thuốc cầm máu cho họ. Mưa lớn khiến việc đi lại khó đoán.\n\nA Liên đang nhóm bếp. Người lính áo sẫm ở bàn gần cửa nhìn qua cửa sau rồi cúi đầu ăn tiếp. Bạn chỉ định nghỉ qua đêm; chẳng có ai giao nhiệm vụ gì cho bạn.",
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
    "text": "Một tiếng thùng gỗ đổ vang lên từ phía kho. Hà chưởng quầy chạy ra rồi quay lại, sắc mặt tái đi: hòm giữ túi thuốc cho đoàn xe sáng mai đã bị mở, túi thuốc biến mất.\n\nNếu không tìm lại được trước bình minh, đoàn xe chở người bị thương sẽ không có đủ vật tư cần thiết để tiếp tục qua đèo. Một vị khách lập tức nghi A Liên chỉ vì cô thường ra vào bếp. Cô đứng sững; Lục Tam cũng ngẩng đầu. Bạn chưa biết ai lấy thuốc, cũng chưa biết thuốc đang ở đâu.",
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
        "id": "hub_present_verified_record",
        "label": "Trình bằng chứng đã xác minh với chưởng quầy",
        "to": "formal_report",
        "kind": "conclusion",
        "visibleIfEvidence": [
          "care_receipt"
        ],
        "visibleIfFlags": [
          "private_admission",
          "receipt_checked"
        ]
      },
      {
        "id": "hub_invite_hearing_verified",
        "label": "Mời những người liên quan đối thoại về sự việc",
        "to": "hearing",
        "kind": "dialogue",
        "visibleIfEvidence": [
          "care_receipt"
        ],
        "visibleIfFlags": [
          "private_admission",
          "receipt_checked"
        ]
      },
      {
        "id": "hub_supply_return",
        "label": "Trở lại việc bàn giao và hồi kết",
        "to": "convoy_ready",
        "kind": "travel",
        "visibleIfFlags": [
          "convoy_supplied"
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
    "text": "Hà chưởng quầy đặt sổ trực lên bàn, nhấc chiếc kính bị trượt xuống sống mũi. Mép các trang giấy đã sờn vì được mở ra rất nhiều lần.\n\nÔng ra hiệu cho bạn ngồi xuống, chờ nghe câu hỏi.",
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
    "speech": "“Việc kho phải có ghi chép. Khách quan cứ xem, đừng vội kết tội người khác.”"
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
    "text": "Sổ ghi Lục Tam nhận chìa kho trong canh hai, chưa có dòng trả rõ ràng. Chưởng quầy nhận đây là chữ mình. Trang bên liệt kê túi thuốc được ký gửi cho đoàn xe sáng mai.\n\nViệc cầm chìa cho thấy một cơ hội ra vào kho, không tự chứng minh anh đã lấy thuốc hay chỉ ra túi thuốc hiện ở đâu.",
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
    "text": "A Liên vặn chiếc khăn ẩm, ánh mắt còn dè chừng sau những lời bàn tán.\n\nCô nhìn sang bạn khi nghe câu hỏi, chờ xem bạn có thực sự muốn nghe lời mình hay không.",
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
    "speech": "“Khách quan muốn hỏi chuyện hành lang hay chỉ nghe họ nói em có tội?”"
  },
  "maid_memory": {
    "placeId": "hall",
    "phase": "LỜI CHỨNG",
    "title": "Dưới ánh đèn hành lang",
    "text": "Bạn hỏi cụ thể về lối đi sau bếp. A Liên đặt khăn xuống bàn, cố nhớ lại ánh đèn đêm qua và khoảng tối ở cuối hành lang.\n\nCô ngập ngừng trước khi nói. Bạn có thể ghi nhận lời cô, nhưng không nên tự điền tên người vào những khoảng cô không nhìn thấy.",
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
    "speech": "“Em thấy một bóng áo sẫm qua hành lang, trời mưa làm đèn tắt bớt. Em không nhìn được mặt.”"
  },
  "guard": {
    "placeId": "hall",
    "phase": "TRÒ CHUYỆN",
    "title": "Người lính bên cửa",
    "text": "Người lính trẻ đứng gần cửa, vai áo vẫn sẫm màu nước mưa. Anh giới thiệu mình là Lục Tam rồi gấp chiếc khăn đang cầm.\n\nBạn có thể hỏi về ca trực hoặc đoàn áp tải; anh chưa tự kể thêm điều gì.",
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
    "speech": "“Tôi là lính áp tải. Khách quan muốn biết chuyện nào?”"
  },
  "guard_duty": {
    "placeId": "hall",
    "phase": "TRÒ CHUYỆN",
    "title": "Chuyện của đoàn áp tải",
    "text": "Lục Tam kéo kín cổ áo, nhìn về chỗ những hòm hàng còn xếp sát tường. Một ký hiệu bằng mực xanh được đóng trên kiện gỗ ngoài cùng.\n\nAnh ngập ngừng khi bạn hỏi thủ tục giao hàng. Qua cách anh trả lời, bạn chỉ hiểu được rằng đội áp tải phải ký nhận từng kiện ở trạm gác.",
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
    "npcId": "guard",
    "speech": "“Đến đồn, người nhận kiểm đủ từng kiện rồi mới ký. Thiếu thứ gì phải lập biên bản.”"
  },
  "guard_memory": {
    "placeId": "hall",
    "phase": "LỜI CHỨNG",
    "title": "Canh hai ở trạm gác",
    "text": "Lục Tam nhìn qua cửa sổ trước khi trả lời về canh hai. Anh nắm quai mũ, ngập ngừng một lúc. Có vẻ anh không muốn tiếp tục chủ đề này.\n\nBạn có thể ghi lại lời khai nguyên văn, hoặc trở lại đại sảnh để so sánh với những gì người khác đã nói.",
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
    "speech": "“Tôi rời trạm một lát khi nghe tiếng kêu cứu. Rồi tôi quay lại. Chỉ vậy thôi.”"
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
    "text": "Trên mặt sau cửa là bảng kê hàng cứu thương ký gửi: sáu cuộn băng ép và hai lọ thuốc cầm máu, tất cả trong một túi. Hà chưởng quầy bảo đoàn xe chở người bị thương sẽ nhận túi trước bình minh.\n\nNếu một phần đã dùng ở nơi khác, bảng kê này có thể giúp tính phần còn lại. Bạn chưa biết số thuốc đã đi đâu.",
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
    "text": "Bạn mở những ghi chép đã có. Có thể bạn mới biết một phần chuyện, cũng có thể đã kiểm tra được một số chi tiết.\n\nBạn có thể nghi ngờ bất kỳ người nào, nhưng lời khẳng định trước người khác cần căn cứ cụ thể. Bạn muốn hỏi ai thêm hay đưa ra giả thuyết?",
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
        "label": "Tôi nghi người lính gần cửa",
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
        "label": "Nêu nghi ngờ trước mọi người, chưa đưa bằng chứng",
        "kind": "dialogue",
        "to": "challenge_maid",
        "addFlags": [
          "accused_maid_publicly"
        ]
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
        "label": "Nêu nghi ngờ trước mọi người, chưa đưa bằng chứng",
        "kind": "dialogue",
        "to": "challenge_keeper",
        "addFlags": [
          "accused_keeper_publicly"
        ]
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
    "title": "Giả thuyết về người lính",
    "text": "Lục Tam đứng gần cửa từ lúc chuyện mất thuốc bị phát hiện. Bạn có thể hỏi thêm, đối chiếu những vật chứng đã có hoặc nói ra nghi ngờ của mình.\n\nMột lời nghi ngờ chưa được chứng minh có thể gây hại cho người vô can, bất kể người đó là ai.",
    "choices": [
      {
        "id": "blame_guard_without_proof",
        "label": "Nêu nghi ngờ trước mọi người, chưa đưa bằng chứng",
        "kind": "dialogue",
        "to": "challenge_guard",
        "addFlags": [
          "accused_guard_publicly"
        ]
      },
      {
        "id": "only_uniform",
        "label": "Vì lời chứng chỉ nói thấy một bóng áo lính",
        "to": "weak_reason",
        "kind": "deduction",
        "visibleIfEvidence": [
          "maid_statement"
        ]
      },
      {
        "id": "show_ledger_and_seal",
        "label": "Đối chất với Lục Tam bằng sổ chìa và dấu sáp",
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
      },
      {
        "id": "guard_formal_after_verification",
        "label": "Đề nghị chưởng quầy ghi nhận việc Lục Tam đã thừa nhận",
        "to": "formal_report",
        "kind": "conclusion",
        "visibleIfEvidence": [
          "care_receipt"
        ],
        "visibleIfFlags": [
          "private_admission",
          "receipt_checked"
        ]
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
    "text": "Khi bạn đối chiếu sổ chìa với niêm phong, Lục Tam nhìn hai trang ghi chép rất lâu. Bàn tay anh buông khỏi quai mũ; giọng nói không còn giữ vẻ điềm tĩnh trước đó.\n\nAnh lấy từ trong áo một tờ giấy đã nhàu và đẩy về phía bạn. Chưa ai khác trong quán được nghe cuộc nói chuyện này; tờ giấy cũng chưa được kiểm tra.",
    "choices": [
      {
        "id": "inspect_receipt",
        "label": "Tự kiểm tra tờ giấy Lục Tam đưa ra",
        "to": "receipt",
        "kind": "observation"
      },
      {
        "id": "request_keeper_witness",
        "label": "Nhờ chưởng quầy nghe lời kể, trước khi kết luận",
        "to": "keeper_followup",
        "kind": "dialogue"
      },
      {
        "id": "truth_back",
        "label": "Tạm dừng, đi hỏi thêm người khác",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "guard",
    "speech": "“Tôi tự mở hòm để mang thuốc cho người bị thương ở trạm gác. Tôi sợ bị phạt, nên đã giấu. Tôi không ngờ A Liên lại bị nghi.”"
  },
  "receipt": {
    "placeId": "hall",
    "phase": "KIỂM CHỨNG",
    "title": "Tờ biên nhận đã nhàu",
    "text": "Tờ giấy Lục Tam đưa ra ghi hai cuộn băng ép và một lọ cầm máu đã được sử dụng tại trạm gác. Mực nhòe khiến giờ cấp thuốc khó đọc.\n\nBạn phải đối chiếu trước khi tin nó. Tờ giấy có thể chỉ ra lượng thuốc đã dùng, nhưng không thể tự đưa phần còn lại về cho đoàn xe đang chờ.",
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
    "text": "Bạn đã lần ra người mở hòm và xác thực số thuốc dùng tại trạm gác. Đây chưa phải kết thúc.\n\nPhần thuốc còn lại vẫn cần trở về cho đoàn xe chở người bị thương, trước khi đường đèo trở nên nguy hiểm hơn. Bạn sẽ làm gì để câu chuyện không dừng ở một chữ ký?",
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
    "text": "Biên nhận ghi đã dùng hai cuộn băng ép và một lọ thuốc cầm máu. Bảng kê ban đầu ghi sáu cuộn và hai lọ. Số liệu có thể cho bạn biết phần còn lại, nhưng trước hết cần xác thực thời điểm, loại thuốc và số lượng trên giấy.\n\nBạn muốn tin con dấu nhòe hay tự đối chiếu với sổ?",
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
    "text": "Giờ giao chìa, lượng thuốc và thời điểm cấp cứu đã được đối chiếu. Tờ giấy có cơ sở đáng tin: hai cuộn băng ép và một lọ cầm máu đã dùng ở trạm gác.\n\nNhưng ban đầu túi thuốc còn nhiều hơn thế. Phần chưa dùng có thể vẫn ở trạm, trong khi đoàn xe chở người bị thương đang chờ ngoài đèo. Giờ bạn phải quyết định xử lý cả trách nhiệm lẫn việc thu hồi.",
    "choices": [
      {
        "id": "verified_formal_now",
        "label": "Đề nghị xử lý trách nhiệm ngay với chưởng quầy",
        "to": "formal_report",
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
        "id": "verified_public_hearing",
        "label": "Mời A Liên và Lục Tam tới đối thoại tại chỗ",
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
        "id": "verified_back_to_notes",
        "label": "Ghi lại suy luận và cân nhắc các giả thuyết",
        "to": "notes",
        "kind": "deduction"
      },
      {
        "id": "verified_more_search",
        "label": "Tiếp tục khám phá trước khi quyết định",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "formal_report": {
    "placeId": "hall",
    "phase": "LẬP BIÊN BẢN",
    "title": "Lời thú nhận cần được ghi nhận",
    "text": "Hà chưởng quầy ghi lời thú nhận của Lục Tam rồi nhìn ra sân. “Giấy tờ có thể lập được cả sáng,” ông nói, “còn thuốc mà không về kịp thì người ngoài đèo biết trông vào đâu?”\n\nBạn có thể cùng ông tính số thuốc còn lại và tìm đường mang về, hoặc dừng lại ở tờ biên bản.",
    "choices": [
      {
        "id": "report_guard_v2b",
        "label": "Lập biên bản rồi tìm lại phần thuốc chưa dùng",
        "kind": "conclusion",
        "requires": [
          "care_receipt"
        ],
        "requiresFlags": [
          "private_admission",
          "receipt_checked"
        ],
        "to": "supply_audit",
        "addFlags": [
          "formal_agreed"
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
    "text": "A Liên ngồi thẳng lưng hơn lúc bị nghi ngờ. Hà chưởng quầy yêu cầu mọi người im lặng để cô được kể đúng những gì mình nhớ.\n\nKhi cô nói xong, chưởng quầy gật đầu rồi ghi lại lời kể, không tự thêm một tên người nào vào chỗ thiếu.",
    "choices": [
      {
        "id": "record_public_witness",
        "label": "Ghi lời cô và tiếp tục cuộc họp",
        "to": "hearing",
        "kind": "observation",
        "hiddenIfFlags": [
          "public_confirmed"
        ],
        "addFlags": [
          "public_witness_heard"
        ]
      },
      {
        "id": "record_witness_after_proof",
        "label": "Ghi lời A Liên và bắt đầu bàn cách giải quyết",
        "to": "hearing_resolution",
        "kind": "dialogue",
        "visibleIfFlags": [
          "public_confirmed"
        ],
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
    "speech": "“Đêm ấy em đi lấy nước và thấy một bóng áo sẫm, nhưng không nhìn thấy người lấy thuốc.”"
  },
  "hearing_proof": {
    "placeId": "hall",
    "phase": "ĐỐI CHỨNG",
    "title": "Lục Tam xác nhận trước mọi người",
    "text": "Bạn công khai sổ chìa và biên nhận đã đối chiếu. Lục Tam nhận đã tự lấy thuốc cấp cứu người ở trạm gác. Mọi người biết A Liên không phải người bị chứng minh đã mở hòm.\n\nHà chưởng quầy hỏi: “Vậy phần thuốc chưa dùng đâu?” Đoàn xe cứu thương sắp đến, và không ai có thể giải quyết câu hỏi ấy bằng lời xin lỗi.",
    "choices": [
      {
        "id": "confirm_public_report",
        "label": "Ghi lời khai và xử lý số thuốc chưa thu hồi",
        "kind": "conclusion",
        "requires": [
          "care_receipt"
        ],
        "requiresFlags": [
          "public_confirmed",
          "receipt_checked"
        ],
        "to": "supply_audit",
        "addFlags": [
          "formal_agreed"
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
    "speech": "“Tôi đã tự lấy thuốc. A Liên không liên quan. Tôi sẽ chịu trách nhiệm vì đã giấu việc này.”"
  },
  "hearing_resolution": {
    "placeId": "hall",
    "phase": "HÒA GIẢI",
    "title": "Từng người tự nói điều cần nói",
    "text": "A Liên được kể điều cô nhìn thấy, Lục Tam xin lỗi vì sự che giấu làm cô bị nghi oan. Chưởng quầy nhất trí ghi trách nhiệm thật rõ ràng.\n\nNgoài sân có tiếng bánh xe: đoàn chở người bị thương sắp tới. Mọi người vẫn phải đưa số thuốc chưa dùng từ trạm gác về, nếu không cuộc hòa giải chỉ nằm trên giấy.",
    "choices": [
      {
        "id": "seek_mediation_v2b",
        "label": "Ghi lời xin lỗi rồi giúp đưa thuốc về kịp",
        "kind": "conclusion",
        "requiresFlags": [
          "public_witness_heard",
          "public_confirmed",
          "receipt_checked"
        ],
        "requires": [
          "care_receipt"
        ],
        "to": "supply_audit",
        "addFlags": [
          "mediation_agreed"
        ]
      },
      {
        "id": "mediated_pause",
        "label": "Chưa chốt, trở lại tìm hiểu",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "keeper_followup": {
    "placeId": "hall",
    "phase": "XÁC MINH",
    "title": "Cần một người làm chứng",
    "text": "Bạn mời Hà chưởng quầy đến cạnh bàn. Ông nghe Lục Tam nhắc đến số thuốc đã sử dụng, nhưng không vội xác nhận mọi điều là thật.\n\nChưởng quầy xem tờ giấy nhàu trong tay người lính, rồi đẩy lại cho bạn.",
    "choices": [
      {
        "id": "check_keeper_receipt",
        "label": "Đối chiếu biên nhận cùng chưởng quầy",
        "to": "receipt",
        "kind": "observation"
      },
      {
        "id": "keeper_wait",
        "label": "Chưa vội kết luận, tiếp tục quan sát",
        "to": "hub",
        "kind": "travel"
      }
    ],
    "npcId": "keeper",
    "speech": "“Nếu giấy này đúng, phải khớp giờ và số thuốc trong sổ. Chúng ta kiểm tra đã.”"
  },
  "challenge_maid": {
    "placeId": "hall",
    "phase": "BỊ CHẤT VẤN",
    "title": "Chưởng quầy ngăn lời buộc tội",
    "text": "Bạn chỉ về phía A Liên và nêu ra nghi ngờ. Cô lùi lại một bước. Hà chưởng quầy lập tức gạt tay người khách đang định giữ cô lại.\n\n“Chưa có chứng cứ thì không ai được giữ người của tôi.” Ông yêu cầu bạn trình bày thứ mình đã tận mắt xem, không phải những điều nghe đoán.",
    "choices": [
      {
        "id": "reconsider_maid",
        "label": "Rút lời buộc tội, tiếp tục tìm chứng cứ",
        "to": "notes",
        "kind": "deduction"
      },
      {
        "id": "insist_maid",
        "label": "Bất chấp lời can ngăn, tiếp tục vu buộc A Liên",
        "ending": "wrong",
        "kind": "conclusion"
      }
    ]
  },
  "challenge_keeper": {
    "placeId": "hall",
    "phase": "BỊ CHẤT VẤN",
    "title": "Quán trọ chưa có người bị bắt",
    "text": "Bạn nói lớn rằng chủ quán có khả năng tiếp cận kho. Hà chưởng quầy im lặng một lát, rồi yêu cầu bạn chỉ rõ một vật chứng cho thấy ông lấy thuốc.\n\nKhông ai trong quán có quyền giam giữ chủ quán chỉ vì ông quản lý chìa khóa. Những người khách bắt đầu hỏi bạn đang dựa vào đâu.",
    "choices": [
      {
        "id": "reconsider_keeper",
        "label": "Rút nhận định, kiểm tra tiếp",
        "to": "notes",
        "kind": "deduction"
      },
      {
        "id": "insist_keeper",
        "label": "Tiếp tục khẳng định chưởng quầy có tội dù chưa chứng minh",
        "ending": "wrong_keeper",
        "kind": "conclusion"
      }
    ]
  },
  "challenge_guard": {
    "placeId": "hall",
    "phase": "BỊ CHẤT VẤN",
    "title": "Người lính yêu cầu một lời giải thích",
    "text": "Bạn nêu nghi ngờ trước mọi người. Lục Tam nhìn bạn rồi đặt chiếc mũ xuống bàn. Anh đề nghị bạn nói rõ đã nhìn thấy điều gì và đã kiểm tra những gì.\n\nHà chưởng quầy không cho khách xúm lại giữ người lính. Ông nhắc rằng buộc tội và chứng minh là hai việc khác nhau.",
    "choices": [
      {
        "id": "reconsider_guard",
        "label": "Dừng buộc tội và tiếp tục xác minh",
        "to": "notes",
        "kind": "deduction"
      },
      {
        "id": "insist_guard",
        "label": "Tiếp tục buộc tội Lục Tam dù chưa trình được căn cứ",
        "ending": "wrong_guard",
        "kind": "conclusion"
      }
    ]
  },
  "supply_audit": {
    "placeId": "hall",
    "phase": "HẬU QUẢ",
    "title": "Lời thú nhận chưa đưa thuốc về",
    "text": "Đoàn xe chở người bị thương sắp đến nhận túi thuốc. Lục Tam đã nhận tự ý mang cả túi về trạm gác, nhưng không ai biết còn bao nhiêu thuốc và có thể kịp lấy về không.\n\nHà chưởng quầy đặt bảng kê trước bạn: “Giờ chúng ta phải làm gì cho những người đang chờ?”",
    "choices": [
      {
        "id": "check_sack_stock",
        "label": "Đối chiếu bảng kê và biên nhận",
        "to": "supply_count",
        "kind": "observation"
      },
      {
        "id": "file_only_finish",
        "label": "Chỉ ghi người lấy thuốc rồi dừng",
        "ending": "paper_only",
        "kind": "conclusion"
      },
      {
        "id": "audit_return",
        "label": "Trở lại đại sảnh hỏi thêm người khác",
        "to": "hub",
        "kind": "travel"
      }
    ]
  },
  "supply_count": {
    "placeId": "hall",
    "phase": "KIỂM KÊ",
    "title": "Số thuốc chưa dùng",
    "text": "Túi gốc có sáu cuộn băng ép và hai lọ thuốc cầm máu. Biên nhận trạm gác ghi đã dùng hai cuộn và một lọ.\n\nMuốn thu hồi, bạn phải xác định chính xác số lượng còn lại thay vì đoán rằng thuốc đã hết.",
    "choices": [
      {
        "id": "calculate_remaining",
        "label": "Khấu trừ phần đã dùng khỏi lượng thuốc ban đầu",
        "to": "route_plan",
        "kind": "deduction",
        "addFlags": [
          "supply_balance_verified"
        ]
      },
      {
        "id": "call_all_used",
        "label": "Cho rằng tất cả đã dùng, không thu hồi",
        "ending": "paper_only",
        "kind": "conclusion"
      },
      {
        "id": "count_return",
        "label": "Kiểm tra lại bảng kê",
        "to": "supply_audit",
        "kind": "observation"
      }
    ]
  },
  "route_plan": {
    "placeId": "hall",
    "phase": "CHỌN ĐƯỜNG",
    "title": "Thuốc ở trạm gác, bình minh ở trước mắt",
    "text": "Lục Tam biết nơi để số thuốc chưa dùng, nhưng sau lần giấu chuyện, không nên để anh tự đi một mình. Người khuân hàng của quán có thể đi cùng.\n\nBên ngoài có hai ngả qua đèo: lối cầu gỗ dưới thung và con đường men sườn đá. Mưa che kín tầm nhìn, không ai trong quán dám chắc cả hai còn đi được. Bạn muốn hỏi người vừa đi đường về hay lập tức cử người?",
    "choices": [
      {
        "id": "route_seek_advice",
        "label": "Hỏi người đánh xe về lối còn an toàn",
        "to": "route_advice",
        "kind": "dialogue"
      },
      {
        "id": "route_choose_bridge",
        "label": "Cử người qua cầu thấp vì gần hơn",
        "ending": "route_blocked",
        "kind": "travel"
      },
      {
        "id": "route_choose_ridge",
        "label": "Cử Lục Tam và người dẫn đường men sườn đá",
        "to": "courier_out",
        "kind": "travel",
        "visibleIfFlags": [
          "ridge_route_known"
        ],
        "addFlags": [
          "escort_dispatched"
        ]
      },
      {
        "id": "route_back_to_stock",
        "label": "Kiểm lại số thuốc cần mang về",
        "to": "supply_count",
        "kind": "observation"
      }
    ]
  },
  "route_advice": {
    "placeId": "hall",
    "phase": "ĐƯỜNG ĐI",
    "title": "Lời người vừa qua đèo",
    "text": "Một người đàn ông khoác áo mưa vải dầu bước ra từ cuối quán. Hà chưởng quầy giới thiệu ông là Đinh Nhị, người khuân hàng quen đường đèo.\n\nĐinh Nhị kéo ghế lại sát bàn, dùng đầu ngón tay vạch hai lối đi trên mặt gỗ. Bạn có thể nghe lời người vừa từ đèo về, hoặc đánh liều chọn đường ngắn hơn.",
    "choices": [
      {
        "id": "choose_escorted_ridge",
        "label": "Theo lối sườn đá, cử hai người đi cùng",
        "to": "courier_out",
        "kind": "travel",
        "addFlags": [
          "ridge_route_known",
          "escort_dispatched"
        ]
      },
      {
        "id": "ignore_flood_report",
        "label": "Bỏ qua lời cảnh báo, đi cầu thấp",
        "ending": "route_blocked",
        "kind": "travel"
      },
      {
        "id": "remember_safe_path",
        "label": "Nhớ lối an toàn rồi quay lại bàn bạc",
        "to": "route_plan",
        "kind": "observation",
        "addFlags": [
          "ridge_route_known"
        ]
      }
    ],
    "npcId": "porter",
    "speech": "“Cầu gỗ dưới thung ngập rồi. Tôi vừa qua lối sườn đá và biết đường đến trạm gác. Để tôi đi cùng Lục Tam.”"
  },
  "courier_out": {
    "placeId": "gate",
    "phase": "THU HỒI",
    "title": "Hai bóng đèn khuất trong mưa",
    "text": "Đinh Nhị cầm đèn, Lục Tam cầm bản kê có chữ ký của chưởng quầy. Cả hai men theo đường sườn đá đến trạm gác để mang phần thuốc chưa dùng về.\n\nBạn đứng dưới mái hiên, nhìn đèn của họ nhỏ dần trong mưa. Cứu được người ở trạm là việc đã xảy ra; cứu được chuyến xe sáng mai vẫn còn phụ thuộc vào cuộc đi này.",
    "choices": [
      {
        "id": "watch_for_return",
        "label": "Đợi tin và ánh đèn từ con dốc",
        "to": "courier_in",
        "kind": "interaction",
        "requiresFlags": [
          "escort_dispatched"
        ]
      }
    ]
  },
  "courier_in": {
    "placeId": "gate",
    "phase": "BÌNH MINH",
    "title": "Chiếc túi thuốc trở lại",
    "text": "Khi trời chuyển sáng, Đinh Nhị cùng Lục Tam xuất hiện trên dốc. Họ đặt chiếc túi sũng nước dưới mái hiên; trong đó còn những gói thuốc chưa mở.\n\nHai người đã đưa thuốc về, nhưng bạn vẫn phải kiểm lượng hàng trước khi giao cho đoàn xe.",
    "choices": [
      {
        "id": "inspect_returned_bag",
        "label": "Kiểm đủ bốn cuộn băng và một lọ thuốc rồi ký nhận",
        "to": "handover",
        "kind": "observation",
        "addFlags": [
          "medicine_recovered"
        ]
      },
      {
        "id": "hand_off_untallied",
        "label": "Đưa túi đi ngay, không kiểm số lượng",
        "ending": "unverified_handover",
        "kind": "conclusion"
      }
    ]
  },
  "handover": {
    "placeId": "hall",
    "phase": "BÀN GIAO",
    "title": "Đoàn xe đang chờ trước quán",
    "text": "Người phụ trách đoàn xe chở người bị thương dừng trước cửa, trên tay cầm danh sách vật tư. Túi thuốc vừa thu hồi nằm trên bàn với lượng còn lại đã được kiểm.\n\nThu hồi xong vẫn chưa có nghĩa người cần thuốc đã nhận được nó.",
    "choices": [
      {
        "id": "deliver_to_convoy",
        "label": "Trao thuốc cho đoàn xe và ký số lượng đã giao",
        "to": "convoy_ready",
        "kind": "interaction",
        "requiresFlags": [
          "medicine_recovered"
        ],
        "addFlags": [
          "convoy_supplied"
        ]
      },
      {
        "id": "leave_bag_in_store",
        "label": "Giữ thuốc trong kho, để sáng khác mới giao",
        "ending": "paper_only",
        "kind": "conclusion"
      }
    ]
  },
  "convoy_ready": {
    "placeId": "hall",
    "phase": "HỒI KẾT",
    "title": "Số thuốc đã đến tay người cần",
    "text": "Người phụ trách đoàn xe nhận đủ thuốc còn lại. Họ có thể chuẩn bị tiếp tục qua đèo khi trời vừa sáng. Những người ở trạm gác đã được cứu bằng phần thuốc dùng trước đó; phần chưa dùng nay có nơi cần nó.\n\nA Liên vẫn cần được minh oan, còn hành vi giấu thuốc của Lục Tam phải được ghi nhận rõ ràng.",
    "choices": [
      {
        "id": "finish_formal_with_supply",
        "label": "Công bố biên bản và minh oan A Liên",
        "ending": "accountability",
        "kind": "conclusion",
        "requiresFlags": [
          "formal_agreed",
          "medicine_recovered",
          "convoy_supplied"
        ]
      },
      {
        "id": "finish_mediated_with_supply",
        "label": "Công khai lời xin lỗi và ghi thỏa thuận có người chứng kiến",
        "ending": "reconcile",
        "kind": "conclusion",
        "requiresFlags": [
          "mediation_agreed",
          "public_confirmed",
          "public_witness_heard",
          "medicine_recovered",
          "convoy_supplied"
        ]
      },
      {
        "id": "finish_rescue_without_truth",
        "label": "Để đoàn xe đi nhưng không đính chính lời nghi oan",
        "ending": "unresolved_reputation",
        "kind": "conclusion"
      },
      {
        "id": "return_to_reconciliation",
        "label": "Quay lại để những người trong quán được lên tiếng",
        "to": "hearing",
        "kind": "dialogue"
      }
    ]
  }
},
  endings:{
  "withdraw": {
    "status": "failure",
    "title": "Bạn rời quán trước bình minh",
    "text": "Bạn rời quán giữa đêm. Đến sáng, đoàn xe chở người bị thương đến nhận túi cứu thương thì hòm hàng vẫn trống. Họ phải chờ trong lúc đường đèo mỗi lúc một khó đi.\n\nKhông ai buộc người khách lạ phải ở lại. Nhưng câu chuyện tại Quan Đạo vẫn tiếp tục với những người cần thuốc, cần một lời giải thích và cần ai đó chịu hành động."
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
    "title": "Hai chuyến cứu người",
    "text": "Lục Tam và người khuân hàng đã đưa thuốc chưa dùng từ trạm gác về bằng lối sườn đá. Bạn đếm đủ bốn cuộn băng ép và một lọ cầm máu trước khi giao cho đoàn xe chở người bị thương. Họ kịp lên đường khi trời vừa sáng.\n\nBạn đặt sổ mượn chìa, dấu sáp, lời khai, biên nhận và phiếu bàn giao mới lên cùng một bàn. Mọi manh mối đã giúp lần ra cả người lấy, nơi thuốc đến và số thuốc còn lại. Lục Tam ký nhận trách nhiệm vì tự mở hòm và giấu sự việc; A Liên được minh oan công khai.\n\nBạn không chỉ tìm ra sự thật: bạn còn đưa phần thuốc chưa dùng về đúng người đang cần, trước khi quá muộn."
  },
  "reconcile": {
    "status": "success",
    "title": "Chén trà sau chuyến xe bình minh",
    "text": "Phần thuốc chưa dùng được mang từ trạm gác về theo đường sườn đá, kiểm đếm rồi trao tận tay người phụ trách đoàn xe chở người bị thương. Tiếng bánh xe lăn khỏi sân khi trời vừa sáng; số thuốc ấy không còn chỉ là một con số trong sổ.\n\nHà chưởng quầy đọc biên bản, Lục Tam nhận lỗi tự ý lấy và che giấu, rồi xin lỗi A Liên trước mọi người. Cô được kể đúng điều mình nhìn thấy, không ai thêm một cái tên vào chỗ bóng đêm che khuất. Người trong quán cùng ghi số thuốc đã dùng, đã trả lại và trách nhiệm bồi hoàn.\n\nKhông phải một lời xin lỗi khiến vụ việc hóa nhỏ. Cả hai nhóm người bị thương đều có thuốc cần thiết, còn người bị nghi oan được trả lại tiếng nói."
  },
  "wrong_guard": {
    "status": "failure",
    "title": "Lời buộc tội chưa thể thay chứng cứ",
    "text": "Bạn đứng trước mọi người, khẳng định Lục Tam có tội nhưng không đưa ra được những gì mình đã kiểm tra. Hà chưởng quầy ngăn người khác giữ anh lại: ông không thể cho phép kết tội hay bắt người chỉ bằng suy đoán.\n\nLục Tam tiếp tục im lặng, còn sự căng thẳng trong quán tăng lên. Bạn có thể đã nghi đúng người, nhưng cách buộc tội vội vàng khiến sự thật càng khó được nghe một cách công bằng."
  },
  "paper_only": {
    "status": "failure",
    "title": "Sự thật nằm trên giấy, thuốc vẫn ở trạm",
    "text": "Bạn giúp chưởng quầy ghi rõ ai đã mở hòm. Lục Tam ký nhận lỗi; A Liên được đính chính trước vài người trong quán. Nhưng không ai được cử đi lấy phần thuốc còn lại ở trạm gác.\n\nTrời vừa sáng, đoàn xe chở người bị thương phải chờ dưới mái hiên. Bạn đã giải đáp ai lấy thuốc, nhưng chưa giải quyết được vì sao việc mất thuốc lại nguy hiểm đến thế."
  },
  "route_blocked": {
    "status": "failure",
    "title": "Đường tắt bị nước lũ khóa",
    "text": "Người được cử đi đến cây cầu thấp thì thấy nước cuộn qua những tấm ván. Họ không thể vượt qua và buộc quay lại. Số thuốc chưa dùng vẫn ở trạm gác.\n\nĐoàn xe chở người bị thương không được nhận thuốc đúng lúc và phải hoãn lên đường. Việc tìm ra người lấy chưa đủ nếu bạn không đưa thuốc về kịp."
  },
  "unverified_handover": {
    "status": "failure",
    "title": "Một lần nữa bỏ qua việc kiểm chứng",
    "text": "Túi thuốc đã được đưa về, nhưng bạn vội chuyển đi mà không kiểm số lượng. Người phụ trách đoàn xe phát hiện chứng từ không ghi rõ phần thuốc còn lại và yêu cầu kiểm lại.\n\nViệc thiếu đối chiếu lại làm mọi người chậm trễ giữa cơn mưa. Hôm nay, lời hứa suông không thể thay cho việc bàn giao có người chứng kiến."
  },
  "unresolved_reputation": {
    "status": "failure",
    "title": "Thuốc được trả, nỗi oan còn đó",
    "text": "Đoàn xe đã có thuốc và kịp lên đường, nhưng không ai chịu công khai đính chính lời đồn về A Liên. Cô vẫn phải đối mặt với ánh mắt nghi ngờ của những người chưa nghe sự thật.\n\nBạn đã giúp những người bị thương, nhưng chưa giải quyết hết hậu quả của lần che giấu. Một câu chuyện không chỉ có người cần thuốc, mà còn có người cần được trả lại danh dự."
  }
}
 };
 function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 return freeze(story);
});