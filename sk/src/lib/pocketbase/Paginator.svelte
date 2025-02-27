<script lang="ts">
  import type { Snippet } from "svelte";
  import type { PageStore } from ".";
  import { Button } from "$lib/components/ui/button";

  const {
    store,
    showIfSinglePage = false,
  }: {
    store: PageStore;
    showIfSinglePage?: boolean;
  } = $props();
</script>

{#if showIfSinglePage || $store.totalPages > 1}
  <div class="paginator">
    <Button
      variant="outline"
      size="sm"
      onclick={() => store.prev()}
      disabled={$store.page <= 1}>&laquo;</Button
    >
    <div>page {$store.page} of {$store.totalPages}</div>
    <Button
      variant="outline"
      size="sm"
      onclick={() => store.next()}
      disabled={$store.page >= $store.totalPages}>&raquo;</Button
    >
  </div>
{/if}

<style lang="scss">
  .paginator {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: auto;
  }
</style>
