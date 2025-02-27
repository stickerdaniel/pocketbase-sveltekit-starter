<script lang="ts">
  import type { AuditlogResponse } from "$lib/pocketbase/generated-types";

  const { auditlog }: { auditlog: AuditlogResponse } = $props();
  const keys = $derived(Object.keys(auditlog.original || {}));
  
  // Determine if values are different
  function isDifferent(key: string) {
    const originalValue = JSON.stringify(auditlog.original[key]);
    const newValue = JSON.stringify(auditlog.data[key]);
    return originalValue !== newValue;
  }
  
  // Format JSON values
  function formatValue(value: any) {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return String(value);
      }
    }
    return String(value);
  }
</script>

<div>
  <h4 class="text-sm font-medium mb-2">Changes</h4>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b">
          <th class="text-left p-2 font-medium">Field</th>
          <th class="text-left p-2 font-medium">Previous</th>
          <th class="text-left p-2 font-medium">Current</th>
        </tr>
      </thead>
      <tbody>
        {#each keys as key}
          {@const changed = isDifferent(key)}
          <tr class="border-b hover:bg-muted/30">
            <th class="text-left p-2 align-top font-medium">{key}</th>
            <td class="p-2 align-top font-mono text-xs" class:text-muted-foreground={!changed}>
              <pre class="whitespace-pre-wrap">{formatValue(auditlog.original[key])}</pre>
            </td>
            <td class="p-2 align-top font-mono text-xs" class:text-accent-foreground={changed} class:font-medium={changed}>
              <pre class="whitespace-pre-wrap">{formatValue(auditlog.data[key])}</pre>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  pre {
    margin: 0;
    padding: 0;
    max-height: 10em;
    overflow-y: auto;
  }
</style>
