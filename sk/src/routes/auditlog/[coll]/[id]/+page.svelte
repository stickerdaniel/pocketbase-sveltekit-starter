<script lang="ts">
  import type { PageData } from "./$types";
  import Changes from "./Changes.svelte";
  import SidebarPage from "$lib/components/sidebar-page.svelte";
  import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";

  const { data }: { data: PageData } = $props();
  $effect(() => {
    data.metadata.title = data.metadata.headline = "Audit Log";
  });

  // Format date properly with native JavaScript
  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (e) {
      return dateString;
    }
  }
</script>

<SidebarPage title="Audit Log">
  <Card>
    <CardHeader>
      <CardTitle>Audit Log Records</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b">
              <th class="text-left p-2">Timestamp</th>
              <th class="text-left p-2">Action</th>
              <th class="text-left p-2">User</th>
            </tr>
          </thead>
          <tbody>
            {#each data.logs as item}
              <tr class="border-b">
                <td class="p-2 text-sm">{formatDate(item.updated)}</td>
                <td class="p-2">
                  <Badge variant={item.event === 'create' ? 'success' : item.event === 'delete' ? 'destructive' : 'default'}>
                    {item.event}
                  </Badge>
                </td>
                <td class="p-2">{item.admin || item.expand?.user?.name || item.user || 'Unknown'}</td>
              </tr>
              <tr class="border-b bg-muted/30">
                <td colspan="3" class="p-2">
                  <div class="py-2">
                    <Changes auditlog={item} />
                  </div>
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="3" class="p-4 text-center text-muted-foreground">
                  No audit log records found.
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
</SidebarPage>
