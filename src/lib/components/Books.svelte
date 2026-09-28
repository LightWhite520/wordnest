<script lang="ts">
  import {
    BookOpen,
    Check,
    ChevronDown,
    Download,
    Edit3,
    Plus,
    Search,
    Star,
    Trash2,
    Upload,
    Volume2
  } from '@lucide/svelte';
  import type { Snapshot, Word, Book } from '../types';
  import type { Perform } from '../ui';
  import { db, createBook, deleteBook, deleteWord, saveSettings, toggleFavorite } from '../db';
  import { exportWords } from '../download';
  import Modal from './Modal.svelte';
  import WordEditor from './WordEditor.svelte';
  let {
    data,
    perform,
    onImport,
    speak
  }: {
    data: Snapshot;
    perform: Perform;
    onImport: (bookId: string) => void;
    speak: (text: string) => void;
  } = $props();
  let selected = $state('');
  let search = $state('');
  let status = $state('all');
  let tag = $state('all');
  let page = $state(1);
  let edit = $state<Word | undefined>();
  let editing = $state(false);
  let creating = $state(false);
  let renaming = $state<Book | undefined>();
  let name = $state('');
  let removing = $state<{ type: 'book' | 'word'; id: string; name: string } | undefined>();
  let expanded = $state('');
  let busy = $state(false);
  const book = $derived(
    data.books.find((b) => b.id === (selected || data.settings.activeBookId)) ?? data.books[0]
  );
  const words = $derived(data.words.filter((w) => w.bookId === book?.id));
  const tags = $derived([...new Set(words.map((w) => w.tags).filter(Boolean))]);
  const filtered = $derived(
    words
      .filter(
        (w) =>
          (!search ||
            [w.word, w.meaning, w.tags].some((s) =>
              s.toLowerCase().includes(search.toLowerCase())
            )) &&
          (tag === 'all' || w.tags === tag) &&
          (status === 'all' ||
            (status === 'favorite' && w.favorite) ||
            (status === 'wrong' && w.wrong) ||
            (status === 'new' && w.card.reps === 0) ||
            (status === 'learned' && w.card.reps > 0))
      )
      .sort((a, b) => a.createdAt - b.createdAt)
  );
  $effect(() => {
    search;
    status;
    tag;
    book?.id;
    page = 1;
  });
  const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / 15)));
  const visible = $derived(
    filtered.slice((Math.min(page, pageCount) - 1) * 15, Math.min(page, pageCount) * 15)
  );
  async function saveBook() {
    busy = true;
    const ok = await perform(
      async () => {
        if (renaming) {
          if (!name.trim()) throw new Error('请填写词书名称。');
          await db.books.update(renaming.id, { name: name.trim() });
        } else selected = await createBook(name);
      },
      renaming ? '词书已重命名' : '新词书已创建'
    );
    if (ok) {
      creating = false;
      renaming = undefined;
    }
    busy = false;
  }
  async function remove() {
    if (!removing) return;
    busy = true;
    const item = removing;
    if (
      await perform(
        () => (item.type === 'book' ? deleteBook(item.id) : deleteWord(item.id)),
        '已删除，历史学习统计仍保留'
      )
    )
      removing = undefined;
    busy = false;
  }
</script>

<div class="page-heading">
  <div>
    <div class="eyebrow">YOUR LITTLE LIBRARY</div>
    <h1>我的词书<span class="heading-dot">。</span></h1>
    <p>把遇见的单词，变成自己的语言。</p>
  </div>
  <button
    class="btn primary"
    onclick={() => {
      name = '';
      creating = true;
      renaming = undefined;
    }}><Plus size={17} />新建词书</button
  >
</div>
<div class="library-grid">
  {#each data.books as b}<button
      class="library-card"
      class:selected={book?.id === b.id}
      onclick={() => {
        selected = b.id;
        tag = 'all';
      }}
      ><span
        class="library-icon"
        class:orange={b.color === 'orange'}
        class:blue={b.color === 'blue'}><BookOpen size={26} strokeWidth={1.4} /></span
      >
      <div>
        <h3>{b.name}</h3>
        <p>
          {data.words.filter((w) => w.bookId === b.id).length} 个词条
          <span>· {b.id === data.settings.activeBookId ? '正在学习' : '个人词书'}</span>
        </p>
      </div>
      {#if book?.id === b.id}<Check class="check-mark" size={17} />{/if}</button
    >{/each}<button
    class="library-card add-book"
    onclick={() => {
      name = '';
      creating = true;
      renaming = undefined;
    }}><Plus size={24} /><span>创建新的词汇收藏</span></button
  >
</div>
{#if book}<section class="panel word-library">
    <div class="section-heading library-heading">
      <div>
        <h2>{book.name}</h2>
        <p class="subtext">{book.description}</p>
      </div>
      <div class="actions wrap">
        {#if book.id !== data.settings.activeBookId}<button
            class="btn small secondary"
            onclick={() =>
              perform(() => saveSettings({ activeBookId: book.id }), '已设为当前学习词书')}
            >设为学习词书</button
          >{/if}<button
          class="icon-btn"
          title="重命名词书"
          aria-label="重命名词书"
          onclick={() => {
            renaming = book;
            name = book.name;
            creating = true;
          }}><Edit3 size={17} /></button
        ><button
          class="icon-btn danger"
          title="删除词书"
          aria-label="删除词书"
          onclick={() => (removing = { type: 'book', id: book.id, name: book.name })}
          ><Trash2 size={17} /></button
        >
      </div>
    </div>
    <div class="library-toolbar">
      <div class="search-box">
        <Search size={17} /><input
          aria-label="搜索词条"
          placeholder="搜索单词、释义或标签…"
          bind:value={search}
        />
      </div>
      <div class="actions">
        <button
          class="btn small secondary"
          onclick={() => perform(() => exportWords(words, book!.name), '词表已导出')}
          ><Download size={15} />导出</button
        ><button class="btn small secondary" onclick={() => onImport(book!.id)}
          ><Upload size={15} />导入</button
        ><button
          class="btn small primary"
          onclick={() => {
            edit = undefined;
            editing = true;
          }}><Plus size={15} />添加单词</button
        >
      </div>
    </div>
    <div class="filter-row">
      <div class="filter-tabs">
        {#each [['all', '全部'], ['new', '未学习'], ['learned', '已学习'], ['favorite', '收藏'], ['wrong', '错词']] as [id, label]}<button
            class:active={status === id}
            onclick={() => (status = id)}>{label}</button
          >{/each}
      </div>
      <select aria-label="按标签筛选" bind:value={tag}
        ><option value="all">全部分类</option>{#each tags as t}<option value={t}>{t}</option
          >{/each}</select
      >
    </div>
    <div class="word-table">
      <div class="table-head">
        <span>单词 / 短语</span><span>释义</span><span>学习状态</span><span>操作</span>
      </div>
      {#each visible as w}<div class="word-row">
          <div class="word-cell">
            <button class="word-title" onclick={() => (expanded = expanded === w.id ? '' : w.id)}
              >{w.word}</button
            ><span class="phonetic">{w.phonetic || w.tags}</span>
          </div>
          <div class="meaning-cell"><span class="pos">{w.pos}</span>{w.meaning}</div>
          <span class="pill state-pill" class:learned={w.card.reps > 0}
            >{w.card.reps > 0 ? '学习中' : '未学习'}</span
          >
          <div class="word-actions">
            <button class="icon-btn" aria-label={`朗读 ${w.word}`} onclick={() => speak(w.word)}
              ><Volume2 size={16} /></button
            ><button
              class="icon-btn"
              class:starred={w.favorite}
              aria-label={`${w.favorite ? '取消收藏' : '收藏'} ${w.word}`}
              onclick={() => perform(() => toggleFavorite(w.id))}
              ><Star size={16} fill={w.favorite ? 'currentColor' : 'none'} /></button
            ><button
              class="icon-btn"
              aria-label={`编辑 ${w.word}`}
              onclick={() => {
                edit = w;
                editing = true;
              }}><Edit3 size={15} /></button
            ><button
              class="icon-btn danger"
              aria-label={`删除 ${w.word}`}
              onclick={() => (removing = { type: 'word', id: w.id, name: w.word })}
              ><Trash2 size={15} /></button
            >
          </div>
        </div>
        {#if expanded === w.id}<div class="word-expanded">
            <p>{w.example || '暂无例句，可在编辑中添加。'}</p>
            <p class="muted">{w.translation}</p>
            {#if w.note}<div class="note-box">{w.note}</div>{/if}<span class="pill subtle"
              >{w.tags || '未分类'}</span
            >{#if w.card.reps > 0}<span class="subtext"
                >下次复习：{new Date(w.card.due).toLocaleString('zh-CN')}</span
              >{/if}
          </div>{/if}{:else}<div class="empty">
          <BookOpen size={36} strokeWidth={1} />
          <h3>{words.length ? '还没有匹配的词条' : '一本新词书，等你写下第一词'}</h3>
          <p>
            {words.length ? '试试其他关键词或筛选条件。' : '导入词表，或手动记下你刚刚遇见的词。'}
          </p>
          {#if !words.length}<button class="btn secondary" onclick={() => onImport(book!.id)}
              ><Upload size={16} />导入词表</button
            >{/if}
        </div>{/each}
    </div>
    <div class="pagination">
      <span>共 {filtered.length} 个词条</span>
      <div class="actions">
        <button class="btn small secondary" disabled={page <= 1} onclick={() => page--}
          >上一页</button
        ><span>{Math.min(page, pageCount)} / {pageCount}</span><button
          class="btn small secondary"
          disabled={page >= pageCount}
          onclick={() => page++}>下一页</button
        >
      </div>
    </div>
  </section>{:else}<div class="panel empty">
    <BookOpen size={40} />
    <h3>书架还空着，故事即将开始</h3>
    <p>创建一本词书，把喜欢的单词收藏起来。</p>
  </div>{/if}
{#if creating}<Modal title={renaming ? '重命名词书' : '创建新词书'} close={() => (creating = false)}
    ><form
      class="form-stack"
      onsubmit={(e) => {
        e.preventDefault();
        saveBook();
      }}
    >
      <label
        >词书名称<input
          required
          maxlength={80}
          bind:value={name}
          placeholder="例如：我的考研核心词汇"
        /></label
      >
      <footer class="modal-actions">
        <button type="button" class="btn secondary" onclick={() => (creating = false)}>取消</button
        ><button class="btn primary" disabled={busy}>{renaming ? '保存名称' : '创建词书'}</button>
      </footer>
    </form></Modal
  >{/if}
{#if removing}<Modal
    title={`删除${removing.type === 'book' ? '词书' : '词条'}？`}
    close={() => (removing = undefined)}
    ><p class="confirm-copy">
      将删除「{removing.name}」{removing.type === 'book'
        ? '及其所有词条和复习进度'
        : ''}。历史统计会保留；此操作无法撤销，建议先导出备份。
    </p>
    <footer class="modal-actions">
      <button class="btn secondary" onclick={() => (removing = undefined)}>保留</button><button
        class="btn danger-btn"
        disabled={busy}
        onclick={remove}>确认删除</button
      >
    </footer></Modal
  >{/if}
{#if editing && book}<WordEditor
    word={edit}
    bookId={book.id}
    {perform}
    close={() => (editing = false)}
  />{/if}
