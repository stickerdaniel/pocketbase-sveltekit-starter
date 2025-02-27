<script lang="ts">
  import { goto } from "$app/navigation";
  import { client } from "$lib/pocketbase";
  import { Button } from "$lib/components/ui/button";
  import { toast } from "svelte-sonner";

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
    try {
      await client.collection(table).delete(id);
      toast.success("Record deleted successfully");
      await back();
    } catch (e: any) {
      const message = e.message || "Error deleting record";
      toast.error(message);
      
      // Handle data errors if available
      const { data = {} } = e.response?.data || {};
      for (const key in data) {
        const message = data[key]?.message;
        if (message) toast.error(`${key}: ${message}`);
      }
    }
  }
</script>

<form onsubmit={submit}>
  <article>
    <aside>Are you sure you want to delete the following record?</aside>
  </article>
  <Button type="submit" variant="destructive">Yes - Proceed</Button>
  <Button type="reset" variant="outline" onclick={back}>No - Cancel</Button>
</form>
