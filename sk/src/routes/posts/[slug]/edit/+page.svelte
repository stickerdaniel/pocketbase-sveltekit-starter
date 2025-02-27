<script lang="ts">
  import { toast } from "svelte-sonner";
  import FileInput from "$lib/components/FileInput.svelte";
  import Spinner, { activityStore } from "$lib/components/Spinner.svelte";
  import { authModel, client, save } from "$lib/pocketbase";
  import FileField from "$lib/pocketbase/FileField.svelte";
  import type { PostsResponse } from "$lib/pocketbase/generated-types.js";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import SidebarPage from "$lib/components/sidebar-page.svelte";
  import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
  import z from "zod";

  const { data } = $props();
  let record = $state(data.record);
  let fileInput = $state() as HTMLInputElement;
  let toBeRemoved = $state([]);
  $effect(() => {
    data.metadata.title = data.metadata.headline = `Edit Post: ${record.title}`;
  });

  const schema = z.object({
    id: z.string().optional().describe("ID"),
    title: z.string().trim().min(1, "value required.").describe("Title"),
    slug: z
      .string()
      .trim()
      .min(1, "required.")
      .refine((s: string) => !s.startsWith("/"), "must not start with a slash.")
      .describe("Slug"),
    body: z.string().trim().min(1, "required.").describe("Body"),
  });

  async function onsubmit(e: SubmitEvent) {
    e.preventDefault();
    const { success, error, data } = schema.safeParse(record);
    if (success) {
      const files = fileInput?.files;
      const user = client.authStore.isAdmin ? "" : $authModel?.id;
      record = await save<PostsResponse>("posts", {
        ...data,
        files,
        user,
        "files-": toBeRemoved,
      });
      toast.success("Post saved.");
      history.back();
    } else {
      Object.entries(error.flatten().fieldErrors).forEach(([k, v]) =>
        toast.error(`${k}: ${v}`)
      );
    }
  }
  const store = activityStore<SubmitEvent>((e) => onsubmit(e));
</script>

<SidebarPage title="Edit Post" path="Edit Post">
  <Card>
    <CardHeader>
      <CardTitle>{record.title ? `Edit: ${record.title}` : 'Create New Post'}</CardTitle>
    </CardHeader>
    <CardContent>
      <form onsubmit={store.run} class="space-y-6">
        <div class="text-sm text-muted-foreground">ID: {record.id ?? "-"}</div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="grid w-full items-center gap-1.5">
            <Label for="title">Title</Label>
            <Input id="title" type="text" bind:value={record.title} placeholder="Post title" />
          </div>
          
          <div class="grid w-full items-center gap-1.5">
            <Label for="slug">Slug</Label>
            <Input id="slug" type="text" bind:value={record.slug} placeholder="url-friendly-slug" />
          </div>
        </div>
        
        <div class="grid w-full items-center gap-1.5">
          <Label for="files">Files</Label>
          <FileInput bind:fileInput pasteFile={true} multiple={true} />
        </div>
        
        <FileField {record} fieldName="files" bind:toBeRemoved />
        
        <div class="grid w-full items-center gap-1.5">
          <Label for="body">Body</Label>
          <textarea 
            id="body"
            bind:value={record.body} 
            placeholder="Post content"
            class="border-input focus-visible:ring-ring min-h-[120px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
          ></textarea>
        </div>
        
        <div class="flex justify-end">
          <Button type="submit">
            <Spinner active={$store} />
            Save
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</SidebarPage>