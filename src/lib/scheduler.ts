import { createEmptyCard, fsrs, type Card, type Grade } from 'ts-fsrs';
export const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false });
export const newCard = (now = new Date()) => createEmptyCard(now);
export function nextCard(card: Card, grade: Grade, now = new Date()) {
  return scheduler.next(card, now, grade).card;
}
export function intervalLabel(due: Date, now = new Date()) {
  const minutes = Math.max(1, Math.round((new Date(due).getTime() - now.getTime()) / 60000));
  if (minutes < 60) return `${minutes} 分钟`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} 小时`;
  return `${Math.round(minutes / 1440)} 天`;
}
