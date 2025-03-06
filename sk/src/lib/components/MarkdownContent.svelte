<script lang="ts">
  import { marked } from "marked";
  import DOMPurify from "dompurify";
  import Prism from "prismjs";
  import "prismjs/themes/prism.css"; // Import a Prism theme

  // Import additional Prism language support as needed
  import "prismjs/components/prism-javascript";
  import "prismjs/components/prism-typescript";
  import "prismjs/components/prism-css";
  import "prismjs/components/prism-markdown";
  import "prismjs/components/prism-json";
  import "prismjs/components/prism-bash";
  import "prismjs/components/prism-yaml";
  import "prismjs/components/prism-go";
  import "prismjs/components/prism-sql";
  import "prism-svelte";

  // Configure marked to use Prism for syntax highlighting
  marked.setOptions({
    highlight: (code, lang) => {
      if (Prism.languages[lang]) {
        return Prism.highlight(code, Prism.languages[lang], lang);
      }
      return code;
    },
  });

  // Using Svelte 5 Runes
  let { content } = $props();
  let sanitizedHtml = $derived(DOMPurify.sanitize(marked.parse(content || "")));
</script>

<div class="markdown-content">
  {@html sanitizedHtml}
</div>

<style>
  /* Add some basic styling for the markdown content */
  .markdown-content :global(h1) {
    font-size: 1.75em;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  .markdown-content :global(h2) {
    font-size: 1.5em;
    margin-top: 1.25em;
    margin-bottom: 0.5em;
  }

  .markdown-content :global(h3) {
    font-size: 1.25em;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  .markdown-content :global(p) {
    margin-bottom: 1em;
    line-height: 1.6;
  }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin-bottom: 1em;
    padding-left: 2em;
  }

  .markdown-content :global(ul) {
    list-style-type: disc;
  }

  .markdown-content :global(ol) {
    list-style-type: decimal;
  }

  .markdown-content :global(li) {
    margin-bottom: 0.5em;
  }

  .markdown-content :global(a) {
    color: var(--primary);
    text-decoration: underline;
  }

  .markdown-content :global(blockquote) {
    border-left: 4px solid var(--muted);
    padding-left: 1em;
    margin-left: 0;
    margin-bottom: 1em;
    font-style: italic;
    color: var(--muted-foreground);
  }

  .markdown-content :global(pre) {
    margin-bottom: 1em;
    padding: 1em;
    background-color: var(--muted);
    border-radius: 0.25em;
    overflow-x: auto;
  }

  .markdown-content :global(code:not(pre code)) {
    background-color: var(--muted);
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
    font-size: 0.875em;
  }

  .markdown-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1em;
  }

  .markdown-content :global(th),
  .markdown-content :global(td) {
    padding: 0.5em;
    border: 1px solid var(--border);
  }

  .markdown-content :global(th) {
    background-color: var(--muted);
  }

  .markdown-content :global(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1.5em 0;
  }
</style>
