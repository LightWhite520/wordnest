<script lang="ts">
  import { untrack } from 'svelte';
  import { ArrowLeft, ArrowRight, Check, Download, FileSpreadsheet, Upload } from '@lucide/svelte';
  import Modal from './Modal.svelte';
  import {
    fields,
    guessMapping,
    hasHeader,
    parseText,
    previewRows,
    type Mapping
  } from '../importer';
  import { importWords } from '../db';
  import { download } from '../download';
  import type { Snapshot } from '../types';
  import type { Perform } from '../ui';
  let {
    data,
    bookId,
    close,
    perform
  }: { data: Snapshot; bookId: string; close: () => void; perform: Perform } = $props();
  let target = $state(untrack(() => bookId));
  let newName = $state('我的导入词书');
  let step = $state(1);
  let text = $state('');
  let filename = $state('');
  let rows = $state<string[][]>([]);
  let header = $state(true);
  let mapping = $state<Mapping>(guessMapping([]));
  let update = $state(false);
  let busy = $state(false);
  let error = $state('');
  let sheets = $state<{ sheet: string; data: string[][] }[]>([]);
  let sheetIndex = $state(0);
  let result = $state<{ added: number; updated: number; skipped: number } | undefined>();
  let fileInput = $state<HTMLInputElement>();
  const preview = $derived(
    previewRows(
      rows,
      mapping,
      header,
      data.words.filter((w) => w.bookId === target).map((w) => w.word)
    )
  );
  const valid = $derived(preview.filter((r) => !r.error));
  const columns = $derived(Math.max(0, ...rows.slice(0, 100).map((r) => r.length)));
  function setRows(value: string[][]) {
    rows = value;
    header = hasHeader(value[0] ?? []);
    mapping = guessMapping(header ? value[0] : []);
    step = 2;
  }
  async function fileChosen(file?: File) {
    if (!file) return;
    busy = true;
    error = '';
    filename = file.name;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('请导入不超过 10 MB 的文件。');
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        const { default: read } = await import('read-excel-file/browser');
        const workbook = await read(file);
        sheets = workbook.map((s) => ({
          sheet: s.sheet,
          data: s.data.map((row) => row.map((c) => String(c ?? '')))
        }));
        sheetIndex = 0;
        setRows(sheets[0]?.data ?? []);
      } else if (/\.(csv|tsv|txt)$/i.test(file.name)) {
        sheets = [];
        setRows(await parseText(await file.text()));
      } else throw new Error('请选择 XLSX、CSV、TSV 或 UTF-8 编码的 TXT 文件。');
      if (rows.length > 20000) throw new Error('一次最多导入 20,000 行，请拆分文件。');
    } catch (e) {
      error = (e as Error).message;
      step = 1;
    } finally {
      busy = false;
    }
  }
  async function useText() {
    busy = true;
    error = '';
    try {
      if (!text.trim()) throw new Error('先粘贴包含英文和释义的内容。');
      sheets = [];
      filename = '粘贴的文本';
      const parsed = await parseText(text);
      if (parsed.length > 20000) throw new Error('一次最多导入 20,000 行。');
      setRows(parsed);
    } catch (e) {
      error = (e as Error).message;
    }
    busy = false;
  }
  async function confirm() {
    busy = true;
    await perform(async () => {
      if (!valid.length) throw new Error('没有可以导入的词条。');
      if (!target) {
        const { importNewBook } = await import('../db');
        const imported = await importNewBook(
          newName,
          valid.map((r) => r.content),
          update
        );
        target = imported.id;
        result = imported.result;
      } else
        result = await importWords(
          target,
          valid.map((r) => r.content),
          update
        );
      step = 4;
    });
    busy = false;
  }
  function template() {
    download(
      '\uFEFF英文,释义,音标,词性,例句,译文,标签,笔记\r\n',
      'WordNest-导入模板.csv',
      'text/csv;charset=utf-8'
    );
  }
</script>

<Modal title="让你的词汇，在这里安家" subtitle="文件只在当前浏览器处理，不会上传。" {close} wide>
  {#if step < 4}<div class="stepper">
      {#each ['选择材料', '整理字段', '确认导入'] as label, i}<span
          class:active={step === i + 1}
          class:done={step > i + 1}><b>{step > i + 1 ? '✓' : i + 1}</b>{label}</span
        >{/each}
    </div>{/if}
  {#if error}<div class="error-note" role="alert">{error}</div>{/if}
  {#if step === 1}<input
      class="sr-only"
      type="file"
      accept=".xlsx,.csv,.tsv,.txt"
      bind:this={fileInput}
      onchange={() => fileChosen(fileInput?.files?.[0])}
    /><button class="upload-zone" disabled={busy} onclick={() => fileInput?.click()}
      ><span class="upload-circle"><Upload size={25} /></span><strong
        >{busy ? '正在读取…' : '选择一份本地词表'}</strong
      ><span>XLSX、CSV、TSV、TXT · 最大 10 MB</span></button
    >
    <div class="import-help">
      <span>至少包含「英文」和「释义」两列</span><button class="text-btn" onclick={template}
        ><Download size={14} />下载模板</button
      >
    </div>
    <div class="or-divider"><span>或者，直接粘贴</span></div>
    <label class="sr-only" for="paste-text">粘贴词表</label><textarea
      id="paste-text"
      class="paste-area"
      bind:value={text}
      rows="5"
      placeholder={'英文\t释义\n每行一个词条，用制表符、逗号或冒号分隔'}></textarea>
    <footer class="modal-actions">
      <button class="btn primary" disabled={busy || !text.trim()} onclick={useText}
        >整理粘贴内容<ArrowRight size={16} /></button
      >
    </footer>
  {:else if step === 2}<div class="import-file">
      <FileSpreadsheet size={20} /><strong>{filename}</strong><span>{rows.length} 行</span>
    </div>
    {#if sheets.length > 1}<label class="field-label"
        >工作表<select
          aria-label="工作表"
          bind:value={sheetIndex}
          onchange={() => setRows(sheets[sheetIndex].data)}
          >{#each sheets as sheet, i}<option value={i}>{sheet.sheet}</option>{/each}</select
        ></label
      >{/if}<label class="checkbox-label"
      ><input type="checkbox" bind:checked={header} />第一行是列标题</label
    >
    <div class="mapping-grid">
      {#each fields as field}<label
          >{field.label}<select bind:value={mapping[field.key]}
            ><option value={-1}>不导入</option
            >{#each Array.from({ length: columns }) as _, i}<option value={i}
                >第 {i + 1} 列 · {(rows[0]?.[i] ?? '空列').slice(0, 25)}</option
              >{/each}</select
          ></label
        >{/each}
    </div>
    <div class="info-note">英文和释义必填；缺少必填内容的行会在预览中标出。</div>
    <footer class="modal-actions split">
      <button class="btn secondary" onclick={() => (step = 1)}><ArrowLeft size={16} />上一步</button
      ><button
        class="btn primary"
        disabled={mapping.word < 0 || mapping.meaning < 0 || mapping.word === mapping.meaning}
        onclick={() => (step = 3)}>预览词条<ArrowRight size={16} /></button
      >
    </footer>
  {:else if step === 3}<div class="form-grid">
      <label
        >导入到<select bind:value={target}
          ><option value="">创建新词书</option>{#each data.books as b}<option value={b.id}
              >{b.name}</option
            >{/each}</select
        ></label
      >{#if !target}<label>新词书名称<input bind:value={newName} required maxlength={80} /></label
        >{:else}<label
          >重复词处理<select bind:value={update}
            ><option value={false}>跳过已有词条</option><option value={true}
              >更新内容，保留学习进度</option
            ></select
          ></label
        >{/if}
    </div>
    <div class="import-counts">
      <span><b>{valid.filter((r) => !r.duplicate).length}</b> 新词</span><span
        ><b>{valid.filter((r) => r.duplicate).length}</b> 重复</span
      ><span class:error-text={preview.some((r) => r.error)}
        ><b>{preview.filter((r) => r.error).length}</b> 错误行（不导入）</span
      >
    </div>
    <div class="import-preview">
      <table>
        <thead><tr><th>行</th><th>英文</th><th>释义</th><th>状态</th></tr></thead><tbody
          >{#each preview.slice(0, 200) as row}<tr
              ><td>{row.line}</td><td>{row.content.word || '—'}</td><td
                >{row.content.meaning || '—'}</td
              ><td class:error-text={!!row.error}
                >{row.error || (row.duplicate ? (update ? '更新' : '跳过') : '新增')}</td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div>
    {#if preview.length > 200}<p class="subtext">
        预览前 200 行，确认时处理全部 {preview.length} 行。
      </p>{/if}
    <footer class="modal-actions split">
      <button class="btn secondary" disabled={busy} onclick={() => (step = 2)}>返回字段映射</button
      ><button
        class="btn primary"
        disabled={busy || !valid.length || (!target && !newName.trim())}
        onclick={confirm}>{busy ? '导入中…' : '确认导入'}<Check size={16} /></button
      >
    </footer>
  {:else if result}<div class="empty success-state">
      <span class="success-circle"><Check size={30} /></span>
      <h2>词汇已安家，开始生长吧。</h2>
      <p>新增 {result.added} 词 · 更新 {result.updated} 词 · 跳过 {result.skipped} 词</p>
      <button class="btn primary" onclick={close}>完成<ArrowRight size={16} /></button>
    </div>{/if}
</Modal>
