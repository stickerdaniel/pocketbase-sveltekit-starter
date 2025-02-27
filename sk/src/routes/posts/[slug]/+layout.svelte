<script lang="ts">
  import type { Snippet } from "svelte";

  const { data, children }: { data: any; children: Snippet } = $props();
</script>

<!-- Simply render the children -->
{@render children()}
