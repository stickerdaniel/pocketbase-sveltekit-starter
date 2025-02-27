<script lang="ts">
  import { client } from "$lib/pocketbase/index.js";
  import { Button } from "$lib/components/ui/button";
  import SidebarPage from "$lib/components/sidebar-page.svelte";
  import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "$lib/components/ui/card";

  let { data } = $props();
  $effect(() => {
    data.metadata.title = data.metadata.headline = "Hello Page";
  });
  async function sendEmail(e: SubmitEvent) {
    e.preventDefault();
    client.send("/api/sendmail", {
      method: "post",
    });
  }
</script>

<SidebarPage title="Hello">
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Hello!</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="mb-4">Got the following API response from the backend server:</p>
        <div class="bg-muted p-4 rounded-md overflow-auto">
          <pre class="text-sm">{JSON.stringify(data, null, 2)}</pre>
        </div>
      </CardContent>
      <CardFooter>
        <form method="post" onsubmit={sendEmail}>
          <Button type="submit">Send me an email</Button>
        </form>
      </CardFooter>
    </Card>
  </div>
</SidebarPage>
