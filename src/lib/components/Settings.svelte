<script lang="ts">
  import { untrack } from 'svelte';
  import {
    BookOpen,
    Download,
    HardDrive,
    Moon,
    Save,
    ShieldCheck,
    Sun,
    Upload,
    Volume2
  } from '@lucide/svelte';
  import type { Snapshot, Backup } from '../types';
  import type { Perform } from '../ui';
  import { saveSettings } from '../db';
  import { makeBackup, parseBackup, restoreBackup } from '../backup';
  import { download } from '../download';
  import { examDays, dayKey } from '../stats';
  import Modal from './Modal.svelte';
  let {
    data,
    perform,
    voices,
    speak
  }: {
    data: Snapshot;
    perform: Perform;
    voices: SpeechSynthesisVoice[];
    speak: (text: string, voice?: string, rate?: number) => void;
  } = $props();
  let form = $state(untrack(() => ({ ...data.settings })));
  let backup = $state<Backup | undefined>();
  let busy = $state(false);
  let fileInput: HTMLInputElement;
  const remaining = $derived(
    data.words.filter((w) => w.bookId === form.activeBookId && w.card.reps === 0).length
  );
  const days = $derived(examDays(form.examDate));
  const recommended = $derived(
    days !== null && days > 0 ? Math.max(1, Math.ceil(remaining / days)) : null
  );
  async function save() {
    busy = true;
    await perform(() => saveSettings(form), '学习偏好已保存');
    busy = false;
  }
  async function exportBackup() {
    await perform(
      async () =>
        download(JSON.stringify(await makeBackup(), null, 2), `WordNest-完整备份-${dayKey()}.json`),
      '完整备份已导出'
    );
  }
  async function readBackup(file?: File) {
    if (!file) return;
    await perform(async () => {
      if (file.size > 50 * 1024 * 1024) throw new Error('备份文件不能超过 50 MB。');
      backup = parseBackup(await file.text());
    });
    fileInput.value = '';
  }
  async function restore() {
    if (!backup) return;
    busy = true;
    if (await perform(() => restoreBackup(backup!), '备份已恢复')) {
      form = { ...backup.data.settings };
      backup = undefined;
    }
    busy = false;
  }
</script>

<div class="page-heading">
  <div>
    <div class="eyebrow">MAKE YOURSELF AT HOME</div>
    <h1>按你的节奏来<span class="heading-dot">。</span></h1>
    <p>一点小调整，让学习更适合你。</p>
  </div>
  <span class="pill subtle"><ShieldCheck size={14} />你的数据，只属于你</span>
</div>
<form
  class="settings-layout"
  onsubmit={(e) => {
    e.preventDefault();
    save();
  }}
>
  <section class="panel settings-panel">
    <div class="section-heading">
      <h2>学习计划</h2>
      <BookOpen size={18} />
    </div>
    <div class="form-grid">
      <label
        >考试目标<select bind:value={form.exam}
          >{#each ['大学英语四级', '大学英语六级', '考研英语', '雅思 IELTS', '托福 TOEFL', '自定义目标'] as exam}<option
              >{exam}</option
            >{/each}</select
        ></label
      >{#if form.exam === '自定义目标'}<label
          >目标名称<input
            bind:value={form.customGoal}
            maxlength={60}
            placeholder="例如：读懂我的第一本英文书"
          /></label
        >{/if}<label
        >考试日期 <span class="optional">选填</span><input
          type="date"
          bind:value={form.examDate}
        /></label
      ><label
        >当前学习词书<select bind:value={form.activeBookId}
          ><option value="" disabled>请选择词书</option>{#each data.books as book}<option
              value={book.id}>{book.name}</option
            >{/each}</select
        ></label
      ><label
        >每日新词量<input
          type="number"
          min="1"
          max="500"
          step="1"
          required
          bind:value={form.dailyGoal}
        /></label
      ><label
        >记忆卡片方向<select bind:value={form.direction}
          ><option value="en-zh">英文 → 中文释义</option><option value="zh-en"
            >中文释义 → 英文</option
          ></select
        ></label
      >
    </div>
    {#if recommended}<div class="info-note">
        还剩 {remaining} 个新词，距离目标 {days} 天。建议每天学习至少 <strong>{recommended}</strong>
        个新词。{#if recommended <= 500}<button
            type="button"
            class="text-btn"
            onclick={() => (form.dailyGoal = recommended!)}>采用建议</button
          >{/if}
      </div>{:else if days === 0}<div class="info-note">
        目标日期已到，仍可继续按每日计划学习，也可以设置新的目标。
      </div>{/if}
    <p class="subtext">新词目标不会限制到期复习。更改词书或卡片方向将在下一轮学习生效。</p>
  </section>
  <section class="panel settings-panel">
    <div class="section-heading">
      <h2>阅读与声音</h2>
      <Sun size={18} />
    </div>
    <p class="field-label">界面主题</p>
    <div class="theme-options">
      {#each [['light', '浅色书房'], ['dark', '深夜书桌'], ['system', '跟随系统']] as [id, label]}<button
          type="button"
          class:active={form.theme === id}
          onclick={() => (form.theme = id as typeof form.theme)}
          >{#if id === 'dark'}<Moon size={18} />{:else if id === 'light'}<Sun
              size={18}
            />{:else}<HardDrive size={18} />{/if}{label}</button
        >{/each}
    </div>
    <div class="form-grid">
      <label
        >本地英语发音<select bind:value={form.voice} disabled={!voices.length}
          ><option value="">{voices.length ? '自动选择可用语音' : '未检测到本地英语语音'}</option
          >{#each voices as voice}<option value={voice.voiceURI}
              >{voice.name}（{voice.lang}）</option
            >{/each}</select
        ></label
      ><label
        >语速 · {form.rate.toFixed(2)}×<input
          type="range"
          min="0.5"
          max="1.5"
          step="0.05"
          bind:value={form.rate}
        /></label
      >
    </div>
    <button
      type="button"
      class="btn small secondary"
      disabled={!voices.length}
      onclick={() => speak('Make the most of every day.', form.voice, form.rate)}
      ><Volume2 size={15} />试听声音</button
    >
    <p class="subtext">
      仅使用系统本地英语语音，不调用在线发音服务。{voices.length
        ? ''
        : '可在系统设置中安装英语语音包，再重新打开页面。'}
    </p>
  </section>
  <div class="settings-save">
    <span class="subtext">找到适合自己的节奏，比走得快更重要。</span><button
      class="btn primary"
      disabled={busy}><Save size={16} />{busy ? '保存中…' : '保存学习偏好'}</button
    >
  </div>
</form>
<section class="panel settings-panel data-panel">
  <div class="section-heading">
    <h2>给努力留一份备份</h2>
    <ShieldCheck size={19} />
  </div>
  <p class="muted">词书、学习进度和设置都保存在当前浏览器。定期备份，就能把它们带到另一台设备。</p>
  <div class="backup-actions">
    <button class="btn secondary" onclick={exportBackup}><Download size={17} />导出完整备份</button
    ><button class="btn secondary" onclick={() => fileInput.click()}
      ><Upload size={17} />从备份恢复</button
    ><input
      class="sr-only"
      type="file"
      accept=".json"
      bind:this={fileInput}
      onchange={() => readBackup(fileInput.files?.[0])}
    />
  </div>
  <div class="local-note">
    <HardDrive size={18} />
    <div>
      <strong>一个 HTML 文件，也是一间随身书房。</strong>
      <p>
        打开文件即可离线学习。更换浏览器、移动文件或清理浏览器数据，可能使原有记录不可见，请先导出备份。无需账号，不上传词库。
      </p>
    </div>
  </div>
</section>
{#if backup}<Modal
    title="恢复这份学习备份？"
    subtitle="恢复将整体替换当前词书、进度与设置。"
    close={() => (backup = undefined)}
    ><div class="backup-summary">
      <div><strong>{backup.data.books.length}</strong><span>本词书</span></div>
      <div><strong>{backup.data.words.length}</strong><span>个词条</span></div>
      <div><strong>{backup.data.logs.length}</strong><span>条学习记录</span></div>
    </div>
    <p class="subtext">备份时间：{new Date(backup.exportedAt).toLocaleString('zh-CN')}</p>
    <div class="info-note">
      建议先保存当前数据，以便需要时恢复。<button class="text-btn" onclick={exportBackup}
        >下载当前完整备份</button
      >
    </div>
    <footer class="modal-actions">
      <button class="btn secondary" disabled={busy} onclick={() => (backup = undefined)}
        >取消</button
      ><button class="btn primary" disabled={busy} onclick={restore}
        >{busy ? '恢复中…' : '确认替换并恢复'}</button
      >
    </footer></Modal
  >{/if}
