<script lang="ts">
  const {
    authCollection = "users",
    passwordLogin = true,
    signupAllowed = true,
  } = $props();
  import { client, providerLogin } from "../pocketbase";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { toast } from "svelte-sonner";
  import * as Dialog from "$lib/components/ui/dialog/index.js";

  const coll = client.collection(authCollection);

  const form = $state({
    email: "",
    name: "",
    password: "",
    passwordConfirm: "",
    admin: false,
  });
  let isLogin = $state(true);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    try {
      if (!isLogin) {
        await coll.create({ ...form });
      }
      // signin
      if (form.admin) {
        await client.admins.authWithPassword(form.email, form.password);
      } else {
        await coll.authWithPassword(form.email, form.password);
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    }
  }
</script>

<Dialog.Header>
  <Dialog.Title>{signupAllowed && !isLogin ? "Sign Up" : "Log In"}</Dialog.Title
  >
  <Dialog.Description>
    {isLogin
      ? "Enter your email below to login to your account"
      : "Create a new account"}
  </Dialog.Description>
</Dialog.Header>

<form onsubmit={submit} class="grid gap-4">
  {#if passwordLogin}
    <div class="grid gap-2">
      <Label for="email">Email</Label>
      <Input
        id="email"
        type="email"
        bind:value={form.email}
        placeholder="m@example.com"
        required
      />
    </div>

    <div class="grid gap-2">
      <Label for="password">Password</Label>
      <Input
        id="password"
        type="password"
        bind:value={form.password}
        placeholder={isLogin ? "Your password" : "Create a password"}
        required
      />
    </div>

    {#if !isLogin}
      <div class="grid gap-2">
        <Label for="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          bind:value={form.passwordConfirm}
          placeholder="Confirm your password"
          required
        />
      </div>

      <div class="grid gap-2">
        <Label for="full-name">Full Name</Label>
        <Input
          id="full-name"
          type="text"
          bind:value={form.name}
          placeholder="Your full name"
          required
        />
      </div>
    {/if}

    {#if isLogin}
      <div class="flex items-center space-x-2">
        <Checkbox id="admin" bind:checked={form.admin} />
        <Label for="admin">Sign in as admin</Label>
      </div>
    {/if}

    <Button type="submit" class="w-full">
      {isLogin ? "Login" : "Sign Up"}
    </Button>

    {#if signupAllowed}
      <div class="mt-4 text-center text-sm">
        {#if isLogin}
          Don't have an account?
          <a
            href="#"
            class="underline"
            onclick={() => {
              isLogin = false;
              return false;
            }}
          >
            Sign up
          </a>
        {:else}
          Already have an account?
          <a
            href="#"
            class="underline"
            onclick={() => {
              isLogin = true;
              return false;
            }}
          >
            Login
          </a>
        {/if}
      </div>
    {/if}

    {#await coll.listAuthMethods({ $autoCancel: false }) then methods}
      {#if methods.authProviders && methods.authProviders.length > 0}
        <div class="mt-4 space-y-2">
          <div class="relative flex items-center justify-center">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative bg-white px-4 text-sm text-gray-500">
              Or continue with
            </div>
          </div>

          <div class="mt-2 grid gap-2">
            {#each methods.authProviders as p}
              <Button
                type="button"
                variant="outline"
                class="w-full"
                onclick={() => providerLogin(p, coll)}
              >
                Sign in with {p.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}
    {:catch}
      <!-- pocketbase not working -->
    {/await}
  {/if}
</form>
