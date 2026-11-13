import type { CardBoxCard, CardBoxSummary, CardBoxDetail, CardBoxText } from "../../shared/cardBox";
interface Box { id: string; name: CardBoxText; description: CardBoxText; free: boolean; adult?: true; cover: string; price: number | null; cards: CardBoxCard[] }
export const CARD_BOXES: Box[] = [
  {
    "id": "lam-quen-lai",
    "name": {
      "vi": "Làm quen lại",
      "en": "Getting to know you again"
    },
    "description": {
      "vi": "Những câu nhẹ nhàng để thấy lại người bên cạnh.",
      "en": "Light cards to see each other anew."
    },
    "free": true,
    "cover": "/card-boxes/lam-quen-lai.jpg",
    "price": null,
    "cards": [
      {
        "id": "lql-01",
        "kind": "question",
        "text": {
          "vi": "Món ăn nào mỗi lần ăn là thấy nhớ nhà? Kể cho nhau nghe.",
          "en": "Which food tastes like home to you? Tell each other about it."
        }
      },
      {
        "id": "lql-02",
        "kind": "rather",
        "options": [
          {
            "vi": "Một ngày nghỉ ở nhà không làm gì cả",
            "en": "A day off at home doing nothing"
          },
          {
            "vi": "Một ngày đi tới chỗ hai đứa chưa từng tới",
            "en": "A day out somewhere neither of you has been"
          }
        ]
      },
      {
        "id": "lql-03",
        "kind": "point",
        "text": {
          "vi": "Ai hay hát một mình trong nhà tắm hơn?",
          "en": "Who sings alone in the shower more?"
        }
      },
      {
        "id": "lql-04",
        "kind": "question",
        "text": {
          "vi": "Năm mười lăm tuổi, mỗi người mơ lớn lên sẽ làm gì?",
          "en": "At fifteen, what did each of you dream of becoming?"
        }
      },
      {
        "id": "lql-05",
        "kind": "dare",
        "text": {
          "vi": "Nhìn vào mắt nhau đủ 30 giây, không ai nói gì.",
          "en": "Look into each other's eyes for 30 seconds, without a word."
        }
      },
      {
        "id": "lql-06",
        "kind": "scale",
        "text": {
          "vi": "Mỗi người thích mùa mưa đến mức nào?",
          "en": "How much do you each like the rainy season?"
        },
        "low": {
          "vi": "Chỉ mong trời nắng.",
          "en": "Bring back the sun."
        },
        "high": {
          "vi": "Mưa là vui.",
          "en": "Rain makes my day."
        }
      },
      {
        "id": "lql-07",
        "kind": "question",
        "text": {
          "vi": "Có bài hát nào nghe lại là thấy mình của ngày xưa không?",
          "en": "Is there a song that takes you straight back to who you used to be?"
        }
      },
      {
        "id": "lql-08",
        "kind": "rather",
        "options": [
          {
            "vi": "Một bữa sáng thật ngon",
            "en": "A really good breakfast"
          },
          {
            "vi": "Thêm một tiếng ngủ",
            "en": "One more hour of sleep"
          }
        ]
      },
      {
        "id": "lql-09",
        "kind": "dare",
        "text": {
          "vi": "Mỗi người lấy một món đồ trong nhà có câu chuyện riêng, rồi kể về nó trong một phút.",
          "en": "Each pick up one thing at home that has a story, and tell it in one minute."
        }
      },
      {
        "id": "lql-10",
        "kind": "question",
        "text": {
          "vi": "Hồi mới quen, có khoảnh khắc nhỏ nào mà đến giờ mỗi người vẫn nhớ?",
          "en": "From when you first met, what small moment does each of you still remember?"
        }
      }
    ]
  },
  {
    "id": "rau-ram",
    "name": {
      "vi": "Rau răm",
      "en": "Spicy"
    },
    "description": {
      "vi": "Cay cay một chút, chỉ dành cho hai đứa.",
      "en": "A little spicy, just for the two of you."
    },
    "free": false,
    "adult": true,
    "cover": "/card-boxes/rau-ram.jpg",
    "price": 49000,
    "cards": [
      {
        "id": "rr-01",
        "kind": "truthDare",
        "truth": {
          "vi": "Lần đầu mỗi người thấy người kia thật sự quyến rũ là lúc nào? Kể kỹ một chút.",
          "en": "When did each of you first find the other truly attractive? Tell it with a little detail."
        },
        "dare": {
          "vi": "Hôn nhau một nụ thật chậm, đếm thầm đến mười rồi mới rời ra.",
          "en": "Share one slow kiss, counting silently to ten before you part."
        }
      },
      {
        "id": "rr-02",
        "kind": "truthDare",
        "truth": {
          "vi": "Người kia mặc gì thì mỗi người thấy khó rời mắt nhất?",
          "en": "What does the other wear that each of you finds hardest to look away from?"
        },
        "dare": {
          "vi": "Mỗi người cởi bớt một món đồ đang mặc, món nào tùy mình.",
          "en": "Each take off one thing you're wearing, your choice which."
        }
      },
      {
        "id": "rr-03",
        "kind": "truthDare",
        "truth": {
          "vi": "Nụ hôn nào của hai đứa mà mỗi người nhớ nhất, và vì sao?",
          "en": "Which of your kisses does each of you remember most, and why?"
        },
        "dare": {
          "vi": "Một người nhắm mắt, người kia hôn ba chỗ bất kỳ trên mặt và cổ, rồi đoán chỗ nào là đầu tiên. Rồi đổi lượt.",
          "en": "One closes their eyes while the other kisses three spots on their face and neck, then guess which came first. Then swap."
        }
      },
      {
        "id": "rr-04",
        "preview": true,
        "kind": "truthDare",
        "truth": {
          "vi": "Có kiểu chạm nào mỗi người rất thích mà chưa từng nói ra?",
          "en": "Is there a kind of touch each of you loves but has never said out loud?"
        },
        "dare": {
          "vi": "Xoa vai và lưng cho nhau thật chậm, mỗi người hai phút. Người được xoa chỉ cần nói \"chỗ đó\" hay \"nhẹ thôi\".",
          "en": "Give each other a slow shoulder and back massage, two minutes each. The one receiving just says \"right there\" or \"gentler\"."
        }
      },
      {
        "id": "rr-05",
        "kind": "truthDare",
        "truth": {
          "vi": "Có giấc mơ nào về người kia mà mỗi người hơi ngại kể không? Kể bản đã kiểm duyệt cũng được.",
          "en": "Has either of you had a dream about the other you'd be a bit shy to tell? The censored version counts."
        },
        "dare": {
          "vi": "Ghé sát tai người kia, thì thầm một điều mình muốn hai đứa làm tối nay. Rồi đổi lượt.",
          "en": "Lean close and whisper in the other's ear one thing you'd like the two of you to do tonight. Then swap."
        }
      },
      {
        "id": "rr-06",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người thấy mình quyến rũ nhất vào lúc nào?",
          "en": "When does each of you feel at your most attractive?"
        },
        "dare": {
          "vi": "Ngồi thật gần, mỗi người hôn dọc cánh tay người kia, từ đầu ngón tay lên đến vai, thật chậm.",
          "en": "Sit close and each kiss along the other's arm, from fingertips to shoulder, slowly."
        }
      },
      {
        "id": "rr-07",
        "preview": true,
        "kind": "truthDare",
        "truth": {
          "vi": "Ông bà bảo rau răm làm bớt \"nóng\". Theo mỗi người, hai đứa nên ăn thêm hay ăn bớt?",
          "en": "Folk wisdom says rau răm cools you down. Should the two of you eat more of it, or less?"
        },
        "dare": {
          "vi": "Ôm sát nhau nhảy chậm hết một bài, không cần nhạc, một người ngân nga là đủ.",
          "en": "Slow dance close together for one song; no music needed, one of you can hum."
        }
      },
      {
        "id": "rr-08",
        "preview": true,
        "kind": "truthDare",
        "truth": {
          "vi": "Người kia làm gì, dù rất nhỏ, mà mỗi người \"đổ\" ngay tại chỗ?",
          "en": "What does the other do, however small, that makes each of you melt on the spot?"
        },
        "dare": {
          "vi": "Một người nhắm mắt, người kia dùng đầu ngón tay vẽ chậm một hình lên lưng. Đoán sai thì bị hôn một cái. Rồi đổi lượt.",
          "en": "One closes their eyes while the other slowly traces a shape on their back with a fingertip. A wrong guess earns a kiss. Then swap."
        }
      },
      {
        "id": "rr-09",
        "kind": "truthDare",
        "truth": {
          "vi": "Một buổi tối chỉ có hai đứa, mỗi người muốn nó bắt đầu thế nào và kết thúc ra sao?",
          "en": "An evening with just the two of you: how would each of you like it to start, and to end?"
        },
        "dare": {
          "vi": "Cởi một cúc áo hay một món đồ của người kia, chỉ khi người kia gật đầu. Rồi đổi lượt.",
          "en": "Undo one button or take off one piece of the other's clothing, only once they nod. Then swap."
        }
      },
      {
        "id": "rr-10",
        "kind": "truthDare",
        "truth": {
          "vi": "Có điều gì mỗi người muốn hai đứa thử cùng nhau mà chưa dám nói? Nói một nửa thôi cũng được.",
          "en": "Is there something each of you would like to try together but hasn't dared to say? Half of it is enough."
        },
        "dare": {
          "vi": "Nằm cạnh nhau, nhìn vào mắt nhau một phút, rồi hôn khi cả hai cùng thấy muốn.",
          "en": "Lie side by side and look into each other's eyes for a minute, then kiss when you both feel like it."
        }
      },
      {
        "id": "rr-11",
        "kind": "truthDare",
        "truth": {
          "vi": "Giọng người kia lúc nào làm mỗi người thấy xao xuyến nhất?",
          "en": "When does the other's voice give each of you butterflies?"
        },
        "dare": {
          "vi": "Mỗi người nói một câu tán tỉnh bằng giọng thật thấp, chỉ đủ cho người kia nghe.",
          "en": "Each say a flirty line in a low voice, just loud enough for the other to hear."
        }
      },
      {
        "id": "rr-12",
        "kind": "truthDare",
        "truth": {
          "vi": "Nếu rủ người kia lại gần chỉ bằng một ánh nhìn, mỗi người sẽ nhìn thế nào?",
          "en": "How would each of you invite the other closer with just a look?"
        },
        "dare": {
          "vi": "Dùng ánh mắt mời người kia ngồi vào lòng mình. Chờ người kia nói muốn rồi mới đỡ người kia ngồi xuống; rồi đổi lượt.",
          "en": "Invite the other into your lap with a look. Wait for them to say they want to before helping them settle in; then swap."
        }
      },
      {
        "id": "rr-13",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người thích được người kia chủ động hay thích tự mình mở lời hơn?",
          "en": "Does each of you prefer the other to make the first move, or to make it yourself?"
        },
        "dare": {
          "vi": "Chìa tay mời người kia. Khi người kia đồng ý, dẫn tay người kia đến một chỗ trên vai hoặc lưng mình và chỉ cách mình thích được vuốt ve. Rồi đổi lượt.",
          "en": "Offer the other your hand. Once they agree, guide their hand to a spot on your shoulder or back and show them how you like to be caressed. Then swap."
        }
      },
      {
        "id": "rr-14",
        "kind": "truthDare",
        "truth": {
          "vi": "Có lời khen nào về vẻ quyến rũ của mình mà mỗi người vẫn muốn được nghe lại?",
          "en": "Is there a compliment about your attractiveness that each of you would love to hear again?"
        },
        "dare": {
          "vi": "Lần lượt nói một điều mình thấy quyến rũ ở người kia ngay lúc này, không dùng từ \"đẹp\" hay \"xinh\".",
          "en": "Take turns saying what you find attractive about the other right now, without using \"beautiful\" or \"good-looking\"."
        }
      },
      {
        "id": "rr-15",
        "kind": "truthDare",
        "truth": {
          "vi": "Một tín hiệu nhỏ nào của người kia khiến mỗi người biết là đang được tán tỉnh?",
          "en": "What little signal tells each of you the other is flirting with you?"
        },
        "dare": {
          "vi": "Cùng nghĩ một tín hiệu bằng tay để rủ nhau hôn. Mỗi người thử một lần, chỉ hôn khi người kia nói có; lắc đầu cười cũng được.",
          "en": "Make up a hand signal to ask for a kiss. Each try it once, kissing only when the other says yes; a smile and a shake of the head is fine too."
        }
      },
      {
        "id": "rr-16",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người thích một nụ hôn bất ngờ hay được hỏi trước bằng một câu thật tình tứ?",
          "en": "Does each of you prefer a surprise kiss or a flirty question first?"
        },
        "dare": {
          "vi": "Hỏi người kia có thích được trêu bằng hơi thở không. Khi người kia gật đầu, ghé sát tai và thổi một làn hơi thật nhẹ, không chạm môi. Rồi đổi lượt.",
          "en": "Ask if the other would enjoy being teased with your breath. Once they nod, lean close to their ear and blow a very gentle breath, without touching with your lips. Then swap."
        }
      },
      {
        "id": "rr-17",
        "kind": "truthDare",
        "truth": {
          "vi": "Khi hai đứa ở sát nhau, mỗi người thích được gọi bằng tên hay một biệt danh riêng?",
          "en": "When you're close together, does each of you prefer your name or a private nickname?"
        },
        "dare": {
          "vi": "Mỗi người nghĩ một biệt danh hơi táo bạo cho người kia, rồi nói nhỏ để người kia chọn giữ hay bỏ.",
          "en": "Each invent a slightly daring nickname for the other, then say it softly so they can choose to keep it or drop it."
        }
      },
      {
        "id": "rr-18",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người có dễ đỏ mặt khi được người kia nhìn chăm chú không?",
          "en": "Does each of you blush easily when the other looks at you intently?"
        },
        "dare": {
          "vi": "Ngồi đối diện và hỏi người kia có muốn thử chạm chân không. Khi người kia nói có, chậm rãi vuốt bàn chân mình dọc cổ chân người kia, rồi đổi lượt.",
          "en": "Sit facing each other and ask if the other wants to try a little foot caress. Once they say yes, slowly slide your foot along their ankle, then swap."
        }
      },
      {
        "id": "rr-19",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người thích cảm giác chờ một nụ hôn đến mức nào?",
          "en": "How much does each of you enjoy the anticipation before a kiss?"
        },
        "dare": {
          "vi": "Ghé mặt lại gần và hỏi nhỏ \"Chờ thêm chút nhé?\" Khi người kia đồng ý, dừng một nhịp rồi mới hôn nếu cả hai vẫn muốn. Rồi đổi lượt.",
          "en": "Bring your faces close and ask softly, \"Shall we wait a little?\" Once the other agrees, pause for a moment, then kiss if you both still want to. Then swap."
        }
      },
      {
        "id": "rr-20",
        "kind": "truthDare",
        "truth": {
          "vi": "Khi đang hôn mà bật cười, mỗi người muốn hôn tiếp hay dừng lại cười cho đã?",
          "en": "If you start laughing during a kiss, does each of you want to keep kissing or pause to enjoy the laugh?"
        },
        "dare": {
          "vi": "Rủ người kia chơi hôn khóe môi. Khi người kia gật đầu, lần lượt hôn nhẹ một bên khóe môi nhau, bên nào tùy mình; bật cười thì nghỉ một nhịp.",
          "en": "Invite the other to play a kissing game. Once they nod, take turns lightly kissing one corner of each other's mouth, choosing either side; pause for a moment if you start laughing."
        }
      },
      {
        "id": "rr-21",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người thích được vuốt tóc lúc đang gần gũi không, hay muốn để tóc yên?",
          "en": "Does each of you enjoy having your hair stroked when you're close, or prefer it left alone?"
        },
        "dare": {
          "vi": "Hỏi người kia có muốn được xoa đầu thật chậm không. Khi người kia đồng ý, để người kia tựa sát vào mình rồi dùng đầu ngón tay xoa nhẹ da đầu trong một phút. Rồi đổi lượt.",
          "en": "Ask if the other would like a slow head massage. Once they agree, let them lean close and gently massage their scalp with your fingertips for a minute. Then swap."
        }
      },
      {
        "id": "rr-22",
        "kind": "truthDare",
        "truth": {
          "vi": "Có mùi hương quen thuộc nào khiến mỗi người chỉ muốn rúc lại gần người kia?",
          "en": "Is there a familiar scent that makes each of you want to snuggle closer to the other?"
        },
        "dare": {
          "vi": "Mời người kia tựa đầu vào vai mình. Khi người kia nói muốn, ngồi sát cho người kia tựa một lúc, không nói gì, rồi đổi lượt.",
          "en": "Invite the other to rest their head on your shoulder. Once they say they'd like to, sit close and let them lean on you quietly for a while, then swap."
        }
      },
      {
        "id": "rr-23",
        "kind": "truthDare",
        "truth": {
          "vi": "Khi nắm tay, mỗi người thích đan ngón hay được bàn tay kia bao lấy?",
          "en": "When holding hands, does each of you prefer fingers intertwined or your hand wrapped in the other's?"
        },
        "dare": {
          "vi": "Chìa tay xin được hôn vào lòng bàn tay người kia. Chờ một tiếng \"ừ\" rồi mới nâng tay lên hôn, sau đó đổi lượt.",
          "en": "Ask to kiss the other's palm. Wait for a yes before lifting their hand for a kiss, then swap."
        }
      },
      {
        "id": "rr-24",
        "kind": "truthDare",
        "truth": {
          "vi": "Khi gần gũi, điều gì khiến mỗi người muốn chậm lại và tận hưởng lâu hơn?",
          "en": "When you're intimate, what makes each of you want to slow down and linger?"
        },
        "dare": {
          "vi": "Vuốt nhẹ cánh tay người kia bằng đầu ngón tay, chỉ sau khi người kia nói muốn thử. Để người kia đổi nhịp bằng cách nói \"chậm hơn\", \"nhanh hơn\" hoặc \"dừng\", rồi đổi lượt.",
          "en": "Gently stroke the other's arm with your fingertips, only after they say they want to try. Let them change the pace by saying \"slower\", \"faster\" or \"stop\", then swap."
        }
      },
      {
        "id": "rr-25",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người muốn được báo thế nào khi một cái chạm đang hơi mạnh hoặc hơi nhanh?",
          "en": "How would each of you like to be told when a touch is a little too firm or too fast?"
        },
        "dare": {
          "vi": "Xin người kia một tiếng \"ừ\" trước khi xoa bàn tay cho nhau, mỗi người một phút. Người được xoa chỉ lực nhẹ hay mạnh theo ý mình.",
          "en": "Get a yes from the other before massaging each other's hands for a minute each. The one receiving guides how light or firm it feels."
        }
      },
      {
        "id": "rr-26",
        "kind": "truthDare",
        "truth": {
          "vi": "Khi gần gũi, mỗi người thích được hướng dẫn bằng lời hay bằng cử chỉ?",
          "en": "When you're intimate, does each of you prefer guidance through words or gestures?"
        },
        "dare": {
          "vi": "Cùng chọn một từ làm tín hiệu tạm dừng. Hỏi người kia có muốn thử trò đứng hình với một cái vuốt má không; khi người kia đồng ý, bắt đầu vuốt và dừng tay ngay lúc nghe tín hiệu. Rồi đổi lượt.",
          "en": "Choose a word as your pause signal. Ask if the other wants to try a freeze game with a cheek caress; once they agree, start stroking and stop your hand as soon as you hear the signal. Then swap."
        }
      },
      {
        "id": "rr-27",
        "kind": "truthDare",
        "truth": {
          "vi": "Có món đồ đang mặc nào khiến mỗi người thấy mình bạo dạn hơn thường ngày?",
          "en": "Does anything you're wearing make each of you feel bolder than usual?"
        },
        "dare": {
          "vi": "Mỗi người tạo ba dáng quyến rũ ngay tại chỗ, vẫn mặc nguyên đồ. Người kia chọn dáng khiến mình khó rời mắt nhất.",
          "en": "Each strike three seductive poses right where you are, keeping your clothes on. The other picks the pose they find hardest to look away from."
        }
      },
      {
        "id": "rr-28",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người thích được ôm từ phía trước hay phía sau khi chỉ có hai đứa?",
          "en": "Does each of you prefer a hug from the front or from behind when it's just the two of you?"
        },
        "dare": {
          "vi": "Ngồi ôm người kia từ phía sau và hôn lên vai, chỉ khi người kia nói muốn cả hai điều đó. Giữ cái ôm một lúc rồi đổi lượt.",
          "en": "Sit with your arms around the other from behind and kiss their shoulder, only when they say they want both. Stay in the embrace for a while, then swap."
        }
      },
      {
        "id": "rr-29",
        "kind": "truthDare",
        "truth": {
          "vi": "Sau một lúc gần gũi, mỗi người thích nằm yên bên nhau hay thủ thỉ chuyện gì đó?",
          "en": "After being intimate, does each of you prefer lying quietly together or talking softly?"
        },
        "dare": {
          "vi": "Cùng nói xem có muốn áp trán vào nhau không. Hai tiếng \"ừ\" thì ghé lại, thở chậm năm nhịp, mắt mở hay nhắm tùy mình.",
          "en": "Ask each other if you'd like to rest your foreheads together. Two yeses, then lean in and take five slow breaths, with your eyes open or closed as you like."
        }
      },
      {
        "id": "rr-30",
        "kind": "truthDare",
        "truth": {
          "vi": "Dấu hiệu nào giúp mỗi người nhận ra hôm nay mình chỉ muốn được âu yếm, không hơn?",
          "en": "What helps each of you recognize when you only want affection today, and nothing more?"
        },
        "dare": {
          "vi": "Mỗi người nói một điều âu yếm mình muốn ngay bây giờ. Người kia chọn đồng ý, gợi ý điều khác hoặc để lúc khác; cùng làm nếu hai đứa thấy thích.",
          "en": "Each name one affectionate thing you want right now. The other can agree, suggest something else or leave it for another time; do it together if you both feel like it."
        }
      }
    ]
  },
  {
    "id": "deep-connection",
    "name": {
      "vi": "Deep Connection",
      "en": "Deep Connection"
    },
    "description": {
      "vi": "Những câu chậm hơn, để hiểu nhau sâu hơn.",
      "en": "Slower cards, to understand each other more deeply."
    },
    "free": false,
    "cover": "/card-boxes/deep-connection.jpg",
    "price": 49000,
    "cards": [
      {
        "id": "dc-01",
        "kind": "question",
        "text": {
          "vi": "Gần đây có lúc nào mỗi người thấy người kia thật sự hiểu mình? Kể lại lúc đó.",
          "en": "When did each of you last feel truly understood by the other? Tell that moment."
        }
      },
      {
        "id": "dc-02",
        "kind": "scale",
        "preview": true,
        "text": {
          "vi": "Dạo này mỗi người thấy mình mệt đến mức nào?",
          "en": "How tired has each of you been lately?"
        },
        "low": {
          "vi": "Còn nhiều sức lắm.",
          "en": "Plenty left in me."
        },
        "high": {
          "vi": "Cạn pin rồi.",
          "en": "Running on empty."
        }
      },
      {
        "id": "dc-03",
        "kind": "rather",
        "options": [
          {
            "vi": "Lúc buồn, được ôm thật lâu",
            "en": "When you're down, a long hug"
          },
          {
            "vi": "Lúc buồn, được ngồi nghe mình kể hết",
            "en": "When you're down, someone who listens to all of it"
          }
        ]
      },
      {
        "id": "dc-04",
        "kind": "question",
        "text": {
          "vi": "Điều gì từ gia đình mình mà mỗi người muốn giữ cho hai đứa, và điều gì muốn để lại phía sau?",
          "en": "What from your own family would each of you keep for the two of you, and what would you leave behind?"
        }
      },
      {
        "id": "dc-05",
        "kind": "point",
        "preview": true,
        "text": {
          "vi": "Ai hay giấu chuyện buồn để người kia khỏi lo hơn?",
          "en": "Who hides a worry more, so the other won't fret?"
        }
      },
      {
        "id": "dc-06",
        "kind": "question",
        "text": {
          "vi": "Một năm nữa, mỗi người mong hai đứa đã cùng làm được điều gì?",
          "en": "A year from now, what would each of you like the two of you to have done together?"
        }
      },
      {
        "id": "dc-07",
        "kind": "dare",
        "preview": true,
        "text": {
          "vi": "Nắm tay nhau, mỗi người nói một câu bắt đầu bằng \"Cảm ơn vì...\" mà trước giờ chưa nói.",
          "en": "Hold hands and each say one sentence starting with \"Thank you for...\" that you have never said before."
        }
      },
      {
        "id": "dc-08",
        "kind": "scale",
        "text": {
          "vi": "Sau khi giận nhau, mỗi người cần bao lâu mới muốn nói chuyện lại?",
          "en": "After an argument, how long does each of you need before you want to talk again?"
        },
        "low": {
          "vi": "Nói được ngay.",
          "en": "Right away."
        },
        "high": {
          "vi": "Cần thật nhiều thời gian.",
          "en": "A good while."
        }
      },
      {
        "id": "dc-09",
        "kind": "question",
        "text": {
          "vi": "Người kia làm điều gì khiến mỗi người thấy được yêu nhất, dù là chuyện rất nhỏ?",
          "en": "What does the other do that makes you feel most loved, even something very small?"
        }
      },
      {
        "id": "dc-10",
        "kind": "question",
        "text": {
          "vi": "Có ước mơ nào mỗi người đã cất đi mà vẫn muốn một ngày được thử?",
          "en": "Is there a dream each of you put away but would still like to try one day?"
        }
      }
    ]
  },
  {
    "id": "truth-or-dare",
    "name": {
      "vi": "Thật hay thử thách",
      "en": "Truth or Dare"
    },
    "description": {
      "vi": "Câu hỏi thật lòng và thử thách nho nhỏ, để hai đứa cười cùng nhau.",
      "en": "Honest questions and little dares, to laugh about together."
    },
    "free": false,
    "cover": "/card-boxes/truth-or-dare.jpg",
    "price": 49000,
    "cards": [
      {
        "id": "tod-01",
        "kind": "truthDare",
        "truth": {
          "vi": "Lần đầu gặp nhau, mỗi người đã thật sự nghĩ gì về người kia? Nói thật nhé.",
          "en": "When you first met, what did each of you really think of the other? Be honest."
        },
        "dare": {
          "vi": "Ôm nhau thật chặt, đếm chậm đến mười rồi mới buông.",
          "en": "Hug tight and count slowly to ten before letting go."
        },
        "preview": true
      },
      {
        "id": "tod-02",
        "kind": "truthDare",
        "truth": {
          "vi": "Biệt danh hồi nhỏ của mỗi người là gì, và ai đã đặt cho?",
          "en": "What was each of your childhood nicknames, and who gave it to you?"
        },
        "dare": {
          "vi": "Mỗi người gọi tên người kia bằng ba giọng: thì thầm, hát lên và giọng đọc bản tin.",
          "en": "Each say the other's name three ways: whispered, sung and in a newsreader's voice."
        }
      },
      {
        "id": "tod-03",
        "kind": "truthDare",
        "truth": {
          "vi": "Điều đầu tiên mỗi người để ý ở người kia là gì?",
          "en": "What was the first thing each of you noticed about the other?"
        },
        "dare": {
          "vi": "Dùng ngón tay viết một chữ lên lòng bàn tay người kia. Đoán đúng thì đổi lượt.",
          "en": "Trace a word with your finger on the other's palm. Guess it right and swap turns."
        }
      },
      {
        "id": "tod-04",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người có món gì hay lén ăn một mình mà chưa từng mời người kia không?",
          "en": "Is there a snack each of you sneaks alone and has never offered the other?"
        },
        "dare": {
          "vi": "Mỗi người diễn không lời món ăn mình thích nhất, người kia đoán.",
          "en": "Each act out your favourite food without a word while the other guesses."
        },
        "preview": true
      },
      {
        "id": "tod-05",
        "kind": "truthDare",
        "truth": {
          "vi": "Người kia có thói quen nhỏ nào mà mỗi người thầm thấy dễ thương nhưng chưa bao giờ nói?",
          "en": "What little habit of the other's does each of you secretly find cute but has never said?"
        },
        "dare": {
          "vi": "Nắm tay nhau, mỗi người khen người kia ba điều không liên quan đến ngoại hình.",
          "en": "Hold hands and each give the other three compliments that have nothing to do with looks."
        }
      },
      {
        "id": "tod-06",
        "kind": "truthDare",
        "truth": {
          "vi": "Có lần nào mỗi người giả vờ thích một thứ chỉ vì người kia thích không?",
          "en": "Has either of you ever pretended to like something just because the other did?"
        },
        "dare": {
          "vi": "Thi nhìn nhau không cười. Ai cười trước thì kể một chuyện vui hồi nhỏ.",
          "en": "Look at each other without laughing. Whoever laughs first tells a funny story from childhood."
        }
      },
      {
        "id": "tod-07",
        "kind": "truthDare",
        "truth": {
          "vi": "Tài lẻ nào của mỗi người mà người kia chưa được thấy?",
          "en": "What hidden talent does each of you have that the other hasn't seen yet?"
        },
        "dare": {
          "vi": "Cùng hát một bài cả hai đều thuộc, mỗi người một câu, đến hết điệp khúc.",
          "en": "Sing a song you both know, one line each, to the end of the chorus."
        }
      },
      {
        "id": "tod-08",
        "kind": "truthDare",
        "truth": {
          "vi": "Trong ngày, lúc nào mỗi người thấy nhớ người kia nhất?",
          "en": "What time of day does each of you miss the other most?"
        },
        "dare": {
          "vi": "Ngồi tựa lưng vào nhau, nhắm mắt, cùng thở chậm năm hơi.",
          "en": "Sit back to back, close your eyes and take five slow breaths together."
        }
      },
      {
        "id": "tod-09",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người có nỗi sợ nhỏ nào hơi buồn cười mà người kia chưa biết?",
          "en": "What small, slightly silly fear does each of you have that the other doesn't know yet?"
        },
        "dare": {
          "vi": "Oẳn tù tì ba ván. Ai thua thì bóp vai cho người kia một phút.",
          "en": "Play rock paper scissors, best of three. Whoever loses gives the other a one-minute shoulder rub."
        },
        "preview": true
      },
      {
        "id": "tod-10",
        "kind": "truthDare",
        "truth": {
          "vi": "Nếu được sống thử một năm ở một thành phố khác, mỗi người sẽ chọn nơi nào?",
          "en": "If you could live in another city for a year, where would each of you pick?"
        },
        "dare": {
          "vi": "Cùng xếp một cái tháp thật cao từ những thứ trong tầm tay, trong một phút.",
          "en": "Build the tallest tower you can from things within reach, in one minute."
        }
      },
      {
        "id": "tod-11",
        "kind": "truthDare",
        "truth": {
          "vi": "Món nào hồi nhỏ mỗi người ghét mà giờ lại thích?",
          "en": "What food did each of you hate as a kid but like now?"
        },
        "dare": {
          "vi": "Một người nhắm mắt, người kia đặt một món đồ trong phòng vào tay để đoán. Rồi đổi lượt.",
          "en": "One closes their eyes and the other puts something from the room in their hand to guess. Then swap."
        }
      },
      {
        "id": "tod-12",
        "kind": "truthDare",
        "truth": {
          "vi": "Nếu được sống lại một ngày đã có cùng nhau, mỗi người chọn ngày nào?",
          "en": "If you could live one day you've had together again, which would each of you choose?"
        },
        "dare": {
          "vi": "Nắm tay nhau, nhắm mắt, mỗi người kể ba tiếng động đang nghe thấy quanh mình.",
          "en": "Hold hands, close your eyes and each name three sounds you can hear around you."
        }
      },
      {
        "id": "tod-13",
        "kind": "truthDare",
        "truth": {
          "vi": "Hồi nhỏ mỗi người từng tin điều gì ngây ngô nhất?",
          "en": "What's the most naive thing each of you believed as a kid?"
        },
        "dare": {
          "vi": "Mỗi người bắt chước điệu cười của người kia, rồi người kia nói giống được mấy phần.",
          "en": "Each copy the other's laugh, and the other says how close it was."
        }
      },
      {
        "id": "tod-14",
        "kind": "truthDare",
        "truth": {
          "vi": "Có bài hát nào mỗi người vừa nghe là nghĩ ngay đến người kia không?",
          "en": "Is there a song that makes each of you think of the other the moment it plays?"
        },
        "dare": {
          "vi": "Một người ngân nga một giai điệu, cả hai cùng nhảy theo trong 30 giây. Nhảy xấu cũng được.",
          "en": "One of you hums a tune and you both dance to it for 30 seconds. Bad dancing counts."
        }
      },
      {
        "id": "tod-15",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người muốn học được điều gì ở người kia nhất?",
          "en": "What would each of you most like to learn from the other?"
        },
        "dare": {
          "vi": "Ngồi đối diện nhau làm gương: một người cử động thật chậm, người kia làm theo y hệt trong 30 giây. Rồi đổi.",
          "en": "Sit facing each other and play mirror: one moves slowly, the other copies exactly for 30 seconds. Then swap."
        }
      },
      {
        "id": "tod-16",
        "kind": "truthDare",
        "truth": {
          "vi": "Nếu có siêu năng lực trong một ngày, mỗi người chọn gì, và sẽ cùng người kia làm gì với nó?",
          "en": "If you had a superpower for one day, what would each of you pick, and what would you do with it together?"
        },
        "dare": {
          "vi": "Cùng đứng một chân, giữ yên 20 giây. Ai lảo đảo trước thì thua.",
          "en": "Both stand on one leg and hold still for 20 seconds. Whoever wobbles first loses."
        }
      },
      {
        "id": "tod-17",
        "kind": "truthDare",
        "truth": {
          "vi": "Mỗi người còn giữ món đồ nhỏ nào từ người kia, dù chỉ là mảnh giấy hay tấm vé?",
          "en": "What small thing from the other does each of you still keep, even a note or a ticket?"
        },
        "dare": {
          "vi": "Đổi chỗ ngồi cho nhau và ngồi theo dáng quen thuộc của người kia trong một phút.",
          "en": "Swap seats and sit the way the other usually sits for one minute."
        }
      },
      {
        "id": "tod-18",
        "kind": "truthDare",
        "truth": {
          "vi": "Câu cửa miệng nào của người kia đã lây sang mỗi người?",
          "en": "Which of the other's pet phrases has rubbed off on each of you?"
        },
        "dare": {
          "vi": "Đập tay theo một nhịp tự nghĩ ra, người kia phải vỗ lại cho đúng. Rồi đổi lượt.",
          "en": "Clap out a rhythm you make up, and the other has to clap it back exactly. Then swap."
        }
      },
      {
        "id": "tod-19",
        "kind": "truthDare",
        "truth": {
          "vi": "Hồi nhỏ mỗi người có món đồ chơi nào không rời tay?",
          "en": "What toy did each of you never let go of as a kid?"
        },
        "dare": {
          "vi": "Cùng kể một câu chuyện, mỗi người một câu, đến khi đủ mười câu.",
          "en": "Tell a story together, one sentence each, until you reach ten."
        }
      },
      {
        "id": "tod-20",
        "kind": "truthDare",
        "truth": {
          "vi": "Nếu mai hai đứa được nghỉ một tuần, mỗi người muốn làm gì đầu tiên?",
          "en": "If you both had a week off from tomorrow, what would each of you want to do first?"
        },
        "dare": {
          "vi": "Đan một tay vào nhau, rồi dùng hai tay còn lại vỗ vào nhau mười lần không trượt.",
          "en": "Lace one hand together, then clap your two free hands together ten times without missing."
        }
      }
    ]
  }
];
function isOpen(box: Box, unlocked: Set<string>): boolean { return box.free || unlocked.has(box.id); }
function summary(box: Box, unlocked: Set<string>): CardBoxSummary { return { id: box.id, name: box.name, description: box.description, open: isOpen(box, unlocked), cardCount: box.cards.length, ...(box.adult ? { adult: box.adult } : {}), cover: box.cover, price: box.price }; }
export function boxList(unlocked = new Set<string>()): CardBoxSummary[] { return [...CARD_BOXES].sort((a, b) => Number(isOpen(b, unlocked)) - Number(isOpen(a, unlocked))).map(box => summary(box, unlocked)); }
export function boxDetail(boxId: string, unlocked = new Set<string>()): CardBoxDetail | null {
  const box = CARD_BOXES.find(box => box.id === boxId);
  return box ? { box: summary(box, unlocked), cards: isOpen(box, unlocked) ? box.cards : box.cards.filter(card => card.preview) } : null;
}
