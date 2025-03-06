<script lang="ts">
  import { base } from "$app/paths";
  import DateShow from "$lib/components/DateShow.svelte";
  import Image from "$lib/pocketbase/Image.svelte";
  import Link2Modal from "$lib/components/Link2Modal.svelte";
  import { client } from "$lib/pocketbase";
  import EditPage from "./[slug]/edit/+page.svelte";
  import LoginGuard from "$lib/components/LoginGuard.svelte";
  import Paginator from "$lib/pocketbase/Paginator.svelte";
  import { writable } from "svelte/store";
  import { toast } from "svelte-sonner";
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
  // Create a loading state store
  const isGenerating = writable(false);

  // Function to generate a random post
  async function generateRandomPost() {
    try {
      isGenerating.set(true);
      console.log("Starting random post generation...");

      const response = await client.send("/api/generate", {
        method: "post",
        // Add a timeout to ensure we don't wait indefinitely
        timeout: 30000,
      });

      console.log("API response:", response);
      toast.success("Random post generated");

      // Reload the page to show the new post
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Post generation error:", error);

      // Try to extract more detailed error info
      let errorMessage = "Failed to generate random post";

      if (error.data) {
        // PocketBase Client returns error details in the data property
        if (error.data.error) {
          errorMessage = `Error: ${error.data.error}`;

          if (error.data.details) {
            console.error("Error details:", error.data.details);
            errorMessage += ` - ${typeof error.data.details === "object" ? JSON.stringify(error.data.details) : error.data.details}`;
          }
        }
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      // Show the detailed error message
      toast.error(errorMessage, {
        duration: 8000, // Show longer so user can read
      });
    } finally {
      isGenerating.set(false);
    }
  }
</script>

<SidebarPage title="Posts">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">Blog Posts</h1>
    <div class="flex space-x-2">
      <LoginGuard>
        <Button variant="default" href={`${base}/posts/new/edit`}>
          New Post
        </Button>
        <Button
          variant="outline"
          onclick={generateRandomPost}
          disabled={$isGenerating}
        >
          {#if $isGenerating}
            <span class="mr-2">
              <svg
                class="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </span>
          {/if}
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

  <div class="grid grow gap-6 md:grid-cols-2 lg:grid-cols-4">
    {#each $posts.items as item}
      {@const [file] = item.files}
      <a href={`${base}/posts/${item.slug || item.id}`} class="group block">
        <Card.Root class="overflow-hidden transition-all hover:shadow-md">
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
      <div
        class="col-span-full py-12 text-center text-muted-foreground grow flex flex-col justify-center"
      >
        <p class="text-lg">No posts found.</p>
        <p class="mt-2">Create some new posts to get started.</p>
      </div>
    {/each}
  </div>
  <Paginator store={posts} showIfSinglePage={true} class="mt-6" />
</SidebarPage>
