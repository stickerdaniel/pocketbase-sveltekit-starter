<script lang="ts">
  import { invalidateAll, preloadData, pushState } from "$app/navigation";
  import { page } from "$app/stores";
  import type { ComponentType, Snippet, SvelteComponent } from "svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";

  const {
    component,
    trigger,
  }: {
    trigger: Snippet<[(e: MouseEvent) => void]>;
    component: ComponentType<SvelteComponent<{ data: any }>>;
  } = $props();

  let isOpen = $state(false);

  async function onclick(e: MouseEvent) {
    if (e.metaKey || e.ctrlKey) return;
    const { href } = e.currentTarget as HTMLAnchorElement;

    // run `load` functions (or rather, get the result of the `load` functions
    // that are already running because of `data-sveltekit-preload-data`)
    const result = await preloadData(href);

    if (result.type === "loaded" && result.status === 200) {
      pushState(href, { selected: result.data });
      e.preventDefault();
    }
  }

  async function onClose() {
    await invalidateAll();
    history.back();
  }

  $effect(() => {
    if ($page.state.selected) {
      isOpen = true;
    }
  });
</script>

{#if $page.state.selected}
  <Dialog.Root bind:open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{$page.state.selected.metadata.headline}</Dialog.Title>
        <Dialog.Close />
      </Dialog.Header>
      <svelte:component this={component} data={$page.state.selected} />
    </Dialog.Content>
  </Dialog.Root>
{/if}

{@render trigger(onclick)}
