<script lang="ts">
  import type { Snippet } from "svelte";
  import type { PageStore } from ".";
  import * as Pagination from "$lib/components/ui/pagination/index.js";

  const {
    store,
    showIfSinglePage = false,
  }: {
    store: PageStore;
    showIfSinglePage?: boolean;
  } = $props();

  // Use a regular variable for two-way binding
  let currentPage = $state($store.page);

  // Watch for store changes and update local state
  $effect(() => {
    currentPage = $store.page;
  });

  // Handle page change event
  function handlePageChange(page: number) {
    if (page !== $store.page) {
      store.setPage(page);
    }
  }
</script>

{#if showIfSinglePage || $store.totalPages > 1}
  <div class="my-4 flex justify-center">
    <Pagination.Root
      count={$store.totalItems}
      perPage={$store.perPage}
      page={currentPage}
      on:pageChange={(e) => handlePageChange(e.detail)}
      siblingCount={1}
    >
      {#snippet children({ pages, currentPage })}
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.PrevButton
              onclick={() => {
                if (currentPage > 1) {
                  handlePageChange(currentPage - 1);
                }
              }}
            />
          </Pagination.Item>

          {#each pages as page (page.key)}
            {#if page.type === "ellipsis"}
              <Pagination.Item>
                <Pagination.Ellipsis />
              </Pagination.Item>
            {:else}
              <Pagination.Item>
                <Pagination.Link
                  {page}
                  isActive={currentPage === page.value}
                  onclick={() => {
                    if (page.value !== currentPage) {
                      handlePageChange(page.value);
                    }
                  }}
                />
              </Pagination.Item>
            {/if}
          {/each}

          <Pagination.Item>
            <Pagination.NextButton
              onclick={() => {
                if (currentPage < $store.totalPages) {
                  handlePageChange(currentPage + 1);
                }
              }}
            />
          </Pagination.Item>
        </Pagination.Content>
      {/snippet}
    </Pagination.Root>
  </div>
{/if}
