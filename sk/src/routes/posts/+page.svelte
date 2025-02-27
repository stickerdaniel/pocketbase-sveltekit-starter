<script lang="ts">
  import { base } from "$app/paths";
  import DateShow from "$lib/components/DateShow.svelte";
  import Image from "$lib/pocketbase/Image.svelte";
  import Link2Modal from "$lib/components/Link2Modal.svelte";
  import { client } from "$lib/pocketbase";
  import EditPage from "./[slug]/edit/+page.svelte";
  import LoginGuard from "$lib/components/LoginGuard.svelte";
  import Paginator from "$lib/pocketbase/Paginator.svelte";
  import Spinner, { activityStore } from "$lib/components/Spinner.svelte";
  import SidebarPage from "$lib/components/sidebar-page.svelte";
  import { Button } from "$lib/components/ui/button";
  import { AspectRatio } from "$lib/components/ui/aspect-ratio/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Calendar, User } from "lucide-svelte";

  const { data } = $props();
  const posts = $derived(data.posts);
  $effect(() => {
    data.metadata.title = data.metadata.headline = "Posts";
  });
  const store = activityStore(() =>
    client.send("/api/generate", { method: "post" })
  );
</script>

<SidebarPage title="Posts" path="Posts">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">Blog Posts</h1>
    <div class="flex space-x-2">
      <LoginGuard>
        <Link2Modal component={EditPage}>
          {#snippet trigger(onclick)}
            <Button variant="default" {onclick}>New Post</Button>
          {/snippet}
        </Link2Modal>
        <Button variant="outline" onclick={store.run} disabled={$store}>
          <Spinner active={$store} />
          Generate Random Post
        </Button>
        {#snippet otherwise()}
          <p class="text-muted-foreground text-sm">
            Please Sign In to create/edit posts.
          </p>
        {/snippet}
      </LoginGuard>
    </div>
  </div>

  <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
    {#each $posts.items as item}
      {@const [file] = item.files}
      <a href={`${base}/posts/${item.slug || item.id}`} class="group block">
        <Card.Root
          class="h-full overflow-hidden transition-all hover:shadow-md"
        >
          <div class="relative">
            <AspectRatio ratio={16 / 9} class="bg-muted/30">
              <Image record={item} {file} class="h-full w-full object-cover" />
            </AspectRatio>
          </div>
          <Card.Content class="p-4">
            <h2
              class="group-hover:text-primary mb-2 line-clamp-2 text-xl font-semibold transition-colors"
            >
              {item.title}
            </h2>
            <div class="text-muted-foreground flex items-center gap-3 text-sm">
              <span class="inline-flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{new Date(item.updated).toLocaleDateString()}</span>
              </span>
              {#if item.expand?.user?.name}
                <span class="inline-flex items-center gap-1.5">
                  <User size={14} />
                  <span>{item.expand.user.name}</span>
                </span>
              {/if}
            </div>
          </Card.Content>
        </Card.Root>
      </a>
    {:else}
      <div class="col-span-full py-12 text-center text-muted-foreground">
        <p class="text-lg">No posts found.</p>
        <p class="mt-2">Create some new posts to get started.</p>
      </div>
    {/each}
  </div>
  <Paginator store={posts} showIfSinglePage={true} class="mt-6" />
</SidebarPage>
