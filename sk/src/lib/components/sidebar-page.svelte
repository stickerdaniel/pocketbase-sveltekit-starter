<script lang="ts">
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { base } from "$app/paths";
  import { page } from "$app/stores";

  let { title = "Dashboard", signupAllowed = true } = $props();

  // Track scroll position for header shadow effect
  let contentEl: HTMLDivElement;
  let isScrolled = $state(false);

  function handleScroll() {
    isScrolled = contentEl?.scrollTop > 5;
  }
  
  // Generate breadcrumbs from current URL
  let breadcrumbs = $derived(generateBreadcrumbs($page.url.pathname));
  
  function generateBreadcrumbs(pathname: string): { href: string, label: string }[] {
    // Remove base path if it exists
    const path = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
    
    // Split the path into segments and filter out empty segments
    const segments = path.split('/').filter(Boolean);
    
    // Always start with Home
    const breadcrumbs: { href: string, label: string }[] = [
      { href: `${base}/`, label: 'Home' }
    ];
    
    // Build up the breadcrumbs based on path segments
    let currentPath = base;
    
    for (let i = 0; i < segments.length; i++) {
      // Add trailing slash if needed
      if (!currentPath.endsWith('/')) {
        currentPath += '/';
      }
      
      // Add current segment to the path
      currentPath += segments[i];
      
      // Decode URI component to handle URL encoded characters like %20
      const decodedSegment = decodeURIComponent(segments[i]);
      
      // Custom label handling for specific paths
      let label = '';
      
      // Special case handling for common route patterns
      if (decodedSegment === 'new' && i === segments.length - 2 && segments[i+1] === 'edit') {
        // Skip "new" segment when in new/edit path
        continue;
      } else if (decodedSegment === 'edit' && segments[i-1] === 'new') {
        label = 'Create New Post';
      } else if (decodedSegment === 'edit') {
        label = 'Edit';
      } else {
        // Format the label: convert kebab-case or snake_case to Title Case
        label = decodedSegment
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, char => char.toUpperCase());
      }
      
      breadcrumbs.push({
        href: currentPath,
        label: label
      });
    }
    
    return breadcrumbs;
  }
</script>

<Sidebar.Provider>
  <AppSidebar {signupAllowed} />
  <Sidebar.Inset>
    <header
      class="bg-background relative z-10 flex h-16 shrink-0 items-center gap-2 transition-all duration-200"
    >
      <!-- Bottom shadow that only appears when scrolled -->
      <div
        class="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-b from-transparent to-black/10 transition-opacity
        duration-200"
        class:opacity-0={!isScrolled}
        class:opacity-100={isScrolled}
      ></div>
      <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 h-4" />
        <Breadcrumb.Root>
          <Breadcrumb.List>
            {#each breadcrumbs as crumb, i}
              {#if i > 0}
                <Breadcrumb.Separator class="hidden md:block" />
              {/if}
              <Breadcrumb.Item class="hidden md:block">
                {#if i === breadcrumbs.length - 1}
                  <Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
                {:else}
                  <Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
                {/if}
              </Breadcrumb.Item>
            {/each}
            
            <!-- Mobile view shows only current page -->
            <Breadcrumb.Item class="md:hidden">
              <Breadcrumb.Page>
                {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : 'Home'}
              </Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </div>
    </header>

    <div
      bind:this={contentEl}
      on:scroll={handleScroll}
      class="flex flex-1 flex-col gap-4 overflow-auto p-4 pt-0"
    >
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
