import type { Box } from "./types";

export const deepConnection: Box = {
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
};
