<script lang="ts">
  import { toast } from "svelte-sonner";
  import FileInput from "$lib/components/FileInput.svelte";
  import { writable } from "svelte/store";
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
    data.metadata.title = data.metadata.headline = "Create New Post";
  });

  const schema = z.object({
    id: z.string().optional().describe("ID"),
    title: z.string().trim().min(1, "value required.").describe("Title"),
    slug: z
      .string()
      .trim()
      .min(1, "required.")
      .refine((s: string) => !s.startsWith("/"), "must not start with a slash.")
      .refine((s: string) => s !== "new", "cannot be 'new' - this is a reserved word.")
      .describe("Slug"),
    body: z.string().trim().min(1, "required.").describe("Body"),
  });

  // Create a loading state store
  const isSaving = writable(false);

  async function onsubmit(e: SubmitEvent) {
    e.preventDefault();
    
    try {
      isSaving.set(true);
      const { success, error, data } = schema.safeParse(record);
      
      if (success) {
        // Validate slug isn't "new" to prevent routing issues
        if (data.slug === "new") {
          toast.error("Slug cannot be 'new' - please choose a different slug");
          return;
        }
        
        const files = fileInput?.files;
        const user = client.authStore.isAdmin ? "" : $authModel?.id;
        
        // Step 1: Create the record with normal fields first
        record = await save<PostsResponse>("posts", {
          ...data,
          files,
          user,
        });
        
        // Step 2: Process each file deletion as a separate request
        if (toBeRemoved.length > 0) {
          for (const file of toBeRemoved) {
            await client.collection("posts").update(record.id, {
              "files-": [file]
            });
          }
          // Refresh the record to get the updated files list
          record = await client.collection("posts").getOne(record.id);
        }
        
        toast.success("Post saved.");
        history.back();
      } else {
        Object.entries(error.flatten().fieldErrors).forEach(([k, v]) =>
          toast.error(`${k}: ${v}`)
        );
      }
    } catch (error) {
      toast.error("Failed to save post");
      console.error(error);
    } finally {
      isSaving.set(false);
    }
  }
</script>

<SidebarPage title="Create Post">
  <Card>
    <CardHeader>
      <CardTitle>Create New Post</CardTitle>
    </CardHeader>
    <CardContent>
      <form onsubmit={onsubmit} class="space-y-6">
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
          <Button type="submit" disabled={$isSaving}>
            {#if $isSaving}
              <span class="mr-2">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            {/if}
            Save
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</SidebarPage>