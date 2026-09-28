<script lang="ts">
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    Headphones,
    Lightbulb,
    PencilLine,
    RotateCcw,
    Star,
    Target,
    Volume2,
    X
  } from '@lucide/svelte';
  import type { Snapshot, Word, PracticeLog } from '../types';
  import type { Perform } from '../ui';
  import { recordPractice } from '../db';
  import { isAnswerCorrect } from '../stats';
  let {
    data,
    perform,
    speak,
    hasVoice
  }: { data: Snapshot; perform: Perform; speak: (text: string) => void; hasVoice: boolean } =
    $props();
  let mode = $state<'spelling' | 'listening'>('spelling');
  let source = $state('all');
  let queue = $state<Word[]>([]);
  let index = $state(0);
  let answer = $state('');
  let hinted = $state(false);
  let checked = $state(false);
  let busy = $state(false);
  let active = $state(false);
  let runId = $state('');
  let outcomes = $state<{ word: Word; result: PracticeLog['result'] }[]>([]);
  let count = $state(10);
  const available = $derived(
    data.words.filter(
      (w) =>
        w.bookId === data.settings.activeBookId &&
        (source === 'all' ||
          (source === 'favorite' && w.favorite) ||
          (source === 'wrong' && w.wrong))
    )
  );
  const word = $derived(queue[index]);
  const completed = $derived(active && index >= queue.length);
  function begin(retry?: Word[]) {
    const pool = retry ?? [...available].sort(() => Math.random() - 0.5).slice(0, count);
    if (!pool.length) return;
    queue = pool;
    index = 0;
    answer = '';
    hinted = false;
    checked = false;
    outcomes = [];
    runId = crypto.randomUUID();
    active = true;
  }
  async function submit(skip = false) {
    if (!word || checked || busy) return;
    busy = true;
    const result: PracticeLog['result'] = skip
      ? 'skip'
      : hinted
        ? 'hint'
        : isAnswerCorrect(answer, word.word)
          ? 'correct'
          : 'wrong';
    if (await perform(() => recordPractice(word, result, mode, `${runId}:${index}`))) {
      outcomes = [...outcomes, { word, result }];
      checked = true;
    }
    busy = false;
  }
  function next() {
    index++;
    answer = '';
    hinted = false;
    checked = false;
  }
</script>

{#if !active}<div class="page-heading">
    <div>
      <div class="eyebrow">PRACTICE MAKES PROGRESS</div>
      <h1>让记忆，再深一点<span class="heading-dot">。</span></h1>
      <p>换一种方式，与熟悉的单词重新相遇。</p>
    </div>
    <span class="pill subtle"><Target size={14} />专项练习</span>
  </div>
  <div class="practice-modes">
    <button
      class="practice-mode panel"
      class:selected={mode === 'spelling' && source !== 'wrong'}
      onclick={() => {
        mode = 'spelling';
        source = 'all';
      }}
      ><span class="mode-icon green"><PencilLine size={30} /></span><span class="eyebrow"
        >SPELL IT OUT</span
      >
      <h2>看义拼写</h2>
      <p>从中文出发，找回英文表达。<br />让“认得”变成“写得出”。</p>
      <span class="text-btn">练习拼写 <ArrowRight size={16} /></span></button
    ><button
      class="practice-mode panel"
      disabled={!hasVoice}
      class:selected={mode === 'listening' && source !== 'wrong'}
      onclick={() => {
        mode = 'listening';
        source = 'all';
      }}
      ><span class="mode-icon orange"><Headphones size={30} /></span><span class="eyebrow"
        >LISTEN CLOSELY</span
      >
      <h2>听音辨词</h2>
      <p>
        {hasVoice
          ? '用耳朵捕捉声音，用拼写加深记忆。'
          : '当前没有本地英语语音，安装系统英语语音包后可用。'}
      </p>
      <span class="text-btn"
        >{hasVoice ? '开始听写' : '需要本地英语语音'} <ArrowRight size={16} /></span
      ></button
    ><button
      class="practice-mode panel"
      class:selected={source === 'wrong'}
      onclick={() => {
        source = 'wrong';
        mode = 'spelling';
      }}
      ><span class="mode-icon purple"><RotateCcw size={30} /></span><span class="eyebrow"
        >TRY ONCE MORE</span
      >
      <h2>错词回访</h2>
      <p>那些暂时忘记的单词，<br />值得再多见一面。</p>
      <span class="text-btn">巩固薄弱词 <ArrowRight size={16} /></span></button
    >
  </div>
  <section class="panel practice-setup">
    <div>
      <h2>为这次练习做个小准备</h2>
      <p class="muted">
        当前词书：{data.books.find((b) => b.id === data.settings.activeBookId)?.name ??
          '尚未选择词书'}
      </p>
    </div>
    <div class="form-grid">
      <label
        >出题范围<select bind:value={source}
          ><option value="all">当前词书全部词条</option><option value="favorite">我的收藏</option
          ><option value="wrong">需要巩固的错词</option></select
        ></label
      ><label
        >练习词数<select bind:value={count}
          ><option value={5}>轻量一组 · 5 词</option><option value={10}>日常练习 · 10 词</option
          ><option value={20}>专注挑战 · 20 词</option><option value={50}>深入巩固 · 50 词</option
          ></select
        ></label
      >
    </div>
    <div class="setup-footer">
      <span class="subtext">{available.length} 个词可供练习 · 不改变正式复习日程</span><button
        class="btn primary"
        disabled={!available.length || (mode === 'listening' && !hasVoice)}
        onclick={() => begin()}>开始练习<ArrowRight size={17} /></button
      >
    </div>
    {#if !available.length}<p class="info-note">
        这个范围还没有词条。请更换范围，或先到词书中添加单词。
      </p>{/if}
  </section>
{:else if completed}<section class="panel completion">
    <span class="success-circle"><Check size={28} /></span>
    <div class="eyebrow">PRACTICE COMPLETED</div>
    <h1>一次练习，一点进步。</h1>
    <div class="completion-stats">
      <div>
        <strong>{outcomes.filter((o) => o.result === 'correct').length}</strong><span>独立答对</span
        >
      </div>
      <div>
        <strong>{outcomes.filter((o) => o.result === 'hint').length}</strong><span>使用提示</span>
      </div>
      <div>
        <strong>{outcomes.filter((o) => o.result === 'wrong' || o.result === 'skip').length}</strong
        ><span>待巩固</span>
      </div>
    </div>
    <div class="practice-results">
      {#each outcomes as result}<div>
          <span>{result.word.word}</span><span
            class:success-text={result.result === 'correct'}
            class:error-text={result.result !== 'correct'}
            >{{ correct: '正确', wrong: '答错', hint: '使用提示', skip: '跳过' }[
              result.result
            ]}</span
          >
        </div>{/each}
    </div>
    <div class="actions center">
      <button class="btn secondary" onclick={() => (active = false)}>返回练习</button
      >{#if outcomes.some((o) => o.result !== 'correct')}<button
          class="btn primary"
          onclick={() => begin(outcomes.filter((o) => o.result !== 'correct').map((o) => o.word))}
          ><RotateCcw size={16} />再练薄弱词</button
        >{/if}
    </div>
  </section>
{:else if word}<div class="study-top">
    <button class="text-btn" onclick={() => (active = false)}
      ><ArrowLeft size={17} />结束本次练习</button
    ><span>{mode === 'listening' ? '听音辨词' : '看义拼写'} · {index + 1} / {queue.length}</span>
  </div>
  <div class="progress-track study-progress">
    <span style:width={`${(index / queue.length) * 100}%`}></span>
  </div>
  <section class="flashcard practice-card">
    <span class="eyebrow">{mode === 'listening' ? 'LISTEN AND TYPE' : 'THINK IN ENGLISH'}</span
    >{#if mode === 'listening'}<button
        class="listen-circle"
        aria-label="播放听写发音"
        onclick={() => speak(word.word)}><Volume2 size={34} /></button
      >
      <p class="muted">点击播放，可以重复收听</p>{:else}<h2 class="spelling-prompt">
        {word.meaning}
      </h2>
      <span class="pos">{word.pos}</span>{/if}
    <form
      class="answer-form"
      onsubmit={(e) => {
        e.preventDefault();
        if (checked) next();
        else submit();
      }}
    >
      <label class="sr-only" for="spelling-answer">英文答案</label><input
        id="spelling-answer"
        class="spelling-input"
        bind:value={answer}
        disabled={checked}
        autocomplete="off"
        autocapitalize="off"
        spellcheck={false}
        placeholder="写下英文单词或短语…"
      />{#if word.word.includes('...') || word.word.includes('one’s') || word.word.includes('sb.')}<p
          class="subtext"
        >
          短语按词书原形填写，保留 sb.、one’s 与省略号。
        </p>{/if}{#if hinted && !checked}<p class="hint-text">
          <Lightbulb size={15} />开头是「{word.word.slice(0, 2)}」，共 {word.word.length} 个字符。
        </p>{/if}{#if checked}<div
          class="answer-feedback"
          class:correct={outcomes.at(-1)?.result === 'correct'}
        >
          <strong
            >{outcomes.at(-1)?.result === 'correct'
              ? '记住了，真好。'
              : '再看一眼，下次会更熟悉。'}</strong
          >
          <h3>{word.word}</h3>
          <p>{word.meaning}</p>
          <blockquote>{word.example}<span>{word.translation}</span></blockquote>
        </div>
        <button class="btn primary full" disabled={busy}
          >{index === queue.length - 1 ? '查看练习结果' : '下一个词'}<ArrowRight
            size={16}
          /></button
        >{:else}<button class="btn primary full" disabled={busy || !answer.trim()}
          >检查答案<Check size={16} /></button
        >
        <div class="answer-help">
          <button
            type="button"
            class="text-btn"
            disabled={hinted || busy}
            onclick={() => (hinted = true)}><Lightbulb size={15} />给我一点提示</button
          ><button type="button" class="text-btn" disabled={busy} onclick={() => submit(true)}
            >暂时跳过<ArrowRight size={14} /></button
          >
        </div>{/if}
    </form>
  </section>{/if}
