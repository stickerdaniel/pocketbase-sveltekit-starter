<script lang="ts">
  const {
    authCollection = "users",
    passwordLogin = true,
    signupAllowed = true,
  } = $props();
  import { client, providerLogin } from "../pocketbase";
  import TabGroup from "./TabGroup.svelte";
  import Tab from "./Tab.svelte";
  import TabContent from "./TabContent.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  const coll = client.collection(authCollection);

  const form = $state({
    email: "",
    name: "",
    password: "",
    passwordConfirm: "",
    admin: false,
  });
  let signup = false;

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (signup) {
      await coll.create({ ...form });
    }
    // signin
    if (form.admin) {
      await client.admins.authWithPassword(form.email, form.password);
    } else {
      await coll.authWithPassword(form.email, form.password);
    }
  }
  let active = $state("SignIn");
</script>

{#snippet signin()}
  <div class="grid w-full items-center gap-1.5 mb-3">
    <Label for="signin-email">Email</Label>
    <Input id="signin-email" bind:value={form.email} required type="text" placeholder="Your email address" />
  </div>
  
  <div class="grid w-full items-center gap-1.5 mb-3">
    <Label for="signin-password">Password</Label>
    <Input
      id="signin-password"
      bind:value={form.password}
      required
      type="password"
      placeholder="Your password"
    />
  </div>
  
  <label title="sign-in as admin" class="flex items-center gap-1.5 mb-4 text-sm">
    <input type="checkbox" bind:checked={form.admin} class="h-4 w-4" />
    <span>Sign in as admin</span>
  </label>
  
  <Button type="submit" onclick={() => (signup = false)}>Sign In</Button>
{/snippet}

<form onsubmit={submit} class="w-full max-w-md space-y-4">
  {#if passwordLogin}
    {#if signupAllowed}
      <TabGroup bind:active>
        {#snippet tabs()}
          <Tab key="SignIn">Sign In</Tab>
          <Tab key="SignUp">Sign Up</Tab>
        {/snippet}
        <TabContent key="SignIn">
          {@render signin()}
        </TabContent>
        <TabContent key="SignUp">
          <div class="grid w-full items-center gap-1.5 mb-3">
            <Label for="signup-email">Email</Label>
            <Input
              id="signup-email"
              bind:value={form.email}
              required
              type="text"
              placeholder="Your email address"
            />
          </div>
          
          <div class="grid w-full items-center gap-1.5 mb-3">
            <Label for="signup-password">Password</Label>
            <Input
              id="signup-password"
              bind:value={form.password}
              required
              type="password"
              placeholder="Create a password"
            />
          </div>
          
          <div class="grid w-full items-center gap-1.5 mb-3">
            <Label for="signup-confirm">Confirm Password</Label>
            <Input
              id="signup-confirm"
              bind:value={form.passwordConfirm}
              required
              type="password"
              placeholder="Confirm your password"
            />
          </div>
          
          <div class="grid w-full items-center gap-1.5 mb-4">
            <Label for="signup-name">Full Name</Label>
            <Input
              id="signup-name"
              bind:value={form.name}
              required
              type="text"
              placeholder="Your full name"
            />
          </div>
          
          <input type="hidden" name="register" value={true} />
          <Button type="submit" onclick={() => (signup = true)}>Sign Up</Button>
        </TabContent>
      </TabGroup>
    {:else}
      <h2>Sign In</h2>
      {@render signin()}
    {/if}
  {/if}
  {#await coll.listAuthMethods({ $autoCancel: false }) then methods}
    {#if methods.authProviders && methods.authProviders.length > 0}
      <div class="mt-4 space-y-2">
        <div class="relative flex items-center justify-center">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative px-4 text-sm text-gray-500 bg-white">
            Or continue with
          </div>
        </div>
        
        <div class="grid gap-2 mt-2">
          {#each methods.authProviders as p}
            <Button type="button" variant="outline" onclick={() => providerLogin(p, coll)}
              >Sign in with {p.name}</Button
            >
          {/each}
        </div>
      </div>
    {/if}
  {:catch}
    <!-- pocketbase not working -->
  {/await}
</form>
