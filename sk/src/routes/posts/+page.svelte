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
  import { Card, CardContent } from "$lib/components/ui/card";

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
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Blog Posts</h1>
    <div class="flex space-x-2">
      <LoginGuard>
        <Link2Modal component={EditPage}>
          {#snippet trigger(onclick)}
            <Button variant="default" {onclick}>
              New Post
            </Button>
          {/snippet}
        </Link2Modal>
        <Button variant="outline" onclick={store.run} disabled={$store}>
          <Spinner active={$store} />
          Generate Random Post
        </Button>
        {#snippet otherwise()}
          <p class="text-sm text-muted-foreground">Please Sign In to create/edit posts.</p>
        {/snippet}
      </LoginGuard>
    </div>
  </div>

  <Card>
    <CardContent class="p-4">
      <Paginator store={posts} showIfSinglePage={true} />
      <div class="space-y-4">
        {#each $posts.items as item}
          {@const [file] = item.files}
          <a href={`${base}/posts/${item.slug || item.id}`} class="post block p-4 rounded-lg border hover:bg-muted/50 transition-colors">
            <div class="flex gap-4 items-start">
              <div class="shrink-0">
                <DateShow date={item.updated} />
                <Image record={item} {file} />
              </div>
              <div class="flex-1">
                <div class="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                  <span class="inline-flex items-center gap-1">
                    <i class="bx bx-calendar" title="on date"></i>
                    {new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(
                      new Date(item.updated)
                    )}
                  </span>
                  {#if item.expand?.user?.name}
                    <span class="inline-flex items-center gap-1">
                      <i class="bx bx-pen" title="author"></i>
                      {item.expand.user.name}
                    </span>
                  {/if}
                </div>
                <h2 class="text-lg font-semibold">{item.title}</h2>
              </div>
            </div>
          </a>
        {:else}
          <div class="py-8 text-center text-muted-foreground">
            No posts found. Create some new posts to get started.
          </div>
        {/each}
      </div>
      <Paginator store={posts} showIfSinglePage={true} />
    </CardContent>
  </Card>
</SidebarPage>

<style lang="scss">
  .post {
    color: inherit;
    display: flex;
    gap: 1rem;
    padding-block: 1rem;
    & + .post {
      border-block-start: dashed 1px;
    }
  }
</style>
