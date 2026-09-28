import type { WordContent } from './types';
import { emptyContent } from './types';
import { normalize } from './stats';
export const fields: { key: keyof WordContent; label: string; aliases: string[] }[] = [
  { key: 'word', label: '英文 *', aliases: ['英文', '单词', 'word', 'english', 'term'] },
  {
    key: 'meaning',
    label: '释义 *',
    aliases: ['释义', '中文', '意思', 'meaning', 'definition', '中文释义']
  },
  { key: 'phonetic', label: '音标', aliases: ['音标', 'phonetic', 'ipa'] },
  { key: 'pos', label: '词性', aliases: ['词性', 'pos'] },
  { key: 'example', label: '例句', aliases: ['例句', 'example', 'sentence'] },
  { key: 'translation', label: '例句译文', aliases: ['译文', '例句译文', 'translation'] },
  { key: 'tags', label: '标签', aliases: ['标签', 'tags', 'tag'] },
  { key: 'note', label: '笔记', aliases: ['笔记', 'note', 'notes'] }
];
export type Mapping = Record<keyof WordContent, number>;
export function guessMapping(row: string[]): Mapping {
  const result = Object.fromEntries(
    fields.map((f) => [f.key, row.findIndex((c) => f.aliases.includes(normalize(c)))])
  ) as Mapping;
  if (result.word === -1) result.word = 0;
  if (result.meaning === -1) result.meaning = 1;
  return result;
}
export function hasHeader(row: string[]) {
  return (
    row.some((c) => fields[0].aliases.includes(normalize(c))) &&
    row.some((c) => fields[1].aliases.includes(normalize(c)))
  );
}
export async function parseText(text: string): Promise<string[][]> {
  const { default: Papa } = await import('papaparse');
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    skipEmptyLines: 'greedy',
    delimitersToGuess: [',', '\t', ';', '|']
  });
  if (result.errors.some((e) => e.code === 'MissingQuotes' || e.code === 'InvalidQuotes'))
    throw new Error('文本中的引号不完整，请修正后重试。');
  const rows = result.data.map((r) => r.map((c) => String(c ?? '').trim()));
  if (rows.every((r) => r.length === 1))
    return rows.map(([line]) => {
      const m = line.match(/^(.+?)(?:\s{2,}|\s+[—–]\s+|\s*[:：]\s*)(.+)$/);
      return m ? [m[1].trim(), m[2].trim()] : [line];
    });
  return rows;
}
export function previewRows(
  rows: string[][],
  mapping: Mapping,
  header: boolean,
  existing: string[]
) {
  const known = new Set(existing.map(normalize));
  return rows.slice(header ? 1 : 0).map((row, index) => {
    const content = { ...emptyContent };
    for (const field of fields) content[field.key] = (row[mapping[field.key]] ?? '').trim();
    const error = !content.word ? '缺少英文' : !content.meaning ? '缺少释义' : '';
    const duplicate = !!content.word && known.has(normalize(content.word));
    if (!error) known.add(normalize(content.word));
    return { line: index + (header ? 2 : 1), content, error, duplicate };
  });
}
