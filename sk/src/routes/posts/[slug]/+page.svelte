<script lang="ts">
  import ImgModal from "$lib/pocketbase/ImgModal.svelte";
  import { client, authModel } from "$lib/pocketbase/index.js";
  import SidebarPage from "$lib/components/sidebar-page.svelte";
  import { Card, CardContent, CardHeader } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { toast } from "svelte-sonner";
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import Edit from "lucide-svelte/icons/edit";
  import Trash from "lucide-svelte/icons/trash";
  import ClipboardList from "lucide-svelte/icons/clipboard-list";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";

  const { data } = $props();
  const record = $derived(data.record);
  $effect(() => {
    data.metadata.title = data.metadata.headline = record.title;
  });

  // Action handlers
  async function handleDelete() {
    try {
      await client.collection('posts').delete(record.id);
      toast.success("Post deleted successfully");
      goto(`${base}/posts`);
    } catch (error) {
      toast.error("Failed to delete post");
      console.error(error);
    }
  }
</script>

<SidebarPage title={record.title}>
  {#if $authModel}
    <div class="mb-4">
      <Button variant="outline" href={`${base}/posts/${record.slug || record.id}/edit`}>
        <Edit class="mr-2 h-4 w-4" />
        Edit
      </Button>
      <AlertDialog.Root>
        <AlertDialog.Trigger asChild>
          <div>
            <Button variant="outline">
              <Trash class="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Delete Post</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure you want to delete "{record.title}"? This action cannot be undone.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <div>
              <Button 
                variant="destructive" 
                onclick={handleDelete}
                class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </Button>
            </div>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
      <Button variant="outline" href={`${base}/auditlog/posts/${record.id}`}>
        <ClipboardList class="mr-2 h-4 w-4" />
        Audit Log
      </Button>
    </div>
  {/if}

  <Card>
    <CardContent class="p-6">
      <article>
        <h1 class="text-2xl font-bold mb-4">{record.title}</h1>
        <pre class="body whitespace-pre-wrap mb-8">{record.body}</pre>
        <div class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {#each record.files ?? [] as file, index}
            {@const src = client.files.getUrl(record, file)}
            {@const title = `image ${index + 1} for: ${record.title}`}
            <div class="overflow-hidden rounded-md">
              <ImgModal {record} filename={file} />
            </div>
          {/each}
        </div>
      </article>
    </CardContent>
  </Card>
</SidebarPage>
