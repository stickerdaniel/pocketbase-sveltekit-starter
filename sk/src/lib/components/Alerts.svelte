<script lang="ts" context="module">
  import { toast } from "svelte-sonner";

  // This file provides a compatibility layer for the old alerts API
  // while using the new Sonner toast system underneath

  interface Alert {
    message: string;
    type: string;
    timeout?: number;
    html?: boolean;
  }

  export const alerts = {
    add({ message, type = "info", timeout = 0, html = false }: Alert) {
      switch (type) {
        case "success":
          toast.success(message);
          break;
        case "error":
          toast.error(message);
          break;
        case "warning":
          toast.warning(message);
          break;
        case "info":
        default:
          toast.info(message);
          break;
      }
    },
    info(message: string, timeout = 0) {
      toast.info(message);
    },
    success(message: string, timeout = 0) {
      toast.success(message);
    },
    warning(message: string, timeout = 0) {
      toast.warning(message);
    },
    error(message: string, timeout = 0) {
      toast.error(message);
    },
  };

  export function errorAlert(message: string) {
    toast.error(message);
  }

  function onunhandledrejection(e: PromiseRejectionEvent) {
    toast.error(e.reason.toString());
    const { data = {} } = e.reason.response ?? {};
    for (const [key, value] of Object.entries(data)) {
      if (value?.message) {
        toast.error(`${key}: ${value.message}`);
      }
    }
  }
</script>

<!-- to display alerts for unhandled promise rejections -->
<svelte:window {onunhandledrejection} />

<!-- This component now does nothing visually since Toaster is in the layout -->