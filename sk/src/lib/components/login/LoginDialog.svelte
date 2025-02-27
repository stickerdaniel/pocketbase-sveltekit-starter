<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import LoginForm from "$lib/components/LoginForm.svelte";
  
  const { signupAllowed = true } = $props();
</script>

<Dialog.Root>
  <Dialog.Trigger>
    {signupAllowed ? "Sign In / Sign Up" : "Sign In"}
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{signupAllowed ? "Sign In / Sign Up" : "Sign In"}</Dialog.Title>
      <Dialog.Description>
        Enter your credentials to access your account.
      </Dialog.Description>
    </Dialog.Header>
    <LoginForm {signupAllowed} />
    <Dialog.Footer>
      <Dialog.Close>Cancel</Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
