<script lang="ts">
  import { base } from "$app/paths";
  import SidebarPage from "$lib/components/sidebar-page.svelte";
  import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";

  const { data } = $props();
  $effect(() => {
    // you could set the metadata either here or in +page.ts
    data.metadata.title = "Home";
    data.metadata.headline = `Welcome to ${data.config.site?.name}`;
  });
</script>

<SidebarPage title="Dashboard" path="Home">
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <Card>
      <CardHeader>
        <CardTitle>Posts</CardTitle>
        <CardDescription>Manage your blog posts</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Create, edit, and manage blog posts with rich content.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
          <a href="{base}/posts">Browse Posts</a>
        </Button>
      </CardFooter>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Hello Page</CardTitle>
        <CardDescription>Sample page example</CardDescription>
      </CardHeader>
      <CardContent>
        <p>A simple demonstration page showing routing capabilities.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
          <a href="{base}/hello">View Hello Page</a>
        </Button>
      </CardFooter>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Documentation</CardTitle>
        <CardDescription>Learn more</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Find out how to get the most out of this starter template.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
          <a href="https://github.com/spinspire/pocketbase-sveltekit-starter" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </Button>
      </CardFooter>
    </Card>
  </div>

  <Card class="mt-6">
    <CardHeader>
      <CardTitle>Features</CardTitle>
      <CardDescription>Key capabilities of this starter kit</CardDescription>
    </CardHeader>
    <CardContent>
      <ul class="list-disc pl-6 space-y-2">
        <li>Svelte 5: runes, $props, snippets, etc.</li>
        <li>SvelteKit: routing, PageData loading, CSR with <code>adapter-static</code></li>
        <li>PocketBase: CRUD, typegen, realtime data updates</li>
        <li>PocketBase: JSVM hook, routes, etc.</li>
        <li>Modern UI with shadcn-svelte components</li>
        <li>Responsive sidebar navigation with expandable sections</li>
        <li>Toast notifications with Sonner</li>
        <li>Authentication system with login/signup flows</li>
      </ul>
    </CardContent>
    <CardFooter>
      <Button variant="outline" asChild>
        <a href="{base}/posts">Browse Posts</a>
      </Button>
    </CardFooter>
  </Card>
</SidebarPage>