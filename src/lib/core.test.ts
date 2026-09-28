import 'fake-indexeddb/auto';
import { beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import {
  db,
  initialize,
  snapshot,
  saveSettings,
  startSession,
  rateCard,
  recordPractice,
  importWords,
  importNewBook,
  deleteWord,
  deleteBook,
  saveWord
} from './db';
import { emptyContent } from './types';
import { makeBackup, parseBackup, restoreBackup } from './backup';
import { dailyStats, dayKey, isAnswerCorrect, streak } from './stats';
import { newCard, nextCard } from './scheduler';
import { parseText, guessMapping, previewRows, hasHeader } from './importer';
const now = new Date('2026-09-28T12:00:00+08:00');
beforeEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
  await db.open();
  await initialize();
});
afterAll(async () => {
  await db.delete();
});

describe('local learning data', () => {
  it('contains only the 43 supplied course words in four categories', async () => {
    const d = await snapshot();
    expect(d.words).toHaveLength(43);
    expect(new Set(d.words.map((w) => w.tags)).size).toBe(4);
    expect(d.words.some((w) => w.word === 'serendipity')).toBe(false);
    expect(d.logs).toHaveLength(0);
  });
  it('seeds once without restoring deleted books', async () => {
    await deleteBook('course');
    await initialize();
    expect((await snapshot()).books).toHaveLength(0);
  });
  it('resumes the same queue and enforces a global daily new-word goal', async () => {
    await saveSettings({ dailyGoal: 2 });
    const s = await startSession(now);
    expect(s.queue).toHaveLength(2);
    expect((await startSession(now)).id).toBe(s.id);
    for (let i = 0; i < 2; i++) {
      const d = await snapshot();
      const w = d.words.find((w) => w.id === s.queue[i])!;
      await rateCard(s.id, i, w.revision, 4, now);
    }
    await expect(startSession(now)).rejects.toThrow('已完成');
    expect(dailyStats((await snapshot()).logs, [], now).fresh).toBe(2);
  });
  it('places overdue cards before new cards without capping reviews', async () => {
    await saveSettings({ dailyGoal: 1 });
    const words = (await snapshot()).words.slice(0, 3);
    for (const word of words)
      await db.words.update(word.id, {
        card: nextCard(word.card, 4, new Date(now.getTime() - 30 * 86400000))
      });
    const s = await startSession(now);
    expect(s.queue).toHaveLength(4);
    expect(s.queue.slice(0, 3)).toEqual(expect.arrayContaining(words.map((w) => w.id)));
  });
  it('allows exactly one score from concurrent stale tabs', async () => {
    const s = await startSession(now);
    const w = (await db.words.get(s.queue[0]))!;
    const results = await Promise.allSettled([
      rateCard(s.id, 0, w.revision, 3, now),
      rateCard(s.id, 0, w.revision, 1, now)
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const d = await snapshot();
    expect(d.logs).toHaveLength(1);
    expect(d.session?.position).toBe(1);
    expect(d.words.find((x) => x.id === w.id)?.card.reps).toBe(1);
  });
  it('rolls back the log and cursor if the card write fails', async () => {
    const s = await startSession(now);
    const w = (await db.words.get(s.queue[0]))!;
    vi.spyOn(db.words, 'update').mockRejectedValueOnce(new Error('disk full'));
    await expect(rateCard(s.id, 0, w.revision, 3, now)).rejects.toThrow('disk full');
    expect(await db.logs.count()).toBe(0);
    expect((await db.sessions.get('main'))?.position).toBe(0);
  });
  it('rejects a score if content changed in another tab', async () => {
    const s = await startSession(now);
    const w = (await db.words.get(s.queue[0]))!;
    await saveWord(w.bookId, { ...w, meaning: '新释义' }, w.id);
    await expect(rateCard(s.id, 0, w.revision, 3, now)).rejects.toThrow('词条已更新');
    expect(await db.logs.count()).toBe(0);
  });
  it('skips a deleted queue item safely', async () => {
    const s = await startSession(now);
    await deleteWord(s.queue[0]);
    const updated = (await db.sessions.get('main'))!;
    expect(updated.position).toBe(0);
    expect(updated.queue[0]).toBe(s.queue[1]);
    expect(updated.version).toBe(1);
  });
  it('tracks practice separately and clears a mistake only on unaided success', async () => {
    const word = (await snapshot()).words[0];
    await recordPractice(word, 'hint', 'spelling', 'p1');
    expect((await db.words.get(word.id))?.wrong).toBe(true);
    await recordPractice(word, 'correct', 'spelling', 'p2');
    await recordPractice(word, 'wrong', 'spelling', 'p2');
    const w = (await db.words.get(word.id))!;
    expect(w.card).toEqual(word.card);
    expect(w.wrong).toBe(false);
    expect(await db.practices.count()).toBe(2);
    expect(await db.logs.count()).toBe(0);
  });
});
describe('imports and backups', () => {
  it('rolls back a newly created book and active-book preference when import fails', async () => {
    await expect(
      importNewBook(
        'should roll back',
        [{ ...emptyContent, word: 'incomplete', meaning: '' }],
        false
      )
    ).rejects.toThrow();
    const data = await snapshot();
    expect(data.books).toHaveLength(1);
    expect(data.settings.activeBookId).toBe('course');
  });
  it('deduplicates case and whitespace while retaining scheduling on update', async () => {
    const old = (await snapshot()).words.find((w) => w.word === 'pledge')!;
    const card = nextCard(old.card, 4, now);
    await db.words.update(old.id, { card });
    const result = await importWords(
      'course',
      [
        { ...emptyContent, word: ' PLEDGE ', meaning: '更新承诺' },
        { ...emptyContent, word: 'New Term', meaning: '新词' },
        { ...emptyContent, word: 'new   term', meaning: '同批重复' }
      ],
      false
    );
    expect(result).toEqual({ added: 1, updated: 0, skipped: 2 });
    await importWords('course', [{ ...emptyContent, word: 'pledge', meaning: '更新承诺' }], true);
    expect((await db.words.get(old.id))?.card).toEqual(card);
    expect((await db.words.get(old.id))?.meaning).toBe('更新承诺');
  });
  it('does not leave a partial batch when one record is invalid', async () => {
    await expect(
      importWords(
        'course',
        [
          { ...emptyContent, word: 'apple', meaning: '苹果' },
          { ...emptyContent, word: 'broken', meaning: '' }
        ],
        false
      )
    ).rejects.toThrow();
    expect(await db.words.count()).toBe(43);
  });
  it('parses quoted CSV, BOM, Chinese fields, tabs and colon text', async () => {
    const rows = await parseText(
      '\uFEFF英文,释义,例句\nhello,"你好，问候","He said ""hello""."\nmissing,,'
    );
    expect(hasHeader(rows[0])).toBe(true);
    const preview = previewRows(rows, guessMapping(rows[0]), true, []);
    expect(preview[0].content.example).toBe('He said "hello".');
    expect(preview[1].error).toBe('缺少释义');
    expect(await parseText('apple\t苹果\npear\t梨')).toEqual([
      ['apple', '苹果'],
      ['pear', '梨']
    ]);
    expect(await parseText('apple：苹果')).toEqual([['apple', '苹果']]);
  });
  it('rejects malformed quotes', async () => {
    await expect(parseText('word,meaning\nhello,"broken')).rejects.toThrow();
  });
  it('round-trips cards, statistics and settings and rejects stale sessions after restore', async () => {
    const s = await startSession(now);
    const w = (await db.words.get(s.queue[0]))!;
    await rateCard(s.id, 0, w.revision, 3, now);
    const backup = parseBackup(JSON.stringify(await makeBackup()));
    expect(backup.data.words[0].card.due).toBeInstanceOf(Date);
    await saveSettings({ dailyGoal: 100 });
    await restoreBackup(backup);
    const restored = await snapshot();
    expect(restored.settings.dailyGoal).toBe(20);
    expect(restored.logs).toHaveLength(1);
    expect(restored.session?.id).not.toBe(s.id);
    expect(restored.session?.historyId).toBe(s.id);
    expect(
      restored.logs.filter((l) => l.id.startsWith(`${restored.session?.historyId}:`))
    ).toHaveLength(1);
    expect(restored.words).toEqual(backup.data.words);
    await expect(rateCard(s.id, 1, 0, 3, now)).rejects.toThrow('进度已更新');
  });
  it('rejects corrupt, future-version, duplicate and invalid-date backups without writes', async () => {
    const backup = await makeBackup();
    for (const transform of [
      (b: any) => (b.version = 99),
      (b: any) => (b.data.words[0].card.due = 'bad'),
      (b: any) => b.data.words.push(b.data.words[0]),
      (b: any) => (b.data.settings.dailyGoal = 0),
      (b: any) => (b.data.words[0].favorite = 'true')
    ]) {
      const corrupt = JSON.parse(JSON.stringify(backup));
      transform(corrupt);
      expect(() => parseBackup(JSON.stringify(corrupt))).toThrow();
    }
    expect(() => parseBackup('{')).toThrow();
    expect(await db.words.count()).toBe(43);
  });
});
describe('scheduling and statistics', () => {
  it('produces valid distinct schedules for all four grades', () => {
    const card = newCard(now);
    const outcomes = ([1, 2, 3, 4] as const).map((g) => nextCard(card, g, now));
    expect(new Set(outcomes.map((c) => +c.due)).size).toBe(4);
    for (const c of outcomes) {
      expect(+c.due).toBeGreaterThan(+now);
      expect(c.reps).toBe(1);
    }
    expect(card.reps).toBe(0);
  });
  it('compares spelling without changing meaningful punctuation', () => {
    expect(isAnswerCorrect("enrich one's life", 'enrich one’s life')).toBe(true);
    expect(isAnswerCorrect('  REAP  THE benefits ', 'reap the benefits')).toBe(true);
    expect(isAnswerCorrect('reap the benefit', 'reap the benefits')).toBe(false);
    expect(isAnswerCorrect('night-owl', 'night owl')).toBe(false);
  });
  it('uses local dates, unique words and separate practice correctness', () => {
    const date = new Date(2026, 8, 28, 0, 5);
    const previous = new Date(2026, 8, 27, 23, 55);
    const logs = [
      { id: '1', wordId: 'x', bookId: 'b', word: 'x', at: +date, grade: 3 as const, isNew: true },
      {
        id: '2',
        wordId: 'x',
        bookId: 'b',
        word: 'x',
        at: +previous,
        grade: 3 as const,
        isNew: false
      }
    ];
    const practices = [
      {
        id: 'p',
        wordId: 'x',
        bookId: 'b',
        at: +date,
        result: 'hint' as const,
        mode: 'spelling' as const
      }
    ];
    expect(dayKey(date)).toBe('2026-09-28');
    expect(dailyStats(logs, practices, date)).toEqual({
      fresh: 1,
      reviews: 0,
      unique: 1,
      count: 2,
      accuracy: 0
    });
    expect(streak(logs, practices, date)).toBe(2);
  });
});
