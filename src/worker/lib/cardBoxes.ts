import type { CardBoxCard, CardBoxSummary, CardBoxDetail, CardBoxText } from "../../shared/cardBox";
interface Box { id: string; name: CardBoxText; description: CardBoxText; free: boolean; cover: string; price: number | null; cards: CardBoxCard[] }
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
  }
];
function isOpen(box: Box): boolean { return box.free; }
function summary(box: Box): CardBoxSummary { return { id: box.id, name: box.name, description: box.description, open: isOpen(box), cover: box.cover, price: box.price }; }
export function boxList(): CardBoxSummary[] { return [...CARD_BOXES].sort((a, b) => Number(isOpen(b)) - Number(isOpen(a))).map(summary); }
export function boxDetail(boxId: string): CardBoxDetail | null {
  const box = CARD_BOXES.find(box => box.id === boxId);
  return box ? { box: summary(box), cards: isOpen(box) ? box.cards : box.cards.filter(card => card.preview) } : null;
}
