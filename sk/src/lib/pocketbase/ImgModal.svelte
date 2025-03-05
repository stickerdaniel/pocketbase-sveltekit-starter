<script lang="ts">
  import type { BaseModel } from "pocketbase";
  import { client } from ".";
  import * as Dialog from "$lib/components/ui/dialog/index.js";

  const {
    record,
    filename,
    thumbOnly,
  }: {
    record: BaseModel;
    filename: string;
    thumbOnly?: boolean;
  } = $props();
</script>

{#if record && filename}
  {@const thumbSrc = client.getFileUrl(record, filename, { thumb: "120x120" })}
  <Dialog.Root>
    <Dialog.Trigger>
      <img
        src={thumbSrc}
        alt="preview"
        class="h-24 w-auto cursor-pointer rounded-lg object-cover shadow-sm transition-shadow duration-200 hover:shadow-md"
      />
    </Dialog.Trigger>
    <Dialog.Content class="w-full max-w-4xl overflow-hidden p-0">
      {#if !thumbOnly}
        {@const fullSrc = client.getFileUrl(record, filename)}
        <img
          src={fullSrc}
          alt="full size"
          class="h-auto max-h-[90vh] w-full object-contain"
        />
      {/if}
    </Dialog.Content>
  </Dialog.Root>
{/if}
