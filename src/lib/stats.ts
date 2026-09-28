import type { Snapshot, StudyLog, PracticeLog, Word } from './types';
export function dayKey(value: number | Date = new Date()) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function daysBefore(n: number, now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}
export function normalize(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
export function isAnswerCorrect(answer: string, word: string) {
  return normalize(answer) === normalize(word);
}
export function dailyStats(logs: StudyLog[], practices: PracticeLog[], date = new Date()) {
  const key = dayKey(date);
  const today = logs.filter((l) => dayKey(l.at) === key);
  const p = practices.filter((l) => dayKey(l.at) === key);
  return {
    fresh: today.filter((l) => l.isNew).length,
    reviews: today.filter((l) => !l.isNew).length,
    unique: new Set([...today, ...p].map((l) => l.wordId)).size,
    count: today.length + p.length,
    accuracy: p.length
      ? Math.round((p.filter((l) => l.result === 'correct').length / p.length) * 100)
      : null
  };
}
export function streak(logs: StudyLog[], practices: PracticeLog[], now = new Date()) {
  const dates = new Set([...logs, ...practices].map((l) => dayKey(l.at)));
  let count = 0;
  let offset = dates.has(dayKey(now)) ? 0 : 1;
  while (dates.has(dayKey(daysBefore(offset++, now)))) count++;
  return count;
}
export function bookWords(data: Snapshot) {
  return data.words.filter((w) => w.bookId === data.settings.activeBookId);
}
export function dueWords(words: Word[], now = new Date()) {
  return words.filter((w) => w.card.reps > 0 && new Date(w.card.due) <= now);
}
export function examDays(date: string, now = new Date()) {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  return Math.max(
    0,
    Math.round(
      (Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
        86400000
    )
  );
}
