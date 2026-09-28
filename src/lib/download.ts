export function download(content: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportWords(words: import('./types').Word[], name: string) {
  const { default: Papa } = await import('papaparse');
  const rows = words.map((w) => ({
    英文: w.word,
    释义: w.meaning,
    音标: w.phonetic,
    词性: w.pos,
    例句: w.example,
    译文: w.translation,
    标签: w.tags,
    笔记: w.note
  }));
  download(
    '\uFEFF' + Papa.unparse(rows, { escapeFormulae: true }),
    `${name}.csv`,
    'text/csv;charset=utf-8'
  );
}
