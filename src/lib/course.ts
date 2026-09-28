import type { Word } from './types';
import { newCard } from './scheduler';
// Vocabulary supplied by the user. Definitions and original example sentences complete each entry.
const groups = [
  {
    tag: '重点动词',
    rows: [
      [
        'pledge',
        '/pledʒ/',
        'v.; n.',
        '承诺；誓言',
        'pledge to do sth.',
        'We pledge to protect the environment.',
        '我们承诺保护环境。'
      ],
      [
        'attain',
        '/əˈteɪn/',
        'v.',
        '实现；达到',
        'attain one’s best / goal',
        'She worked hard to attain her goal.',
        '她努力工作以实现目标。'
      ],
      [
        'pursue',
        '/pəˈsjuː/',
        'v.',
        '追求',
        'pursue new passions / a degree',
        'He decided to pursue a degree in history.',
        '他决定攻读历史学学位。'
      ],
      [
        'reap',
        '/riːp/',
        'v.',
        '收获',
        'reap the benefits',
        'You will reap the benefits of regular practice.',
        '你会收获经常练习带来的益处。'
      ],
      [
        'emerge',
        '/ɪˈmɜːdʒ/',
        'v.',
        '出现；成为',
        'emerge as...',
        'She emerged as a confident speaker.',
        '她成长为一名自信的演讲者。'
      ],
      [
        'inherit',
        '/ɪnˈherɪt/',
        'v.',
        '继承',
        'inherit the spirit',
        'We inherit the spirit of those who came before us.',
        '我们继承先辈的精神。'
      ],
      [
        'transmit',
        '/trænzˈmɪt/',
        'v.',
        '传递；传播',
        'transmit knowledge',
        'Teachers transmit knowledge to the next generation.',
        '教师向下一代传授知识。'
      ],
      [
        'pose',
        '/pəʊz/',
        'v.',
        '造成；构成',
        'pose a threat',
        'Pollution can pose a threat to wildlife.',
        '污染可能对野生动物构成威胁。'
      ],
      [
        'acquire',
        '/əˈkwaɪə/',
        'v.',
        '获得；习得',
        'acquire knowledge',
        'We acquire knowledge through reading and practice.',
        '我们通过阅读和实践获取知识。'
      ],
      [
        'enrich',
        '/ɪnˈrɪtʃ/',
        'v.',
        '丰富',
        'enrich one’s life',
        'New friendships can enrich your life.',
        '新的友谊可以丰富你的生活。'
      ]
    ]
  },
  {
    tag: '重点形容词',
    rows: [
      [
        'comprehensive',
        '/ˌkɒmprɪˈhensɪv/',
        'adj.',
        '全面的；综合的',
        '',
        'The guide offers a comprehensive introduction.',
        '这份指南提供了全面的介绍。'
      ],
      [
        'caring',
        '/ˈkeərɪŋ/',
        'adj.',
        '关心他人的；体贴的',
        '',
        'She is a caring teacher.',
        '她是一位体贴学生的老师。'
      ],
      [
        'fascinating',
        '/ˈfæsɪneɪtɪŋ/',
        'adj.',
        '极有吸引力的；迷人的',
        '',
        'The history of this town is fascinating.',
        '这座小镇的历史引人入胜。'
      ],
      [
        'interesting',
        '/ˈɪntrəstɪŋ/',
        'adj.',
        '有趣的；引起兴趣的',
        '',
        'We had an interesting conversation.',
        '我们进行了一次有趣的交谈。'
      ],
      [
        'unique',
        '/juːˈniːk/',
        'adj.',
        '独特的；独一无二的',
        '',
        'Everyone has a unique way of learning.',
        '每个人都有独特的学习方式。'
      ],
      [
        'learned',
        '/ˈlɜːnɪd/',
        'adj.',
        '博学的；有学问的',
        '作为形容词时读作 /ˈlɜːnɪd/，区别于 learn 的过去式。',
        'The learned professor shared her insights.',
        '这位博学的教授分享了她的见解。'
      ],
      [
        'available',
        '/əˈveɪləbəl/',
        'adj.',
        '可获得的；有空的',
        '',
        'The book is available in the library.',
        '图书馆里可以借到这本书。'
      ],
      [
        'abundant',
        '/əˈbʌndənt/',
        'adj.',
        '大量的；丰富的',
        '',
        'The region has abundant natural resources.',
        '这个地区自然资源丰富。'
      ],
      [
        'rewarding',
        '/rɪˈwɔːdɪŋ/',
        'adj.',
        '值得做的；有益的；令人满足的',
        '',
        'Helping others is a rewarding experience.',
        '帮助他人是一段令人满足的经历。'
      ]
    ]
  },
  {
    tag: '高频短语',
    rows: [
      [
        'remind sb. of...',
        '',
        'phr.',
        '使某人想起……',
        '',
        'This photo reminds me of my school days.',
        '这张照片让我想起了学生时代。'
      ],
      [
        'remind sb. that...',
        '',
        'phr.',
        '提醒某人……',
        '',
        'She reminded me that the exam was on Friday.',
        '她提醒我考试在星期五。'
      ],
      [
        'be overwhelmed by...',
        '',
        'phr.',
        '被……压垮；被……深深打动',
        '',
        'I was overwhelmed by their kindness.',
        '他们的善意让我深受感动。'
      ],
      [
        'make the most of...',
        '',
        'phr.',
        '最大限度利用……',
        '',
        'Make the most of your time at university.',
        '充分利用你的大学时光。'
      ],
      [
        'stand a chance of doing...',
        '',
        'phr.',
        '有机会做……',
        '',
        'You stand a chance of winning the prize.',
        '你有机会赢得这个奖项。'
      ],
      [
        'take pleasure in...',
        '',
        'phr.',
        '以……为乐',
        '',
        'She takes pleasure in helping others.',
        '她以帮助他人为乐。'
      ],
      [
        'take delight in...',
        '',
        'phr.',
        '以……为乐',
        '',
        'They take delight in exploring new places.',
        '他们以探索新地方为乐。'
      ],
      [
        'get by on...',
        '',
        'phr.',
        '靠……勉强维持',
        '',
        'It is hard to get by on such a small income.',
        '靠这么少的收入很难维持生计。'
      ],
      [
        'reap the benefits',
        '',
        'phr.',
        '收获益处',
        '',
        'Work patiently and you will reap the benefits.',
        '耐心努力，你会收获益处。'
      ],
      [
        'pair... with...',
        '',
        'phr.',
        '把……与……结合',
        '',
        'Pair new vocabulary with useful examples.',
        '把新词汇与实用例句结合起来。'
      ],
      [
        'early bird',
        '',
        'n.',
        '早起的人',
        '',
        'As an early bird, I enjoy the quiet morning.',
        '作为一个早起的人，我喜欢清静的早晨。'
      ],
      [
        'night owl',
        '',
        'n.',
        '夜猫子；惯于熬夜的人',
        '',
        'My brother is a night owl who reads late.',
        '我哥哥是个爱读书到深夜的夜猫子。'
      ],
      [
        'pass from one generation to the next',
        '',
        'phr.',
        '代代相传',
        '',
        'These stories pass from one generation to the next.',
        '这些故事代代相传。'
      ],
      [
        'shape one’s future',
        '',
        'phr.',
        '铸就未来',
        'one’s 根据语境替换为 my / your / his 等。',
        'The choices you make today shape your future.',
        '今天作出的选择塑造你的未来。'
      ]
    ]
  },
  {
    tag: '必背短语翻译',
    rows: [
      [
        'the triumph of years of hard work',
        '',
        'phr.',
        '多年努力的结果',
        '',
        'Graduation marks the triumph of years of hard work.',
        '毕业标志着多年努力的成果。'
      ],
      [
        'cry tears of joy',
        '',
        'phr.',
        '喜极而泣',
        '',
        'They cried tears of joy at the news.',
        '听到这个消息，他们喜极而泣。'
      ],
      [
        'a time unlike any other',
        '',
        'phr.',
        '无与伦比的时光',
        '',
        'University can be a time unlike any other.',
        '大学时光可以是一段无与伦比的时光。'
      ],
      [
        'pursue new passions',
        '',
        'phr.',
        '追求新的爱好',
        '',
        'Take this opportunity to pursue new passions.',
        '抓住这个机会追求新的爱好。'
      ],
      [
        'emerge as a more broadly educated person',
        '',
        'phr.',
        '变得更加博学',
        '',
        'You can emerge as a more broadly educated person.',
        '你可以成长为一个更加博学的人。'
      ],
      [
        'give sb. a giant headache',
        '',
        'phr.',
        '令人头痛欲裂',
        'sb. 根据语境替换为 me / you / him 等。',
        'The loud music gave me a giant headache.',
        '吵闹的音乐让我头痛欲裂。'
      ],
      [
        'the happy experiences outweigh the unpleasant ones',
        '',
        'phr.',
        '快乐的经历多于令人不快的经历',
        '',
        'Looking back, the happy experiences outweigh the unpleasant ones.',
        '回首往事，快乐的经历多于令人不快的经历。'
      ],
      [
        'enrich one’s life',
        '',
        'phr.',
        '使生活丰富多彩',
        'one’s 根据语境替换为 my / your / his 等。',
        'Art and music enrich our lives.',
        '艺术和音乐使我们的生活丰富多彩。'
      ],
      [
        'acquire and transmit knowledge',
        '',
        'phr.',
        '获取、传递知识',
        '',
        'Universities help us acquire and transmit knowledge.',
        '大学帮助我们获取并传递知识。'
      ],
      [
        'build a strong and prosperous future',
        '',
        'phr.',
        '创造强大昌盛的未来',
        '',
        'Together we can build a strong and prosperous future.',
        '我们可以携手创造强大昌盛的未来。'
      ]
    ]
  }
];
export function courseWords(now = new Date()): Word[] {
  return groups.flatMap((g) =>
    g.rows.map((r, i) => ({
      id: `course-${g.tag}-${i}`,
      bookId: 'course',
      word: r[0],
      phonetic: r[1],
      pos: r[2],
      meaning: r[3],
      note: r[4],
      example: r[5],
      translation: r[6],
      tags: g.tag,
      favorite: false,
      wrong: false,
      card: newCard(now),
      revision: 0,
      createdAt: now.getTime() + groups.indexOf(g) * 100 + i
    }))
  );
}
