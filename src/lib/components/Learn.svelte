<script lang="ts">
  import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Check,
    Keyboard,
    Leaf,
    RotateCcw,
    Star,
    Volume2,
    Edit3
  } from '@lucide/svelte';
  import type { Snapshot, Tab } from '../types';
  import type { Perform } from '../ui';
  import { db, rateCard, toggleFavorite } from '../db';
  import { nextCard, intervalLabel } from '../scheduler';
  import type { Grade } from 'ts-fsrs';
  import WordEditor from './WordEditor.svelte';
  import Modal from './Modal.svelte';
  let {
    data,
    perform,
    navigate,
    speak,
    start,
    now
  }: {
    data: Snapshot;
    perform: Perform;
    navigate: (tab: Tab) => void;
    speak: (text: string) => void;
    start: () => void;
    now: Date;
  } = $props();
  let flipped = $state(false);
  let busy = $state(false);
  let editing = $state(false);
  let ending = $state(false);
  const session = $derived(data.session);
  const word = $derived(data.words.find((w) => w.id === session?.queue[session.position]));
  const sessionLogs = $derived(
    data.logs.filter((l) => l.id.startsWith(`${session?.historyId ?? session?.id}:`))
  );
  const ratings = [
    { grade: 1, label: '忘记', class: 'again' },
    { grade: 2, label: '困难', class: 'hard' },
    { grade: 3, label: '良好', class: 'good' },
    { grade: 4, label: '轻松', class: 'easy' }
  ] as const;
  $effect(() => {
    session?.id;
    session?.position;
    word?.revision;
    flipped = false;
  });
  async function rate(grade: Grade) {
    if (busy || !word || !session || !flipped) return;
    busy = true;
    await perform(() => rateCard(session!.id, session!.version, word!.revision, grade));
    busy = false;
  }
  function keydown(e: KeyboardEvent) {
    if (
      (e.target as HTMLElement)?.closest('input,textarea,select,dialog') ||
      editing ||
      busy ||
      e.repeat ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    )
      return;
    if (e.code === 'Space') {
      e.preventDefault();
      flipped = true;
    } else if (['1', '2', '3', '4'].includes(e.key) && flipped) {
      e.preventDefault();
      rate(Number(e.key) as Grade);
    } else if (e.key.toLowerCase() === 'p' && word) speak(word.word);
  }
</script>

<svelte:window onkeydown={keydown} />
<div class="study-top">
  <button class="text-btn" onclick={() => navigate('today')}
    ><ArrowLeft size={17} />返回今日学习</button
  ><span><Leaf size={15} />专注当下，每一词都是积累</span
  >{#if session && !session.finishedAt}<button class="text-btn" onclick={() => (ending = true)}
      >结束本轮</button
    >{/if}
</div>
{#if session?.finishedAt}<section class="panel completion">
    <span class="completion-art">{@render SproutIcon()}</span>
    <div class="eyebrow">A LITTLE BETTER THAN YESTERDAY</div>
    <h1>又向前走了一小步。</h1>
    <p>这一轮的认真，已经替你保存。</p>
    <div class="completion-stats">
      <div><strong>{sessionLogs.filter((l) => l.isNew).length}</strong><span>新学单词</span></div>
      <div><strong>{sessionLogs.filter((l) => !l.isNew).length}</strong><span>完成复习</span></div>
      <div>
        <strong>{sessionLogs.filter((l) => l.grade === 1).length}</strong><span>需要巩固</span>
      </div>
    </div>
    <div class="actions center">
      <button class="btn secondary" onclick={() => navigate('today')}>回到首页</button><button
        class="btn primary"
        onclick={() => navigate('practice')}>做一组专项练习<ArrowRight size={17} /></button
      >
    </div>
    <p class="subtext">忘记的词会按照复习日程再次出现，不用着急。</p>
  </section>
{:else if word && session}<div class="study-progress-heading">
    <span>{data.books.find((b) => b.id === session.bookId)?.name}</span><span
      ><strong>{session.position + 1}</strong> / {session.queue.length}</span
    >
  </div>
  <div class="progress-track study-progress">
    <span style:width={`${(session.position / session.queue.length) * 100}%`}></span>
  </div>
  <section class="flashcard" class:flipped>
    <div class="flashcard-top">
      <span class="pill subtle">{word.card.reps === 0 ? '初次相遇' : '温故知新'}</span>
      <div class="actions">
        <button class="icon-btn" aria-label="编辑当前词条" onclick={() => (editing = true)}
          ><Edit3 size={17} /></button
        ><button
          class="icon-btn"
          class:starred={word.favorite}
          aria-label={word.favorite ? '取消收藏' : '收藏当前词条'}
          onclick={() => perform(() => toggleFavorite(word.id))}
          ><Star size={19} fill={word.favorite ? 'currentColor' : 'none'} /></button
        >
      </div>
    </div>
    <div class="flashcard-main">
      <span class="eyebrow"
        >{session.direction === 'en-zh'
          ? 'READ · RECALL · REMEMBER'
          : 'RECALL THE ENGLISH EXPRESSION'}</span
      >
      <h1 class:chinese-prompt={session.direction === 'zh-en'}>
        {session.direction === 'en-zh' ? word.word : word.meaning}
      </h1>
      {#if session.direction === 'en-zh' || flipped}<div class="pronunciation">
          <span>{word.phonetic}</span><button
            class="icon-btn sound"
            aria-label="朗读当前单词"
            onclick={() => speak(word.word)}><Volume2 size={21} /></button
          >
        </div>{/if}{#if !flipped}<p class="recall-prompt">
          {session.direction === 'en-zh'
            ? '在心里想一想，它是什么意思？'
            : '试着回想它的英文表达。'}
        </p>{:else}<div class="card-answer">
          {#if session.direction === 'zh-en'}<h2 class="answer-english">{word.word}</h2>{/if}
          <p class="card-meaning"><span class="pos">{word.pos}</span>{word.meaning}</p>
          {#if word.example}<blockquote>
              {word.example}<span>{word.translation}</span>
            </blockquote>{/if}{#if word.note}<div class="note-box">
              <span>搭配与笔记</span>{word.note}
            </div>{/if}
        </div>{/if}
    </div>
    <div class="flashcard-bottom">
      <span>{word.tags || '我的词汇'}</span><span
        >{session.direction === 'en-zh' ? '英 → 中' : '中 → 英'}</span
      >
    </div>
  </section>
  <div class="study-controls">
    {#if !flipped}<button class="btn primary reveal-btn" onclick={() => (flipped = true)}
        >查看释义 <span class="keycap">Space</span></button
      ><span class="subtext">先尝试回忆，再揭晓答案</span>{:else}<p class="rating-caption">
        这一次，你记得怎样？
      </p>
      <div class="rating-grid">
        {#each ratings as rating}<button
            class={`rating-btn ${rating.class}`}
            disabled={busy}
            onclick={() => rate(rating.grade)}
            ><span>{rating.label}<kbd>{rating.grade}</kbd></span><small
              >{intervalLabel(nextCard(word.card, rating.grade, now).due, now)}后复习</small
            ></button
          >{/each}
      </div>{/if}
  </div>
  <div class="keyboard-hint">
    <Keyboard size={15} />空格翻面 <span>·</span> 1–4 评分 <span>·</span> P 发音 <span>·</span> 进度自动保存
  </div>
{:else}<div class="panel empty">
    <BookOpen size={38} />
    <h2>准备好，和单词见面了吗？</h2>
    <p>先复习到期词，再学习今天的新词。</p>
    <button class="btn primary" onclick={start}>开始学习<ArrowRight size={17} /></button>
  </div>{/if}
{#if editing && word}<WordEditor
    {word}
    bookId={word.bookId}
    {perform}
    close={() => (editing = false)}
  />{/if}
{#snippet SproutIcon()}<svg
    viewBox="0 0 100 100"
    width="90"
    height="90"
    fill="none"
    aria-hidden="true"
    ><circle cx="50" cy="50" r="48" fill="currentColor" opacity=".08" /><path
      d="M50 79V40M49 60C26 61 22 40 25 29c22 0 30 17 24 31ZM51 48c-2-21 14-31 30-29 1 22-14 32-30 29Z"
      stroke="currentColor"
      stroke-width="2"
    /><path d="m29 36 20 24M73 26 51 48" stroke="currentColor" /></svg
  >{/snippet}

{#if ending}<Modal title="结束这一轮学习？" close={() => (ending = false)}
    ><p class="confirm-copy">
      已经完成的评分都会保留。下一次开始时，会根据当前词书和每日目标重新安排剩余单词。
    </p>
    <footer class="modal-actions">
      <button class="btn secondary" onclick={() => (ending = false)}>继续本轮</button><button
        class="btn primary"
        onclick={async () => {
          if (await perform(() => db.sessions.delete('main'))) {
            ending = false;
            navigate('today');
          }
        }}>结束并保存进度</button
      >
    </footer></Modal
  >{/if}
