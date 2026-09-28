<script lang="ts">
  import { untrack } from 'svelte';
  import Modal from './Modal.svelte';
  import { saveWord } from '../db';
  import { emptyContent, type Word, type WordContent } from '../types';
  import type { Perform } from '../ui';
  let {
    word,
    bookId,
    close,
    perform
  }: { word?: Word; bookId: string; close: () => void; perform: Perform } = $props();
  let form = $state<WordContent>(
    untrack(() =>
      word
        ? {
            word: word.word,
            meaning: word.meaning,
            phonetic: word.phonetic,
            pos: word.pos,
            example: word.example,
            translation: word.translation,
            tags: word.tags,
            note: word.note
          }
        : { ...emptyContent }
    )
  );
  let busy = $state(false);
  async function save() {
    busy = true;
    if (await perform(() => saveWord(bookId, form, word?.id), '词条已保存')) close();
    busy = false;
  }
</script>

<Modal
  title={word ? '编辑词条' : '添一个新词'}
  subtitle="每一个认真记下的单词，都会成为收获。"
  {close}
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      save();
    }}
    class="form-stack"
  >
    <label
      >英文或短语 <span class="required">*</span><input
        required
        bind:value={form.word}
        placeholder="输入英文单词或短语"
        maxlength={400}
      /></label
    >
    <label
      >中文释义 <span class="required">*</span><textarea
        required
        bind:value={form.meaning}
        rows="2"
        placeholder="这个词是什么意思？"></textarea></label
    >
    <div class="form-grid">
      <label>音标<input bind:value={form.phonetic} placeholder="/…/" /></label><label
        >词性<input bind:value={form.pos} placeholder="如 v. / adj. / phr." /></label
      >
    </div>
    <label
      >英文例句<textarea bind:value={form.example} rows="2" placeholder="把单词放进一句话里"
      ></textarea></label
    ><label>例句译文<input bind:value={form.translation} placeholder="例句的中文翻译" /></label>
    <label>标签<input bind:value={form.tags} placeholder="如 重点动词、易错词" /></label><label
      >搭配与笔记<textarea
        bind:value={form.note}
        rows="2"
        placeholder="写下固定搭配或自己的记忆方法"></textarea></label
    >
    <footer class="modal-actions">
      <button type="button" class="btn secondary" onclick={close}>取消</button><button
        class="btn primary"
        disabled={busy}>{busy ? '保存中…' : '保存词条'}</button
      >
    </footer>
  </form>
</Modal>
