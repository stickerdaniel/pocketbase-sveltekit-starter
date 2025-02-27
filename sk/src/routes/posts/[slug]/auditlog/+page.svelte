<script lang="ts">
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { onMount } from "svelte";

  const { data } = $props();
  const record = $derived(data.record);
  $effect(() => {
    data.metadata.title = data.metadata.headline = `Audit Log: ${record.title}`;
  });

  // Redirect to the proper audit log URL
  onMount(() => {
    goto(`${base}/auditlog/posts/${record.id}`);
  });
</script>

<div class="text-center p-8">
  <p>Redirecting to audit log...</p>
</div>