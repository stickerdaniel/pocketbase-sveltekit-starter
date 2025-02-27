<script lang="ts">
  import { base } from "$app/paths";
  import Delete from "$lib/components/Delete.svelte";
  import SidebarPage from "$lib/components/sidebar-page.svelte";
  import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";

  const { data } = $props();
  const record = $derived(data.record);
  $effect(() => {
    data.metadata.title = data.metadata.headline = `Delete: ${record.title}`;
  });
</script>

<SidebarPage title="Delete Post" path="Delete">
  <Card>
    <CardHeader>
      <CardTitle>Delete Post: {record.title}</CardTitle>
    </CardHeader>
    <CardContent>
      <Delete 
        id={record.id} 
        table={record.collectionName} 
        return_path={`${base}/posts`}
      />
    </CardContent>
  </Card>
</SidebarPage>