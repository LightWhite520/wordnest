import { db, snapshot } from './db';
import type { Backup, Snapshot } from './types';
import { normalize } from './stats';

export async function makeBackup(): Promise<Backup> {
  return {
    app: 'wordnest',
    version: 1,
    algorithm: 'ts-fsrs-5',
    exportedAt: new Date().toISOString(),
    data: await snapshot()
  };
}
export function parseBackup(text: string): Backup {
  const fail = () => {
    throw new Error('备份格式不正确、数据不完整或版本不受支持，现有数据未改变。');
  };
  let b: Backup;
  try {
    b = JSON.parse(text);
  } catch {
    return fail();
  }
  if (!b || b.app !== 'wordnest' || b.version !== 1 || b.algorithm !== 'ts-fsrs-5' || !b.data)
    return fail();
  const d = b.data;
  const string = (x: unknown) => typeof x === 'string';
  const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  const integer = (x: unknown) => num(x) && Number.isInteger(x);
  const date = (x: unknown) =>
    (typeof x === 'string' || x instanceof Date) && Number.isFinite(new Date(x).getTime());
  for (const key of ['books', 'words', 'logs', 'practices'] as const) {
    if (!Array.isArray(d[key])) return fail();
    const ids = new Set<string>();
    for (const item of d[key]) {
      if (!item || !string(item.id) || !item.id || ids.has(item.id)) return fail();
      ids.add(item.id);
    }
  }
  const books = new Set(d.books.map((b) => b.id));
  for (const book of d.books)
    if (
      !string(book.name) ||
      !book.name.trim() ||
      !string(book.description) ||
      !string(book.color) ||
      !num(book.createdAt) ||
      (book.sample !== undefined && typeof book.sample !== 'boolean')
    )
      return fail();
  const words = new Set<string>();
  for (const w of d.words) {
    if (
      !books.has(w.bookId) ||
      !['word', 'meaning', 'phonetic', 'pos', 'example', 'translation', 'tags', 'note'].every((k) =>
        string(w[k as keyof typeof w])
      ) ||
      !w.word.trim() ||
      !w.meaning.trim() ||
      typeof w.favorite !== 'boolean' ||
      typeof w.wrong !== 'boolean' ||
      !integer(w.revision) ||
      !num(w.createdAt)
    )
      return fail();
    const key = w.bookId + '\u0000' + normalize(w.word);
    if (words.has(key)) return fail();
    words.add(key);
    const c = w.card;
    if (
      !c ||
      !date(c.due) ||
      ![
        'stability',
        'difficulty',
        'elapsed_days',
        'scheduled_days',
        'learning_steps',
        'reps',
        'lapses'
      ].every((k) => num(c[k as keyof typeof c])) ||
      ![0, 1, 2, 3].includes(c.state) ||
      !integer(c.reps) ||
      !integer(c.lapses) ||
      !integer(c.learning_steps) ||
      c.difficulty > 10 ||
      (c.last_review !== undefined && !date(c.last_review))
    )
      return fail();
    c.due = new Date(c.due);
    if (c.last_review) c.last_review = new Date(c.last_review);
  }
  for (const l of d.logs)
    if (
      !string(l.wordId) ||
      !string(l.bookId) ||
      !string(l.word) ||
      !num(l.at) ||
      ![1, 2, 3, 4].includes(l.grade) ||
      typeof l.isNew !== 'boolean'
    )
      return fail();
  for (const l of d.practices)
    if (
      !string(l.wordId) ||
      !string(l.bookId) ||
      !num(l.at) ||
      !['correct', 'wrong', 'hint', 'skip'].includes(l.result) ||
      !['spelling', 'listening'].includes(l.mode)
    )
      return fail();
  const s = d.settings;
  if (s && s.customGoal === undefined) s.customGoal = '';
  if (
    !s ||
    s.id !== 'main' ||
    !string(s.activeBookId) ||
    (s.activeBookId !== '' && !books.has(s.activeBookId)) ||
    !string(s.exam) ||
    !string(s.customGoal) ||
    !string(s.examDate) ||
    (s.examDate !== '' &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(s.examDate) || !Number.isFinite(Date.parse(s.examDate)))) ||
    !integer(s.dailyGoal) ||
    s.dailyGoal < 1 ||
    s.dailyGoal > 500 ||
    !['en-zh', 'zh-en'].includes(s.direction) ||
    !['light', 'dark', 'system'].includes(s.theme) ||
    !string(s.voice) ||
    !num(s.rate) ||
    s.rate < 0.5 ||
    s.rate > 1.5
  )
    return fail();
  const session = d.session;
  if (session) {
    if (
      (session.finishedAt === undefined && session.position >= session.queue?.length) ||
      session.key !== 'main' ||
      !string(session.id) ||
      (session.historyId !== undefined && !string(session.historyId)) ||
      !books.has(session.bookId) ||
      !Array.isArray(session.queue) ||
      !session.queue.every((id) =>
        d.words.some((w) => w.id === id && w.bookId === session.bookId)
      ) ||
      new Set(session.queue).size !== session.queue.length ||
      !integer(session.position) ||
      session.position > session.queue.length ||
      !integer(session.version) ||
      !num(session.startedAt) ||
      !['en-zh', 'zh-en'].includes(session.direction) ||
      (session.finishedAt !== undefined && !num(session.finishedAt))
    )
      return fail();
  }
  return b;
}
export async function restoreBackup(backup: Backup) {
  const checked = parseBackup(JSON.stringify(backup));
  const d: Snapshot = checked.data;
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
    await db.books.bulkAdd(d.books);
    await db.words.bulkAdd(d.words);
    await db.logs.bulkAdd(d.logs);
    await db.practices.bulkAdd(d.practices);
    await db.settings.add(d.settings);
    if (d.session)
      await db.sessions.add({
        ...d.session,
        id: crypto.randomUUID(),
        historyId: d.session.historyId ?? d.session.id,
        version: d.session.version + 1
      });
  });
}
