<script lang="ts">
  import { goto } from "$app/navigation";
  import { client } from "$lib/pocketbase";
  import { alertOnFailure } from "$lib/pocketbase/ui";
  import { Button } from "$lib/components/ui/button";

  const {
    id,
    table,
    return_path = "back",
  }: { id: string; table: string; return_path?: string } = $props();
  async function back() {
    if (return_path === "back") {
      history.back();
    } else {
      await goto(return_path);
    }
  }
  async function submit(e: SubmitEvent) {
    e.preventDefault();
    alertOnFailure(async () => {
      await client.collection(table).delete(id);
      await back();
    });
  }
</script>

<form onsubmit={submit}>
  <article>
    <aside>Are you sure you want to delete the following record?</aside>
  </article>
  <Button type="submit" variant="destructive">Yes - Proceed</Button>
  <Button type="reset" variant="outline" onclick={back}>No - Cancel</Button>
</form>
