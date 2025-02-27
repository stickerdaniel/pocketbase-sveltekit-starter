<script lang="ts">
  import type { BaseModel } from "pocketbase";
  import { client } from ".";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button";

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
  {@const thumbSrc = client.getFileUrl(record, filename, { thumb: "100x100" })}
  <Dialog.Root>
    <Dialog.Trigger>
      <Button variant="ghost" class="thumbnail p-0">
        <img src={thumbSrc} alt="image preview" />
      </Button>
    </Dialog.Trigger>
    <Dialog.Content>
      {#if !thumbOnly}
        {@const fullSrc = client.getFileUrl(record, filename)}
        <img src={fullSrc} alt="full size image" />
      {/if}
    </Dialog.Content>
  </Dialog.Root>
{/if}

<style lang="scss">
  .thumbnail {
    padding: 0;
    > img {
      border-radius: 5px;
      box-shadow: 0 0 5px 0px black;
    }
  }
</style>
