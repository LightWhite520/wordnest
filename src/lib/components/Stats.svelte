<script lang="ts">
  import { BarChart3, BookOpen, Flame, Leaf, Target, TrendingUp } from '@lucide/svelte';
  import type { Snapshot } from '../types';
  import { dailyStats, daysBefore, dayKey, streak } from '../stats';
  let { data, now }: { data: Snapshot; now: Date } = $props();
  let range = $state(7);
  let selectedDay = $state('');
  const days = $derived(
    Array.from({ length: range }, (_, i) => {
      const date = daysBefore(range - 1 - i, now);
      return { date, ...dailyStats(data.logs, data.practices, date) };
    })
  );
  const max = $derived(Math.max(1, ...days.map((d) => d.unique)));
  const selected = $derived(
    days.find((d) => dayKey(d.date) === selectedDay) ?? days[days.length - 1]
  );
  const total = $derived(new Set([...data.logs, ...data.practices].map((l) => l.wordId)).size);
  const accuracy = $derived(
    data.practices.length
      ? Math.round(
          (data.practices.filter((p) => p.result === 'correct').length / data.practices.length) *
            100
        )
      : null
  );
  const heat = $derived(
    Array.from({ length: 91 }, (_, i) => {
      const date = daysBefore(90 - i, now);
      return { date, count: dailyStats(data.logs, data.practices, date).count };
    })
  );
</script>

<div class="page-heading">
  <div>
    <div class="eyebrow">SEE HOW FAR YOU'VE COME</div>
    <h1>每一点努力，都有迹可循<span class="heading-dot">。</span></h1>
    <p>不和别人比，只看看自己走过的路。</p>
  </div>
  <span class="pill subtle"><Leaf size={14} />持续生长中</span>
</div>
<div class="stats-metrics">
  <div class="panel stat-tile">
    <BookOpen size={20} /><span>累计接触词数</span><strong>{total}<small>词</small></strong>
    <p>学习与练习中的去重词数</p>
  </div>
  <div class="panel stat-tile">
    <TrendingUp size={20} /><span>累计复习</span><strong
      >{data.logs.filter((l) => !l.isNew).length}<small>次</small></strong
    >
    <p>不含首次学习与专项练习</p>
  </div>
  <div class="panel stat-tile">
    <Target size={20} /><span>练习正确率</span><strong
      >{accuracy ?? '—'}<small>{accuracy !== null ? '%' : ''}</small></strong
    >
    <p>提示、跳过不计作独立答对</p>
  </div>
  <div class="panel stat-tile">
    <Flame size={20} /><span>连续学习</span><strong
      >{streak(data.logs, data.practices, now)}<small>天</small></strong
    >
    <p>按本地自然日记录坚持</p>
  </div>
</div>
<section class="panel trend-panel">
  <div class="section-heading">
    <div>
      <h2>学习的节奏</h2>
      <p class="subtext">每日去重学习词数，包含专项练习</p>
    </div>
    <div class="segmented">
      <button class:active={range === 7} onclick={() => (range = 7)}>近 7 天</button><button
        class:active={range === 30}
        onclick={() => (range = 30)}>近 30 天</button
      >
    </div>
  </div>
  <div class="trend-chart" class:monthly={range === 30}>
    {#each days as day, i}<button
        class="trend-col"
        onclick={() => (selectedDay = dayKey(day.date))}
        aria-label={`${dayKey(day.date)}，学习 ${day.unique} 词，查看详情`}
        aria-pressed={dayKey(selected.date) === dayKey(day.date)}
        title={`${dayKey(day.date)}：学习 ${day.unique} 词，新学 ${day.fresh} 词，复习 ${day.reviews} 次`}
      >
        <span>{day.unique || ''}</span>
        <div class="trend-bar" style:height={`${Math.max(3, (day.unique / max) * 130)}px`}></div>
        <small
          >{range === 7 || i % 5 === 0 || i === range - 1
            ? `${day.date.getMonth() + 1}/${day.date.getDate()}`
            : ''}</small
        >
      </button>{/each}
  </div>
  <div class="daily-detail" aria-live="polite">
    <strong>{dayKey(selected.date) === dayKey(now) ? '今天' : dayKey(selected.date)}</strong><span
      >新学 <b>{selected.fresh}</b> 词</span
    ><span>复习 <b>{selected.reviews}</b> 次</span><span
      >学习 <b>{selected.unique}</b> 词（去重）</span
    ><span>练习正确率 <b>{selected.accuracy === null ? '—' : `${selected.accuracy}%`}</b></span>
  </div>
  {#if !days.some((d) => d.unique)}<p class="chart-empty-caption">
      第一笔成长记录，等待你今天写下。
    </p>{/if}
</section>
<div class="stats-lower">
  <section class="panel">
    <div class="section-heading">
      <h2>坚持的印记</h2>
      <span class="subtext">最近 91 天</span>
    </div>
    <div class="heatmap">
      {#each heat as day}<div
          class="heat-cell"
          class:level1={day.count > 0 && day.count < 5}
          class:level2={day.count >= 5 && day.count < 15}
          class:level3={day.count >= 15 && day.count < 30}
          class:level4={day.count >= 30}
          title={`${dayKey(day.date)} · ${day.count} 次学习与练习`}
          role="img"
          aria-label={`${dayKey(day.date)}，${day.count} 次学习与练习`}
        ></div>{/each}
    </div>
    <div class="heat-legend">
      <span>少</span>{#each ['', 'level1', 'level2', 'level3', 'level4'] as cls}<i
          class={`heat-cell ${cls}`}
        ></i>{/each}<span>多</span>
    </div>
    <p class="subtext">每一格，都藏着一个认真学习的你。</p>
  </section>
  <section class="panel">
    <div class="section-heading">
      <h2>词书进度</h2>
      <BookOpen size={17} />
    </div>
    <div class="book-progress-list">
      {#each data.books as book}{@const words = data.words.filter(
          (w) => w.bookId === book.id
        )}{@const learned = words.filter((w) => w.card.reps > 0).length}
        <div>
          <div class="progress-label">
            <span>{book.name}</span><b>{learned} / {words.length}</b>
          </div>
          <div class="progress-track">
            <span style:width={`${words.length ? (learned / words.length) * 100 : 0}%`}></span>
          </div>
        </div>{:else}<p class="muted">创建词书后，这里会记录你的学习进度。</p>{/each}
    </div>
    <p class="subtext">已学习表示完成过首次评分，不等同于完全掌握。</p>
  </section>
</div>
