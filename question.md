# Bisou question cards

Generated from `src/shared/garden.ts` (`CARDS`, `DECKS`). That file is the source of truth; regenerate this list after editing it.

## How to read it

- **Level** (`levelId`): the relationship stage the card belongs to. Ordinary cards of a level enter the daily draw once the couple has opened that level.
- **Type** (`kind`):
  - *Thường* (`ordinary`): both answer, then flip; it can be the daily card and grows its plant.
  - *Cần chốt* (`decision`): asked before moving to the next level; complete once both have responded (text, "no details" or "later / not applicable"); never in the daily draw.
- **Depth** (`depth`): Nhẹ (`light`), Vừa (`medium`), Sâu (`deep`).
- **Deck** (`deckId`): the topic, one plant in the garden.

## Adding or changing cards

- Add a row to `CARDS` with a new ID: `<deck>-NN` is reserved for the original 60; new cards use `L<level number>-NN` (L1 Làm quen ... L5 Có con), next free number.
- Every card needs `deckId`, `levelId`, `kind`, `depth` and both `vi` and `en` text.
- Never reuse or repurpose an ID that may have answers; never edit the original 60 (a test pins them).
- To drop a card, set `retired: true`; answers stay readable.
- A new decision card only applies to couples who open that level after the release; couples already on it keep their snapshot (`gate_ids`).
- Update the counts in `test/garden-cards.test.ts`, run the tests, then regenerate this file.

## Summary

| Level | Thường | Cần chốt | Total |
|---|---|---|---|
| Làm quen (`acquainted`) | 60 | 3 | 63 |
| Đang yêu (`in_love`) | 21 | 11 | 32 |
| Sống chung (`living_together`) | 12 | 4 | 16 |
| Đã cưới (`married`) | 0 | 4 | 4 |
| Có con (`with_children`) | 4 | 0 | 4 |
| **All** | 97 | 22 | 119 |

By deck: Ký ức 12, Ước mơ 21, Tiền bạc 20, Khi bất đồng 17, Gia đình hai bên 18, Mỗi ngày của mình 31.

## Làm quen (`acquainted`)

### Thẻ thường

| ID | Deck | Depth | Câu hỏi | English |
|---|---|---|---|---|
| `memories-01` | Ký ức | Nhẹ | Món ăn nào làm mình nhớ ngay tới tuổi thơ? Nó gợi lại ai, ở đâu? | Which food takes you straight back to childhood? Who and where does it bring back? |
| `memories-02` | Ký ức | Nhẹ | Lần đầu gặp người ấy, điều gì mình còn nhớ rõ nhất? | What do you remember most clearly about the first time we met? |
| `memories-03` | Ký ức | Nhẹ | Một bài hát gắn với một quãng đời của mình. Giờ nghe lại thấy thế nào? | A song tied to a time in your life. How does it feel to hear it now? |
| `memories-04` | Ký ức | Nhẹ | Hồi nhỏ, mình hay trốn ở góc nào nhất? Ở đó mình thấy ra sao? | As a kid, where did you like to hide away? How did it feel there? |
| `memories-05` | Ký ức | Vừa | Khoảnh khắc nào của hai đứa mình muốn giữ lại mãi? Lúc đó mình cảm thấy gì? | Which moment of ours would you keep forever? What did you feel then? |
| `memories-06` | Ký ức | Vừa | Hồi nhỏ, mình hay được khen vì điều gì? Giờ nghĩ lại mình thấy sao? | What were you often praised for as a child? How do you feel about it now? |
| `memories-07` | Ký ức | Vừa | Có ai (thầy cô, bạn bè hay họ hàng) đã làm mình nhìn đời khác đi? Chuyện thế nào? | Someone (a teacher, friend or relative) who changed how you see life. What happened? |
| `memories-08` | Ký ức | Vừa | Lúc nào mình thấy tự hào về bản thân nhất? Khi đó có ai bên cạnh không? | When were you proudest of yourself? Was anyone with you? |
| `memories-09` | Ký ức | Sâu | Một quãng khó khăn mình đã đi qua. Điều gì đã giúp mình đứng dậy? | A hard stretch you went through. What helped you get back up? |
| `memories-10` | Ký ức | Sâu | Có chuyện ngày xưa nào mình chưa kể với ai, nhưng muốn người ấy biết? | Is there something from long ago you've told no one, but would like your partner to know? |
| `dreams-01` | Ước mơ | Nhẹ | Nếu có trọn một ngày rảnh, mình muốn sống ngày đó thế nào? | With one whole free day, how would you spend it? |
| `dreams-02` | Ước mơ | Nhẹ | Nơi nào mình muốn hai đứa cùng đến một lần trong đời? Vì sao lại là nơi đó? | Where would you like us to go together once in our lives? Why there? |
| `dreams-03` | Ước mơ | Nhẹ | Hồi nhỏ mình mơ làm nghề gì? Giấc mơ đó còn chút nào trong mình không? | What did you dream of becoming as a kid? Is any of it still in you? |
| `dreams-04` | Ước mơ | Nhẹ | Có điều gì mình luôn muốn học mà chưa có dịp? | Something you've always wanted to learn but never had the chance? |
| `dreams-05` | Ước mơ | Vừa | Năm năm nữa, một ngày bình thường của hai đứa trông thế nào trong mắt mình? | Five years from now, what does an ordinary day of ours look like to you? |
| `dreams-06` | Ước mơ | Vừa | Ngôi nhà mơ ước của mình có những gì? Góc nào là góc của riêng mình? | What is in your dream home? Which corner is yours? |
| `dreams-07` | Ước mơ | Vừa | Một ước mơ mình từng gác lại. Giờ nghĩ đến nó, mình thấy thế nào? | A dream you once set aside. How do you feel when you think of it now? |
| `dreams-08` | Ước mơ | Vừa | Điều gì làm mình thấy cuộc sống này đáng sống nhất? | What makes life feel most worth living to you? |
| `dreams-09` | Ước mơ | Sâu | Có ước mơ nào mình ngại nói ra vì sợ bị cho là viển vông? | Is there a dream you're shy to say out loud, afraid it sounds far-fetched? |
| `dreams-10` | Ước mơ | Sâu | Khi về già, mình mong nhìn lại và thấy hai đứa đã cùng làm được điều gì? | When we're old, what do you hope to look back on and see we did together? |
| `money-01` | Tiền bạc | Nhẹ | Hồi nhỏ, nhà mình nói chuyện tiền bạc với nhau như thế nào? | Growing up, how did your family talk about money? |
| `money-02` | Tiền bạc | Nhẹ | Món đồ nhỏ nào mình mua mà tới giờ vẫn thấy vui? | Which small thing you bought still makes you happy? |
| `money-03` | Tiền bạc | Nhẹ | Đồng tiền đầu tiên mình tự kiếm được là từ đâu? Mình đã làm gì với nó? | Where did the first money you earned come from? What did you do with it? |
| `money-04` | Tiền bạc | Vừa | Tiêu vào điều gì khiến mình thấy đáng nhất? Điều gì thì thấy tiếc? | What spending feels most worth it to you? What feels like a waste? |
| `money-05` | Tiền bạc | Vừa | Với mình, điều gì về tiền bạc giúp mình thấy an tâm? | What about money helps you feel secure? |
| `money-06` | Tiền bạc | Vừa | Khi nói chuyện tiền với người ấy, mình thấy thoải mái hay ngại? Vì sao? | When we talk about money, do you feel at ease or awkward? Why? |
| `money-07` | Tiền bạc | Vừa | Tiền chung, tiền riêng: cách nào khiến mình thấy dễ chịu nhất? | Shared money, own money: what arrangement feels most comfortable to you? |
| `money-08` | Tiền bạc | Vừa | Mình muốn hai đứa cùng để dành cho điều gì nhất? | What would you most like us to save for together? |
| `money-09` | Tiền bạc | Sâu | Có nỗi lo nào về tiền mình hay giữ trong lòng, ít khi nói ra? | Is there a money worry you keep to yourself and rarely say? |
| `money-10` | Tiền bạc | Sâu | Phụ giúp tiền cho gia đình hai bên: thế nào thì mình thấy yên lòng? | Helping our families with money: what would let you feel at peace? |
| `disagree-01` | Khi bất đồng | Nhẹ | Khi bực mình, mình cần gì trước: nói ra ngay, hay yên một lúc? | When you're upset, what do you need first: to talk right away, or some quiet? |
| `disagree-02` | Khi bất đồng | Nhẹ | Một câu nói hay cử chỉ nhỏ nào giúp mình dịu lại nhanh nhất? | Which small word or gesture calms you down fastest? |
| `disagree-03` | Khi bất đồng | Nhẹ | Mình thích làm lành theo kiểu nào: một cái ôm, một bữa ăn, hay một lời nói? | How do you like to make up: a hug, a meal, or a few words? |
| `disagree-04` | Khi bất đồng | Vừa | Hồi nhỏ, người lớn trong nhà mình giận nhau rồi làm lành ra sao? | Growing up, how did the adults at home fall out and make up? |
| `disagree-05` | Khi bất đồng | Vừa | Khi hai đứa nghĩ khác nhau, điều gì khiến mình thấy được lắng nghe? | When we see things differently, what makes you feel heard? |
| `disagree-06` | Khi bất đồng | Vừa | Có chuyện nào mình thấy khó mở lời với người ấy? Điều gì sẽ giúp dễ hơn? | Is there something you find hard to bring up with your partner? What would make it easier? |
| `disagree-07` | Khi bất đồng | Vừa | Sau một lần to tiếng, trong lòng mình thường thấy thế nào? | After raised voices, how do you usually feel inside? |
| `disagree-08` | Khi bất đồng | Vừa | Một điều hai đứa nghĩ khác nhau mà mình thấy cứ khác vậy cũng ổn. | One thing we see differently that you think is fine to keep different. |
| `disagree-09` | Khi bất đồng | Sâu | Khi bất đồng, điều mình sợ xảy ra nhất là gì? | In a disagreement, what are you most afraid might happen? |
| `disagree-10` | Khi bất đồng | Sâu | Có chuyện nào hai đứa hay quay lại? Với mình, điều quan trọng nằm bên dưới chuyện đó là gì? | Is there a topic we keep coming back to? For you, what matters underneath it? |
| `families-01` | Gia đình hai bên | Nhẹ | Món nào ở nhà (mẹ hay ai đó nấu) mà mình nhớ nhất? | Which dish from home (your mum's or whoever cooked) do you miss most? |
| `families-02` | Gia đình hai bên | Nhẹ | Tết ở nhà mình có thói quen nào mà mình thích nhất? | Which Tết habit in your family do you love most? |
| `families-03` | Gia đình hai bên | Nhẹ | Trong nhà, mình giống ai nhất? Giống ở điểm nào? | Who in your family are you most like? In what way? |
| `families-04` | Gia đình hai bên | Nhẹ | Một kỷ niệm vui với ông bà mà mình hay nghĩ tới? | A happy memory with your grandparents that you often think of? |
| `families-05` | Gia đình hai bên | Vừa | Lần đầu gặp gia đình người ấy, mình đã cảm thấy thế nào? | How did you feel the first time you met your partner's family? |
| `families-06` | Gia đình hai bên | Vừa | Mình mong hai bên gia đình gần nhau hơn ở điểm nào? | In what way would you like our two families to be closer? |
| `families-07` | Gia đình hai bên | Vừa | Điều gì của gia đình mình mà mình muốn giữ cho tổ ấm của hai đứa? | What from your family would you like to keep in our own home? |
| `families-08` | Gia đình hai bên | Vừa | Điều gì của gia đình mình mà mình muốn hai đứa làm khác đi? | What from your family would you like us to do differently? |
| `families-09` | Gia đình hai bên | Sâu | Khi đứng giữa gia đình mình và người ấy, mình thấy khó nhất ở đâu? | When you feel caught between your family and your partner, what is hardest? |
| `families-10` | Gia đình hai bên | Sâu | Sau này khi bố mẹ hai bên cần chăm sóc, mình mong hai đứa sẽ cùng làm thế nào? | Later, when our parents need care, how do you hope we'll handle it together? |
| `everyday-01` | Mỗi ngày của mình | Nhẹ | Dạo này điều gì làm mình vui nhất trong ngày? | Lately, what's the best part of your day? |
| `everyday-02` | Mỗi ngày của mình | Nhẹ | Một việc nhỏ người ấy làm khiến mình thấy được thương. Đó là việc gì? | A small thing your partner does that makes you feel loved. What is it? |
| `everyday-03` | Mỗi ngày của mình | Nhẹ | Buổi tối lý tưởng của hai đứa sau một ngày dài trông thế nào? | What does our ideal evening after a long day look like? |
| `everyday-04` | Mỗi ngày của mình | Nhẹ | Dạo này mình đang mê gì: một bài hát, một món ăn hay một bộ phim? | What are you into lately: a song, a dish or a show? |
| `everyday-05` | Mỗi ngày của mình | Vừa | Dạo này điều gì làm mình mệt hoặc lo nhất? | Lately, what's tiring or worrying you most? |
| `everyday-06` | Mỗi ngày của mình | Vừa | Khi mình mệt, người ấy làm gì thì mình thấy đỡ hơn? | When you're worn out, what can your partner do that helps? |
| `everyday-07` | Mỗi ngày của mình | Vừa | Mình thấy gần người ấy nhất vào những lúc nào? | When do you feel closest to your partner? |
| `everyday-08` | Mỗi ngày của mình | Vừa | Có điều gì mình muốn hai đứa làm cùng nhau thường hơn? | Is there something you'd like us to do together more often? |
| `everyday-09` | Mỗi ngày của mình | Sâu | Điều gì ở người ấy mình biết ơn mà ít khi nói thành lời? | What about your partner are you grateful for but rarely say? |
| `everyday-10` | Mỗi ngày của mình | Sâu | Gần đây có lúc nào mình thấy chơi vơi không? Lúc đó mình cần điều gì? | Lately, have you felt a little lost? What did you need then? |

### Thẻ cần chốt (để sang Đang yêu)

| ID | Deck | Depth | Câu hỏi | English |
|---|---|---|---|---|
| `L1-01` | Ước mơ | Sâu | Nếu gọi nhau là người yêu, mỗi đứa mong điều gì ở mối quan hệ này? | If we call ourselves partners, what would each of us hope for in this relationship? |
| `L1-03` | Khi bất đồng | Sâu | Khi một đứa chưa sẵn sàng tiến xa hơn hoặc muốn dừng lại, mình mong hai đứa nói và đón nhận điều đó thế nào? | If one of us is not ready to go further or wants to stop, how would I like us to say and receive that? |
| `L1-02` | Mỗi ngày của mình | Sâu | Mình muốn hai đứa nói rõ thế nào về việc tìm hiểu người khác, thời gian riêng và nhịp liên lạc? | How would I like us to talk about seeing other people, time alone and how often we stay in touch? |

## Đang yêu (`in_love`)

### Thẻ thường

| ID | Deck | Depth | Câu hỏi | English |
|---|---|---|---|---|
| `L2-26` | Ước mơ | Nhẹ | Căn nhà đầu tiên của hai đứa cần có gì để mình thấy đó là nhà, không chỉ là chỗ ở? | What does our first place need for it to feel like home to me, not just somewhere to live? |
| `L2-18` | Ước mơ | Vừa | Nếu công việc, nơi ở hoặc mong muốn có con của một đứa thay đổi, mình muốn hai đứa dành lúc nào và cách nào để nói lại kế hoạch? | If our work, location or wishes about children change, when and how would I like us to revisit our plans? |
| `L2-31` | Ước mơ | Vừa | Sau vài tháng sống chung, mình muốn hai đứa ngồi lại xem điều gì hợp, điều gì chưa vào lúc nào? | After a few months of living together, when would I like us to sit down and look at what works and what doesn't yet? |
| `L2-02` | Tiền bạc | Vừa | Nếu thu nhập hai đứa chênh nhau hoặc một người tạm mất thu nhập, mình mong cách góp tiền chung thay đổi ra sao? | If our incomes differ or one of us temporarily loses income, how would I like our contributions to shared costs to change? |
| `L2-04` | Tiền bạc | Vừa | Khi có chi phí bất ngờ như sửa đồ hoặc phải chuyển nhà gấp, mình muốn hai đứa chuẩn bị và bàn cách chi thế nào? | How would I like us to prepare and talk about paying for unexpected costs, such as a broken appliance or an urgent move? |
| `L2-20` | Tiền bạc | Vừa | Nếu dọn ra riêng, mình muốn hai đứa bàn trước những gì về tiền cọc, đồ chung, chi phí còn lại và thời gian tìm chỗ ở? | If we move apart, what would I like us to discuss in advance about the deposit, shared belongings, remaining costs and time to find somewhere to live? |
| `L2-27` | Tiền bạc | Vừa | Đồ đạc mua chung (giường, tủ lạnh, máy giặt) mình muốn đứng tên hay góp thế nào, để sau này khỏi khó xử? | For things we buy together (a bed, a fridge, a washing machine), how would I like to share the cost and ownership so it is not awkward later? |
| `L2-28` | Tiền bạc | Vừa | Tiền chợ và đồ dùng chung, mình muốn có quỹ chung, chia đôi từng lần hay mỗi người lo một phần? | For groceries and household supplies, would I like a shared fund, splitting each time, or each of us covering certain things? |
| `L2-10` | Khi bất đồng | Vừa | Điều gì trong lúc bất đồng khiến mình thấy bị tổn thương, và mình muốn hai đứa giữ giới hạn nào khi nói chuyện? | What hurts me during a disagreement, and what boundaries would I like us to keep when talking? |
| `L2-32` | Khi bất đồng | Sâu | Điều mình lo nhất khi ở chung là gì: mất không gian riêng, thấy mặt xấu của nhau, hay chuyện khác? | What worries me most about living together: losing my own space, seeing each other's worst sides, or something else? |
| `L2-12` | Gia đình hai bên | Vừa | Chuyện riêng của hai đứa, chuyện nhà cửa hay tiền bạc: phần nào mình muốn hỏi ý nhau trước khi kể với gia đình? | Which private matters about us, our home or money would I like us to check with each other before telling family? |
| `L2-29` | Gia đình hai bên | Vừa | Bạn bè hay người thân đến chơi, mình thấy bao lâu một lần là vừa, và ở lại qua đêm thì cần báo trước bao lâu? | How often do visits from friends or family feel right to me, and how much notice do I want before someone stays overnight? |
| `L2-23` | Mỗi ngày của mình | Nhẹ | Nếp sinh hoạt nào của mình người ấy nên biết trước: giờ ngủ, giờ dậy, tắm đêm, bật quạt hay điều hoà? | Which of my daily habits should my partner know before we move in: bedtime, wake time, late showers, fan or air conditioning? |
| `L2-24` | Mỗi ngày của mình | Nhẹ | Với mình, “nhà gọn” là thế nào? Thứ gì để bừa thì mình chịu được, thứ gì thì không? | What does a tidy home mean to me? What mess can I live with, and what can't I? |
| `L2-06` | Mỗi ngày của mình | Vừa | Khi một đứa quá bận hoặc mệt, mình muốn nhờ đổi việc nhà ra sao, và lúc nào nên cùng xem lại cách chia? | When one of us is too busy or tired, how would I like to ask to swap chores, and when should we review the arrangement? |
| `L2-08` | Mỗi ngày của mình | Vừa | Với điện thoại, đồ cá nhân và thời gian gặp bạn bè riêng, mình muốn hai đứa hỏi ý nhau ở những việc nào? | For phones, personal belongings and time with our own friends, when would I like us to ask each other first? |
| `L2-14` | Mỗi ngày của mình | Vừa | Có cách gần gũi nào mình thấy thoải mái, và có giới hạn nào mình muốn người ấy luôn hỏi trước, kể cả khi trước đây mình từng đồng ý? | What kinds of closeness feel comfortable to me, and what boundaries would I like my partner to always ask about, even if I agreed before? |
| `L2-15` | Mỗi ngày của mình | Vừa | Khi một người muốn gần gũi tình dục còn người kia không muốn, mình mong hai đứa nói ra và chăm sóc nhau theo cách nào mà không gây áp lực? | When one person wants sexual intimacy and the other does not, how would I like us to talk and care for each other without pressure? |
| `L2-16` | Mỗi ngày của mình | Vừa | Nếu tránh thai là điều liên quan đến hai đứa, mình muốn bắt đầu cuộc trao đổi về lựa chọn, trách nhiệm và điều cần tìm hiểu cùng người có chuyên môn như thế nào? | If contraception is relevant to us, how would I like to start a conversation about choices, responsibilities and questions to discuss with a qualified professional? |
| `L2-25` | Mỗi ngày của mình | Vừa | Mình hình dung bữa ăn ở nhà ra sao: ai nấu, ăn chung mấy bữa, có hay ăn ngoài không? | How do I picture meals at home: who cooks, how many meals we share, how often we eat out? |
| `L2-30` | Mỗi ngày của mình | Vừa | Nuôi thú cưng, hút thuốc, uống rượu ở nhà: điều gì mình cần thống nhất trước khi dọn về? | Pets, smoking, drinking at home: what do I need us to agree on before we move in? |

### Thẻ cần chốt (để sang Sống chung)

| ID | Deck | Depth | Câu hỏi | English |
|---|---|---|---|---|
| `L2-17` | Ước mơ | Sâu | Mình mong điều gì ở việc sống chung, và có điều gì mình chưa muốn coi là bước tiếp theo đã được quyết định, như kết hôn hay có con? | What do I hope living together will bring, and what would I not want treated as already decided, such as marriage or having children? |
| `L2-21` | Ước mơ | Sâu | Vì sao mình muốn sống chung lúc này? Đó là điều mình chọn, hay vì tiện (hết hợp đồng thuê nhà, đỡ tiền)? | Why do I want us to live together now? Is it something I am choosing, or is it for convenience (a lease ending, saving money)? |
| `L2-01` | Tiền bạc | Sâu | Tiền thuê nhà, tiền cọc và các hoá đơn nên chia thế nào để mỗi đứa vẫn thấy vừa sức? | How could we split rent, the deposit and household bills so each of us can afford our share? |
| `L2-03` | Tiền bạc | Sâu | Nếu có khoản nợ hay trách nhiệm tài chính ảnh hưởng đến tiền nhà, mình muốn chia sẻ phần nào để hai đứa cùng tính, mà chưa cần nêu con số hay chi tiết riêng tư? | If a debt or financial responsibility affects housing costs, what would I like to share so we can plan together without giving exact amounts or private details? |
| `L2-09` | Khi bất đồng | Sâu | Khi tranh luận căng lên, mình muốn báo cần tạm dừng bằng cách nào và hẹn nói tiếp ra sao? | When an argument gets tense, how would I like to ask for a pause and arrange a time to return to it? |
| `L2-19` | Khi bất đồng | Sâu | Nếu một người muốn ngừng sống chung, mình muốn có thể mở lời thế nào để không phải chứng minh ai đúng hay sai? | If one person wants to stop living together, how would I like them to be able to say it without having to prove who is right or wrong? |
| `L2-11` | Gia đình hai bên | Sâu | Trước khi mời bạn bè hoặc người thân đến chơi hay ở lại, mình muốn hai đứa thống nhất những gì? | Before inviting friends or family to visit or stay over, what would I like us to agree on? |
| `L2-22` | Gia đình hai bên | Sâu | Mình muốn hai đứa nói với bố mẹ hai bên chuyện ở chung thế nào, hay chưa nói, và nếu gia đình phản đối thì hai đứa đứng chung ra sao? | How would I like us to tell our parents that we are moving in together, or not tell them yet, and if family objects, how do we stand together? |
| `L2-05` | Mỗi ngày của mình | Sâu | Những việc như nấu ăn, dọn dẹp, mua đồ và nhớ lịch thanh toán nên chia thế nào để không dồn vào một người? | How could we share cooking, cleaning, shopping and remembering bill deadlines so they do not fall on one person? |
| `L2-07` | Mỗi ngày của mình | Sâu | Khi sống chung, mình cần khoảng thời gian hay góc riêng nào để nghỉ ngơi mà vẫn thấy được tôn trọng? | When we live together, what time or space of my own would help me rest and feel respected? |
| `L2-13` | Mỗi ngày của mình | Sâu | Mình muốn hai đứa hỏi ý và đón nhận câu “không” hoặc “dừng lại” thế nào để không ai thấy có lỗi hay mắc nợ? | How would I like us to ask for consent and accept a no or a stop without either person feeling guilty or obliged? |

## Sống chung (`living_together`)

### Thẻ thường

| ID | Deck | Depth | Câu hỏi | English |
|---|---|---|---|---|
| `L3-14` | Ký ức | Nhẹ | Một buổi tối bình thường ở nhà mà mình muốn nhớ mãi? | An ordinary evening at home that I want to remember forever? |
| `L3-15` | Ước mơ | Sâu | Sống chung có giống điều mình hình dung lúc trước không? Khác ở đâu? | Is living together what I imagined before? Where is it different? |
| `L3-16` | Ước mơ | Sâu | Mình đang thấy hai đứa đi về đâu: cứ thế này, tiến tới cưới, hay mình chưa biết? | Where do I see us heading: staying as we are, moving towards marriage, or I don't know yet? |
| `L3-10` | Tiền bạc | Vừa | Cách chia tiền nhà và tiền chợ hiện giờ, mình thấy còn ổn không, hay cần chỉnh lại? | Does the way we split rent and groceries still feel right to me, or does it need adjusting? |
| `L3-11` | Khi bất đồng | Vừa | Từ khi ở chung, hai đứa hay va nhau vì chuyện gì nhất? Mình thấy chuyện đó nói lên điều gì mình cần? | Since we moved in, what do we bump into each other over most? What does it say about what I need? |
| `L3-12` | Gia đình hai bên | Vừa | Tết và giỗ chạp, mình muốn hai đứa về bên nào, chia thời gian ra sao khi chưa cưới? | For Tết and family memorial days, whose family would I like us to visit, and how do we share the time while we are not married? |
| `L3-13` | Gia đình hai bên | Sâu | Khi người thân hỏi “bao giờ cưới”, mình thấy thế nào, và muốn hai đứa trả lời ra sao? | When relatives ask when we are getting married, how do I feel, and how would I like us to answer? |
| `L3-05` | Mỗi ngày của mình | Nhẹ | Từ lúc ở chung, mình phát hiện thêm điều gì dễ thương ở người ấy? | Since we moved in together, what lovely thing have I discovered about my partner? |
| `L3-06` | Mỗi ngày của mình | Nhẹ | Nghi thức nhỏ nào ở nhà mình thích nhất: cà phê sáng, đi chợ cuối tuần hay xem phim tối? | Which small ritual at home do I love most: morning coffee, weekend market runs or a film at night? |
| `L3-07` | Mỗi ngày của mình | Vừa | Ở chung rồi, làm sao để hai đứa vẫn còn những buổi hẹn hò thật sự? | Now that we live together, how can we still have real dates? |
| `L3-08` | Mỗi ngày của mình | Vừa | Dạo này mình có đủ thời gian cho riêng mình không? Nếu thiếu thì thiếu lúc nào? | Lately, do I have enough time to myself? If not, when do I miss it? |
| `L3-09` | Mỗi ngày của mình | Vừa | Cách chia việc nhà hiện giờ, mình thấy công bằng chưa? Có việc nào mình muốn đổi? | Does the way we share chores now feel fair to me? Is there a task I would like to swap? |

### Thẻ cần chốt (để sang Đã cưới)

| ID | Deck | Depth | Câu hỏi | English |
|---|---|---|---|---|
| `L3-01` | Ước mơ | Sâu | Kết hôn có ý nghĩa gì với mình, và có điều gì mình muốn giữ dù hai đứa có cưới hay không? | What does marriage mean to me, and what would I want to keep whether or not we marry? |
| `L3-04` | Ước mơ | Sâu | Về chuyện có con, không có con hoặc chưa biết, mình muốn người ấy hiểu điều gì và muốn nói lại khi nào? | About having children, not having children or being unsure, what would I like my partner to understand, and when would I want to revisit it? |
| `L3-02` | Tiền bạc | Sâu | Với một cam kết lâu dài, mình muốn hai đứa bàn lại thế nào về tiền chung, tiền riêng và trách nhiệm với gia đình? | For a long-term commitment, how would I like us to revisit shared money, personal money and responsibilities to family? |
| `L3-03` | Gia đình hai bên | Sâu | Nếu tổ chức cưới hoặc một dịp cam kết chung, mình muốn giữ giới hạn nào về mong đợi của gia đình, khách mời và chi phí? | If we have a wedding or another commitment celebration, what boundaries would I want around family expectations, guests and costs? |

## Đã cưới (`married`)

### Thẻ cần chốt (để sang Có con)

| ID | Deck | Depth | Câu hỏi | English |
|---|---|---|---|---|
| `L4-01` | Ước mơ | Sâu | Mình có muốn nuôi dạy con không, đang còn phân vân điều gì, và cần điều gì trước khi bàn bước tiếp? | Do I want to raise a child, what am I unsure about, and what would I need before discussing a next step? |
| `L4-03` | Tiền bạc | Sâu | Nếu có con, mình muốn hai đứa chuẩn bị chi phí và trao đổi ra sao nếu một người giảm thời gian làm việc hoặc cần hỗ trợ thêm? | If we have a child, how would I like us to prepare for costs and discuss one person working less or needing more support? |
| `L4-04` | Gia đình hai bên | Sâu | Nếu cần người thân hỗ trợ chăm con, mình muốn nhờ những gì và giữ ranh giới nào về cách nuôi dạy? | If we ask family to help care for a child, what help would I want and what boundaries would I keep around parenting? |
| `L4-02` | Mỗi ngày của mình | Sâu | Nếu chăm sóc một đứa trẻ, mình muốn hai đứa chia việc chăm con, việc nhà, nghỉ ngơi và công việc như thế nào? | If we care for a child, how would I like us to share childcare, housework, rest and paid work? |

## Có con (`with_children`)

### Thẻ thường

| ID | Deck | Depth | Câu hỏi | English |
|---|---|---|---|---|
| `L5-04` | Ký ức | Vừa | Một khoảnh khắc nhỏ với con gần đây mà mình muốn kể lại cho người ấy là gì? | What small recent moment with our child would I like to tell my partner about? |
| `L5-02` | Khi bất đồng | Vừa | Khi khác ý về cách chăm con, mình muốn hai đứa trao đổi thế nào để vẫn tôn trọng nhau? | When we disagree about caring for our child, how would I like us to talk while respecting each other? |
| `L5-01` | Mỗi ngày của mình | Vừa | Dạo này việc chăm con nào làm mình mệt nhất, và mình muốn nhờ người ấy giúp điều gì cụ thể? | Which part of caring for our child is tiring me most lately, and what specific help would I like to ask my partner for? |
| `L5-03` | Mỗi ngày của mình | Vừa | Bên cạnh việc chăm con, mình đang cần khoảng riêng hoặc cách gần gũi nào với người ấy mà không tạo thêm áp lực? | Alongside caring for our child, what time alone or closeness with my partner do I need without adding pressure? |
