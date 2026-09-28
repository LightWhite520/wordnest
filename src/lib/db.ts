import Dexie, { type Table } from 'dexie';
import type {
  Book,
  Word,
  WordContent,
  Settings,
  Session,
  StudyLog,
  PracticeLog,
  Snapshot
} from './types';
import { defaults, emptyContent } from './types';
import { courseWords } from './course';
import { newCard, nextCard } from './scheduler';
import { dailyStats, normalize } from './stats';
import type { Grade } from 'ts-fsrs';

export class WordNestDB extends Dexie {
  books!: Table<Book, string>;
  words!: Table<Word, string>;
  settings!: Table<Settings, string>;
  sessions!: Table<Session, string>;
  logs!: Table<StudyLog, string>;
  practices!: Table<PracticeLog, string>;
  constructor(name = 'wordnest-v1') {
    super(name);
    this.version(1).stores({
      books: 'id,createdAt',
      words: 'id,bookId,[bookId+word]',
      settings: 'id',
      sessions: 'key',
      logs: 'id,at,bookId,wordId',
      practices: 'id,at,bookId,wordId'
    });
  }
}
export const db = new WordNestDB();
export async function initialize() {
  await db.transaction('rw', [db.settings, db.books, db.words], async () => {
    if (await db.settings.get('main')) return;
    await db.settings.add({ ...defaults });
    await db.books.add({
      id: 'course',
      name: '大学英语 · 重点词汇与短语',
      description: '重点动词、形容词、高频短语与必背翻译',
      color: 'green',
      createdAt: Date.now()
    });
    await db.words.bulkAdd(courseWords());
  });
}
export async function snapshot(): Promise<Snapshot> {
  return db.transaction('r', db.tables, async () => ({
    books: await db.books.orderBy('createdAt').toArray(),
    words: await db.words.toArray(),
    logs: await db.logs.toArray(),
    practices: await db.practices.toArray(),
    settings: (await db.settings.get('main'))!,
    session: await db.sessions.get('main')
  }));
}
export async function saveSettings(patch: Partial<Omit<Settings, 'id'>>) {
  if (
    patch.dailyGoal !== undefined &&
    (!Number.isInteger(patch.dailyGoal) || patch.dailyGoal < 1 || patch.dailyGoal > 500)
  )
    throw new Error('每日新词量请输入 1–500 的整数。');
  await db.transaction('rw', [db.settings, db.books], async () => {
    if (patch.activeBookId && !(await db.books.get(patch.activeBookId)))
      throw new Error('所选词书已被删除，请重新选择。');
    await db.settings.update('main', patch);
  });
}
export async function createBook(name: string, description = '我的专属词汇收藏') {
  if (!name.trim()) throw new Error('请填写词书名称。');
  const id = crypto.randomUUID();
  await db.transaction('rw', [db.books, db.settings], async () => {
    await db.books.add({
      id,
      name: name.trim(),
      description,
      color: ['green', 'orange', 'blue'][Math.floor(Math.random() * 3)],
      createdAt: Date.now()
    });
    await db.settings.update('main', { activeBookId: id });
  });
  return id;
}
export async function deleteBook(id: string) {
  await db.transaction('rw', [db.books, db.words, db.settings, db.sessions], async () => {
    await db.books.delete(id);
    await db.words.where('bookId').equals(id).delete();
    if ((await db.sessions.get('main'))?.bookId === id) await db.sessions.delete('main');
    if ((await db.settings.get('main'))?.activeBookId === id)
      await db.settings.update('main', {
        activeBookId: (await db.books.toCollection().first())?.id ?? ''
      });
  });
}
export async function saveWord(bookId: string, content: WordContent, id?: string) {
  if (!content.word.trim() || !content.meaning.trim()) throw new Error('英文和释义不能为空。');
  await db.transaction('rw', [db.words, db.books], async () => {
    if (!(await db.books.get(bookId))) throw new Error('词书已被删除，请重新选择。');
    const existing = (await db.words.where('bookId').equals(bookId).toArray()).find(
      (w) => normalize(w.word) === normalize(content.word) && w.id !== id
    );
    if (existing) throw new Error('词书中已存在这个单词，请编辑已有词条。');
    const old = id ? await db.words.get(id) : undefined;
    if (id && !old) throw new Error('这个词条已被删除。');
    const cleaned = { ...content, word: content.word.trim(), meaning: content.meaning.trim() };
    if (old) await db.words.put({ ...old, ...cleaned, revision: old.revision + 1 });
    else
      await db.words.add({
        ...emptyContent,
        ...cleaned,
        id: crypto.randomUUID(),
        bookId,
        favorite: false,
        wrong: false,
        card: newCard(),
        revision: 0,
        createdAt: Date.now()
      });
  });
}
export async function deleteWord(id: string) {
  await db.transaction('rw', [db.words, db.sessions], async () => {
    await db.words.delete(id);
    const s = await db.sessions.get('main');
    if (s && s.queue.includes(id)) {
      const before = s.queue.slice(0, s.position).filter((x) => x === id).length;
      s.queue = s.queue.filter((x) => x !== id);
      s.position -= before;
      s.version++;
      if (s.position >= s.queue.length) s.finishedAt = Date.now();
      await db.sessions.put(s);
    }
  });
}
export async function toggleFavorite(id: string) {
  await db.transaction('rw', db.words, async () => {
    const w = await db.words.get(id);
    if (w) await db.words.update(id, { favorite: !w.favorite });
  });
}
export async function importWords(bookId: string, contents: WordContent[], update: boolean) {
  return db.transaction('rw', [db.words, db.books], async () => {
    if (!(await db.books.get(bookId))) throw new Error('目标词书已被删除。');
    const known = new Map(
      (await db.words.where('bookId').equals(bookId).toArray()).map((w) => [normalize(w.word), w])
    );
    let added = 0,
      updated = 0,
      skipped = 0;
    for (const item of contents) {
      const c = { ...emptyContent, ...item, word: item.word.trim(), meaning: item.meaning.trim() };
      if (!c.word || !c.meaning) throw new Error('导入数据不完整，请重新预览。');
      const key = normalize(c.word);
      const old = known.get(key);
      if (old) {
        if (update) {
          const w = { ...old, ...c, revision: old.revision + 1 };
          await db.words.put(w);
          known.set(key, w);
          updated++;
        } else skipped++;
      } else {
        const w: Word = {
          ...c,
          id: crypto.randomUUID(),
          bookId,
          favorite: false,
          wrong: false,
          card: newCard(),
          revision: 0,
          createdAt: Date.now() + added
        };
        await db.words.add(w);
        known.set(key, w);
        added++;
      }
    }
    return { added, updated, skipped };
  });
}
export async function importNewBook(name: string, contents: WordContent[], update: boolean) {
  return db.transaction('rw', [db.books, db.settings, db.words], async () => {
    const id = await createBook(name);
    const result = await importWords(id, contents, update);
    return { id, result };
  });
}
export async function startSession(now = new Date(), restart = false) {
  return db.transaction('rw', [db.words, db.logs, db.settings, db.sessions], async () => {
    const old = await db.sessions.get('main');
    if (old && !old.finishedAt && !restart) return old;
    const settings = (await db.settings.get('main'))!;
    const words = await db.words.where('bookId').equals(settings.activeBookId).toArray();
    const stats = dailyStats(await db.logs.toArray(), [], now);
    const due = words
      .filter((w) => w.card.reps > 0 && new Date(w.card.due) <= now)
      .sort((a, b) => +new Date(a.card.due) - +new Date(b.card.due));
    const fresh = words
      .filter((w) => w.card.reps === 0)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, Math.max(0, settings.dailyGoal - stats.fresh));
    if (!due.length && !fresh.length)
      throw new Error('今天的学习计划已完成。你可以进行专项练习，或稍后回来复习。');
    const session: Session = {
      key: 'main',
      id: crypto.randomUUID(),
      bookId: settings.activeBookId,
      queue: [...due, ...fresh].map((w) => w.id),
      position: 0,
      version: 0,
      startedAt: now.getTime(),
      direction: settings.direction
    };
    await db.sessions.put(session);
    return session;
  });
}
export async function rateCard(
  sessionId: string,
  version: number,
  wordRevision: number,
  grade: Grade,
  now = new Date()
) {
  if (![1, 2, 3, 4].includes(grade)) throw new Error('无效的评分。');
  await db.transaction('rw', [db.sessions, db.words, db.logs], async () => {
    const s = await db.sessions.get('main');
    if (!s || s.id !== sessionId || s.version !== version || s.finishedAt)
      throw new Error('学习进度已更新，请继续当前单词。');
    const word = await db.words.get(s.queue[s.position]);
    if (!word || word.revision !== wordRevision) throw new Error('词条已更新，请重新查看后评分。');
    await db.logs.add({
      id: `${s.historyId ?? s.id}:${s.version}`,
      wordId: word.id,
      bookId: word.bookId,
      word: word.word,
      at: now.getTime(),
      grade,
      isNew: word.card.reps === 0
    });
    await db.words.update(word.id, {
      card: nextCard(word.card, grade, now),
      revision: word.revision + 1,
      wrong: grade === 1 ? true : word.wrong
    });
    s.position++;
    s.version++;
    if (s.position >= s.queue.length) s.finishedAt = now.getTime();
    await db.sessions.put(s);
  });
}
export async function recordPractice(
  word: Word,
  result: PracticeLog['result'],
  mode: PracticeLog['mode'],
  id: string
) {
  await db.transaction('rw', [db.practices, db.words], async () => {
    if (await db.practices.get(id)) return;
    const current = await db.words.get(word.id);
    if (!current) throw new Error('该词条已删除，请重新开始练习。');
    await db.practices.add({
      id,
      wordId: word.id,
      bookId: word.bookId,
      at: Date.now(),
      result,
      mode
    });
    await db.words.update(word.id, { wrong: result !== 'correct' });
  });
}
