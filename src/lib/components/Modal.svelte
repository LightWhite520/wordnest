<script lang="ts">
  import { X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  let {
    title,
    subtitle = '',
    close,
    children,
    wide = false
  }: {
    title: string;
    subtitle?: string;
    close: () => void;
    children: Snippet;
    wide?: boolean;
  } = $props();
  let dialog = $state<HTMLDialogElement>();
  $effect(() => {
    if (dialog && !dialog.open) dialog.showModal();
  });
</script>

<dialog
  bind:this={dialog}
  class:wide
  oncancel={(e) => {
    e.preventDefault();
    close();
  }}
  onclick={(e) => {
    if (e.target === dialog) close();
  }}
  onkeydown={(e) => e.stopPropagation()}
>
  <div class="modal-inner">
    <header class="modal-header">
      <div>
        <h2>{title}</h2>
        {#if subtitle}<p>{subtitle}</p>{/if}
      </div>
      <button class="icon-btn" aria-label="关闭弹窗" onclick={close}><X size={20} /></button>
    </header>
    {@render children()}
  </div>
</dialog>
