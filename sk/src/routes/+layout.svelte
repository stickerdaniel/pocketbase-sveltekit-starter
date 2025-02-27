<script lang="ts">
  import "../app.css";
  import "../app.scss";
  import { page } from "$app/stores";
  import { Toaster } from "$lib/components/ui/sonner";
  import { toast } from "svelte-sonner";
  
  const { data, children } = $props();
  const metadata = $derived(data.metadata ?? {});
  const config = $derived(data.config ?? {});

  $effect(() => {
    if ($page.error) {
      metadata.title = $page.error.message;
      toast.error($page.error.message);
    }
  });
</script>

<svelte:head>
  <title>{metadata.title} | {config.site?.name}</title>
</svelte:head>

<Toaster />

{@render children()}

<style lang="scss">
  :global(html, body) {
    height: 100%;
  }
  
  :global(body) {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
</style>
