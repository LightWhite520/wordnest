<script lang="ts">
  import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    CalendarDays,
    ChevronRight,
    Flame,
    Leaf,
    Plus,
    RotateCcw,
    Sprout,
    Target,
    Upload,
    Volume2
  } from '@lucide/svelte';
  import type { Snapshot, Tab } from '../types';
  import { bookWords, dailyStats, dueWords, streak, daysBefore, examDays } from '../stats';
  import StillLife from './StillLife.svelte';
  let {
    data,
    navigate,
    start,
    importBook,
    speak,
    now
  }: {
    data: Snapshot;
    navigate: (tab: Tab) => void;
    start: () => void;
    importBook: () => void;
    speak: (text: string) => void;
    now: Date;
  } = $props();
  const words = $derived(bookWords(data));
  const current = $derived(data.books.find((b) => b.id === data.settings.activeBookId));
  const today = $derived(dailyStats(data.logs, data.practices, now));
  const due = $derived(dueWords(words, now).length);
  const fresh = $derived(
    Math.min(
      words.filter((w) => w.card.reps === 0).length,
      Math.max(0, data.settings.dailyGoal - today.fresh)
    )
  );
  const learned = $derived(words.filter((w) => w.card.reps > 0).length);
  const days = $derived(examDays(data.settings.examDate, now));
  const week = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const d = daysBefore(6 - i, now);
      return { date: d, count: dailyStats(data.logs, data.practices, d).unique };
    })
  );
  const max = $derived(Math.max(data.settings.dailyGoal, ...week.map((d) => d.count)));
  const featured = $derived(
    words.length ? words[Math.floor(now.getTime() / 86400000) % words.length] : undefined
  );
  const resume = $derived(data.session && !data.session.finishedAt);
</script>

<div class="page-heading">
  <div>
    <div class="eyebrow">A LITTLE EVERY DAY</div>
    <h1>每一天，离更好的自己近一点<span class="heading-dot">。</span></h1>
    <p>把单词装进口袋，把世界读进心里。</p>
  </div>
  <div class="date-badge">
    <CalendarDays size={16} />{now.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })}
  </div>
</div>
<section class="hero-card">
  <div class="hero-copy">
    <span class="pill hero-pill"><span class="status-dot"></span>你的每日成长时刻</span>
    <h2>积跬步，<br />也能抵达<span>远方。</span></h2>
    <p>不必一口气走很远。<br />今天的每一个单词，都算数。</p>
    <button class="btn primary hero-start" onclick={start}
      >{resume ? '继续上次学习' : '开始今日学习'}<ArrowRight size={18} /></button
    >
    <div class="hero-foot">
      <span><RotateCcw size={13} />先复习，再学习</span><span>按你的节奏，慢慢来</span>
    </div>
  </div>
  <StillLife /><span class="hero-caption">GROW AT YOUR OWN PACE</span>
</section>
<div class="metric-grid">
  <div class="metric">
    <span class="metric-icon green"><Sprout size={21} /></span>
    <div>
      <span class="muted">今日新词</span>
      <div class="metric-number">{fresh}<span>词待学习</span></div>
    </div>
    <span class="metric-tag">目标 {data.settings.dailyGoal}</span>
  </div>
  <div class="metric">
    <span class="metric-icon orange"><RotateCcw size={20} /></span>
    <div>
      <span class="muted">到期复习</span>
      <div class="metric-number">{due}<span>词待巩固</span></div>
    </div>
    <span class="metric-dot orange-dot"></span>
  </div>
  <div class="metric">
    <span class="metric-icon purple"><Flame size={21} /></span>
    <div>
      <span class="muted">连续学习</span>
      <div class="metric-number">{streak(data.logs, data.practices, now)}<span>天</span></div>
    </div>
    <span class="metric-caption">日积月累</span>
  </div>
</div>
<div class="dashboard-grid">
  <section class="panel book-panel">
    <div class="section-heading">
      <h2>正在学习</h2>
      <button class="text-btn" onclick={() => navigate('books')}
        >全部词书 <ChevronRight size={15} /></button
      >
    </div>
    {#if current}<div class="current-book">
        <div
          class="book-cover"
          class:orange-cover={current.color === 'orange'}
          class:blue-cover={current.color === 'blue'}
        >
          <span class="cover-small">WORDNEST COLLECTION</span><BookOpen
            size={28}
            strokeWidth={1}
          /><span class="cover-title">拾词<br />成章</span><span class="cover-bottom"
            >WORDS TO GROW</span
          >
        </div>
        <div class="book-info">
          <span class="pill subtle"
            >{data.settings.exam === '自定义目标'
              ? data.settings.customGoal || '我的学习目标'
              : data.settings.exam}</span
          >
          <h3>{current.name}</h3>
          <p>
            {words.length} 个词条 · {words.filter((w) => w.tags).length
              ? '分类整理，循序渐进'
              : '专属于你的词汇收藏'}
          </p>
          <div class="progress-label">
            <span>已学习 {learned} / {words.length}</span><b
              >{words.length ? Math.round((learned / words.length) * 100) : 0}%</b
            >
          </div>
          <div class="progress-track">
            <span style:width={`${words.length ? (learned / words.length) * 100 : 0}%`}></span>
          </div>
          <button class="text-btn book-link" onclick={() => navigate('books')}
            >查看词书 <ArrowUpRight size={15} /></button
          >
        </div>
      </div>
    {:else}<div class="empty compact">
        <BookOpen />
        <h3>你的第一本词书，从这里开始</h3>
        <button class="btn secondary" onclick={() => navigate('books')}
          ><Plus size={16} />创建词书</button
        >
      </div>{/if}
  </section>
  <section class="panel weekly-panel">
    <div class="section-heading">
      <h2>本周足迹</h2>
      <span class="subtext">每日学习词数</span>
    </div>
    <div class="week-summary">
      <strong>{week.reduce((s, d) => s + d.count, 0)}</strong><span
        >词<span class="muted"> · 小小坚持，也有回响</span></span
      >
    </div>
    <div class="mini-chart">
      {#each week as item, i}<div class="chart-col">
          <span class="chart-number">{item.count || ''}</span>
          <div
            class="chart-bar"
            class:current={i === 6}
            style:height={`${Math.max(4, (item.count / max) * 75)}px`}
          ></div>
          <span class:today-label={i === 6}
            >{i === 6
              ? '今天'
              : ['日', '一', '二', '三', '四', '五', '六'][item.date.getDay()]}</span
          >
        </div>{/each}
    </div>
    <div class="chart-footer">
      <span class="legend-dot"></span>每天一点，记得更久<button
        class="text-btn"
        onclick={() => navigate('stats')}>统计 <ArrowUpRight size={14} /></button
      >
    </div>
  </section>
  <section class="panel daily-word">
    <div class="section-heading">
      <h2><Leaf size={17} /> 词间一刻</h2>
      <span class="eyebrow">A WORD TO KEEP</span>
    </div>
    {#if featured}<div class="word-feature-heading">
        <h3>{featured.word}</h3>
        <button
          class="icon-btn sound"
          aria-label={`朗读 ${featured.word}`}
          onclick={() => speak(featured.word)}><Volume2 size={18} /></button
        >
      </div>
      <p class="phonetic">{featured.phonetic} <span>{featured.pos}</span></p>
      <p class="featured-meaning">{featured.meaning}</p>
      {#if featured.example}<blockquote>
          {featured.example}<span>{featured.translation}</span>
        </blockquote>{/if}{:else}<p class="muted">导入词书后，在这里与一个新词相遇。</p>{/if}
  </section>
  <section class="panel plan-panel">
    <div class="section-heading">
      <h2>给未来的自己</h2>
      <Target size={18} class="muted" />
    </div>
    <div class="exam-label">
      {data.settings.exam === '自定义目标'
        ? data.settings.customGoal || '我的学习目标'
        : data.settings.exam}
    </div>
    {#if days !== null}<div class="countdown">{days}<span>天后，见证成长</span></div>{:else}<h3
        class="plan-title"
      >
        有方向，也有自己的节奏。
      </h3>
      <p class="muted">定下一个小目标，让坚持更有意义。</p>{/if}<button
      class="btn secondary full"
      onclick={() => navigate('settings')}
      >{days === null ? '设置我的考试计划' : '调整学习计划'}<ArrowRight size={16} /></button
    >
    <div class="plan-note"><Leaf size={13} />比昨天多懂一点，就很好。</div>
  </section>
</div>
<button class="import-banner" onclick={importBook}
  ><span class="import-banner-icon"><Upload size={20} /></span><span
    ><strong>让你的词汇，在这里安家</strong><small>导入 Excel、CSV 或文本，开始专属学习旅程</small
    ></span
  ><ArrowRight size={19} /></button
>
