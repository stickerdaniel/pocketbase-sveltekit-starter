<script lang="ts">
  import { base } from "$app/paths";
  import Image from "$lib/pocketbase/Image.svelte";
  import { client } from "$lib/pocketbase";
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

  // Error type from PocketBase client
  interface PBError {
    data?: {
      error?: string;
      details?: Record<string, unknown> | string;
    };
    message?: string;
    status?: number;
  }

  // Function to generate a random post
  async function generateRandomPost() {
    try {
      isGenerating.set(true);
      console.log("Starting random post generation...");

      // Show a detailed toast to let the user know we're generating a post
      toast.loading("Generating blog post with Gemini AI...", {
        id: "generate-post",
        duration: 30000, // Long timeout since generation can take time
      });

      const response = await client.send("/api/generate", {
        method: "post",
        // Add a timeout to ensure we don't wait indefinitely
        timeout: 30000,
      });

      console.log("API response:", response);

      // Now we can access the structured data
      if (response && response.record) {
        // Dismiss the loading toast
        toast.dismiss("generate-post");

        // Show success toast with title and summary if available
        if (response.record.summary) {
          // Use string template for toast message instead of JSX
          toast.success(`${response.record.title}`, {
            duration: 5000,
            description: "Post generated successfully",
          });
        } else {
          toast.success(
            `Post "${response.record.title}" generated successfully`,
            {
              duration: 3000,
            }
          );
        }

        // Navigate to the newly created post
        setTimeout(() => {
          window.location.href = `${base}/posts/${response.record.slug || response.record.id}`;
        }, 1500);
      } else {
        // Dismiss the loading toast
        toast.dismiss("generate-post");
        toast.success("Random post generated");

        // Fallback to page reload if we don't have structured data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error("Post generation error:", error);

      // Dismiss the loading toast
      toast.dismiss("generate-post");

      // Cast error to our PBError interface for proper type checking
      const pbError = error as PBError;

      // Check for missing Gemini API key specifically
      if (pbError.data?.error?.includes("GEMINI_API_KEY not configured")) {
        toast.error(
          "Missing Gemini API key. Please set the GEMINI_API_KEY environment variable.",
          {
            duration: 8000,
            action: {
              label: "Learn more",
              onClick: () =>
                window.open("https://ai.google.dev/tutorials/setup", "_blank"),
            },
          }
        );
        return;
      }

      // Try to extract more detailed error info
      let errorMessage = "Failed to generate random post";

      if (pbError.data) {
        // PocketBase Client returns error details in the data property
        if (pbError.data.error) {
          errorMessage = `Error: ${pbError.data.error}`;

          if (pbError.data.details) {
            console.error("Error details:", pbError.data.details);
            errorMessage += ` - ${typeof pbError.data.details === "object" ? JSON.stringify(pbError.data.details) : pbError.data.details}`;
          }
        }
      } else if (pbError.message) {
        errorMessage = `Error: ${pbError.message}`;
      } else if (pbError.status === 404) {
        errorMessage =
          "API endpoint not found. Make sure the backend server is running properly.";
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
  <div class="flex min-h-[calc(100vh-6rem)] flex-col">
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
            Generate with AI
          </Button>
          {#snippet otherwise()}
            <p class="text-muted-foreground text-sm">
              Please Sign In to create/edit posts.
            </p>
          {/snippet}
        </LoginGuard>
      </div>
    </div>

    <div
      class="grid auto-rows-[minmax(min-content,_1fr)] gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {#each $posts.items as item}
        {@const [file] = item.files}
        <a href={`${base}/posts/${item.slug || item.id}`} class="group block">
          <Card.Root
            class="flex h-full flex-col overflow-hidden transition-all hover:shadow-md"
          >
            <div class="relative">
              <AspectRatio ratio={16 / 9} class="bg-muted/30">
                <Image
                  record={item}
                  {file}
                  thumb="800x450"
                  class="h-full w-full object-cover"
                />
              </AspectRatio>
            </div>
            <Card.Content class="flex flex-1 flex-col p-4">
              <h2
                class="group-hover:text-primary mb-2 line-clamp-2 text-xl font-semibold transition-colors"
              >
                {item.title}
              </h2>
              <div
                class="text-muted-foreground mt-auto flex items-center gap-3 text-sm"
              >
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

    <div class="mt-auto pt-6">
      <Paginator store={posts} showIfSinglePage={true} />
    </div>
  </div>
</SidebarPage>
