<script lang="ts">
  import { onDestroy } from "svelte";
  import { authModel, client } from "../pocketbase";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button";
  import LoginForm from "./LoginForm.svelte";
  import Alerts, { alerts } from "./Alerts.svelte";
  const { signupAllowed = true } = $props();
  async function logout() {
    client.authStore.clear();
  }
  const unsubscribe = client.authStore.onChange((token, model) => {
    if (model) {
      const { name, username } = model;
      alerts.success(`Signed in as ${name || username || "Admin"}`, 5000);
    } else {
      alerts.success(`Signed out`, 5000);
    }
  }, false);
  onDestroy(() => {
    unsubscribe();
  });
</script>

{#if $authModel}
  <Dialog.Root>
    <Dialog.Trigger>
      <Button variant="ghost" class="badge">
        {#if $authModel.avatar}
          <img
            src={client.getFileUrl($authModel, $authModel.avatar)}
            alt="profile pic"
          />
        {/if}
        <samp
          >{$authModel?.name || $authModel?.username || $authModel?.email}</samp
        >
      </Button>
    </Dialog.Trigger>
    <Dialog.Content class="max-w-sm">
      <Dialog.Header>
        <Dialog.Title>Profile</Dialog.Title>
      </Dialog.Header>
      <div class="wrapper">
        <div class="badge">
          {#if $authModel.avatar}
            <img
              src={client.getFileUrl($authModel, $authModel.avatar)}
              alt="profile pic"
            />
          {/if}
          <samp
            >{$authModel?.name ??
              $authModel?.username ??
              $authModel?.email}</samp
          >
        </div>
        <Dialog.Footer>
          <Button variant="destructive" onclick={logout}>Sign Out</Button>
        </Dialog.Footer>
      </div>
    </Dialog.Content>
  </Dialog.Root>
{:else}
  <Dialog.Root>
    <Dialog.Trigger>
      <Button>
        {signupAllowed ? "Sign In / Sign Up" : "Sign In"}
      </Button>
    </Dialog.Trigger>
    <Dialog.Content class="max-w-sm">
      <LoginForm {signupAllowed} />
    </Dialog.Content>
  </Dialog.Root>
{/if}

<style lang="scss">
  .badge {
    padding: 0;
    background-color: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    > img {
      height: 2em;
      width: 2em;
      border-radius: 50%;
    }
    > samp {
      display: inline-block !important;
      -moz-border-radius: 20px !important;
      -webkit-border-radius: 20px !important;
      -khtml-border-radius: 20px !important;
      border-radius: 20px !important;
      padding: 0.5rem !important;
      text-align: center !important;
      line-height: 1.5rem !important;
    }
  }
  .wrapper {
    display: flex;
    flex-direction: column;
  }
</style>
