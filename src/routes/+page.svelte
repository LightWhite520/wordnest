<script lang="ts">
  import { onMount } from 'svelte';
  import { liveQuery } from 'dexie';
  import {
    BarChart3,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    Flower2,
    GraduationCap,
    House,
    Leaf,
    LoaderCircle,
    Moon,
    Settings2,
    ShieldCheck,
    Sun,
    X
  } from '@lucide/svelte';
  import type { Snapshot, Tab } from '$lib/types';
  import { initialize, snapshot, startSession, saveSettings } from '$lib/db';
  import type { Perform } from '$lib/ui';
  import Dashboard from '$lib/components/Dashboard.svelte';
  import Books from '$lib/components/Books.svelte';
  import Learn from '$lib/components/Learn.svelte';
  import Practice from '$lib/components/Practice.svelte';
  import Stats from '$lib/components/Stats.svelte';
  import Settings from '$lib/components/Settings.svelte';
  import ImportModal from '$lib/components/ImportModal.svelte';
  import { dailyStats } from '$lib/stats';
  let data = $state<Snapshot>();
  let tab = $state<Tab>('today');
  let now = $state(new Date());
  let error = $state('');
  let toast = $state('');
  let toastError = $state(false);
  let importing = $state(false);
  let importTarget = $state('');
  let voices = $state<SpeechSynthesisVoice[]>([]);
  let systemDark = $state(false);
  let toastTimer: ReturnType<typeof setTimeout>;
  let toastElement = $state<HTMLDivElement>();
  let mounted = $state(false);
  const nav = [
    { id: 'today', label: '今日学习', icon: House },
    { id: 'books', label: '我的词书', icon: BookOpen },
    { id: 'practice', label: '专项练习', icon: GraduationCap },
    { id: 'stats', label: '学习统计', icon: BarChart3 },
    { id: 'settings', label: '学习设置', icon: Settings2 }
  ] as const;
  const dark = $derived(
    data?.settings.theme === 'dark' || (data?.settings.theme === 'system' && systemDark)
  );
  const today = $derived(data ? dailyStats(data.logs, data.practices, now) : null);
  function notify(message: string, isError = false) {
    toast = message;
    toastError = isError;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), isError ? 7000 : 3500);
  }
  const perform: Perform = async (work, success) => {
    try {
      await work();
      if (success) notify(success);
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : '操作未能完成，请重试。', true);
      return false;
    }
  };
  function navigate(next: Tab) {
    tab = next;
    if (mounted) {
      history.replaceState(null, '', `#${next}`);
      window.scrollTo({ top: 0, behavior: 'instant' });
      window.speechSynthesis?.cancel();
    }
  }
  async function start() {
    if (!data) return;
    if (!data.books.length || !data.settings.activeBookId) {
      navigate('books');
      notify('先创建或选择一本学习词书。');
      return;
    }
    if (await perform(() => startSession())) navigate('learn');
  }
  function openImport(bookId?: string) {
    importTarget = bookId ?? data?.settings.activeBookId ?? '';
    importing = true;
  }
  function speak(text: string, voiceURI?: string, rate?: number) {
    if (!('speechSynthesis' in window) || !voices.length) {
      notify('未检测到本地英语语音。请在系统中安装英语语音包后重试。', true);
      return;
    }
    const voice =
      voices.find((v) => v.voiceURI === (voiceURI ?? data?.settings.voice)) ??
      voices.find((v) => v.lang === 'en-US') ??
      voices[0];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = rate ?? data?.settings.rate ?? 0.85;
    utterance.onerror = (e) => {
      if (!['interrupted', 'canceled'].includes(e.error))
        notify('本地语音暂时无法播放，请检查系统语音设置。', true);
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
  $effect(() => {
    if (toast && toastElement?.showPopover) {
      if (toastElement.matches(':popover-open')) toastElement.hidePopover();
      toastElement.showPopover();
    }
  });
  $effect(() => {
    if (mounted) {
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    }
  });
  onMount(() => {
    mounted = true;
    const initial = location.hash.slice(1);
    if ([...nav.map((n) => n.id), 'learn'].includes(initial)) tab = initial as Tab;
    const media = matchMedia('(prefers-color-scheme: dark)');
    systemDark = media.matches;
    const themeChange = () => (systemDark = media.matches);
    media.addEventListener('change', themeChange);
    let disposed = false;
    let subscription: { unsubscribe: () => void } | undefined;
    initialize()
      .then(() => {
        if (disposed) return;
        subscription = liveQuery(snapshot).subscribe({
          next: (value) => {
            data = value;
            error = '';
          },
          error: (e) =>
            (error = `无法读取本地学习数据：${String(e)}。请检查浏览器是否允许本地存储。`)
        });
      })
      .catch((e) => {
        error = `本地存储无法打开：${e.message}。请使用普通窗口中的 Chrome 或 Edge，并允许浏览器保存网站数据。`;
      });
    const updateVoices = () => {
      voices =
        window.speechSynthesis
          ?.getVoices()
          .filter((v) => v.localService && /^en[-_]/i.test(v.lang)) ?? [];
    };
    updateVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', updateVoices);
    const focus = () => {
      now = new Date();
      updateVoices();
    };
    window.addEventListener('focus', focus);
    const interval = setInterval(() => (now = new Date()), 30000);
    return () => {
      disposed = true;
      subscription?.unsubscribe();
      clearInterval(interval);
      clearTimeout(toastTimer);
      window.removeEventListener('focus', focus);
      media.removeEventListener('change', themeChange);
      window.speechSynthesis?.removeEventListener('voiceschanged', updateVoices);
      window.speechSynthesis?.cancel();
    };
  });
</script>

<svelte:head
  ><title>拾词 WordNest · 让每一词，慢慢生长</title><meta
    name="description"
    content="一间属于你的随身英语书房。单文件离线学习、本地词书、间隔复习与拼写练习。"
  /></svelte:head
>
<div class="app-shell" class:focus-mode={tab === 'learn'}>
  <aside class="sidebar">
    <button class="brand" onclick={() => navigate('today')} aria-label="拾词首页"
      ><span class="brand-mark"><Leaf size={26} strokeWidth={1.5} /></span><span
        ><strong>拾词<span>WordNest</span></strong><small>让每一词，慢慢生长</small></span
      ></button
    >
    <div class="sidebar-label">我的学习空间</div>
    <nav class="desktop-nav" aria-label="主导航">
      {#each nav as item}<button
          class:active={tab === item.id || (tab === 'learn' && item.id === 'today')}
          onclick={() => navigate(item.id)}
          ><item.icon size={20} strokeWidth={1.7} /><span>{item.label}</span
          >{#if tab === item.id}<span class="nav-active-dot"></span>{/if}</button
        >{/each}
    </nav>
    <div class="sidebar-bottom">
      <div class="sidebar-quote">
        <Flower2 size={25} strokeWidth={1.2} />
        <p>“The secret of getting ahead<br />is getting started.”</p>
        <span>迈出第一步，就是进步的开始。</span>
      </div>
      <div class="sidebar-progress">
        <div>
          <span>今天的小目标</span><b>{today?.fresh ?? 0} / {data?.settings.dailyGoal ?? 20}</b>
        </div>
        <div class="progress-track">
          <span
            style:width={`${Math.min(100, ((today?.fresh ?? 0) / (data?.settings.dailyGoal ?? 20)) * 100)}%`}
          ></span>
        </div>
      </div>
      <div class="local-status"><span class="status-dot"></span>本地书房<span>离线可用</span></div>
    </div>
  </aside>
  <div class="main-shell">
    <header class="topbar">
      <div class="breadcrumb">
        <Leaf size={15} /><span>我的学习空间</span><ChevronRight size={13} /><strong
          >{tab === 'learn' ? '专注学习' : nav.find((n) => n.id === tab)?.label}</strong
        >
      </div>
      <div class="topbar-actions">
        <span class="privacy-badge"><ShieldCheck size={14} />只在本地，安心学习</span><button
          class="icon-btn theme-toggle"
          aria-label={dark ? '切换浅色主题' : '切换深色主题'}
          onclick={() => data && perform(() => saveSettings({ theme: dark ? 'light' : 'dark' }))}
          >{#if dark}<Sun size={18} />{:else}<Moon size={18} />{/if}</button
        ><span class="avatar">W</span>
      </div>
    </header>
    <main id="main-content" class:learning-main={tab === 'learn'}>
      {#if error}<div class="panel empty">
          <ShieldCheck size={35} />
          <h2>暂时无法打开书房</h2>
          <p role="alert">{error}</p>
          <button class="btn primary" onclick={() => location.reload()}>重新尝试</button>
        </div>{:else if !data}<div class="loading-state">
          <LoaderCircle class="spin" size={26} />
          <p>正在打开你的书房…</p>
        </div>{:else if tab === 'today'}<Dashboard
          {data}
          {navigate}
          {start}
          importBook={() => openImport()}
          {speak}
          {now}
        />{:else if tab === 'books'}<Books
          {data}
          {perform}
          onImport={openImport}
          {speak}
        />{:else if tab === 'learn'}<Learn
          {data}
          {perform}
          {navigate}
          {speak}
          {start}
          {now}
        />{:else if tab === 'practice'}<Practice
          {data}
          {perform}
          {speak}
          hasVoice={voices.length > 0}
        />{:else if tab === 'stats'}<Stats {data} {now} />{:else}<Settings
          {data}
          {perform}
          {voices}
          {speak}
        />{/if}
    </main>
    <footer class="app-footer">
      <span><Leaf size={13} />拾词 WordNest</span><span>一词一句，日有所长。</span><span
        >单文件 · 本地保存</span
      >
    </footer>
  </div>
  <nav class="mobile-nav" aria-label="移动导航">
    {#each nav as item}<button
        class:active={tab === item.id || (tab === 'learn' && item.id === 'today')}
        onclick={() => navigate(item.id)}
        ><item.icon size={21} strokeWidth={1.7} /><span>{item.label}</span></button
      >{/each}
  </nav>
</div>
{#if toast}<div
    bind:this={toastElement}
    popover="manual"
    class="toast"
    class:error={toastError}
    role={toastError ? 'alert' : 'status'}
  >
    {#if toastError}<span>!</span>{:else}<CheckCircle2 size={18} />{/if}<span>{toast}</span><button
      class="icon-btn"
      aria-label="关闭提示"
      onclick={() => (toast = '')}><X size={15} /></button
    >
  </div>{/if}
{#if importing && data}<ImportModal
    {data}
    bookId={importTarget}
    {perform}
    close={() => (importing = false)}
  />{/if}
