<script lang="ts">
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { base } from "$app/paths";

  let { title = "Dashboard", path = "Home", signupAllowed = true } = $props();
</script>

<Sidebar.Provider>
  <AppSidebar {signupAllowed} />
  <Sidebar.Inset>
    <header class="flex h-16 shrink-0 items-center gap-2">
      <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 h-4" />
        <Breadcrumb.Root>
          <Breadcrumb.List>
            <Breadcrumb.Item class="hidden md:block">
              <Breadcrumb.Link href={`${base}/`}>Home</Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator class="hidden md:block" />
            <Breadcrumb.Item>
              <Breadcrumb.Page>{path}</Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </div>
    </header>
    <div class="flex flex-1 flex-col gap-4 overflow-auto p-4 pt-0">
      <!-- Page content goes here -->
      <slot>
        <!-- Default content if no slot provided -->
        <div class="grid auto-rows-min gap-4 md:grid-cols-3">
          <div class="bg-muted/50 aspect-video rounded-xl"></div>
          <div class="bg-muted/50 aspect-video rounded-xl"></div>
          <div class="bg-muted/50 aspect-video rounded-xl"></div>
        </div>
        <div class="bg-muted/50 rounded-xl p-6">
          <h2 class="mb-4 text-2xl font-bold">
            Welcome to PocketBase + SvelteKit Starter
          </h2>
          <p class="mb-4">
            This is a starter template for building applications with PocketBase
            and SvelteKit. Use the sidebar navigation to explore the different
            features.
          </p>
          <ul class="mb-4 list-disc space-y-2 pl-6">
            <li>Svelte 5: runes, $props, snippets, etc.</li>
            <li>
              SvelteKit: routing, PageData loading, CSR with <code
                >adapter-static</code
              >
            </li>
            <li>PocketBase: CRUD, typegen, realtime data updates</li>
            <li>PocketBase: JSVM hook, routes, etc.</li>
            <li>Modern UI with shadcn-svelte components</li>
          </ul>
        </div>
      </slot>
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>
