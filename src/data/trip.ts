export interface TravelPhrase {
  ja: string;
  kana: string;
  romaji: string;
  en: string;
  tip: string;
}
export interface TravelLesson {
  id: string;
  title: string;
  goal: string;
  theme: string;
  phrases: TravelPhrase[];
  reply: Omit<TravelPhrase, 'tip'>;
  replyContext: string;
  distractors: [string, string];
}
const p = (
  ja: string,
  kana: string,
  romaji: string,
  en: string,
  tip: string,
): TravelPhrase => ({ ja, kana, romaji, en, tip });
const r = (ja: string, kana: string, romaji: string, en: string) => ({
  ja,
  kana,
  romaji,
  en,
});

// Original, short dialogues for an absolute beginner. Romanization is a
// pronunciation bridge; the Japanese audio remains the model to imitate.
const core: TravelLesson[] = [
  {
    id: 'politeness',
    title: 'Start politely',
    theme: 'Basics',
    goal: 'Get attention, say thank you, and make a simple request.',
    phrases: [
      p(
        'すみません。',
        'すみません。',
        'Sumimasen.',
        'Excuse me.',
        'Use this to get someone’s attention before asking. It also works as a small apology.',
      ),
      p(
        'ありがとうございます。',
        'ありがとうございます。',
        'Arigatō gozaimasu.',
        'Thank you.',
        'This polite form works with staff and strangers. Hold the ō slightly longer.',
      ),
      p(
        'これをください。',
        'これをください。',
        'Kore o kudasai.',
        'This one, please.',
        'Point to the item or menu photo. Kore means “this”; kudasai makes the request polite.',
      ),
    ],
    replyContext: 'You point to an item and ask for it. The staff member says:',
    reply: r(
      'はい、どうぞ。',
      'はい、どうぞ。',
      'Hai, dōzo.',
      'Yes, here you are.',
    ),
    distractors: ['Sorry, we do not have it.', 'How many would you like?'],
  },
  {
    id: 'repair',
    title: 'When you don’t understand',
    theme: 'Basics',
    goal: 'Keep a conversation going when the reply is too fast.',
    phrases: [
      p(
        'もう一度お願いします。',
        'もういちどおねがいします。',
        'Mō ichido onegaishimasu.',
        'One more time, please.',
        'Mō ichido means “once more.” Use this instead of pretending you understood.',
      ),
      p(
        'ゆっくりお願いします。',
        'ゆっくりおねがいします。',
        'Yukkuri onegaishimasu.',
        'Slowly, please.',
        'A short, polite request. Make a small pause in the double k of yukkuri.',
      ),
      p(
        '英語は話せますか。',
        'えいごははなせますか。',
        'Eigo wa hanasemasu ka?',
        'Do you speak English?',
        'The particle は sounds like wa here. Ka makes a question.',
      ),
    ],
    replyContext: 'You ask whether the person speaks English. They reply:',
    reply: r('少しだけ。', 'すこしだけ。', 'Sukoshi dake.', 'Just a little.'),
    distractors: ['Please write it down.', 'I do not speak English.'],
  },
  {
    id: 'directions',
    title: 'Find your way',
    theme: 'Directions',
    goal: 'Ask for essential places and confirm a direction.',
    phrases: [
      p(
        '駅はどこですか。',
        'えきはどこですか。',
        'Eki wa doko desu ka?',
        'Where is the station?',
        'Swap eki for a place name. Doko means “where.” Start with sumimasen.',
      ),
      p(
        'トイレはどこですか。',
        'トイレはどこですか。',
        'Toire wa doko desu ka?',
        'Where is the toilet?',
        'The same question pattern works in shops, stations, and restaurants.',
      ),
      p(
        '右ですか。',
        'みぎですか。',
        'Migi desu ka?',
        'Is it to the right?',
        'Migi = right; hidari = left; massugu = straight ahead. Point to confirm.',
      ),
    ],
    replyContext: 'You ask where the station is. The person replies:',
    reply: r(
      'まっすぐ行って、左です。',
      'まっすぐいって、ひだりです。',
      'Massugu itte, hidari desu.',
      'Go straight, then left.',
    ),
    distractors: ['Go straight, then right.', 'It is inside this building.'],
  },
  {
    id: 'transport',
    title: 'Take the right train',
    theme: 'Transport',
    goal: 'Check your destination before boarding.',
    phrases: [
      p(
        'この電車は東京駅に行きますか。',
        'このでんしゃはとうきょうえきにいきますか。',
        'Kono densha wa Tōkyō-eki ni ikimasu ka?',
        'Does this train go to Tokyo Station?',
        'Replace Tōkyō-eki with your destination. Show the destination on your phone too.',
      ),
      p(
        '何番ホームですか。',
        'なんばんホームですか。',
        'Nanban hōmu desu ka?',
        'Which platform is it?',
        'Nanban asks “which number.” Hōmu means the station platform.',
      ),
      p(
        'ここで降りますか。',
        'ここでおりますか。',
        'Koko de orimasu ka?',
        'Do I get off here?',
        'Use this to check your stop. Orimasu means “get off.”',
      ),
    ],
    replyContext: 'You ask which platform to use. The staff member replies:',
    reply: r(
      '三番ホームです。',
      'さんばんホームです。',
      'Sanban hōmu desu.',
      'It is platform three.',
    ),
    distractors: ['It is platform one.', 'You need to change trains.'],
  },
  {
    id: 'hotel',
    title: 'Check into your hotel',
    theme: 'Hotel',
    goal: 'Explain your reservation and ask about breakfast.',
    phrases: [
      p(
        'チェックインをお願いします。',
        'チェックインをおねがいします。',
        'Chekku-in o onegaishimasu.',
        'I would like to check in, please.',
        'Onegaishimasu is a useful polite request ending. Show your booking after speaking.',
      ),
      p(
        '予約があります。',
        'よやくがあります。',
        'Yoyaku ga arimasu.',
        'I have a reservation.',
        'Say your name next, or show the name on the booking.',
      ),
      p(
        '朝食は何時からですか。',
        'ちょうしょくはなんじからですか。',
        'Chōshoku wa nanji kara desu ka?',
        'What time does breakfast start?',
        'Nanji = what time; kara = from. Listen for a number followed by ji.',
      ),
    ],
    replyContext: 'You ask when breakfast starts. The receptionist replies:',
    reply: r(
      '七時からです。',
      'しちじからです。',
      'Shichiji kara desu.',
      'It starts at seven.',
    ),
    distractors: ['It starts at nine.', 'Breakfast is not included.'],
  },
  {
    id: 'restaurant',
    title: 'Order a meal',
    theme: 'Food',
    goal: 'Ask for a menu, order from a picture, and request water.',
    phrases: [
      p(
        'メニューをお願いします。',
        'メニューをおねがいします。',
        'Menyū o onegaishimasu.',
        'The menu, please.',
        'Keep the ū in menyū long. A short polite request is enough.',
      ),
      p(
        'これを一つください。',
        'これをひとつください。',
        'Kore o hitotsu kudasai.',
        'One of these, please.',
        'Hitotsu means one item. Point at a picture to make the order clear.',
      ),
      p(
        'お水をお願いします。',
        'おみずをおねがいします。',
        'Omizu o onegaishimasu.',
        'Water, please.',
        'Mizu means water. Omizu is a common polite form in restaurants.',
      ),
    ],
    replyContext: 'You arrive at a restaurant. A staff member asks:',
    reply: r(
      '何名様ですか。',
      'なんめいさまですか。',
      'Nanmei-sama desu ka?',
      'How many people are in your party?',
    ),
    distractors: [
      'What would you like to drink?',
      'Do you have a reservation?',
    ],
  },
  {
    id: 'food-needs',
    title: 'Explain food needs',
    theme: 'Food',
    goal: 'Ask what a dish contains and communicate a restriction.',
    phrases: [
      p(
        'これは豚肉が入っていますか。',
        'これはぶたにくがはいっていますか。',
        'Kore wa butaniku ga haitte imasu ka?',
        'Does this contain pork?',
        'Butaniku = pork. Ask about the specific ingredient; the name of a dish may not tell you.',
      ),
      p(
        '肉は食べられません。',
        'にくはたべられません。',
        'Niku wa taberaremasen.',
        'I cannot eat meat.',
        'This states a restriction, but does not explain every ingredient you avoid.',
      ),
      p(
        '卵アレルギーがあります。',
        'たまごアレルギーがあります。',
        'Tamago arerugī ga arimasu.',
        'I have an egg allergy.',
        'Practise the pattern with your actual allergen. For an allergy, also show a written explanation and confirm ingredients with staff.',
      ),
    ],
    replyContext:
      'You ask whether the dish contains pork. The staff member replies:',
    reply: r(
      'はい、入っています。',
      'はい、はいっています。',
      'Hai, haitte imasu.',
      'Yes, it does contain it.',
    ),
    distractors: [
      'No, it does not contain it.',
      'We can make it without pork.',
    ],
  },
  {
    id: 'shopping',
    title: 'Shop and pay',
    theme: 'Shopping',
    goal: 'Ask a price, check card payment, and respond about a bag.',
    phrases: [
      p(
        'いくらですか。',
        'いくらですか。',
        'Ikura desu ka?',
        'How much is it?',
        'Point to the item. If the number is unclear, ask to see it written or on the display.',
      ),
      p(
        'カードは使えますか。',
        'カードはつかえますか。',
        'Kādo wa tsukaemasu ka?',
        'Can I pay by card?',
        'Tsukaemasu means “can use.” Keep the first vowel in kādo long.',
      ),
      p(
        '袋はいりません。',
        'ふくろはいりません。',
        'Fukuro wa irimasen.',
        'I do not need a bag.',
        'Fukuro means bag. Use this when staff ask whether you want one.',
      ),
    ],
    replyContext: 'At the checkout, the staff member asks:',
    reply: r(
      '袋はご利用ですか。',
      'ふくろはごりようですか。',
      'Fukuro wa goriyō desu ka?',
      'Would you like a bag?',
    ),
    distractors: [
      'Would you like a receipt?',
      'Would you like to pay by card?',
    ],
  },
  {
    id: 'numbers',
    title: 'Numbers you will hear',
    theme: 'Numbers',
    goal: 'Say how many people and recognize a simple price.',
    phrases: [
      p(
        '一人です。',
        'ひとりです。',
        'Hitori desu.',
        'Just one person.',
        'Use this at a restaurant entrance. The word for one person is hitori.',
      ),
      p(
        '二人です。',
        'ふたりです。',
        'Futari desu.',
        'Two people.',
        'Futari is the special word for two people; it is not “ni-nin.”',
      ),
      p(
        '数字で書いてください。',
        'すうじでかいてください。',
        'Sūji de kaite kudasai.',
        'Please write it in numbers.',
        'A useful fallback for prices and times. Sūji means numerals.',
      ),
    ],
    replyContext: 'You ask the price. The staff member replies:',
    reply: r(
      '五百円です。',
      'ごひゃくえんです。',
      'Gohyaku-en desu.',
      'It is 500 yen.',
    ),
    distractors: ['It is 100 yen.', 'It is 1,000 yen.'],
  },
  {
    id: 'cafe',
    title: 'At a café',
    theme: 'Food',
    goal: 'Order a drink and choose where to have it.',
    phrases: [
      p(
        'コーヒーを一つください。',
        'コーヒーをひとつください。',
        'Kōhī o hitotsu kudasai.',
        'One coffee, please.',
        'Both vowels in kōhī are long. You can point at the size on the menu.',
      ),
      p(
        '店内でお願いします。',
        'てんないでおねがいします。',
        'Tennai de onegaishimasu.',
        'For here, please.',
        'Tennai means “inside the shop.” Use it when choosing eat-in or takeaway.',
      ),
      p(
        '持ち帰りでお願いします。',
        'もちかえりでおねがいします。',
        'Mochikaeri de onegaishimasu.',
        'To take away, please.',
        'Mochikaeri means takeaway. The request ending is the same as for eat-in.',
      ),
    ],
    replyContext: 'After you order, the staff member asks:',
    reply: r(
      '店内でお召し上がりですか。',
      'てんないでおめしあがりですか。',
      'Tennai de omeshiagari desu ka?',
      'Will you have it here?',
    ),
    distractors: [
      'Would you like an iced drink?',
      'Would you like another coffee?',
    ],
  },
  {
    id: 'sightseeing',
    title: 'Enjoy a visit',
    theme: 'Sightseeing',
    goal: 'Buy entry and ask permission before taking a photo.',
    phrases: [
      p(
        'チケットを一枚ください。',
        'チケットをいちまいください。',
        'Chiketto o ichimai kudasai.',
        'One ticket, please.',
        'Mai counts flat things, including tickets. One ticket is ichimai.',
      ),
      p(
        '写真を撮ってもいいですか。',
        'しゃしんをとってもいいですか。',
        'Shashin o totte mo ii desu ka?',
        'May I take a photo?',
        'Ask permission if you are unsure. Also follow signs and staff instructions.',
      ),
      p(
        '何時までですか。',
        'なんじまでですか。',
        'Nanji made desu ka?',
        'Until what time?',
        'Use this to ask about closing time. Made means “until.”',
      ),
    ],
    replyContext:
      'You ask whether you may take a photo. A staff member replies:',
    reply: r(
      'すみません、写真はだめです。',
      'すみません、しゃしんはだめです。',
      'Sumimasen, shashin wa dame desu.',
      'Sorry, photos are not allowed.',
    ),
    distractors: ['Yes, photos are allowed.', 'Please take a photo for me.'],
  },
  {
    id: 'help',
    title: 'Ask for help',
    theme: 'Help',
    goal: 'Explain a lost item or that you feel unwell.',
    phrases: [
      p(
        '手伝ってください。',
        'てつだってください。',
        'Tetsudatte kudasai.',
        'Please help me.',
        'Use this to ask someone nearby for assistance.',
      ),
      p(
        '財布をなくしました。',
        'さいふをなくしました。',
        'Saifu o nakushimashita.',
        'I lost my wallet.',
        'Saifu = wallet. Show a picture or describe the item if you can.',
      ),
      p(
        '気分が悪いです。',
        'きぶんがわるいです。',
        'Kibun ga warui desu.',
        'I feel unwell.',
        'A simple way to tell staff you need help. Use your phone to explain further if needed.',
      ),
    ],
    replyContext: 'You say you lost your wallet. The person asks:',
    reply: r(
      'どこでなくしましたか。',
      'どこでなくしましたか。',
      'Doko de nakushimashita ka?',
      'Where did you lose it?',
    ),
    distractors: ['What color is your wallet?', 'When did you find it?'],
  },
];
export const TRIP_LESSONS: TravelLesson[] = [
  ...core,
  {
    ...core[5]!,
    id: 'rehearsal-arrival',
    title: 'Rehearse your first day',
    theme: 'Review',
    goal: 'Practise getting attention, checking transport, and checking in without hints.',
    phrases: [core[0]!.phrases[0]!, core[3]!.phrases[0]!, core[4]!.phrases[0]!],
    replyContext: core[3]!.replyContext,
    reply: core[3]!.reply,
    distractors: core[3]!.distractors,
  },
  {
    ...core[7]!,
    id: 'rehearsal-outing',
    title: 'Your ready-to-go rehearsal',
    theme: 'Review',
    goal: 'Order, pay, and recover when you do not understand. Repeat any shaky lesson next.',
    phrases: [core[5]!.phrases[1]!, core[7]!.phrases[1]!, core[1]!.phrases[0]!],
  },
];

const scenarioByTheme: Record<string, string> = {
  Basics: 'smalltalk',
  Directions: 'directions',
  Transport: 'transport',
  Hotel: 'lodging',
  Food: 'food',
  Shopping: 'shopping',
  Numbers: 'shopping',
  Sightseeing: 'directions',
  Help: 'emergency',
};
export const ESSENTIAL_PHRASES = core.flatMap((lesson) =>
  lesson.phrases.map((phrase, i) => ({
    ...phrase,
    id: `trip:${lesson.id}:${i}`,
    scene: lesson.title,
    category: lesson.theme,
    theme: scenarioByTheme[lesson.theme]!,
  })),
);
