import type { Card, Grade } from 'ts-fsrs';

export type Tab = 'today' | 'books' | 'practice' | 'stats' | 'settings' | 'learn';
export interface Book {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: number;
  sample?: boolean;
}
export interface WordContent {
  word: string;
  meaning: string;
  phonetic: string;
  pos: string;
  example: string;
  translation: string;
  tags: string;
  note: string;
}
export interface Word extends WordContent {
  id: string;
  bookId: string;
  favorite: boolean;
  wrong: boolean;
  card: Card;
  revision: number;
  createdAt: number;
}
export interface StudyLog {
  id: string;
  wordId: string;
  bookId: string;
  word: string;
  at: number;
  grade: Grade;
  isNew: boolean;
}
export interface PracticeLog {
  id: string;
  wordId: string;
  bookId: string;
  at: number;
  result: 'correct' | 'wrong' | 'hint' | 'skip';
  mode: 'spelling' | 'listening';
}
export interface Settings {
  id: 'main';
  activeBookId: string;
  exam: string;
  customGoal: string;
  examDate: string;
  dailyGoal: number;
  direction: 'en-zh' | 'zh-en';
  theme: 'light' | 'dark' | 'system';
  voice: string;
  rate: number;
}
export interface Session {
  key: 'main';
  id: string;
  /** Stable log namespace; the instance id changes after restoring a backup. */
  historyId?: string;
  bookId: string;
  queue: string[];
  position: number;
  version: number;
  startedAt: number;
  finishedAt?: number;
  direction: Settings['direction'];
}
export interface Snapshot {
  books: Book[];
  words: Word[];
  logs: StudyLog[];
  practices: PracticeLog[];
  settings: Settings;
  session?: Session;
}
export interface Backup {
  app: 'wordnest';
  version: 1;
  algorithm: 'ts-fsrs-5';
  exportedAt: string;
  data: Snapshot;
}
export const emptyContent: WordContent = {
  word: '',
  meaning: '',
  phonetic: '',
  pos: '',
  example: '',
  translation: '',
  tags: '',
  note: ''
};
export const defaults: Settings = {
  id: 'main',
  activeBookId: 'course',
  exam: '大学英语四级',
  customGoal: '',
  examDate: '',
  dailyGoal: 20,
  direction: 'en-zh',
  theme: 'light',
  voice: '',
  rate: 0.85
};
