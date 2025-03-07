<script lang="ts">
  import { client } from "$lib/pocketbase";
  import { base } from "$app/paths";

  // URL to the fallback SVG image in the static folder
  const fallbackImageUrl = `${base}/images/fallbackImage.svg`;

  const {
    record,
    file,
    thumb = "100x100",
    fallback = "internal",
    class: className = "",
    ...rest
  }: {
    record: any;
    file: string;
    thumb?: string;
    fallback?: "internal" | "external";
    class?: string;
  } = $props();
  const src = $derived(
    file
      ? client.getFileUrl(record, file, { thumb })
      : fallback === "external"
        ? `https://via.placeholder.com/${thumb}`
        : fallbackImageUrl
  );
</script>

<img {...rest} {src} class={className} />
